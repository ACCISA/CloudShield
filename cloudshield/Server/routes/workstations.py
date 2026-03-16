"""Access Groups API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError

from utils.logging_setup import get_logger

from services import service_dispatcher

from cloudshield.Server.security.guards import require_auth

from repos import get_workstations
from utils import db


# Collection handle. In production this is resolved lazily.
# In tests, this is monkeypatched to an in-memory fake.
workstations = None

logger = get_logger("access_groups")

workstations_bp = Blueprint("workstations", __name__)

ERROR_ORG_ID_REQUIRED = "org_id is required"
ERROR_TEMPLATE_ID_REQUIRED = "template_id is required"
ERROR_WORKSTATION_ID_REQUIRED = "workstation_id is required"
ERROR_STATUS_REQUIRED = "status is required"
ERROR_USER_ID_REQUIRED = "user_id is required"

@workstations_bp.route("/workstation/available", methods=["GET"])
@require_auth
def get_available_workstations():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error":ERROR_USER_ID_REQUIRED}), 400

    workstations = get_available_workstation(user_id=user_id)

    return {"workstations": workstations}, 200

@workstations_bp.route("/workstations", methods=["GET"])
@require_auth
def get_workstations_api():
    org_id = request.args.get("org_id")

    if not org_id:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 400

    workstations = get_workstations(db, org_id)
    
    return {"workstations": workstations}


@workstations_bp.route("/workstations/create", methods=["POST"])
@require_auth
def create_default():
    """
    Debug route, this should not be used in our WebUI

    This will create an image of a workstations with no customization
    """
    data = request.get_json() or {}
    
    logger.info("[API] Received /workstations/create-default POST request")

    org_id = data.get("org_id")
    name = data.get("name")
    description = data.get("description")
    software = data.get("software")
    access_groups = data.get("access_groups")


    for arg, val in {"org_id":org_id, "name":name, "description":description, "software":software, "access_groups":access_groups}.items():
        if val is None:
            logger.warning(f"WORKSTATIONS create_default request missing {arg}")
            return jsonify({"error":f"{arg} is required"}), 400

    job = service_dispatcher(
            service_name="ws_create_default",
            org_id=org_id,
            name=name,
            description=description,
            software=software,
            access_groups=access_groups)

    return jsonify({"job_id":job.id}), 202

@workstations_bp.route("/workstations/start", methods=["POST"])
@require_auth
def start():
    """
    Debug route, this should not be used in our WebUI

    This will create an image of a workstations with no customization
    """
    data = request.get_json() or {}

    logger.info("[API] Received /workstations/create-default POST request")

    org_id = data.get("org_id")
    template_id = data.get("template_id")

    if org_id is None:
        logger.warning("Workstation default workstation provisioning request missing org_id")
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 400
    if template_id is None:
        logger.warning("Workstation default workstation provisioning request missing org_id")
        return jsonify({"error":ERROR_TEMPLATE_ID_REQUIRED}), 400


    job = service_dispatcher(
            service_name="ws_start",
            org_id=org_id,
            template_id=template_id)

    return jsonify({"job_id":job.id}), 202

@workstations_bp.route("/workstations/update", methods=["GET"])
def update():
    """
    NOTE: this route should NEVER be called manually or by the UI
    
    This route is reserved for workstation to update their status after provisioning has started. In the future this route will only allow IPs from the workstations range for accessing it.

    The workstation_id is a temporary identifier assigned during provisiong, its not the actual database workstation id
    """

    workstation_id = request.args.get('id')
    status = request.args.get('status')

    logger.info("[API] Received /workstations/update GET request")

    if not workstation_id:
        return jsonify({"error":ERROR_WORKSTATION_ID_REQUIRED})
    if not status:
        return jsonify({"error":ERROR_STATUS_REQUIRED})


    job = service_dispatcher(
            service_name="ws_provision_update",
            workstation_id=workstation_id,
            status=status)

    return jsonify({"job_id":job.id}), 202

    



