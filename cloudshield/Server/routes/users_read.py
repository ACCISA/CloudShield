from flask import Blueprint, request, jsonify, g
from cloudshield.Server.security.guards import require_auth
from cloudshield.Server.utils.database import users_admin, users_public 
users_read_bp = Blueprint("users_read", __name__)

def _int(name, default):
    try:
        return int(request.args.get(name, default))
    except:
        return default

@users_read_bp.route("/users", methods=["GET"])
@require_auth
def list_users():
    limit  = max(1, min(_int("limit", 20), 100))
    offset = max(0, _int("offset", 0))
    q = (request.args.get("search") or "").strip()

    # Admins see all users; employees see only their org's users
    if g.user["role"] == "admin":
        coll = users_admin   # full collection
        projection = {"password": 0}  # never expose password
        base_filter = {}
    else:
        coll = users_public  # read-only view with public fields
        projection = None
        base_filter = {"org_id": g.user["org_id"]}

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
@require_auth
def get_user(user_id):
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except:
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
