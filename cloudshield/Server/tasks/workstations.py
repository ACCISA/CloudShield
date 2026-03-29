import time
from datetime import datetime, timezone

from rq import get_current_job

from provisioner import provision_default_workstation, provision_workstation_vm
from utils import get_logger, update_job, db, db_admin, organizations, org_filter
from repos import insert_workstation_template, insert_workstation, update_workstation, update_workstation_template, get_workstation_template, get_unique_members_by_ids
from models import WorkstationStatus
from .task import get_server_nodes
from services import service_dispatcher


SIMULATE_WORKSTATION_CREATE_SECONDS = 0


def _enqueue_workstation_ready_email(requesting_user_id, workstation_name, logger):
    if not requesting_user_id:
        logger.warning("Skipping workstation ready email: missing requesting_user_id")
        return

    try:
        from services.job_service import enqueue_workstation_ready_email

        enqueue_workstation_ready_email(requesting_user_id, workstation_name)
    except Exception as exc:
        logger.error("Failed to enqueue workstation ready email: %s", exc)

def start_workstations(org_id, template_id, access_groups, members, logger):
    group_members = get_unique_members_by_ids(db, access_groups)
    all_members = group_members + members
    unique_members = set(all_members)
    amount = len(unique_members)

    logger.info(f"Starting {amount}")
    for _ in range(amount):
        service_dispatcher(service_name="ws_start", org_id=org_id, template_id=template_id)


def ws_create_default(org_id, name, description, software, access_groups, members, requesting_user_id=None):
    """
    Create a default workstation
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"

    logger = get_logger("job", job_id=job_id)
    
    org_doc = organizations.find_one(org_filter(org_id)) or None

    if org_doc is None:
        logger.error(f"Orginization not found (org_id={org_id})")
        update_job(job, "org not found")
        return
    try:
        ws_template = insert_workstation_template(
            db=db,
            name=name,
            org_id=org_id,
            description=description,
            software=software,
            is_ready=True,
            access_groups=access_groups,
            members=members
        )
    except Exception as e:
        logger.error(e)
        logger.error("Failed to insert workstation template to database")
        return

    if ws_template is None:
        logger.error("Failed to insert vm template to database")
        update_job(job, "failed to create template db")
        return
    
    template_id = str(ws_template.inserted_id)

    update_job(job, "starting ws_create_default")

    if SIMULATE_WORKSTATION_CREATE_SECONDS > 0:
        logger.info(
            "Simulating workstation template creation for %ss",
            SIMULATE_WORKSTATION_CREATE_SECONDS,
        )
        time.sleep(SIMULATE_WORKSTATION_CREATE_SECONDS)
        update_workstation_template(db, template_id=template_id, is_ready=True)
        _enqueue_workstation_ready_email(requesting_user_id, name, logger)
        logger.info("Successfully simulated workstation template creation")
        return {"result": {"template_id": template_id}}

    org_doc["id"] = org_id

    nodes = get_server_nodes(org_id)
    if nodes is None:
        logger.error(f"Failed to get nodes (org_id={org_id})")
        update_job(job, "failed to get server nodes")
        return

    samba_node = nodes.get("DOMAIN_CONTROLLER", None)

    if samba_node is None:
        logger.error(f"Failed to get DOMAIN_CONTROLLER node (org_id={org_id})")
        update_job(job, "failed to get DOMAIN_CONTROLLER node")
        return

    org_doc["samba_ip"] = samba_node.ip

    status = provision_default_workstation(
        org_data=org_doc,
        template_id=template_id,
        software=software,
        job=job,
        updater=update_job,
        logger=logger
    )

    if not status:
        logger.error("Failed to create workstation template")
        update_job(job, "failed")
        return

    update_workstation_template(db, template_id=template_id, is_ready=True)

    logger.info("Successfully created workstation template")
    _enqueue_workstation_ready_email(requesting_user_id, name, logger)

    start_workstations(org_id, template_id, access_groups, members, logger)

    return {"result":{"template_id":template_id}}

  
def ws_start(org_id, template_id):

    job = get_current_job()
    job_id = job.id if job else "unknown"

    logger = get_logger("job", job_id=job_id)
    
    ws_template = get_workstation_template(db=db, org_id=org_id, template_id=template_id)

    if ws_template is None:
        logger.error(f"Template not found (template_id={template_id})")
        update_job(job, "template not found")
        return

    if ws_template["is_ready"] is False:
        logger.warning("Image is not ready for provisioning, canceling workstation provisioning")
        update_job(job, "image not ready")
        return

    ws = insert_workstation(db=db, org_id=org_id, template_id=template_id)
    vm_id = ws.inserted_id
    logger.info(f"Added workstation to database (vm_id={vm_id})")

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
            workstation_id=vm_id,
            mac=data.get("mac", ""),
            ipv4_address=data["ipv4_address"],
            status=WorkstationStatus.ACTIVE,
            name=ws_template.get("name", "Workstation"),
            members=ws_template.get("members", []),
    )


    
def ws_create_custom():
    """
    Create a custom workstation
    """
    pass

def ws_provision_update(workstation_id, status):
    """
    Update a workstation's status after it reports back from provisioning.
    The workstation_id here is the Docker container ID stored as 'container_id'
    on the workstation document.
    """
    logger = get_logger("workstations")
    workstations = db_admin["workstations"]

    result = workstations.update_one(
        {"container_id": workstation_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
    )

    if result.modified_count == 0:
        logger.warning(f"No workstation found with container_id={workstation_id}")
    else:
        logger.info(f"Updated workstation container_id={workstation_id} to status={status}")

