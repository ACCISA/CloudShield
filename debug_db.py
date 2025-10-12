# debug_db.py
from flask import Blueprint, jsonify, request
from bson import ObjectId
from pymongo.errors import OperationFailure

from cloudshield.Server.utils.database import db_admin, db_emp, users_admin, users_public
from cloudshield.Server.security.guards import require_auth, require_role

debug_db_bp = Blueprint("debug_db", __name__)

# 1) Quick status (optional)
@debug_db_bp.route("/debug/db", methods=["GET"])
@require_auth
@require_role("admin")
def debug_db():
    result = {"admin": {}, "employee": {}}
    try:
        db_admin.client.admin.command("ping")
        result["admin"]["ping"] = "ok"
        result["admin"]["users_count"] = users_admin.estimated_document_count()
    except Exception as e:
        result["admin"]["error"] = str(e)

    try:
        db_emp.client.admin.command("ping")
        result["employee"]["ping"] = "ok"
        sample = users_public.find_one({}, {"_id": 1, "email": 1, "role": 1})
        result["employee"]["sample_read"] = (
            {"_id": str(sample["_id"]), "email": sample.get("email"), "role": sample.get("role")}
            if sample else None
        )
    except Exception as e:
        result["employee"]["error"] = str(e)

    return jsonify(result), 200

# 2) PROBE: employee client tries to INSERT into 'users' (should 403)
@debug_db_bp.route("/debug/probe/employee-insert", methods=["POST"])
@require_auth
@require_role("admin")  # only admins can trigger the probe
def probe_employee_insert():
    doc = {"probe": "emp_insert", "ts": request.headers.get("X-Now")}
    # use the employee *database* handle to reach the raw 'users' collection
    coll = db_emp["users"]  # NOT users_public on purpose
    # This should raise OperationFailure("not authorized") and be turned into 403 by your error handler
    res = coll.insert_one(doc)
    # If we ever got here, DB permissions are wrong:
    return jsonify({"error": "employee insert unexpectedly succeeded", "inserted_id": str(res.inserted_id)}), 500

# 3) PROBE: admin client INSERTS into 'users' (should 201), then auto-cleanup
@debug_db_bp.route("/debug/probe/admin-insert", methods=["POST"])
@require_auth
@require_role("admin")
def probe_admin_insert():
    doc = {
        "email": "probe+" + ObjectId().__str__() + "@example.com",
        "org_id": "org_001",
        "role": "employee",
        "status": "active",
        "created_at": request.headers.get("X-Now"),
        "password": "<hash>",
        "full_name": "Probe User"
    }
    res = users_admin.insert_one(doc)
    inserted_id = str(res.inserted_id)
    # Clean up right away so the DB stays tidy
    users_admin.delete_one({"_id": res.inserted_id})
    return jsonify({"ok": True, "inserted_id": inserted_id}), 201
