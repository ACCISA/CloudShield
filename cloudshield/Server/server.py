from __future__ import annotations

import os
import logging
import uuid
from dotenv import load_dotenv

from flask import Flask, request, jsonify, g
from werkzeug.exceptions import BadRequest, HTTPException

from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError, OperationFailure

# RQ / Redis bits (unchanged)
from redis_client import task_queue, redis_conn
from tasks import create_ec2, create_vpc
from rq.job import Job

# App blueprints
from cloudshield.Server.routes.users import users_bp
# optional audit blueprint; may fail if DB/view not set up
try:
    from routes.audit import audit_bp # type: ignore[import]
except Exception:  # pragma: no cover
    audit_bp = None

load_dotenv()

# App setup
app = Flask(__name__)

# Logging setup
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("cloudshield.server")

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
    logger.exception("Unhandled error: %s", e)
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


# Task endpoints (kept as-is, with small JSON safety)
@app.route("/task/ec2", methods=["POST"])
def task_ec2():
    data = request.get_json(silent=True) or {}
    instance_type = data.get("instance_type", "t2.micro")
    job = task_queue.enqueue(create_ec2, instance_type)
    return jsonify({"job_id": job.id, "request_id": g.request_id}), 202


@app.route("/task/vpc", methods=["POST"])
def task_vpc():
    data = request.get_json(silent=True) or {}
    cidr = data.get("cidr", "10.0.0.0/16")
    job = task_queue.enqueue(create_vpc, cidr)
    return jsonify({"job_id": job.id, "request_id": g.request_id}), 202


@app.route("/status/<job_id>", methods=["GET"])
def job_status(job_id):
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        return _error_json("Job not found", "JOB_NOT_FOUND", status=404)

    response = {
        "job_id": job.id,
        "status": job.get_status(),
        "progress": job.meta.get("progress", "No updates yet"),
        "result": job.result if job.is_finished else None,
        "request_id": g.request_id,
    }
    return jsonify(response), 200


# Entrypoint
if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5050")),
    )
