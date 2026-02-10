from rq import get_current_job

from provisioner import provision_default_workstation, provision_custom_workstation, provision_workstation_vm
from utils import get_logger, update_job, db, organizations, org_filter
from repos import insert_workstation_template, insert_workstation, update_workstation, update_workstation_template, get_workstation, get_workstation_template 
from models import WorkstationStatus
from .task import get_server_nodes

def ws_create_default(org_id, name, description, software, access_groups):
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

    ws_template = insert_workstation_template(
        db=db,
        name=name,
        org_id=org_id,
        description=description,
        software=software,
        is_ready=True,
        access_groups=access_groups
    )

    if ws_template is None:
        logger.error("Failed to insert vm template to database")
        update_job(job, "failed to create template db")
        return
    
    template_id = str(ws_template.inserted_id)

    update_job(job, "starting ws_create_default")

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
            mac=data["mac"],
            ipv4_address=data["ipv4_address"],
            status=WorkstationStatus.ACTIVE
    )


    
def wc_create_custom():
    """
    Create a custom workstation
    """
    pass
