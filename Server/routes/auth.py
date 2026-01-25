import logging

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from celery import Celery
from pydantic import ValidationError

# Import models/services used by this route
from models import UserCreate
from services.user_service import create_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object('app.config.Config')

db = SQLAlchemy(app)
celery = Celery(app)
celery.conf.broker_url = app.config['CELERY_BROKER_URL']

@app.route('/signup', methods=['POST'])
def signup():
    logger.debug("Signup route hit")

    body = request.get_json(silent=True) or {}

    # Avoid logging sensitive request body (e.g., passwords). Log only non-sensitive info.
    logger.debug("Signup request keys: %s", list(body.keys()))
    logger.info("Signup attempt for email: %s", body.get("email"))

    # Validate request using pydantic model
    try:
        user_model = UserCreate(**body)
    except ValidationError as exc:
        logger.info("Signup validation failed: %s", exc)
        return jsonify({'error': 'Invalid request', 'details': str(exc)}), 400

    # Create user via service layer (handles public vs admin flows, user limits, etc.)
    try:
        user_id = create_user(user_model, current_user=None, reason="public_signup")
    except PermissionError as exc:
        logger.info("Signup permission error: %s", exc)
        return jsonify({'error': str(exc)}), 403
    except ValueError as exc:
        logger.info("Signup failed: %s", exc)
        return jsonify({'error': str(exc)}), 400
    except Exception:
        logger.exception("Unexpected error during signup")
        return jsonify({'error': 'Internal server error'}), 500

    # Log created user id and org id (avoid exposing secrets)
    logger.info("[SIGNUP] User created user_id=%s org_id=%s", user_id, getattr(user_model, "org_id", None))

    return jsonify({'message': 'User created successfully', 'user_id': user_id}), 201