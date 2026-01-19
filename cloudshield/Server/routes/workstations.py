"""Workstation read/write endpoints."""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, g, request
from cloudshield.Server.security.guards import require_auth, require_role
from cloudshield.Server.utils.database import db_admin

workstations_bp = Blueprint("workstations", __name__)


@workstations_bp.route("/workstations/assigned", methods=["GET"])
@require_auth
def list_assigned_workstations():
    """
    List workstations assigned to the current user.

    Endpoint: GET /api/workstations/assigned
    """
    workstations = db_admin["workstations"]

    base_filter = {"org_id": g.user.get("org_id")}
    if g.user.get("role") != "admin":
        user_id = g.user.get("id")
        user_email = g.user.get("email")
        base_filter["$or"] = [
            {"assigned_user_id": user_id},
            {"assigned_user": user_id},
        ]
        if user_email:
            base_filter["$or"].append({"assigned_user": user_email})

    docs = list(workstations.find(base_filter))
    for doc in docs:
        doc["_id"] = str(doc["_id"])

    return jsonify({"items": docs}), 200


@workstations_bp.route("/workstations", methods=["POST"])
@require_auth
@require_role("admin")
def create_workstation():
    """
    Create a workstation record (admin only).

    Endpoint: POST /api/workstations
    """
    body = request.get_json(silent=True) or {}
    org_id = (body.get("org_id") or g.user.get("org_id") or "").strip()
    if not org_id:
        return jsonify({"error": "org_id is required"}), 400

    name = (body.get("name") or "Workstation").strip() or "Workstation"
    status = (body.get("status") or "offline").strip().lower()
    ip = (body.get("ip") or "").strip() or None
    assigned_user = (body.get("assigned_user") or "").strip() or None
    assigned_user_id = (body.get("assigned_user_id") or "").strip() or None
    last_seen = body.get("last_seen")

    workstations = db_admin["workstations"]
    doc = {
        "org_id": org_id,
        "name": name,
        "status": status,
        "ip": ip,
        "assigned_user": assigned_user,
        "assigned_user_id": assigned_user_id,
        "last_seen": last_seen,
        "created_at": datetime.now(timezone.utc),
    }

    result = workstations.insert_one(doc)
    return jsonify({"id": str(result.inserted_id)}), 201
