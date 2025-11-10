from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from bson.errors import InvalidId
from cloudshield.Server.security.guards import require_auth
from cloudshield.Server.utils.database import users_admin, users_public 
users_read_bp = Blueprint("users_read", __name__)

def _int_param(name: str, default: int = 1) -> int:
    try:
        return int(request.args.get(name, default))
    except (ValueError, TypeError):
        return default

# TODO: RE-ENABLE AUTHENTICATION BEFORE PRODUCTION!
# The @require_auth decorator has been temporarily disabled for development/testing.
# IMPORTANT: Uncomment @require_auth on both endpoints before deploying to production.

@users_read_bp.route("/users", methods=["GET"])
# @require_auth  # TEMPORARY: Disabled for development - RE-ENABLE BEFORE PRODUCTION!
def list_users():
    limit  = max(1, min(_int_param("limit", 20), 100))
    offset = max(0, _int_param("offset", 0))
    q = (request.args.get("search") or "").strip()

    # TEMPORARY: While auth is disabled, show all users as if admin
    # When re-enabling auth, uncomment the if/else block below and remove these 3 lines
    coll = users_admin
    projection = {"password": 0}
    base_filter = {}
    
    # TODO: Uncomment this when re-enabling authentication:
    # # Admins see all users; employees see only their org's users
    # if g.user["role"] == "admin":
    #     coll = users_admin   # full collection
    #     projection = {"password": 0}  # never expose password
    #     base_filter = {}
    # else:
    #     coll = users_public  # read-only view with public fields
    #     projection = None
    #     base_filter = {"org_id": g.user["org_id"]}

    flt = dict(base_filter)
    if q:
        # search by email or full_name (case-insensitive, partial)
        flt["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}}
        ]

    total = coll.count_documents(flt)
    docs = list(coll.find(flt, projection).skip(offset).limit(limit))
    # Convert ObjectId to str
    for d in docs:
        d["_id"] = str(d["_id"])
    return jsonify({"total": total, "limit": limit, "offset": offset, "items": docs}), 200

@users_read_bp.route("/users/<user_id>", methods=["GET"])
# @require_auth  # TEMPORARY: Disabled for development - RE-ENABLE BEFORE PRODUCTION!
def get_user(user_id: str):
    try:
        oid = ObjectId(user_id)
    except (ValueError, TypeError, InvalidId):
        return jsonify({"error": "Not found"}), 404

    # TEMPORARY: While auth is disabled, show all users as if admin
    # When re-enabling auth, uncomment the if/else block below and remove these 3 lines
    coll = users_admin
    projection = {"password": 0}
    flt = {"_id": oid}
    
    # TODO: Uncomment this when re-enabling authentication:
    # if g.user["role"] == "admin":
    #     coll = users_admin
    #     projection = {"password": 0}
    #     flt = {"_id": oid}
    # else:
    #     coll = users_public
    #     projection = None
    #     flt = {"_id": oid, "org_id": g.user["org_id"]}

    doc = coll.find_one(flt, projection)
    if not doc:
        return jsonify({"error": "Not found"}), 404

    doc["_id"] = str(doc["_id"])
    return jsonify(doc), 200
