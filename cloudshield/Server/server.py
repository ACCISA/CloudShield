from __future__ import annotations

import os
import logging
import uuid
from time import time
from dotenv import load_dotenv

from flask import Flask, request, jsonify, g
from werkzeug.exceptions import BadRequest, HTTPException

# --- 1. ADD FLASK CORS IMPORT ---
from flask_cors import CORS

from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError, OperationFailure


from utils import get_logger  # type: ignore

# Prefer package-qualified imports so tests can monkeypatch `cloudshield.Server.routes.*`
# and so the app uses a single module path.
try:
    from cloudshield.Server.routes import api_bp, auth_bp, users_bp, users_read_bp, access_groups_bp, workstations_bp, activity_bp  # type: ignore
    from cloudshield.Server.routes.tickets import tickets_bp
except Exception:  # pragma: no cover
    from routes import api_bp, auth_bp, users_bp, users_read_bp, access_groups_bp, workstations_bp, activity_bp  # type: ignore
    from routes.tickets import tickets_bp

def _coerce_exception_class(candidate, name: str):
    """Ensure an imported exception reference is a proper Exception subclass."""
    if isinstance(candidate, type) and issubclass(candidate, Exception):
        return candidate

    class _Fallback(Exception):
        pass

    _Fallback.__name__ = f"Stub{name}"
    return _Fallback


DuplicateKeyError = _coerce_exception_class(DuplicateKeyError, "DuplicateKeyError")
OperationFailure = _coerce_exception_class(OperationFailure, "OperationFailure")

# optional audit blueprint; may fail if DB/view not set up
try:
    try:
        from cloudshield.Server.routes.audit import audit_bp # type: ignore[import]
    except ImportError:
        from routes.audit import audit_bp # type: ignore[import]
except Exception:  # pragma: no cover
    audit_bp = None

load_dotenv()


# Logging setup
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
server_logger = logging.getLogger("cloudshield.server")
logger = get_logger("api")

def create_app() -> Flask:
    app = Flask(__name__)
    
    # --- 2. INITIALIZE CORS ---
    # This enables Cross-Origin Resource Sharing for all routes    
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        },
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )


    
    
    # --- 3. REGISTER BLUEPRINTS HERE (Consolidated) ---
    # Register Tasks API -> /api/task/...
    app.register_blueprint(api_bp, url_prefix="/api")
    logger.debug("Registered api blueprint: %s", api_bp.name)

    # Register Auth (Login/Me) -> /api/auth/...
    app.register_blueprint(auth_bp, url_prefix="/api/auth") 
    logger.debug("Registered auth blueprint: %s", auth_bp.name)

    # Register Users -> /api/users
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(users_read_bp, url_prefix="/api")

    app.register_blueprint(access_groups_bp, url_prefix="/api")
    logger.debug("Registered access_groups blueprint: %s", access_groups_bp.name)

    app.register_blueprint(workstations_bp, url_prefix="/api")
    logger.debug("Registered workstations blueprint: %s", workstations_bp.name)

    app.register_blueprint(activity_bp, url_prefix="/api")
    logger.debug("Registered activity blueprint: %s", activity_bp.name)

    app.register_blueprint(tickets_bp, url_prefix="/api")
    logger.debug("Registered tickets blueprint: %s", tickets_bp.name)

    if audit_bp:
        app.register_blueprint(audit_bp, url_prefix="/api")

    return app




app = create_app()


# Helpers
def _request_id() -> str:
    # Use incoming X-Request-ID or generate a new one
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    g.request_id = rid
    return rid


def _error_json(error: str, code: str, details=None, status: int = 400):
    """Standardized error payloads for clients."""
    payload = {
        "error": error,
        "code": code,
        "details": details,
        "request_id": getattr(g, "request_id", None) or _request_id(),
    }
    return jsonify(payload), status

# Global JSON guard for write methods
@app.before_request
def _ensure_json_on_writes():
    """Enforce JSON content-type for write operations and handle CORS preflights."""
    g.start_time = time()
    _request_id()

    # 1. ALWAYS respond to OPTIONS requests so CORS preflight can pass with a valid status
    if request.method == "OPTIONS":
        # Return empty 200 so browser preflight sees an OK response; CORS headers will be
        # added by the CORS extension in after_request.
        return "", 200

    # 2. Enforce JSON for write methods
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.data and not request.is_json:
            # Return a clear error instead of just 'pass'
            return jsonify({
                "error": "Content-Type must be application/json",
                "request_id": g.request_id
            }), 415


@app.after_request
def _add_performance_headers(response):
    """Add response time tracking and log slow requests."""
    if hasattr(g, 'start_time'):
        elapsed_ms = (time() - g.start_time) * 1000
        response.headers['X-Response-Time'] = f"{elapsed_ms:.2f}ms"
        if elapsed_ms > 500:
            logger.warning(
                "Slow request: %s %s - %.2fms (request_id=%s)",
                request.method,
                request.path,
                elapsed_ms,
                getattr(g, 'request_id', 'unknown')
            )
    return response


# --- Error Handlers ---
@app.errorhandler(ValidationError)
def _handle_pydantic(e: ValidationError):
    return _error_json("Validation failed", "VALIDATION_ERROR", e.errors(), 400)

@app.errorhandler(DuplicateKeyError)
def _handle_duplicate(e: Exception):
    return _error_json("Email already exists", "DUPLICATE_EMAIL", {"field": "email"}, 409)

@app.errorhandler(ValueError)
def _handle_value_error(e: ValueError):
    return _error_json("Invalid request", "INVALID_REQUEST", str(e), 400)

@app.errorhandler(BadRequest)
def _handle_bad_json(e: BadRequest):
    return _error_json("Bad Request", "BAD_JSON", str(e.description), 400)

@app.errorhandler(OperationFailure)
def _handle_mongo_failure(e: Exception):
    msg = str(e)
    if "not authorized" in msg.lower():
        return _error_json("Forbidden (database)", "DB_UNAUTHORIZED", msg, 403)
    return _error_json("Database error", "DB_OPERATION_FAILURE", msg, 500)

@app.errorhandler(HTTPException)
def _handle_http_exception(e: HTTPException):
    return _error_json(e.name or "HTTP Error", f"HTTP_{e.code}", e.description, e.code)

@app.errorhandler(Exception)
def _handle_generic(e: Exception):
    server_logger.exception("Unhandled error: %s", e)
    details = str(e) if app.debug else "An unexpected error occurred"
    return _error_json("Internal Server Error", "INTERNAL_ERROR", details, 500)


# Health / info endpoint
@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok", "request_id": g.request_id}), 200


# Entrypoint
if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5050")),
    )
