"""Workstations API endpoints."""
from __future__ import annotations

from bson import ObjectId
from flask import Blueprint, g, request, jsonify

from utils.logging_setup import get_logger
from services import service_dispatcher
from cloudshield.Server.security.guards import require_auth
from utils import db, db_admin

from repos import get_workstations, get_available_workstations, get_workstation_templates
from utils import db


# Collection handle. In production this is resolved lazily.
# In tests, this is monkeypatched to an in-memory fake.
workstations = None

logger = get_logger("workstations")

workstations_bp = Blueprint("workstations", __name__)

ERROR_ORG_ID_REQUIRED = "org_id is required"
ERROR_TEMPLATE_ID_REQUIRED = "template_id is required"
ERROR_WORKSTATION_ID_REQUIRED = "workstation_id is required"
ERROR_STATUS_REQUIRED = "status is required"
ERROR_USER_ID_REQUIRED = "user_id is required"

@workstations_bp.route("/workstations", methods=["POST"])
@require_auth
def create_workstation():
    user = g.user
    role = user.get("role")
    org_id = user.get("org_id")

    if role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    if not org_id:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400

    data = request.get_json() or {}
    name = data.get("name", "Workstation")
    groups = data.get("groups", [])

    collection = db_admin["workstations"]

    doc = {
        "org_id": org_id,
        "name": name,
        "status": "offline",
        "assigned_user": None,
        "assigned_user_id": None,
    }

    result = collection.insert_one(doc)
    workstation_id = str(result.inserted_id)

    if groups:
        try:
            access_groups_collection = db_admin["access_groups"]
        except (KeyError, TypeError):
            access_groups_collection = None
        if access_groups_collection is not None:
            group_oids = [ObjectId(gid) for gid in groups]
            access_groups_collection.update_many(
                {"_id": {"$in": group_oids}, "org_id": org_id},
                {"$addToSet": {"workstations": workstation_id}},
            )

    return jsonify({"id": workstation_id}), 201


@workstations_bp.route("/workstation/available", methods=["GET"])
@require_auth
def get_available_workstations_api():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": ERROR_USER_ID_REQUIRED}), 400

    from repos import get_available_workstations
    workstations_list = get_available_workstations(db, user_id=user_id)

    return {"workstations": workstations}, 200

@workstations_bp.route("/workstations", methods=["GET"])
@require_auth
def get_workstations_api():
    org_id = request.args.get("org_id")

    if not org_id:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 400

    workstations = get_workstations(db, org_id)
    
    return jsonify({"workstations": workstations}), 200

@workstations_bp.route("/workstations/templates", methods=["POST"])
@require_auth
def create_default():
    data = request.get_json() or {}
    
    logger.info("[API] Received /workstations/templates POST request")

    org_id = data.get("org_id")
    name = data.get("name")
    description = data.get("description")
    software = data.get("software")
    access_groups = data.get("access_groups")
    members = data.get("members")

    for arg, val in {"org_id":org_id, "name":name, "description":description, "software":software, "access_groups":access_groups, "members":members}.items():
        if val is None:
            logger.warning(f"WORKSTATIONS create_default request missing {arg}")
            return jsonify({"error": f"{arg} is required"}), 400

    job = service_dispatcher(
        service_name="ws_create_default",
        org_id=org_id,
        name=name,
        description=description,
        software=software,
        access_groups=access_groups,
        members=members,
    )

    return jsonify({"job_id": job.id}), 202


@workstations_bp.route("/workstations/templates", methods=["GET"])
@require_auth
def list_templates():
    org_id = request.args.get('org_id')

    if not org_id:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 400

    templates = get_workstation_templates(db=db, org_id=org_id)

    # fetch other doucments from the ids stored in templates

    return jsonify({"templates":templates}), 200

@workstations_bp.route("/workstations/start", methods=["POST"])
@require_auth
def start():
    """
    Debug route, this should not be used in our WebUI

    This will start an existing workstation template
    """
    data = request.get_json() or {}

    logger.info("[API] Received /workstations/start POST request")

    org_id = data.get("org_id")
    template_id = data.get("template_id")

    if org_id is None:
        logger.warning("Workstation start request missing org_id")
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400
    if template_id is None:
        logger.warning("Workstation default workstation provisioning request missing org_id")
        return jsonify({"error":ERROR_TEMPLATE_ID_REQUIRED}), 400

    job = service_dispatcher(
        service_name="ws_start",
        org_id=org_id,
        template_id=template_id,
    )

    return jsonify({"job_id": job.id}), 202


@workstations_bp.route("/workstations/update", methods=["GET"])
def update():
    """
    NOTE: this route should NEVER be called manually or by the UI

    This route is reserved for workstation to update their status after provisioning has started.
    """
    workstation_id = request.args.get("id")
    status = request.args.get("status")

    logger.info("[API] Received /workstations/update GET request")

    if not workstation_id:
        return jsonify({"error": ERROR_WORKSTATION_ID_REQUIRED})
    if not status:
        return jsonify({"error":ERROR_STATUS_REQUIRED})

    job = service_dispatcher(
        service_name="ws_provision_update",
        workstation_id=workstation_id,
        status=status,
    )

    return jsonify({"job_id":job.id}), 202
