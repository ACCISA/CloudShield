"""
Service layer for job enqueueing and status retrieval.
"""
from __future__ import annotations

import os
from typing import Tuple, Dict, Any
import rq
from redis_client import task_queue, redis_conn
from utils import get_logger

# NOTE these 2 attempts to import is necessary for the worker to work
try:
    from cloudshield.Server.tasks import (
        provision_network,
        destroy_environment,
        provision_workstations,
        dc_add_user,
        dc_remove_user,
        dc_restart_samba_service,
        dc_user_list,
        dc_set_password,
        dc_create_file_share,
        dc_delete_file_share
    )
except ImportError:  # pragma: no cover - fallback for legacy PYTHONPATH
    from tasks import (  # noqa: E501
        provision_network, destroy_environment, provision_workstations, dc_add_user,
        dc_restart_samba_service, dc_user_list, dc_set_password, dc_create_file_share,
        dc_delete_file_share, dc_remove_user
    )

JOB_TIMEOUT = int(os.getenv("CLOUDSHIELD_JOB_TIMEOUT", "1200"))
Job = rq.job.Job  # type: ignore[attr-defined]
logger = get_logger("service")

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
    job = task_queue.enqueue(
        destroy_environment,
        org_id,
        force,
        job_timeout=JOB_TIMEOUT,
    )
    # Avoid logging user-controlled identifiers
    logger.info("Enqueued destroy job")
    return job

def enqueue_dc_add_user(org_id: str, username: str, password: str):
    """
    Enqueue an Active Directory (Domain Controller) "add user" task.

    Args:
        org_id (str): Organization ID that owns the domain.
        username (str): Username to be created in the domain.
        password (str): Initial password for the new DC user.

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
            password
    )
    logger.info("Enqueued dc_add_user job")
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

def enqueue_create_file_share(org_id: str, share_name: str):
    job = task_queue.enqueue(
            dc_create_file_share,
            org_id,
            share_name
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
    pass
    job = task_queue.enqueue(
            dc_remove_user,
            org_id,
            username,
    )
    logger.info("Enqueued dc_remove_user")
    return job


SERVICES = {
    "provision_network": enqueue_provision,
    "provision_workstations": enqueue_provision_workstations,
    "destroy": enqueue_destroy,
    "dc_add_user": enqueue_dc_add_user,
    "dc_remove_user": enqueue_dc_remove_user,
    "dc_restart_samba_service": enqueue_dc_restart_samba_service,
    "dc_user_list": enqueue_dc_user_list,
    "dc_set_password": enqueue_dc_set_password,
    "dc_create_file_share": enqueue_create_file_share,
    "dc_delete_file_share": enqueue_delete_file_share,
}

def service_dispatcher(service_name: str, *args, **kwargs):
    """
    Dynamically dispatch a service request to the appropriate enqueue function.

    Args:
        service_name (str): Name of the service to invoke (must exist in SERVICES map).
        *args: Positional arguments passed through to the service.
        **kwargs: Keyword arguments forwarded to the target enqueue function.

    Returns:
        Job: The RQ job object returned by the enqueue function.

    Raises:
        Exception: If 'service_name' does not exist in the SERVICES registry.

    Behaviour:
        - Validates that the requested service is registered.
        - Logs the service dispatch event (without sensitive payloads).
        - Calls the corresponding 'enqueue_*' function to queue the job.
    """
    if service_name not in SERVICES:
        raise ValueError(f"Unknown service called: {service_name}")

    logger.info(f"Service dispatched to {service_name}")

    service = SERVICES[service_name]
    return service(*args, **kwargs)
