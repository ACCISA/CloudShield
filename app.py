from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from debug_db import debug_db_bp
from pymongo.errors import OperationFailure

# App setup
app = Flask(__name__)

try:
    from flask_cors import CORS
    CORS(app)
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
from cloudshield.Server.utils.audit import audit_bp

# Routes overview:
#   POST   /api/auth/login
#   POST   /api/users
#   PATCH  /api/users/<user_id>
#   POST   /api/users/<user_id>/deactivate
#   DELETE /api/users/<user_id>
app.register_blueprint(auth_bp,  url_prefix="/api")
app.register_blueprint(users_bp, url_prefix="/api")
app.register_blueprint(users_read_bp, url_prefix="/api")
app.register_blueprint(debug_db_bp, url_prefix="/api")
app.register_blueprint(audit_bp, url_prefix="/api")

if __name__ == "__main__":
    # Run the app
    app.run(host="0.0.0.0", port=5050)
