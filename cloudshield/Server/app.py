import sys
import os
# Add the root directory to Python path so we can import debug_db
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from debug_db import debug_db_bp

# Import OperationFailure conditionally to avoid test issues
try:
    from pymongo.errors import OperationFailure
    MONGO_AVAILABLE = True
except ImportError:
    OperationFailure = None
    MONGO_AVAILABLE = False

# App setup
app = Flask(__name__)  # NOSONAR - CSRF protection handled by JWT authentication in API endpoints

try:
    from flask_cors import CORS
    CORS(app)  # NOSONAR
except Exception:
    pass

# Simple health check
@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok"}), 200

# Error handlers
@app.errorhandler(HTTPException)
def handle_http_exception(e: HTTPException):
    return jsonify({"error": e.name, "status": e.code, "description": e.description}), e.code

@app.errorhandler(Exception)
def handle_unexpected(e: Exception):
    # Log the error here as needed
    return jsonify({"error": "Internal server error"}), 500

# Register MongoDB error handler only if pymongo is available
if MONGO_AVAILABLE and OperationFailure is not None:
    @app.errorhandler(OperationFailure)
    def handle_mongo_opfail(e: OperationFailure):
        msg = str(e)
        status = 403 if "not authorized" in msg.lower() else 500
        return jsonify({
            "error": "Forbidden (database)" if status == 403 else "Database error",
            "code": "DB_UNAUTHORIZED" if status == 403 else "DB_OPERATION_FAILURE",
            "details": msg
        }), status

# Import and register blueprints
from cloudshield.Server.routes.users import users_bp
from cloudshield.Server.routes.users_read import users_read_bp
from cloudshield.Server.routes.auth import auth_bp
from cloudshield.Server.routes.api import api_bp
from cloudshield.Server.utils.audit import audit_bp

# Routes overview:
#   POST   /api/auth/login
#   POST   /api/users
#   PATCH  /api/users/<user_id>
#   POST   /api/users/<user_id>/deactivate
#   DELETE /api/users/<user_id>
#   POST   /task/provision
#   POST   /task/destroy
#   GET    /status/<job_id>
#   GET    /health
app.register_blueprint(auth_bp,  url_prefix="/api")
app.register_blueprint(users_bp, url_prefix="/api")
app.register_blueprint(users_read_bp, url_prefix="/api")
app.register_blueprint(debug_db_bp, url_prefix="/api")
app.register_blueprint(audit_bp, url_prefix="/api")
app.register_blueprint(api_bp, url_prefix="/")

if __name__ == "__main__":
    # Run the app
    app.run(host="0.0.0.0", port=5050)
