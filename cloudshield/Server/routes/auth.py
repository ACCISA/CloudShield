from flask import Blueprint, request, jsonify, g
from cloudshield.Server.security.passwords import verify_password, hash_password, is_bcrypt_string
from cloudshield.Server.security.jwt_utils import issue_token, verify_token
from cloudshield.Server.utils.database import users_admin


auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    # Basic validation
    user = users_admin.find_one(
        {"email": email, "status": "active"},
        {"email": 1, "password": 1, "role": 1, "org_id": 1}
    )
    if not user or not verify_password(password, user.get("password", "")):
        return jsonify({"error": "Invalid credentials"}), 401

    # If user had legacy plaintext, upgrade it to bcrypt now
    if not is_bcrypt_string(user["password"]):
        users_admin.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hash_password(password)}}
        )

    token = issue_token(sub=str(user["_id"]), role=user["role"], org_id=user["org_id"])
    return jsonify({
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 60 * 60
    }), 200

# Get current user info from token
@auth_bp.route("/auth/me", methods=["GET"])
def me():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error":"Unauthorized","details":"Missing Bearer token"}), 401
    token = auth.split(" ",1)[1].strip()
    try:
        claims = verify_token(token)
        return jsonify({"claims": claims}), 200
    except Exception as e:
        return jsonify({"error":"Unauthorized","details":str(e)}), 401