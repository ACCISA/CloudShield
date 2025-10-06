from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from models.user import UserCreate, UserUpdate
from services.user_service import create_user, update_user, deactivate_user, delete_user

users_bp = Blueprint('users', __name__)

@users_bp.route("/users", methods=["POST"])
def create_user_endpoint():
    try:
        user_data = UserCreate(**request.get_json())
        user_id = create_user(user_data)
        return jsonify({"user_id": user_id}), 201
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@users_bp.route("/users/<user_id>", methods=["PATCH"])
def update_user_endpoint(user_id):
    try:
        update_data = UserUpdate(**request.get_json())
        update_user(user_id, update_data)
        return jsonify({"message": "User updated"}), 200
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@users_bp.route("/users/<user_id>/deactivate", methods=["POST"])
def deactivate_user_endpoint(user_id):
    try:
        deactivate_user(user_id)
        return jsonify({"message": "User deactivated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@users_bp.route("/users/<user_id>", methods=["DELETE"])
def delete_user_endpoint(user_id):
    try:
        delete_user(user_id)
        return jsonify({"message": "User deleted"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500