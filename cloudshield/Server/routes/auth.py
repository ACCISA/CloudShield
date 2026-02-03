import logging

from flask import Blueprint, request, jsonify
from flask_cors import CORS  # <--- 1. Add this import
from pydantic import ValidationError
from bson import ObjectId # <-- Added to convert string ID for DB queries
from bson.errors import InvalidId
from security.jwt_utils import issue_token, verify_token

# Import models/services used by this route
from models import UserCreate
from services.user_service import create_user

from services import service_dispatcher
from utils import organizations
from utils.database import users_admin
from security.passwords import hash_password, is_bcrypt_string, verify_password

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)
CORS(auth_bp)

@auth_bp.route('/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS':
        return '', 200 # Standard response for preflight
    logger.debug("Signup route hit")

    body = request.get_json(silent=True) or {}

    # Avoid logging sensitive request body (e.g., passwords).
    logger.debug("Signup request keys: %s", list(body.keys()))
    logger.info("Signup attempt for email: %s", body.get("email"))

    # Validate request using pydantic model
    try:
        user_model = UserCreate(**body)
    except ValidationError as exc:
        logger.info("Signup validation failed: %s", exc)
        return jsonify({'error': 'Invalid request', 'details': str(exc)}), 400

    # Create user and org via service layer
    try:
        # user_service auto-generates the MongoDB ID and attaches it to user_model.org_id
        user_id = create_user(user_model, current_user=None, reason="public_signup")
        org_id = user_model.org_id 

        # Generate token for the new user
        token = issue_token(
            sub=user_id,
            role="admin",      # first user is org admin
            org_id=org_id
        )

    except PermissionError as exc:
        logger.info("Signup permission error: %s", exc)
        return jsonify({'error': str(exc)}), 403
    except ValueError as exc:
        logger.info("Signup failed: %s", exc)
        return jsonify({'error': str(exc)}), 400
    except Exception:
        logger.exception("Unexpected error during signup")
        return jsonify({'error': 'Internal server error'}), 500

    try:
        job = service_dispatcher(
            service_name="provision_network",
            org_id=org_id, # Passes the 24-character hex string (ObjectId)
            region="ca-central-1",
            workstation_count=1, # Default starting workstation
        )

        logger.info(f"[SIGNUP] Provisioning job enqueued job_id={job.id} org_id={org_id}")

        # Update org status to reflect that building has started
        organizations.update_one(
            {"_id": ObjectId(org_id)}, # Find by native Mongo ID
            {
                "$set": {
                    "provisioning_status": "in_progress",
                    "provisioning_job_id": job.id,
                }
            },
        )
    except InvalidId:
        # org_id is not a valid ObjectId (e.g., in tests) - skip DB update but continue
        logger.warning(f"Invalid ObjectId format for org_id: {org_id}, skipping org update")
        class MockJob:
            id = None
        job = MockJob()
    except Exception as e:
        logger.exception(f"Failed to enqueue provisioning for {org_id}: {e}")
        # Mark as failed if the queue is down, but keep the 201 success for the user creation
        try:
            organizations.update_one(
                {"_id": ObjectId(org_id)}, # Find by native Mongo ID
                {"$set": {"provisioning_status": "failed"}},
            )
        except InvalidId:
            pass  # Skip if org_id is not a valid ObjectId
        # We can set job to None so the response doesn't break
        class MockJob: 
            id = None
        job = MockJob()

    return jsonify({
        'message': 'User created successfully and provisioning started', 
        'user_id': user_id,
        'job_id': job.id,
        'org_id': org_id, # Return the actual Mongo ID to the UI
        "access_token": token,
    }), 201


@auth_bp.route("/login", methods=["POST"])
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


@auth_bp.route("/me", methods=["GET"])
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
