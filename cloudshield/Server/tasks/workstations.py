from rq import get_current_job

from provisioner import provision_default_workstation, provision_custom_workstation, provision_workstation_vm
from utils import get_logger, update_job, db
from repos import insert_workstation_template, insert_workstation, update_workstation
from models import WorkstationStatus


def ws_create_default(org_id):
    """
    Create a default workstation
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"

    logger = get_logger("job", job_id=job_id)

    update_job(job, "starting ws_create_default")

    status = provision_default_workstation(
        org_id=org_id,
        job=job,
        updater=update_job,
        logger=logger
    )

    if not status:
        logger.error("Failed to create workstation template")
        update_job(job, "failed")
        return

    logger.info("Successfully created workstation template")

    insert_workstation_template(
        db=db,
        name=name,
        org_id=org_id,
        description=description,
        software=software,
        is_ready=False,
        access_groups=access_groups
    )

def ws_start(org_id, template_id):

    job = get_current_job()
    job_id = job.id if job else "unknown"

    logger = get_logger("job", job_id=job_id)

    ws = insert_workstation(db=db, org_id=org_id, template_id=template_id)
    vm_id = ws.inserted_id

    update_job(job, "starting ws_start")
    
    data = provision_workstation_vm(
        org_id=org_id,
        template_id=template_id,
        vm_id=str(vm_id),
        job=job,
        updater=update_job,
        logger=logger
    )
    
    status = data["status"]

    if not status:
        logger.error("Failed to cretae workstation template")
        update_job(job, "failed")
        return

    logger.info("Successfully started workstation vm")

    update_workstation(
            db=db,
            mac=data["mac"],
            ipv4_address=data["ipv4_address"],
            status=WorkstationStatus.ACTIVE
    )


    
def wc_create_custom():
    """
    Create a custom workstation
    """
    pass
