"""
Service layer for job enqueueing and status retrieval.
"""
from __future__ import annotations

import os
from typing import Tuple, Dict, Any
import rq
from redis_client import task_queue, redis_conn
from tasks import provision_network, destroy_environment, provision_workstations, dc_add_user
from utils import get_logger

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

def enqueue_provision(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None) -> Job:
    """
    Enqueue a new infrastructure provisioning job.

    Args:
        org_id (str): Organization ID for which the environment is provisioned.
        region (str): Cloud region to deploy to (default: "ca-central-1").
        ubuntu_ami (str | None): Optional Ubuntu AMI override.
        workstation_ami (str | None): Optional workstation AMI override.

    Returns:
        Job: RQ Job instance representing the queued provisioning task.

    Behaviour:
        - Pushes a 'provision_network' job onto the Redis queue.
        - Job timeout is defined by 'CLOUDSHIELD_JOB_TIMEOUT' (default 1200s).
        - Logs job enqueue events (without sensitive info).
    """
    job = task_queue.enqueue(
        provision_network,
        org_id,
        region,
        ubuntu_ami,
        workstation_ami,
        job_timeout=JOB_TIMEOUT,
    )
    # Avoid logging user-controlled identifiers
    logger.info("Enqueued provision job")
    return job

def enqueue_provision_workstations(org_id: str, region: str = "us-west-2", count: int = 1) -> Job:
    """
    Enqueue a provisioning job for multiple workstations.

    Args:
        org_id (str): Organization ID requesting provisioning.
        region (str): Cloud region to deploy to (default: "us-west-2").
        count (int): Number of workstations to provision (default: 1).

    Returns:
        Job: RQ Job instance for the provisioning operation.

    Behaviour:
        - Enqueues a 'provision_workstations' job.
        - Supports scaling based on workstation count.
    """
    job = task_queue.enqueue(
        provision_workstations,
        org_id,
        region,
        count,
        job_timeout=JOB_TIMEOUT,
    )
    # Avoid logging user-controlled identifiers
    logger.info("Enqueued provision workstations job")
    return job

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
    logger.info("Enqueued dc add user job")
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
def enqueue_dc_remove_user(org_id: str, username: str, password: str):
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

SERVICES = {
    "provision_network": enqueue_provision,
    "provision_workstations": enqueue_provision_workstations,
    "destroy": enqueue_destroy,
    "dc_add_user": enqueue_dc_add_user
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



