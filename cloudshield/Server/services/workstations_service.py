import rq

from utils import get_logger, workstations_queue

logger = get_logger("workstations")


def ws_create_default(org_id):
    from cloudshield.Server.tasks import ws_create_default as _task # type: ignore

    return _task(org_id)

def enqueue_ws_create_default(org_id):
    job = workstations_queue.enqueue(
        ws_create_default,
        org_id
    )
    logger.info("Enqueued ws_create_default")
    return job

SERVICES = {
    "ws_create_default": enqueue_ws_create_default
}
