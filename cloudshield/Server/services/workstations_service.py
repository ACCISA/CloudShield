import rq

from utils import get_logger, workstations_queue

logger = get_logger("workstations")


def ws_create_default(org_id, name, description, software, access_groups):
    from cloudshield.Server.tasks import ws_create_default as _task # type: ignore

    return _task(org_id, name, description, software, access_groups)

def ws_start(org_id, template_id):
    from cloudshield.Server.tasks import ws_start as _task

    return _task(org_id, template_id)

def enqueue_ws_create_default(org_id, name, description, software, access_groups):
    job = workstations_queue.enqueue(
        ws_create_default,
        org_id,
        name,
        description,
        software,
        access_groups
    )
    logger.info("Enqueued ws_create_default")
    return job

def enqueue_ws_start(org_id, template_id):
    job = workstations_queue.enqueue(
            ws_start,
            org_id,
            template_id
    )
    logger.info("Enqueue ws_start")
    return job
    

SERVICES = {
    "ws_create_default": enqueue_ws_create_default,
    "ws_start": enqueue_ws_start
}
