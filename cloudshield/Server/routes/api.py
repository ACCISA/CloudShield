"""Task dispatch and job status API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, request, jsonify

from pydantic import ValidationError
from models import UserCreate
from services import create_user

from services import (
    service_dispatcher,
    get_job_status,
    health_status,
    list_shares,
    list_groups_with_shares,
    update_share,
)
from utils.logging_setup import get_logger
from utils import organizations
from cloudshield.Server.utils.database import db_admin

logger = get_logger("api")

api_bp = Blueprint("api", __name__)

# Error messages
ERROR_ORG_ID_REQUIRED = "org_id is required"


def _seed_workstations(org_id: str, count: int) -> None:
    if count <= 0:
        return

    workstations = db_admin["workstations"]
    now = datetime.now(timezone.utc)
    docs = [
        {
            "org_id": org_id,
            "name": f"{org_id}-ws-{uuid4().hex[:8]}",
            "status": "provisioning",
            "created_at": now,
        }
        for _ in range(count)
    ]
    workstations.insert_many(docs)


def _share_doc_to_payload(doc: dict) -> dict:
    """
    Transform MongoDB share document into API response payload.
    
    Converts internal MongoDB document format to client-friendly JSON,
    including ObjectId to string conversion and datetime to ISO format.
    
    Args:
        doc: MongoDB document dict with share fields
    
    Returns:
        Dict suitable for JSON serialization with fields:
        - id: String representation of MongoDB _id
        - org_id: Organization identifier
        - name: Share name
        - groups: List of group names (empty list if None)
        - drive: Allocated drive letter (e.g., "Z")
        - description: Optional description
        - owner: Optional owner email/username
        - created_at: ISO 8601 timestamp string
        - updated_at: ISO 8601 timestamp string
    """
    return {
        "id": str(doc.get("_id")) if doc.get("_id") else None,
        "org_id": doc.get("org_id"),
        "name": doc.get("name"),
        "groups": doc.get("groups") or [],
        "drive": doc.get("drive"),
        "description": doc.get("description"),
        "owner": doc.get("owner"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }

@api_bp.route("/task/dc/delete_file_share", methods=["POST"])
def task_delete_file_share():
    data = request.get_json() or {}

    org_id = data.get("org_id")
    share_name = data.get("share_name")
    data.get("wipe_data") or False

    if org_id is None:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 422
    if share_name is None:
        return jsonify({"error":"share_name is required"}), 422

    job = service_dispatcher(service_name="dc_delete_file_share", org_id=org_id, share_name=share_name)

    return jsonify({"job_id":job.id}), 202

@api_bp.route("/task/dc/create_file_share", methods=["POST"])
def task_create_file_share():
    data = request.get_json() or {}

    org_id = data.get("org_id")
    share_name = data.get("share_name")

    if org_id is None:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 422
    if share_name is None:
        return jsonify({"error":"share_name is required"}), 422

    job = service_dispatcher(service_name="dc_create_file_share", org_id=org_id, share_name=share_name)

    return jsonify({"job_id":job.id}), 202


@api_bp.route("/file_shares", methods=["GET"])
def list_file_shares():
    """
    List all file shares for an organization.
    
    Endpoint:
        GET /api/file_shares?org_id=<org_id>
    
    Query Parameters:
        - org_id (str, required): Organization identifier
    
    Returns:
        200: JSON with structure:
            {
                "shares": [
                    {
                        "share": {
                            "id": "...",
                            "name": "Documents",
                            "drive": "Z",
                            "groups": ["engineering", "hr"],
                            "description": "...",
                            "owner": "admin@example.com",
                            "created_at": "2026-01-18T22:44:34.480000",
                            "updated_at": "2026-01-18T22:44:34.480000"
                        }
                    },
                    ...
                ]
            }
        422: Missing org_id parameter
    """
    org_id = request.args.get("org_id")

    if org_id is None:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 422

    docs = list_shares(org_id)
    payload = [{"share": _share_doc_to_payload(doc)} for doc in docs]
    return jsonify({"shares": payload}), 200


@api_bp.route("/file_share_groups", methods=["GET"])
def list_file_share_groups():
    """
    List groups and their associated file shares (inverted view).
    
    Transforms share-centric data into group-centric view, useful for
    displaying which shares each group has access to.
    
    Endpoint:
        GET /api/file_share_groups?org_id=<org_id>
    
    Query Parameters:
        - org_id (str, required): Organization identifier
    
    Returns:
        200: JSON with structure:
            {
                "groups": [
                    {
                        "group": {
                            "name": "engineering",
                            "shares": ["Documents", "Projects"]
                        }
                    },
                    {
                        "group": {
                            "name": "hr",
                            "shares": ["Documents"]
                        }
                    },
                    ...
                ]
            }
        422: Missing org_id parameter
    """
    org_id = request.args.get("org_id")

    if org_id is None:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 422

    payload = list_groups_with_shares(org_id)
    return jsonify({"groups": payload}), 200

@api_bp.route("/file_shares/<share_name>", methods=["PATCH"])
def update_file_share(share_name):
    """
    Update file share metadata (groups, description, owner).
    
    Allows modification of share access and metadata without recreating
    the share or changing the allocated drive letter.
    
    Endpoint:
        PATCH /api/file_shares/<share_name>
    
    Path Parameters:
        - share_name (str): Name of the share to update
    
    Request JSON:
        - org_id (str, required): Organization identifier
        - groups (list[str], optional): List of group names with access
        - description (str, optional): Human-readable description
        - owner (str, optional): Owner email or username
    
    Returns:
        200: JSON with structure:
            {
                "status": "SUCCESS",
                "message": "Share updated successfully"
            }
        400: No fields provided to update
        404: Share not found
        422: Missing org_id in request body
    
    Notes:
        - At least one optional field must be provided
        - updated_at timestamp is automatically set
        - Cannot modify org_id, name, or drive letter
    """
    data = request.get_json() or {}
    
    org_id = data.get("org_id")
    
    if org_id is None:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 422
    
    # Build update fields from request
    update_fields = {}
    if "groups" in data:
        update_fields["groups"] = data["groups"]
    if "description" in data:
        update_fields["description"] = data["description"]
    if "owner" in data:
        update_fields["owner"] = data["owner"]
    
    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400
    
    success = update_share(org_id, share_name, update_fields)

    if not success:
        return jsonify({"error": "Share not found"}), 404

    return jsonify({"status": "SUCCESS", "message": "Share updated successfully"}), 200

@api_bp.route("/task/dc/set_password", methods=["POST"])
def task_set_password():
    data = request.get_json() or {}

    org_id = data.get("org_id")
    username = data.get("username")
    new_password = data.get("new_password")

    if org_id is None:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 422
    if username is None:
        return jsonify({"error":"username is required"}), 422
    if new_password is None:
        return jsonify({"error":"new_password is required"}), 422

    job = service_dispatcher(service_name="dc_set_password", org_id=org_id, username=username, new_password=new_password)

    return jsonify({"job_id": job.id}), 202

@api_bp.route("/task/dc/user_list", methods=["POST"])
def task_dc_user_list():
    data = request.get_json() or {}

    org_id = data.get("org_id")

    if org_id is None:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 422

    job = service_dispatcher(service_name="dc_user_list", org_id=org_id)

    return jsonify({"job_id": job.id}), 202

@api_bp.route("/task/dc/restart_samba", methods=["POST"])
def task_dc_restart_samba_service():
    data = request.get_json() or {}

    org_id = data.get("org_id")

    if org_id is None:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 422

    job = service_dispatcher(service_name="dc_restart_samba_service", org_id=org_id)

    return jsonify({"job_id": job.id}), 202

@api_bp.route("/task/dc/remove_user", methods=["POST"])
def task_dc_remove_user():
    data = request.get_json() or {}

    org_id = data.get("org_id")
    username = data.get("username")

    if org_id is None:
        return jsonify({"error":ERROR_ORG_ID_REQUIRED}), 422
    if username is None:
        return jsonify({"error":"username is required"}), 422

    job = service_dispatcher(service_name="dc_remove_user", org_id=org_id, username=username)

    return jsonify({"job_id": job.id}), 202


@api_bp.route("/task/dc/add_user", methods=["POST"])
def task_dc_add_user():
    """
    Queue domain controller user creation task.

    Endpoint:
        POST /api/task/dc/add_user

    Request JSON:
        - org_id (str, required): Organization identifier.
        - username (str, required): Username to be created in DC.
        - password (str, required): Initial password for the DC account.
        - email (str, required): Email for the DC account.

    Behaviour:
        - Validates required fields.
        - Dispatches an async job named "dc_add_user" to the service layer
    """
    data = request.get_json() or {}

    org_id = data.get("org_id")
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    
    for arg, val in {"org_id":org_id, "username":username, "password":password}.items():
        if val is None:
            logger.warning(f"DC add_user request missing {arg}")
            return jsonify({"error":"{arg} is required"})

    job = service_dispatcher(
        service_name="dc_add_user",
        org_id=org_id,
        username=username,
        password=password,
        email=email,
    )
    return jsonify({"job_id": job.id}), 202


@api_bp.route("/task/dc/add_user_with_group", methods=["POST"])
def task_dc_add_user_with_group():
    """
    Queue domain controller user creation with dedicated group linkage.

    Endpoint:
        POST /api/task/dc/add_user_with_group

    Request JSON:
        - org_id (str, required)
        - username (str, required)
        - password (str, required)
        - group_name (str, optional; defaults to "<username>-group" if omitted)
    """
    data = request.get_json() or {}

    org_id = data.get("org_id")
    username = data.get("username")
    password = data.get("password")
    group_name = data.get("group_name")

    for arg, val in {"org_id": org_id, "username": username, "password": password}.items():
        if val is None:
            logger.warning(f"DC add_user_with_group request missing {arg}")
            return jsonify({"error": f"{arg} is required"}), 422

    job = service_dispatcher(
        service_name="dc_create_user_with_group",
        org_id=org_id,
        username=username,
        password=password,
        group_name=group_name,
    )
    return jsonify({"job_id": job.id}), 202


@api_bp.route("/task/provision", methods=["POST"])
def task_provision():
    """
    Queue network infrastructure provisioning task.

    Endpoint:
        POST /api/task/provision

    Request JSON:
        - org_id (str, required): Organization identifier.
        - region (str, optional): Cloud region; defaults to "ca-central-1".
        - ubuntu_ami (str, optional): Override for Ubuntu AMI ID.
        - workstation_ami (str, optional): Override for workstation AMI ID.

    Behaviour:
        - Validates 'org_id'.
        - Dispatches an async job "provision_network" with the supplied parameters.
    """
    data = request.get_json() or {}

    def _coerce_int(val):
        try:
            return int(val)
        except (TypeError, ValueError):
            return None

    logger.info("[API] Received /task/provision POST request")
    org_id = data.get("org_id")

    if not org_id:
        logger.warning("Provision request missing org_id")
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400

    org_doc = organizations.find_one({"org_id": org_id}, {"workstation_limit": 1})
    org_limit = _coerce_int(org_doc.get("workstation_limit")) if org_doc else None

    requested_count = data.get("workstation_count")
    if requested_count is None:
        workstation_count = org_limit if org_limit is not None else 1
    else:
        workstation_count = _coerce_int(requested_count)
        if workstation_count is None:
            return jsonify({"error": "workstation_count must be an integer"}), 400

    if org_limit is not None and org_limit > 0 and workstation_count > org_limit:
        logger.warning("Requested workstation_count exceeds org limit; capping to %s", org_limit)
        workstation_count = org_limit

    if workstation_count is None or workstation_count <= 0:
        workstation_count = 1

    _seed_workstations(org_id, workstation_count)

    job = service_dispatcher(
        service_name="provision_network", 
        org_id=org_id, 
        region=data.get("region", "ca-central-1"), 
        ubuntu_ami=data.get("ubuntu_ami"), 
        workstation_ami=data.get("workstation_ami"),
        workstation_count=workstation_count
        )

    return jsonify({"job_id": job.id}), 202


@api_bp.route("/task/provisionworkstations", methods=["POST"])
def task_provision_workstations():
    """
    Queue workstation provisioning task.

    Endpoint:
        POST /api/task/provisionworkstations

    Request JSON:
        - org_id (str, required): Organization identifier.
        - region (str, optional): Cloud region; defaults to "us-west-2".
        - count (int, optional): Number of workstations to provision; defaults to 1.

    Behaviour:
        - Validates 'org_id'.
        - Dispatches an async job "provision_workstations" with count and region.
    """
    data = request.get_json() or {}
    logger.info("Received /task/provisionworkstations POST request")
    org_id = data.get("org_id")

    if not org_id:
        logger.warning("Provision workstations request missing org_id")
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400\

    logger.debug(
        "[API] Parsed parameters: org_id=%s, region=%s, count=%s",
        org_id,
        data.get("region", "us-west-2"),
        data.get("count", 1),
    )
    try:
        count = int(data.get("count", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "count must be an integer"}), 400

    if count <= 0:
        count = 1

    _seed_workstations(org_id, count)
    job = service_dispatcher(service_name="provision_workstations",org_id=org_id, region=data.get("region", "us-west-2"), count=count)

    return jsonify({"job_id": job.id}), 202


@api_bp.route("/task/destroy", methods=["POST"])
def task_destroy():
    """
    Queue infrastructure destruction task.

    Endpoint:
        POST /api/task/destroy

    Request JSON:
        - org_id (str, required): Organization identifier.
        - force (bool, optional): Force-destroy flag; defaults to false.

    Behaviour:
        - Validates 'org_id'.
        - Dispatches an async job "destroy" with the 'force' option.
    """
    data = request.get_json() or {}
    logger.info("Received /task/destroy POST request")
    org_id = data.get("org_id")

    if not org_id:
        logger.warning("Destroy request missing org_id")
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 400

    job = service_dispatcher(service_name="destroy", org_id=org_id, force=data.get("force", False))

    return jsonify({"job_id": job.id}), 202


@api_bp.route("/status/<job_id>", methods=["GET"])
def job_status(job_id: str):
    """
    Retrieve job execution status and progress.

    Endpoint:
        GET /api/status/<job_id>

    Path Parameters:
        - job_id (str): The service job identifier returned by a prior 202 Accepted response.

    Behaviour:
        - Queries the service layer for status and returns its payload.
    """
    status_payload, code = get_job_status(job_id)
    return jsonify(status_payload), code


@api_bp.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint for service monitoring.

    Endpoint:
        GET /api/health

    Behaviour:
        - Calls 'health_status()' to gather liveness/readiness info from dependencies.
        - Returns a simple JSON payload and HTTP status code.
    """
    payload, code = health_status()
    return jsonify(payload), code

@api_bp.route("/signup_admin", methods=["POST"])
def signup_admin():
    """
    Public endpoint: create first admin user (NO AUTH).

    POST /api/signup_admin
    """
    try:
        data = request.get_json() or {}
        reason = data.get("reason")

        # Force admin role no matter what client sends
        data = dict(data)
        data["role"] = "admin"

        user_data = UserCreate(**data)

        # Public signup → current_user=None
        user_id = create_user(user_data, current_user=None, reason=reason)

        # org_id is set on user_data by the service for public signup
        return jsonify({"user_id": user_id, "org_id": user_data.org_id}), 201

    except ValidationError as e:
        return jsonify({
            "error": "Validation failed",
            "details": e.errors()
        }), 400

    except PermissionError as e:
        return jsonify({"error": str(e)}), 403

    except ValueError as e:
        return jsonify({"error": str(e)}), 409

    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500
