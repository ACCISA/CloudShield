"""Read-only user endpoints with RBAC and view-based data filtering."""
from importlib import import_module

from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from bson.errors import InvalidId
from cloudshield.Server.utils.database import users_admin, users_public 

users_read_bp = Blueprint("users_read", __name__)

"""
Users Read Routes

This module exposes authenticated read-only endpoints for retrieving user data.
Admins can view all users, while employees are limited to viewing users within their own organization.

Endpoints:
    GET /api/users           --> List users with pagination and search
    GET /api/users/<user_id> --> Retrieve one specific user by ID

Access control:
    - All endpoints require a valid JWT ('require_auth').
    - Role-based visibility:
        > Admins    --> All users, all orgs (excluding password fields).
        > Employees --> Only users within their 'org_id', via the public projection view ('users_public').
"""

def _int_param(name: str, default: int = 1) -> int:
    """
    Parse integer query parameter with fallback.

    Args:
        name (str): The query parameter name to retrieve.
        default (int, optional): Default value if parsing fails. Defaults to 1.

    Returns:
        int: The integer value of the query parameter, or the default if missing or invalid.

    Notes:
        - Gracefully handles missing, non-numeric, or malformed values.
        - Prevents exceptions that could break pagination or limit logic.
    """
    try:
        return int(request.args.get(name, default))
    except (ValueError, TypeError):
        return default


def _ensure_authenticated_response():
    """Ensure the current request is authenticated, leveraging guards if available."""
    sentinel = object()
    try:
        guards_module = import_module("cloudshield.Server.security.guards")
        require_auth = getattr(guards_module, "require_auth", None)
    except Exception:
        require_auth = None

    if require_auth:
        def _stub(*_args, **_kwargs):
            return sentinel

        result = require_auth(_stub)()
        if result is sentinel:
            return None
        return result

    if getattr(g, "user", None):
        return None
    return jsonify({"error": "Unauthorized"}), 401


@users_read_bp.route("/users", methods=["GET"])
def list_users():
    """
    List users with pagination and search. Admins see all, employees see own org only.

    ---
    Endpoint: 'GET /api/users'

    Query Parameters:
        - 'limit' (int, optional): Maximum number of users to return. Default 20, max 100.
        - 'offset' (int, optional): Number of users to skip for pagination. Default 0.
        - 'search' (str, optional): Case-insensitive partial match on 'email' or 'full_name'.

    Access Control:
        - Admins    --> See all users across all organizations (via 'users_admin').
        - Employees --> See only users in their own organization (via 'users_public').

    Response (200):
    '''json
    {
        "total": 123,
        "limit": 20,
        "offset": 0,
        "items": [
            {
                "_id": "68e397a3fe20d872b03156cc",
                "email": "user@example.com",
                "full_name": "Example User",
                "role": "employee",
                "org_id": "org_001"
            }
        ]
    }
    '''

    Errors:
        - 401: Missing or invalid JWT (handled by 'require_auth').

    Security / Behaviour:
        - Never returns password hashes ('projection = {"password": 0}').
        - For employees, data is pulled from 'users_public'

    Returns:
        flask.Response: JSON object with pagination metadata and user list.
    """
    auth_response = _ensure_authenticated_response()
    if auth_response is not None:
        return auth_response

    limit  = max(1, min(_int_param("limit", 20), 100))
    offset = max(0, _int_param("offset", 0))
    q = (request.args.get("search") or "").strip()

    if g.user["role"] == "admin":
        coll = users_admin
        projection = {"password": 0}
        base_filter = {}
    else:
        coll = users_public
        projection = None
        base_filter = {"org_id": g.user["org_id"]}

    flt = dict(base_filter)
    if q:
        flt["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}}
        ]

    total = coll.count_documents(flt)
    docs = list(coll.find(flt, projection).skip(offset).limit(limit))
    for d in docs:
        d["_id"] = str(d["_id"])
    return jsonify({"total": total, "limit": limit, "offset": offset, "items": docs}), 200


@users_read_bp.route("/users/<user_id>", methods=["GET"])
def get_user(user_id: str):
    """
    Retrieve single user by ID. Employees can only access users in their org.

    ---
    Endpoint: 'GET /api/users/<user_id>'

    Path Parameter:
        - 'user_id' (str): MongoDB ObjectId of the user to retrieve.

    Access Control:
        - Admins    --> May view any user across all organizations.
        - Employees --> Restricted to users within their own 'org_id'.
        - Both roles exclude password field.

    Errors:
        - 404: If the user ID is invalid or the user is not found in the permitted scope.
        - 401: If JWT is missing or invalid (handled by 'require_auth').

    Security Notes:
        - Converts '_id' to a string for JSON responses.
        - Prevents employees from querying users outside their organization by enforcing
          'flt = {"_id": id, "org_id": g.user["org_id"]}'.
    """
    auth_response = _ensure_authenticated_response()
    if auth_response is not None:
        return auth_response

    try:
        oid = ObjectId(user_id)
    except (ValueError, TypeError, InvalidId):
        return jsonify({"error": "Not found"}), 404

    if g.user["role"] == "admin":
        coll = users_admin
        projection = {"password": 0}
        flt = {"_id": oid}
    else:
        coll = users_public
        projection = None
        flt = {"_id": oid, "org_id": g.user["org_id"]}

    doc = coll.find_one(flt, projection)
    if not doc:
        return jsonify({"error": "Not found"}), 404

    doc["_id"] = str(doc["_id"])
    return jsonify(doc), 200


@users_read_bp.route("/organizations/<org_id>/users", methods=["GET"])
def list_users_by_org(org_id):
    """
    List users for a specific organization.
    
    Endpoint: 'GET /api/organizations/<org_id>/users'
    
    Query Parameters:
        - 'limit' (int, optional): Maximum number of users to return. Default 100.
        - 'offset' (int, optional): Number of users to skip for pagination. Default 0.
    
    Access Control:
        - Admins can query any organization
        - Employees can only query their own organization
    
    Response (200):
    '''json
    {
        "total": 3,
        "items": [
            {
                "_id": "...",
                "email": "user@example.com",
                "username": "user1",
                "role": "employee",
                "org_id": "asad"
            }
        ]
    }
    '''
    
    Returns:
        flask.Response: JSON object with user list for the organization.
    """
    auth_response = _ensure_authenticated_response()
    if auth_response is not None:
        return auth_response
    
    # Check authorization: employees can only access their own org
    if g.user["role"] != "admin" and g.user["org_id"] != org_id:
        return jsonify({"error": "Forbidden"}), 403
    
    limit = max(1, min(_int_param("limit", 100), 100))
    offset = max(0, _int_param("offset", 0))
    
    # Use admin collection (has all orgs) with explicit org_id filter
    coll = users_admin
    projection = {"password": 0}
    flt = {"org_id": org_id}
    
    cursor = coll.find(flt, projection).skip(offset).limit(limit)
    items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    
    total = coll.count_documents(flt)
    
    return jsonify({"total": total, "items": items}), 200
