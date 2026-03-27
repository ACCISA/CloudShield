"""
Service layer for job enqueueing and status retrieval.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Tuple, Dict, Any
import rq
from utils import task_queue, redis_conn, get_logger
from utils.database import db_admin, organizations, org_filter

JOB_TIMEOUT = int(os.getenv("CLOUDSHIELD_JOB_TIMEOUT", "1200"))
Job = rq.job.Job  # type: ignore[attr-defined]
logger = get_logger("service")


# ---------------------------------------------------------------------------
# Task wrappers
# ---------------------------------------------------------------------------
# Tests assert that enqueue helpers pass specific callables into RQ. We expose
# these names at module scope, but keep imports lazy to avoid circular imports
# during module import.


def dc_add_user(org_id: str, username: str, password: str, email: str):
    from cloudshield.Server.tasks import dc_add_user as _task  # type: ignore

    return _task(org_id, username, password, email)


def dc_create_user_with_group(org_id: str, username: str, password: str, group_name: str):
    from cloudshield.Server.tasks import dc_create_user_with_group as _task  # type: ignore

    return _task(org_id, username, password, group_name)


def dc_add_user_to_group(org_id: str, username: str, group_name: str):
    from cloudshield.Server.tasks import dc_add_user_to_group as _task  # type: ignore

    return _task(org_id, username, group_name)


def dc_restart_samba_service(org_id: str):
    from cloudshield.Server.tasks import dc_restart_samba_service as _task  # type: ignore

    return _task(org_id)


def dc_user_list(org_id: str):
    from cloudshield.Server.tasks import dc_user_list as _task  # type: ignore

    return _task(org_id)


def dc_set_password(org_id: str, username: str, new_password: str):
    from cloudshield.Server.tasks import dc_set_password as _task  # type: ignore

    return _task(org_id, username, new_password)


def dc_create_file_share(
    org_id: str,
    share_name: str,
    users: list | None = None,
    groups: list | None = None,
    description: str | None = None,
    max_size: int | None = None,
):
    from cloudshield.Server.tasks import dc_create_file_share as _task  # type: ignore

    return _task(org_id, share_name, users or [], groups or [], description, max_size)


def dc_delete_file_share(org_id: str, share_name: str, wipe_data: bool = False):
    from cloudshield.Server.tasks import dc_delete_file_share as _task  # type: ignore

    return _task(org_id, share_name, wipe_data)


def dc_remove_user(org_id: str, username: str):
    from cloudshield.Server.tasks import dc_remove_user as _task  # type: ignore

    return _task(org_id, username)


def dc_add_group(org_id: str, group_name: str):
    from cloudshield.Server.tasks import dc_add_group as _task  # type: ignore

    return _task(org_id, group_name)


def dc_remove_group(org_id: str, group_name: str):
    from cloudshield.Server.tasks import dc_remove_group as _task  # type: ignore

    return _task(org_id, group_name)


def dc_update_file_share(
    org_id: str,
    share_name: str,
    groups: list | None = None,
    users: list | None = None,
):
    from cloudshield.Server.tasks import dc_update_file_share as _task  # type: ignore

    return _task(org_id, share_name, groups or [], users or [])


def send_org_welcome_email(org_id: str, admin_user_id: str):
    """Call the org welcome email task directly (used by enqueue helpers/tests)."""
    from cloudshield.Server.tasks import send_org_welcome_email as _task  # type: ignore

    return _task(org_id, admin_user_id)


def send_employee_invite_email(user_id: str):
    """Call the employee invite email task directly (used by enqueue helpers/tests)."""
    from cloudshield.Server.tasks import send_employee_invite_email as _task  # type: ignore

    return _task(user_id)


def send_workstation_ready_email(user_id: str, workstation_name: str):
    """Call the workstation-ready email task directly (used by enqueue helpers/tests)."""
    from cloudshield.Server.tasks import send_workstation_ready_email as _task  # type: ignore

    return _task(user_id, workstation_name)

def get_job_status(job_id: str) -> Tuple[Dict[str, Any], int]:
    """
    Retrieve the current status and metadata of a queued background job.

    Args:
        job_id (str): Unique Redis Queue job identifier.

    Returns:
        Tuple[Dict[str, Any], int]: JSON-style response payload and HTTP status code.

    Behaviour:
        - Fetches the RQ job from Redis by ID.
        - Returns job status: "queued", "started", "finished", or "failed".
        - Includes 'meta.progress' field if the worker updates progress metadata.
        - Includes 'result' if job finished successfully.
        - Includes 'error' (last traceback line) if job failed.

    Errors:
        - Returns '404' if job ID is invalid or no longer exists in Redis.
        - Never raises exceptions upward; logs warning instead.

    Security:
        - Never logs user-controlled job IDs directly.
    """
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        # Avoid logging user-controlled identifiers
        logger.warning("Status requested for unknown job")
        return {"error": "job not found"}, 404

    status = job.get_status()
    meta = getattr(job, "meta", {}) or {}
    response: Dict[str, Any] = {
        "job_id": job.id,
        "status": status,
        "progress": meta.get("progress"),
    }
    if status == "finished":
        response["result"] = job.result
    elif status == "failed":
        response["error"] = (job.exc_info or "failed").splitlines()[-1] if job.exc_info else "failed"
    return response, 200


def health_status() -> Tuple[Dict[str, Any], int]:
    """
    Check Redis connection health for monitoring and readiness probes.

    Returns:
        Tuple[Dict[str, Any], int]: JSON payload and HTTP status code.

    Behaviour:
        - Sends a Redis PING command to verify connectivity.
        - Logs and returns degraded status if Redis is unreachable.
    """
    try:
        ping = redis_conn.ping()
    except Exception as e:  # pragma: no cover - network error path
        logger.error("Health check failed: %s", e)
        return {"status": "degraded", "redis": False, "error": str(e)}, 503
    return {"status": "ok", "redis": bool(ping)}, 200

def enqueue_provision(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None, workstation_count: int = 0) -> Job:
    logger.info(
        "[SERVICE] Enqueueing provision_network job (org_id=%s, region=%s, workstation_count=%s)",
        org_id,
        region,
        workstation_count,
    )

    try:
        from cloudshield.Server.tasks import provision_network  # type: ignore
        job = task_queue.enqueue(
            provision_network,
            org_id,
            region,
            ubuntu_ami,
            workstation_ami,
            workstation_count,
            job_timeout=JOB_TIMEOUT,
        )
        # Avoid logging user-controlled identifiers
        logger.info("[SERVICE] Enqueued provision_network job")
        return job
    except Exception as e:
        logger.exception(f"[SERVICE] Error enqueueing provision_network job for org_id={org_id}: {e}")
        raise

def enqueue_provision_workstations(org_id: str, region: str = "us-west-2", count: int = 1) -> Job:
    logger.info("[SERVICE] Enqueueing provision_workstations job (org_id=%s, region=%s, count=%s)", org_id, region, count)
    
    try:
        from cloudshield.Server.tasks import provision_workstations  # type: ignore
        job = task_queue.enqueue(
            provision_workstations,
            org_id,
            region,
            count,
            job_timeout=JOB_TIMEOUT,
        )
        # Avoid logging user-controlled identifiers
        logger.info("[SERVICE] Enqueued provision workstations job")
        return job
    except Exception as e:
        logger.exception(f"[SERVICE] Error enqueueing provision_workstations job for org_id={org_id}: {e}")
        raise

def enqueue_destroy(org_id: str, force: bool = False) -> Job:
    """
    Enqueue a teardown (destroy) job for an organization's infrastructure.

    Args:
        org_id (str): Organization ID whose environment should be destroyed.
        force (bool, optional): Whether to force deletion of resources. Defaults to False.

    Returns:
        Job: RQ Job instance for the destroy operation.

    Behaviour:
        - Queues a 'destroy_environment' task.
        - Timeout and error handling are standardized across tasks.
    """
    from cloudshield.Server.tasks import destroy_environment  # type: ignore
    job = task_queue.enqueue(
        destroy_environment,
        org_id,
        force,
        job_timeout=JOB_TIMEOUT,
    )
    # Avoid logging user-controlled identifiers
    logger.info("Enqueued destroy job")
    return job

def enqueue_dc_add_user(org_id: str, username: str, password: str, email: str):
    """
    Enqueue an Active Directory (Domain Controller) "add user" task.

    Args:
        org_id (str): Organization ID that owns the domain.
        username (str): Username to be created in the domain.
        password (str): Initial password for the new DC user.
        email (str): Email for the new DC user.

    Returns:
        Job: RQ Job instance representing the queued DC user creation job.

    Behaviour:
        - Enqueues the 'dc_add_user' task with minimal logging.
        - Allows async integration with on-premise or cloud-hosted AD controllers.
    """
    job = task_queue.enqueue(
        dc_add_user,
        org_id,
        username,
        password,
        email,
    )
    logger.info("Enqueued dc_add_user job")
    return job


def enqueue_dc_add_user_to_group(org_id: str, username: str, group_name: str):
    job = task_queue.enqueue(
            dc_add_user_to_group,
            org_id,
            username,
            group_name,
    )
    logger.info("Enqueued dc_add_user_to_group job")
    return job

def enqueue_dc_create_user_with_group(org_id: str, username: str, password: str, group_name: str):
    """
    Enqueue a task that creates a user, provisions a group, links it to Domain Users, and adds the user to that group.
    """
    job = task_queue.enqueue(
            dc_create_user_with_group,
            org_id,
            username,
            password,
            group_name,
    )
    logger.info("Enqueued dc_create_user_with_group job")
    return job

def enqueue_dc_restart_samba_service(org_id: str):
    job = task_queue.enqueue(
        dc_restart_samba_service,
            org_id
    )
    logger.info("Enqueued dc_restart_samba_service job")
    return job

def enqueue_dc_user_list(org_id: str):
    job = task_queue.enqueue(
        dc_user_list,
            org_id
    )
    logger.info("Enqueued dc_user_list job")
    return job

def enqueue_dc_set_password(org_id: str, username: str, new_password: str):
    job = task_queue.enqueue(
        dc_set_password,
            org_id,
            username,
            new_password
    )
    logger.info("Enqueued dc_set_password job")
    return job

def enqueue_create_file_share(
    org_id: str,
    share_name: str,
    users: list = None,
    groups: list = None,
    description: str = None,
    max_size: int = None
):
    job = task_queue.enqueue(
            dc_create_file_share,
            org_id,
            share_name,
            users or [],
            groups or [],
            description,
            max_size
    )
    logger.info("Enqueued dc_create_file_share")
    return job

def enqueue_delete_file_share(org_id: str, share_name: str, wipe_data: bool = False):
    job = task_queue.enqueue(
        dc_delete_file_share,
            org_id,
            share_name,
            wipe_data
    )
    logger.info("Enqueued dc_delete_file_share")
    return job

def enqueue_dc_change_password(org_id: str, username: str, password:str):
    """
    Placeholder: Enqueue an Active Directory "change password" task.

    Args:
        org_id (str): Organization ID that owns the domain.
        username (str): DC username whose password should be changed.
        password (str): New password.

    Returns:
        None (currently unimplemented).
    """
    pass

def enqueue_dc_remove_user(org_id: str, username: str):
    """
    Placeholder: Enqueue an Active Directory "remove user" task.

    Args:
        org_id (str): Organization ID that owns the domain.
        username (str): DC username to be removed.
        password (str): Account password (if required for authentication).

    Returns:
        None (currently unimplemented).
    """
    job = task_queue.enqueue(
            dc_remove_user,
            org_id,
            username,
    )
    logger.info("Enqueued dc_remove_user")
    return job


def enqueue_dc_add_group(org_id: str, group_name: str):
    job = task_queue.enqueue(
        dc_add_group,
        org_id,
        group_name,
    )
    logger.info("Enqueued dc_add_group job")
    return job


def enqueue_dc_remove_group(org_id: str, group_name: str):
    job = task_queue.enqueue(
        dc_remove_group,
        org_id,
        group_name,
    )
    logger.info("Enqueued dc_remove_group job")
    return job


def enqueue_dc_update_file_share(
    org_id: str,
    share_name: str,
    groups: list = None,
    users: list = None,
):
    job = task_queue.enqueue(
        dc_update_file_share,
        org_id,
        share_name,
        groups or [],
        users or [],
    )
    logger.info("Enqueued dc_update_file_share job")
    return job


def enqueue_org_welcome_email(org_id: str, admin_user_id: str) -> Job:
    """Enqueue a welcome email for a newly created organization admin."""
    job = task_queue.enqueue(
        send_org_welcome_email,
        org_id,
        admin_user_id,
        job_timeout=JOB_TIMEOUT,
    )
    logger.info("Enqueued send_org_welcome_email")
    return job


def enqueue_org_welcome_email_if_ready(org_id: str) -> Job | None:
    """
    Enqueue org welcome email only after successful provisioning.

    Why this exists:
    - Signup returns before infrastructure provisioning finishes.
    - Provisioning completion happens later in a background worker that only has org_id.
    - We must avoid duplicate welcome emails on retried/replayed success paths.

    Contract:
    - Returns None when not ready/already sent/missing admin.
    - Returns the queued Job when an email is enqueued.
    """
    # Guard 1: only send after infrastructure is truly completed.
    org = organizations.find_one(
        org_filter(org_id),
        {"provisioning_status": 1, "welcome_email_enqueued": 1},
    ) or {}
    if org.get("provisioning_status") != "completed":
        return None

    # Guard 2: persistent duplicate-prevention across retries/restarts.
    if org.get("welcome_email_enqueued"):
        return None

    # Resolve the primary admin for this org.
    admin = db_admin["users"].find_one(
        {"org_id": org_id, "role": "admin"},
        sort=[("created_at", 1)],
    )
    if not admin or not admin.get("_id"):
        return None

    # Reuse the existing enqueue helper.
    job = enqueue_org_welcome_email(org_id, str(admin["_id"]))

    # Mark as sent so future successful/retried runs are no-ops for this org.
    organizations.update_one(
        org_filter(org_id),
        {
            "$set": {
                "welcome_email_enqueued": True,
                "welcome_email_enqueued_at": datetime.now(timezone.utc),
            }
        },
    )
    return job


def enqueue_employee_invite_email(user_id: str) -> Job:
    """Enqueue an invite email for a newly created employee."""
    job = task_queue.enqueue(
        send_employee_invite_email,
        user_id,
        job_timeout=JOB_TIMEOUT,
    )
    logger.info("Enqueued send_employee_invite_email")
    return job


def enqueue_workstation_ready_email(user_id: str, workstation_name: str) -> Job:
    """Enqueue a workstation-ready email for the requesting user."""
    job = task_queue.enqueue(
        send_workstation_ready_email,
        user_id,
        workstation_name,
        job_timeout=JOB_TIMEOUT,
    )
    logger.info("Enqueued send_workstation_ready_email")
    return job


SERVICES = {
    "provision_network": enqueue_provision,
    "provision_workstations": enqueue_provision_workstations,
    "destroy": enqueue_destroy,
    "dc_add_user": enqueue_dc_add_user,
    "dc_add_user_to_group": enqueue_dc_add_user_to_group,
    "dc_create_user_with_group": enqueue_dc_create_user_with_group,
    "dc_remove_user": enqueue_dc_remove_user,
    "dc_restart_samba_service": enqueue_dc_restart_samba_service,
    "dc_user_list": enqueue_dc_user_list,
    "dc_set_password": enqueue_dc_set_password,
    "dc_create_file_share": enqueue_create_file_share,
    "dc_delete_file_share": enqueue_delete_file_share,
    "dc_add_group": enqueue_dc_add_group,
    "dc_remove_group": enqueue_dc_remove_group,
    "dc_update_file_share": enqueue_dc_update_file_share,
    "send_org_welcome_email": enqueue_org_welcome_email,
    "send_employee_invite_email": enqueue_employee_invite_email,
    "send_workstation_ready_email": enqueue_workstation_ready_email,
}
