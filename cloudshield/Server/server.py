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
    # Track request start time for performance monitoring
    g.start_time = time()
    
    _request_id()
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.data and not request.is_json:
            raise BadRequest("Expected application/json body")


@app.after_request
def _add_performance_headers(response):
    """Add response time tracking and log slow requests.
    
    Performance optimization: Adds X-Response-Time header to all responses
    and automatically logs requests that take longer than 500ms for monitoring.
    """
    if hasattr(g, 'start_time'):
        elapsed_ms = (time() - g.start_time) * 1000
        
        # Add header for client-side monitoring and debugging
        response.headers['X-Response-Time'] = f"{elapsed_ms:.2f}ms"
        
        # Log slow requests for investigation
        if elapsed_ms > 500:
            logger.warning(
                "Slow request: %s %s - %.2fms (request_id=%s)",
                request.method,
                request.path,
                elapsed_ms,
                getattr(g, 'request_id', 'unknown')
            )
    
    return response


@app.errorhandler(ValidationError)
def _handle_pydantic(e: ValidationError):
    """Handle Pydantic validation errors with field-level details."""
    return _error_json(
        error="Validation failed",
        code="VALIDATION_ERROR",
        details=e.errors(),
        status=400,
    )


@app.errorhandler(DuplicateKeyError)
def _handle_duplicate(e: DuplicateKeyError):
    """Handle MongoDB duplicate key violations (typically email uniqueness)."""
    return _error_json(
        error="Email already exists",
        code="DUPLICATE_EMAIL",
        details={"field": "email"},
        status=409,
    )


@app.errorhandler(ValueError)
def _handle_value_error(e: ValueError):
    """Handle service-layer rejections from business logic validation."""
    return _error_json(
        error="Invalid request",
        code="INVALID_REQUEST",
        details=str(e),
        status=400,
    )


@app.errorhandler(BadRequest)
def _handle_bad_json(e: BadRequest):
    """Handle malformed or missing JSON in request body."""
    return _error_json(
        error="Bad Request",
        code="BAD_JSON",
        details=str(e.description) if getattr(e, "description", None) else "Malformed or missing JSON body",
        status=400,
    )


@app.errorhandler(OperationFailure)
def _handle_mongo_operation_failure(e: OperationFailure):
    """Handle MongoDB operation failures, mapping auth errors to 403."""
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
    """Normalize all Werkzeug HTTP exceptions to consistent JSON format."""
    return _error_json(
        error=e.name or "HTTP Error",
        code=f"HTTP_{e.code}",
        details=e.description,
        status=e.code,
    )


@app.errorhandler(Exception)
def _handle_generic(e: Exception):
    """Catch-all handler for unexpected errors with debug mode control."""
    server_logger.exception("Unhandled error: %s", e)
    details = str(e) if app.debug else "An unexpected error occurred"
    return _error_json(
        error="Internal Server Error",
        code="INTERNAL_ERROR",
        details=details,
        status=500,
    )


app.register_blueprint(users_bp, url_prefix="/api")
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
