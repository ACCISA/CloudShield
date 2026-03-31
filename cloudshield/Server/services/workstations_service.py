
from utils import get_logger, workstations_queue

logger = get_logger("workstations")


def ws_create_default(org_id, name, description, software, access_groups, members, requesting_user_id=None, template_id=None, vm_ids=None):
    from cloudshield.Server.tasks import ws_create_default as _task # type: ignore

    return _task(org_id, name, description, software, access_groups, members, requesting_user_id, template_id, vm_ids)

def ws_start(org_id, template_id, vm_id=None):
    from cloudshield.Server.tasks import ws_start as _task # type: ignore

    return _task(org_id, template_id, vm_id)

def ws_provision_update(workstation_id, status):
    from cloudshield.Server.tasks import ws_provision_update as _task # type: ignore

    return _task(workstation_id, status)

def enqueue_ws_create_default(org_id, name, description, software, access_groups, members, requesting_user_id=None, template_id=None, vm_ids=None, wallpaper=None):
    job = workstations_queue.enqueue(
        ws_create_default,
        org_id,
        name,
        description,
        software,
        access_groups,
        members,
        requesting_user_id,
        template_id,
        vm_ids,
        wallpaper,
        job_timeout=-1,  # Windows install can take 60+ min; no timeout
    )
    logger.info("Enqueued ws_create_default")
    return job

def enqueue_ws_start(org_id, template_id, vm_id=None):
    job = workstations_queue.enqueue(
            ws_start,
            org_id,
            template_id,
            vm_id,
    )
    logger.info("Enqueue ws_start")
    return job

def enqueue_ws_provision_update(workstation_id, status):
    job = workstations_queue.enqueue(
            ws_provision_update,
            workstation_id,
            status
    )
    logger.info("Enqueue ws_provision_update")
    return job
    

SERVICES = {
    "ws_create_default": enqueue_ws_create_default,
    "ws_start": enqueue_ws_start,
    "ws_provision_update": enqueue_ws_provision_update
}
