"""Workstations API endpoints."""
from __future__ import annotations

from bson import ObjectId
from datetime import datetime, timezone
from flask import Blueprint, g, request, jsonify

from utils.logging_setup import get_logger
from services import service_dispatcher
from cloudshield.Server.security.guards import require_auth
from utils import db
from repos import get_workstation_templates, insert_workstation_template, get_available_workstation, set_assigned_workstation, release_assigned_workstation

logger = get_logger("workstations")

workstations_bp = Blueprint("workstations", __name__)

ERROR_ORG_ID_REQUIRED = "org_id is required"
ERROR_TEMPLATE_ID_REQUIRED = "template_id is required"
ERROR_WORKSTATION_ID_REQUIRED = "workstation_id is required"
ERROR_STATUS_REQUIRED = "status is required"
ERROR_USER_ID_REQUIRED = "user_id is required"


def _serialize_doc(doc):
    if not doc:
        return None

    serialized = dict(doc)
    if "_id" in serialized:
        serialized["_id"] = str(serialized["_id"])
    return serialized


def _candidate_ids(raw_id: str):
    candidates = []
    try:
        candidates.append(ObjectId(raw_id))
    except Exception:
        pass

    candidates.append(raw_id)
    return candidates


def _find_org_scoped_doc(collection, raw_id: str, org_id: str):
    for candidate_id in _candidate_ids(raw_id):
        doc = collection.find_one({"_id": candidate_id, "org_id": org_id})
        if doc:
            return doc, candidate_id
    return None, None


@workstations_bp.route("/workstations/assign", methods=["GET"])
@require_auth
def get_workstations_avail():
    """
    This route is used to find a ACTIVE workstation vm and assign it to a user.
    This route should be used by the DesktopUI
    """
    user_id = request.args.get("user_id")
    template_id = request.args.get("template_id")
    
    if not user_id:
        return jsonify({"error": ERROR_USER_ID_REQUIRED}), 400

    if not template_id:
        return jsonify({"error": ERROR_TEMPLATE_ID_REQUIRED}), 400

    available_workstations = get_available_workstation(db, user_id=user_id)

    if len(available_workstations) == 0:
        logger.warning(f"No workstations are currently available (user_id={user_id}, tempalte_id={template_id})")
        return jsonify({"workstation":None}), 200
    
    assigned_workstation = available_workstations[0]
    vm_id = assigned_workstation["_id"]

    if not set_assigned_workstation(db=db, vm_id=vm_id, user_id=user_id):
        logger.error(f"Failed to assgign workstation to user (user_id={user_id}, vm_id={vm_id})")
        return jsonify({"workstation":None}), 200

    logger.info(f"Assigned workstation to user (user_id={user_id}, vm_id={vm_id})")

    return jsonify({"workstation": assigned_workstation}), 200



@workstations_bp.route("/workstations/release", methods=["GET"])
@require_auth
def release_workstation():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": ERROR_USER_ID_REQUIRED}), 400

    status = release_assigned_workstation(db=db, user_id=user_id)
    if status is False:
        # From the desktop UI's perspective it does not matter if we failed to release a VM. Howerver we should be notified about it
        logger.warning(f"Failed to release assigned workstation (user_id={user_id})")

    return jsonify({"status": status}), 200


@workstations_bp.route("/workstations/<workstation_id>", methods=["DELETE"])
@require_auth
def delete_workstation(workstation_id: str):
    user = g.user
    role = user.get("role")
    org_id = user.get("org_id")

    if role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    if not org_id:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400

    collection = db["workstations"]
    existing, matched_id = _find_org_scoped_doc(collection, workstation_id, org_id)
    if not existing:
        return jsonify({"error": "workstation not found"}), 404

    collection.delete_one({"_id": matched_id, "org_id": org_id})

    try:
        access_groups_collection = db["access_groups"]
    except (KeyError, TypeError):
        access_groups_collection = None

    if access_groups_collection is not None:
        access_groups_collection.update_many(
            {"org_id": org_id},
            {"$pull": {"workstations": workstation_id}},
        )

    return "", 204


    

@workstations_bp.route("/workstation/available", methods=["GET"])
@require_auth
def get_available_workstations_api():
    """
    Note: This route is for debugging purposes, we dont need to have a route that pulls the available vms since this is abastracted from the user
    """
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": ERROR_USER_ID_REQUIRED}), 400

    workstations_list = get_available_workstation(db, user_id=user_id)

    return jsonify({"workstations": workstations_list}), 200

@workstations_bp.route("/workstations/templates/assigned", methods=["GET"])
@require_auth
def get_assigned_templates():

    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": ERROR_USER_ID_REQUIRED}), 400

    from repos import get_assigned_workstation_templates
    workstation_templates_list = get_assigned_workstation_templates(db=db, user_id=user_id)

    return jsonify({"templates": workstation_templates_list}), 200

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
    for arg, val in {"org_id": org_id, "name": name, "description": description, "software": software, "access_groups": access_groups}.items():
        if val is None:
            logger.warning(f"WORKSTATIONS create_default request missing {arg}")
            return jsonify({"error": f"{arg} is required"}), 400

    members = data.get("members", [])

    # Insert the template immediately so it's visible in the UI before the
    # background job runs (is_ready=False until provisioning completes).
    try:
        ws_template = insert_workstation_template(
            db=db,
            name=name,
            org_id=org_id,
            description=description,
            software=software,
            is_ready=False,
            access_groups=access_groups,
            members=members,
        )
        template_id = str(ws_template.inserted_id)
    except Exception as e:
        logger.error("Failed to pre-insert workstation template: %s", e)
        return jsonify({"error": "Failed to create workstation template"}), 500

    job = service_dispatcher(
        service_name="ws_create_default",
        org_id=org_id,
        name=name,
        description=description,
        software=software,
        access_groups=access_groups,
        members=members,
        template_id=template_id,
    )

    return jsonify({"job_id": job.id, "template_id": template_id}), 202


@workstations_bp.route("/workstations/templates", methods=["GET"])
@require_auth
def list_templates():
    org_id = request.args.get('org_id')

    if not org_id:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 400

    templates = get_workstation_templates(db=db, org_id=org_id)

    # fetch other doucments from the ids stored in templates

    return jsonify({"templates":templates}), 200


@workstations_bp.route("/workstations/templates/<template_id>", methods=["PATCH"])
@require_auth
def update_template(template_id: str):
    user = g.user
    role = user.get("role")
    org_id = user.get("org_id")

    if role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    if not org_id:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400

    collection = db.workstation_templates
    existing, matched_id = _find_org_scoped_doc(collection, template_id, org_id)
    if not existing:
        return jsonify({"error": "workstation template not found"}), 404

    data = request.get_json(silent=True) or {}
    set_doc = {}

    if "name" in data:
        set_doc["name"] = data.get("name") or "Workstation"
    if "description" in data:
        set_doc["description"] = data.get("description") or ""
    if "software" in data:
        set_doc["software"] = data.get("software") or []
    if "access_groups" in data:
        set_doc["access_groups"] = data.get("access_groups") or []
    if "members" in data:
        set_doc["members"] = data.get("members") or []

    if not set_doc:
        return jsonify({"template": _serialize_doc(existing)}), 200

    set_doc["updated_at"] = datetime.now(timezone.utc)
    collection.update_one({"_id": matched_id, "org_id": org_id}, {"$set": set_doc})
    updated = collection.find_one({"_id": matched_id, "org_id": org_id})

    return jsonify({"template": _serialize_doc(updated)}), 200


@workstations_bp.route("/workstations/templates/<template_id>", methods=["DELETE"])
@require_auth
def delete_template(template_id: str):
    user = g.user
    role = user.get("role")
    org_id = user.get("org_id")

    if role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    if not org_id:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400

    collection = db.workstation_templates
    existing, matched_id = _find_org_scoped_doc(collection, template_id, org_id)
    if not existing:
        return jsonify({"error": "workstation template not found"}), 404

    collection.delete_one({"_id": matched_id, "org_id": org_id})
    return "", 204

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
        logger.warning("Workstation start request missing template_id")
        return jsonify({"error": ERROR_TEMPLATE_ID_REQUIRED}), 400

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
        return jsonify({"error": ERROR_STATUS_REQUIRED})

    job = service_dispatcher(
        service_name="ws_provision_update",
        workstation_id=workstation_id,
        status=status,
    )

    return jsonify({"job_id": job.id}), 202
