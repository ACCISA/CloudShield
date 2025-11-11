from __future__ import annotations

import os
import logging
import uuid
from dotenv import load_dotenv

from flask import Flask, request, jsonify, g
from werkzeug.exceptions import BadRequest, HTTPException

from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError, OperationFailure

try:
    from cloudshield.Server.utils import get_logger
    from cloudshield.Server.routes import api_bp
    from cloudshield.Server.routes.users import users_bp
except ImportError:
    from utils import get_logger
    from routes import api_bp
    from routes.users import users_bp

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
    app.register_blueprint(api_bp)
    logger.debug("Registered api blueprint: %s", api_bp.name)
    return app



from flask_cors import CORS

CORS(app, origins=["http://localhost:5173"], supports_credentials=True)
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
    _request_id()  # ensure request_id is always set
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        # Allow empty body for certain routes (like DELETE /users/<id>)
        if request.data and not request.is_json:
            # Content-Type missing or not JSON
            raise BadRequest("Expected application/json body")


# Error handlers (Validation & Error Handling)
@app.errorhandler(ValidationError)
def _handle_pydantic(e: ValidationError):
    # Field-level details come from Pydantic
    return _error_json(
        error="Validation failed",
        code="VALIDATION_ERROR",
        details=e.errors(),
        status=400,
    )


@app.errorhandler(DuplicateKeyError)
def _handle_duplicate(e: DuplicateKeyError):
    # Typically triggered by unique index on email
    return _error_json(
        error="Email already exists",
        code="DUPLICATE_EMAIL",
        details={"field": "email"},
        status=409,
    )


@app.errorhandler(ValueError)
def _handle_value_error(e: ValueError):
    # Service-layer rejections (e.g., "User not found", "No fields to update")
    return _error_json(
        error="Invalid request",
        code="INVALID_REQUEST",
        details=str(e),
        status=400,
    )


@app.errorhandler(BadRequest)
def _handle_bad_json(e: BadRequest):
    # Malformed JSON / missing body on write methods
    return _error_json(
        error="Bad Request",
        code="BAD_JSON",
        details=str(e.description) if getattr(e, "description", None) else "Malformed or missing JSON body",
        status=400,
    )


@app.errorhandler(OperationFailure)
def _handle_mongo_operation_failure(e: OperationFailure):
    # Surface DB-level authorization errors as 403; otherwise 500
    msg = str(e)
    if "not authorized" in msg.lower():
        return _error_json(
            error="Forbidden (database)",
            code="DB_UNAUTHORIZED",
            details=msg,
            status=403,
        )
    return _error_json(
        error="Database error",
        code="DB_OPERATION_FAILURE",
        details=msg,
        status=500,
    )


@app.errorhandler(HTTPException)
def _handle_http_exception(e: HTTPException):
    # Make all Werkzeug HTTP errors consistent
    return _error_json(
        error=e.name or "HTTP Error",
        code=f"HTTP_{e.code}",
        details=e.description,
        status=e.code,
    )


@app.errorhandler(Exception)
def _handle_generic(e: Exception):
    # Last-resort handler; don't leak internals in production
    server_logger.exception("Unhandled error: %s", e)
    details = str(e) if app.debug else "An unexpected error occurred"
    return _error_json(
        error="Internal Server Error",
        code="INTERNAL_ERROR",
        details=details,
        status=500,
    )

# Blueprints
app.register_blueprint(users_bp, url_prefix="/api")
if audit_bp:
    app.register_blueprint(audit_bp, url_prefix="/api")


# Health / info endpoint
@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok", "request_id": g.request_id}), 200


# Task endpoints removed - functionality moved to api_bp routes

# Entrypoint
if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5050")),
    )
