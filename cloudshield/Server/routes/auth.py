import logging

from flask import Blueprint, request, jsonify
from flask_cors import CORS  # <--- 1. Add this import
from pydantic import ValidationError
from bson import ObjectId # <-- Added to convert string ID for DB queries
from security.jwt_utils import issue_token

# Import models/services used by this route
from models import UserCreate
from services.user_service import create_user

from services import service_dispatcher
from utils import organizations

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
    except Exception as e:
        logger.exception(f"Failed to enqueue provisioning for {org_id}: {e}")
        # Mark as failed if the queue is down, but keep the 201 success for the user creation
        organizations.update_one(
            {"_id": ObjectId(org_id)}, # Find by native Mongo ID
            {"$set": {"provisioning_status": "failed"}},
        )
        # We can set job to None so the response doesn't break
        class MockJob: id = None
        job = MockJob()

    return jsonify({
        'message': 'User created successfully and provisioning started', 
        'user_id': user_id,
        'job_id': job.id,
        'org_id': org_id, # Return the actual Mongo ID to the UI
        "access_token": token,
    }), 201