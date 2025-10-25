"""Service layer for job enqueueing and status retrieval.

"""
from __future__ import annotations

import os
from typing import Tuple, Dict, Any
import rq
from ..redis_client import task_queue, redis_conn
from ..tasks import provision_network, destroy_environment, provision_workstations
from ..utils.logging_setup import get_logger

JOB_TIMEOUT = int(os.getenv("CLOUDSHIELD_JOB_TIMEOUT", "1200"))
Job = rq.job.Job  # type: ignore[attr-defined]
logger = get_logger("service")


def enqueue_provision(org_id: str, region: str = "us-west-2", ubuntu_ami: str | None = None, workstation_ami: str | None = None) -> Job:
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
    job = task_queue.enqueue(
        destroy_environment,
        org_id,
        force,
        job_timeout=JOB_TIMEOUT,
    )
    # Avoid logging user-controlled identifiers
    logger.info("Enqueued destroy job")
    return job


def get_job_status(job_id: str) -> Tuple[Dict[str, Any], int]:
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
    try:
        ping = redis_conn.ping()
    except Exception as e:  # pragma: no cover - network error path
        logger.error("Health check failed: %s", e)
        return {"status": "degraded", "redis": False, "error": str(e)}, 503
    return {"status": "ok", "redis": bool(ping)}, 200
