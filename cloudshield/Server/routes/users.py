from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError
from security.guards import require_auth, require_role
from models.user import UserCreate, UserUpdate
from services.user_service import create_user, update_user, deactivate_user, delete_user

users_bp = Blueprint('users', __name__)
# Note: All routes here require admin role
# Create user endpoint
@users_bp.route("/users", methods=["POST"])
@require_auth
@require_role("admin")
def create_user_endpoint():
    try:
        user_data = UserCreate(**request.get_json())
        user_id = create_user(user_data, current_user=g.user)  # pass current user
        return jsonify({"user_id": user_id}), 201
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except PermissionError as e:  # NEW
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    except Exception:
        return jsonify({"error": "Internal server error"}), 500
# Update user endpoint
@users_bp.route("/users/<user_id>", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_user_endpoint(user_id):
    try:
        update_data = UserUpdate(**request.get_json())
        update_user(user_id, update_data, current_user=g.user)  # pass current user
        return jsonify({"message": "User updated"}), 200
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": "Internal server error"}), 500
# Deactivate user endpoint
@users_bp.route("/users/<user_id>/deactivate", methods=["POST"])
@require_auth
@require_role("admin")
def deactivate_user_endpoint(user_id):
    try:
        deactivate_user(user_id, current_user=g.user)  # pass current user
        return jsonify({"message": "User deactivated"}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": "Internal server error"}), 500
# Delete user endpoint
@users_bp.route("/users/<user_id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_user_endpoint(user_id):
    try:
        delete_user(user_id, current_user=g.user)  # pass current user
        return jsonify({"message": "User deleted"}), 200
    except PermissionError as e: 
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        return jsonify({"error": "Internal server error"}), 500
