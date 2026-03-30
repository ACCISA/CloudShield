from utils import get_logger

from .workstations_service import SERVICES as WS_SERVICES
from .job_service import SERVICES as JOB_SERVICES

SERVICES = JOB_SERVICES | WS_SERVICES

logger = get_logger("service")

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
        - Propagates the HTTP request_id into job.meta so logs can be
          correlated across the request → worker boundary.
    """
    if service_name not in SERVICES:
        raise ValueError(f"Unknown service called: {service_name}")

    service = SERVICES[service_name]
    job = service(*args, **kwargs)

    # Propagate the HTTP request_id into RQ job metadata so that the task
    # worker can include it in its log lines (cross-boundary correlation).
    try:
        from flask import g
        request_id = getattr(g, "request_id", None)
        if request_id and job is not None and hasattr(job, "meta"):
            job.meta["_request_id"] = request_id
            job.save_meta()
    except RuntimeError:
        pass  # Not inside a Flask request context (e.g. called from a worker)

    return job

