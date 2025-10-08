from flask import Blueprint, request, jsonify
from bson import ObjectId
from security.passwords import verify_password
from security.jwt_utils import issue_token
from utils.database import users_collection

auth_bp = Blueprint("auth", __name__)
# Login endpoint
@auth_bp.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json(force=True)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    user = users_collection.find_one({"email": email, "status": "active"})
    if not user or not verify_password(password, user["password"]):
        # Invalid credentials
        return jsonify({"error": "Invalid credentials"}), 401

    token = issue_token(sub=str(user["_id"]), role=user["role"], org_id=user["org_id"])
    return jsonify({
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 60 * 60
    }), 200