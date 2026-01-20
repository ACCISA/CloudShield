"""Authentication endpoints for login and token verification."""
from flask import Blueprint, request, jsonify
from cloudshield.Server.security.passwords import verify_password, hash_password, is_bcrypt_string
from cloudshield.Server.security.jwt_utils import issue_token, verify_token
try:
    # Normal runtime: this module has both db_admin and users_admin
    from cloudshield.Server.utils.database import db_admin, users_admin
except ImportError:
    # Test suite: monkeypatched module only provides users_admin
    from cloudshield.Server.utils.database import users_admin
    db_admin = None
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """
    Authenticate a user and issue a JWT access token.

    ---
    Endpoint: 'POST /api/auth/login'

    Request Body:
        - 'email' (str): The user's email address.
        - 'password' (str): The user's plaintext password.

    Process:
        1. Normalizes and validates the provided email.
        2. Retrieves the corresponding active user from the 'users_admin' collection.
        3. Verifies the password using 'verify_password'.
        4. If a legacy plaintext hash is detected, automatically upgrades it to bcrypt.
        5. Issues a signed JWT token using 'issue_token()'.

    Response (200):
    '''json
    {
        "access_token": "<JWT>",
        "token_type": "Bearer",
        "expires_in": 3600
    }
    '''

    Errors:
        - 401: Invalid credentials or inactive user.
        - 500: Internal server error (unexpected failure).
    """
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "Request body required"}), 400

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Invalid credentials"}), 401


    user = users_admin.find_one(
        {"email": email, "status": "active"},
        {"email": 1, "password": 1, "role": 1, "org_id": 1}
    )
    if not user or not verify_password(password, user.get("password", "")):
        return jsonify({"error": "Invalid credentials"}), 401

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


@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    body = request.get_json(silent=True) or {}

    # Inputs (with fallbacks to support UI naming)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    full_name = (body.get("full_name") or "").strip()
    company_name = (body.get("company_name") or body.get("company") or "").strip()
    org_id = (body.get("org_id") or "").strip()
    package_type = (body.get("package_type") or body.get("plan") or "free").strip().lower()

    # Required fields check
    missing = [k for k, v in {
        "email": email,
        "password": password,
        "company_name": company_name,
        "org_id": org_id,
    }.items() if not v]
    if missing:
        return jsonify({"error": "Missing fields", "details": missing}), 400

    orgs = db_admin["orgs"]
    audit = db_admin["audit"]

    # Uniqueness: org_id OR company_name must not exist already
    if orgs.find_one({"$or": [{"org_id": org_id}, {"company_name": company_name}]}):
        return jsonify({"error": "Organization already exists"}), 409

    now = datetime.now(timezone.utc)

    # 1) Create organization
    org_doc = {
        "org_id": org_id,
        "company_name": company_name,
        "package_type": package_type,
        "created_at": now,
        "status": "active",
    }
    orgs.insert_one(org_doc)

    # 2) Create admin user for that org
    user_doc = {
        "email": email,
        "password": hash_password(password),
        "full_name": full_name,
        "role": "admin",
        "status": "active",
        "org_id": org_id,
        "created_at": now,
    }
    try:
        ins = users_admin.insert_one(user_doc)
        uid = str(ins.inserted_id)
    except DuplicateKeyError:
        # rollback org if email already exists
        orgs.delete_one({"org_id": org_id})
        return jsonify({"error": "Email already exists"}), 409

    # 3) Best-effort audit trail (non-blocking)
    try:
        audit.insert_one({
            "ts": now,
            "action": "org_created",
            "org_id": org_id,
            "company_name": company_name,
            "by": email,
            "ip": request.remote_addr,
        })
    except Exception:
        pass

    # 4) Issue JWT for the new admin
    token = issue_token(sub=uid, role="admin", org_id=org_id)

    return jsonify({
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 60 * 60,
        "org": {
            "org_id": org_id,
            "company_name": company_name,
            "package_type": package_type,
        },
    }), 201



@auth_bp.route("/auth/me", methods=["GET"])
def me():
    
    """
    Get current user information from JWT token.

    ---
    Endpoint: 'GET /api/auth/me'

    Headers:
        - 'Authorization: Bearer <JWT>'

    Process:
        1. Extracts the Bearer token from the Authorization header.
        2. Decodes and verifies it using 'verify_token()'.
        3. Returns the decoded JWT claims, which include:
            - 'sub': User ID
            - 'role': User role
            - 'org_id': Organization ID
            - 'iss': Issuer
            - 'aud': Audience
            - 'iat', 'exp': Token issuance and expiry timestamps.

    Errors:
        - 401: Missing, expired, or invalid token.
        - 401: Token fails signature/issuer/audience validation.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error":"Unauthorized","details":"Missing Bearer token"}), 401
    token = auth.split(" ",1)[1].strip()
    try:
        claims = verify_token(token)
        return jsonify({"claims": claims}), 200
    except Exception as e:
        return jsonify({"error":"Unauthorized","details":str(e)}), 401