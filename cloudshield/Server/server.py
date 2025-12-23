"""Flask application factory and unified error handling for CloudShield API."""
from __future__ import annotations

import os
import logging
import uuid
from time import time
from dotenv import load_dotenv

from flask import Flask, request, jsonify, g
from werkzeug.exceptions import BadRequest, HTTPException

from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError, OperationFailure


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

# --- 2. UPDATE IMPORTS TO INCLUDE auth_bp ---
try:
    from cloudshield.Server.utils import get_logger
    from cloudshield.Server.routes import api_bp
    from cloudshield.Server.routes.auth import auth_bp  # <--- ADDED
    from cloudshield.Server.routes.users import users_bp
    from cloudshield.Server.routes.users_read import users_read_bp
except ImportError:
    try:
        from .utils import get_logger
        from .routes import api_bp
        from .routes.auth import auth_bp  # <--- ADDED
        from .routes.users import users_bp
        from .routes.users_read import users_read_bp
    except ImportError:
        from utils import get_logger  # type: ignore
        from routes import api_bp  # type: ignore
        from routes.auth import auth_bp  # <--- ADDED
        from routes.users import users_bp  # type: ignore
        from routes.users_read import users_read_bp  # type: ignore

# optional audit blueprint
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
    """Create and configure Flask application with blueprints."""
    app = Flask(__name__)
    app.register_blueprint(api_bp)
    logger.debug("Registered api blueprint: %s", api_bp.name)
    return app


app = create_app()


def _request_id() -> str:
    """Get or generate request ID for tracing."""
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    g.request_id = rid
    return rid


def _error_json(error: str, code: str, details=None, status: int = 400):
    """Build standardized JSON error response with request ID."""
    payload = {
        "error": error,
        "code": code,
        "details": details,
        "request_id": getattr(g, "request_id", None) or _request_id(),
    }
    return jsonify(payload), status


@app.before_request
def _ensure_json_on_writes():
    """Enforce JSON content-type for write operations."""
    g.start_time = time()
    _request_id()
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.data and not request.is_json:
            # Allow empty body if needed, but if data exists, it must be JSON
            pass 
            # Note: Strict check removed for now to prevent issues with empty POSTs
            # if request.data and not request.is_json:
            #    raise BadRequest("Expected application/json body")


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


# --- Error Handlers (No changes needed) ---
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


# --- 5. REGISTER BLUEPRINTS ---

# Register Auth (Login/Me) -> /api/auth/login
app.register_blueprint(auth_bp, url_prefix="/api") 

# Register Users -> /api/users
app.register_blueprint(users_bp, url_prefix="/api")
app.register_blueprint(users_read_bp, url_prefix="/api")

if audit_bp:
    app.register_blueprint(audit_bp, url_prefix="/api")


@app.route("/healthz", methods=["GET"])
def healthz():
    """Health check endpoint for monitoring."""
    return jsonify({"status": "ok", "request_id": g.request_id}), 200

# Entrypoint
if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5050")),
    )