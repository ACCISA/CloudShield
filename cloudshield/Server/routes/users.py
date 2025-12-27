"""User management API endpoints."""
import json
from collections.abc import Mapping

from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError
from security import require_auth, require_role
from models import UserCreate, UserUpdate
from services import create_user, update_user, deactivate_user, delete_user, list_users

users_bp = Blueprint('users', __name__)
"""
Users routes (admin-only mutations).

This module exposes CRUD-like admin actions on users:
- GET    /users                      --> List users (admin only)
- POST   /users                      --> Create user (admin only)
- PATCH  /users/<user_id>            --> Update user (admin only)
- POST   /users/<user_id>/deactivate --> Deactivate user (admin only)
- DELETE /users/<user_id>            --> Delete user (admin only)

Security:
- All routes require a valid JWT ('require_auth') and the "admin" role ('require_role("admin")').
"""

INTERNAL_SERVER_ERROR = "Internal server error"


def _make_json_safe(value):
    """Recursively coerce validation payloads to JSON-serializable primitives."""
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    if isinstance(value, Mapping):
        return {str(k): _make_json_safe(v) for k, v in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_make_json_safe(v) for v in value]

    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def _json_or_empty() -> dict:
    """
    Return request JSON body or empty dict if missing/invalid.

    Returns:
        dict: Parsed JSON object if the request contains valid JSON, otherwise an empty dictionary.

    Notes:
        - Uses Flask's 'request.get_json(silent=True)' to avoid raising an exception on invalid or missing JSON bodies.
        - Helpful for methods like DELETE where a body may be absent.
    """
    return request.get_json(silent=True) or {}


def _extract_reason() -> str | None:
    """
    Extract 'reason' from JSON body or query params.

    Order of precedence:
        1) JSON body field 'reason'
        2) Query string parameter '?reason='

    Returns:
        str | None: A trimmed reason string if provided and non-empty, otherwise None.

    Usage:
        Pass this value through to service-layer functions --> record audit context for the change.
    """
    body = _json_or_empty()
    reason = body.get("reason") or request.args.get("reason")
    return (reason or "").strip() or None


@users_bp.route("/users", methods=["GET"])
@require_auth
@require_role("admin")
def list_users_endpoint():
    """
    List all users (admin only).

    Endpoint:
        GET /api/users

    Responses:
        200: { "items": [ ... ] }
        403: { "error": "..." }
        500: { "error": "Internal server error" }
    """
    try:
        users = list_users(current_user=g.user)
        return jsonify({"items": users}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500


@users_bp.route("/users", methods=["POST"])
@require_auth
@require_role("admin")
def create_user_endpoint():
    """
    Create new user account (admin only).

    Endpoint:
        POST /api/users

    Request JSON (validated by 'UserCreate'):
        - email (str, required): Unique email address (normalized to lowercase).
        - password (str, required): Strong password (creation policy enforced).
        - role (str, required): "admin" | "employee".
        - full_name (str, required): Name (≥2 chars).
        - org_id (str, required): Organization identifier.
        - reason (str, optional): Audit trail note (can also be provided as '?reason=').

    Responses:
        201: { "user_id": "<new user id>" }
        400: { "error": "Validation failed", "details": [...] }  # Pydantic validation issues
        403: { "error": "..." }                                  # Authorization/role guard
        409: { "error": "..." }                                  # Conflict (e.g., duplicate email)
        500: { "error": "Internal server error" }

    Security:
        - Requires a valid admin JWT.
        - Service layer should ensure no sensitive fields (e.g., hashed password)
          leak back to clients beyond the 'user_id'.
    """
    try:
        body = _json_or_empty()
        reason = _extract_reason()
        user_data = UserCreate(**body)
        user_id = create_user(user_data, current_user=g.user, reason=reason)
        return jsonify({"user_id": user_id}), 201
    except ValidationError as e:
        safe_errors = [_make_json_safe(err) for err in e.errors()]
        return jsonify({"error": "Validation failed", "details": safe_errors}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        # e.g., duplicate email
        return jsonify({"error": str(e)}), 409
    except Exception as e:
        return jsonify({"error": INTERNAL_SERVER_ERROR, "details":str(e)}), 500


@users_bp.route("/users/<user_id>", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_user_endpoint(user_id):
    """
    Update user fields (admin only).

    Endpoint:
        PATCH /api/users/<user_id>

    Request JSON (validated by 'UserUpdate'):
        - email (str, optional): New email (normalized to lowercase).
        - password (str, optional): New password (update policy enforced).
        - role (str, optional): "admin" | "employee".
        - status (str, optional): "active" | "inactive".
        - full_name (str, optional): Updated human-readable name.
        - reason (str, optional): Audit trail note (can also be provided as '?reason=').

    Responses:
        200: { "message": "User updated" }
        400: { "error": "Validation failed", "details": [...] }
        403: { "error": "..." }                    # Authorization/role guard
        404: { "error": "..." }                    # User not found
        500: { "error": "Internal server error" }

    Security:
        - Requires a valid admin JWT.
        - Service layer should apply field-specific rules (e.g., password hashing).
    """
    try:
        body = _json_or_empty()
        reason = _extract_reason()
        update_data = UserUpdate(**body)
        update_user(user_id, update_data, current_user=g.user, reason=reason)
        return jsonify({"message": "User updated"}), 200
    except ValidationError as e:
        safe_errors = [_make_json_safe(err) for err in e.errors()]
        return jsonify({"error": "Validation failed", "details": safe_errors}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500


@users_bp.route("/users/<user_id>/deactivate", methods=["POST"])
@require_auth
@require_role("admin")
def deactivate_user_endpoint(user_id):
    """
    Deactivate user account (admin only).

    Endpoint:
        POST /api/users/<user_id>/deactivate

    Request:
        - JSON body is optional.
        - Provide an audit 'reason' in the JSON body or as '?reason='.

    Responses:
        200: { "message": "User deactivated" }
        403: { "error": "..." }    # Authorization/role guard
        404: { "error": "..." }    # User not found
        500: { "error": "Internal server error" }

    Notes:
        - Deactivated users should be prevented from authenticating (policy enforced in auth layer).
        - This action should be idempotent where possible (repeated deactivations are safe).
    """
    try:
        reason = _extract_reason()
        deactivate_user(user_id, current_user=g.user, reason=reason)
        return jsonify({"message": "User deactivated"}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500


@users_bp.route("/users/<user_id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_user_endpoint(user_id):
    """
    Permanently delete user account (admin only).

    Endpoint:
        DELETE /api/users/<user_id>

    Request:
        - JSON body is optional.
        - Provide an audit 'reason' in the JSON body or as '?reason='.

    Responses:
        200: { "message": "User deleted" }
        403: { "error": "..." }    # Authorization/role guard
        404: { "error": "..." }    # User not found
        500: { "error": "Internal server error" }
    """
    try:
        reason = _extract_reason()
        delete_user(user_id, current_user=g.user, reason=reason)
        return jsonify({"message": "User deleted"}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500
