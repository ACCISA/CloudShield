from rq import get_current_job

from provisioner import provision_default_workstation, provision_custom_workstation
from utils import get_logger, update_job, db
from repos import insert_workstation_image


def ws_create_default(org_id):
    """
    Create a default workstation
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"

    logger = get_logger("job", job_id=job_id)

    update_job(job, "starting ws_create_default")

    provision_default_workstation(
        job=job,
        updater=update_job,
        logger=logger
    )

    insert_workstation_image(db, org_id=org_id)

    pass

def wc_create_custom():
    """
    Create a custom workstation
    """
    pass
