from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError
from ..security.guards import require_auth, require_role
from ..models.user import UserCreate, UserUpdate
from ..services.user_service import create_user, update_user, deactivate_user, delete_user

users_bp = Blueprint('users', __name__)

# Constants
INTERNAL_SERVER_ERROR = "Internal server error"

def _json_or_empty():
    # Safely get JSON body or return empty dict
    return request.get_json(silent=True) or {}

def _extract_reason():
    # Try to get 'reason' from JSON body first, then from query params
    body = _json_or_empty()
    reason = body.get("reason")
    if not reason:
        reason = request.args.get("reason")
    return (reason or "").strip() or None

# Create user endpoint
@users_bp.route("/users", methods=["POST"])
@require_auth
@require_role("admin")
def create_user_endpoint():
    try:
        body = _json_or_empty()
        reason = _extract_reason()
        user_data = UserCreate(**body)
        user_id = create_user(user_data, current_user=g.user, reason=reason)
        return jsonify({"user_id": user_id}), 201
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        # e.g., duplicate email
        return jsonify({"error": str(e)}), 409
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500

# Update user endpoint
@users_bp.route("/users/<user_id>", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_user_endpoint(user_id):
    try:
        body = _json_or_empty()
        reason = _extract_reason()
        update_data = UserUpdate(**body)
        update_user(user_id, update_data, current_user=g.user, reason=reason)
        return jsonify({"message": "User updated"}), 200
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500

# Deactivate user endpoint
@users_bp.route("/users/<user_id>/deactivate", methods=["POST"])
@require_auth
@require_role("admin")
def deactivate_user_endpoint(user_id):
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

# Delete user endpoint
@users_bp.route("/users/<user_id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_user_endpoint(user_id):
    try:
        # DELETE may not have a JSON body, so also support ?reason=
        reason = _extract_reason()
        delete_user(user_id, current_user=g.user, reason=reason)
        return jsonify({"message": "User deleted"}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": INTERNAL_SERVER_ERROR}), 500
