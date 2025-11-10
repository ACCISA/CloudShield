"""
Network provisioning tasks for CloudShield infrastructure.

This module handles AWS infrastructure provisioning and destruction using Terraform.
Expects the provisioner module to be available in the same directory (configured
via Docker volume mounts in docker-compose.yml).
"""
from rq import get_current_job
import os
from pathlib import Path
from provisioner import provision_network_terraform  # noqa: E402
from provisioner import destroy as destroy_infra  # noqa: E402
from cloudshield.Server.utils import (
    get_logger,
    db,
    set_progress,
    get_job_id_fallback,
    run_stream,
)
from cloudshield.Server.adapters import map_metadata_to_ec2_instances
from cloudshield.Server.repos import insert_inventory, delete_inventory_by_org


"""
Add the Cloud/terraform directory to the path to import main and destroy_infra
base_dir = Path(__file__).resolve().parents[1]
terraform_dir = base_dir / "Cloud" / "terraform"
sys.path.insert(0, str(terraform_dir))
We wont be running the above code because we can just move the scripts to the same location using docker.
This setup only works in the docker container
run: sudo docker-compose up api
"""

_module_logger = get_logger("tasks")
CLOUDSHIELD_JOBS_DIR = "/var/lib/cloudshield"

# Network Provisioning Tasks
def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    """
    Provisions only the workstations via Terraform.
    Uses shared 'run_stream' + 'set_progress' for less boilerplate and reuse.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    logger.info("Provision %d workstations: org_id=%s region=%s", count, org_id, region)
    set_progress("starting")


    base_dir = Path(__file__).resolve().parents[1]
    runs_dir = base_dir / "Cloud" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    work_dir = runs_dir / org_id

    # Verify work_dir exists
    if not work_dir.exists():
        logger.warning("Work dir missing for org '%s': %s", org_id, work_dir)
        raise FileNotFoundError(f"Work dir does not exist for org '{org_id}'")
    
    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")

    # Run terraform apply for workstations only
    try:
        set_progress("terraform apply (workstations)")
        cmd = [
        "terraform", "apply", "-auto-approve", "-input=false",
        "-target=aws_instance.workstation",
        f"-var=workstation_count={count}",
        "-var=workstation_enable=true",
        ]
        logs_tail = run_stream(cmd, cwd=str(work_dir), env=env, logger=logger)
        set_progress("completed")
        logger.info("Provisioned workstations for org %s", org_id)
        return {"message": "Provisioning workstations complete", "work_dir": str(work_dir), "logs_tail": logs_tail}
    except Exception as e:
        logger.exception("Provisioning workstations failed: org=%s err=%s", org_id, e)
        set_progress(f"failed: {e}")
        raise

# Full Network Provisioning Task
def provision_network(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None):
    """
    Provisions the full network using Terraform templates.
    Isolates progress, mapping, and DB writes via helpers for reuse.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    logger.info(
        "Provision requested: org_id=%s region=%s ubuntu_ami=%s workstation_ami=%s",
        org_id, region, ubuntu_ami, workstation_ami,
    )
    set_progress("starting")

    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    templates_dir = base_dir / "templates"
    generated_dir = base_dir / "terraform" / "generated" / org_id

    # Begin provisioning
    try:
        set_progress("provisioning infrastructure")
        logger.info("Calling provision_network_terraform for org %s", org_id)

        metadata = provision_network_terraform(
            org_id=org_id,
            region=region,
            templates_dir=templates_dir,
            generated_dir=generated_dir,
            server_logger=logger,
        )


        if metadata is None:
            # Early return with explicit failure details, still sets progress.
            details = "Provisioning failed since the generated directory already exists"
            set_progress("failed")
            job = get_current_job()
            if job:
                job.meta["details"] = details
                job.save_meta()
            return {"message": "Provisioning failed", "details": details}
        
        # Keeps orchestration clean, makes mapping/DB writes available to other tasks.
        set_progress("completed")


        logger.info("Metadata from provisioner: %s", metadata)
        assets = map_metadata_to_ec2_instances(metadata)


        # Centralized persistence via repository helper (insert_inventory)
        res = insert_inventory(db=db, org_id=org_id, assets=assets)
        logger.info("Stored assets in Inventory (inventory_id=%s)", getattr(res, "inserted_id", None))

        logger.info("Provisioning complete for org %s", org_id)
        return {"message": "Provisioning complete", "work_dir": str(generated_dir), "metadata": metadata}

    except Exception as e:
        logger.exception("Provisioning failed for org %s: %s", org_id, e)
        set_progress(f"failed: {e}")
        raise

def destroy_environment(org_id: str, force: bool = False):
    """
    Destroys an environment and removes its Inventory entry.
    Uses set_progress + repo delete helper; logs consistent outcomes.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    logger.info("Destroy requested: org_id=%s force=%s", org_id, force)
    set_progress("starting destroy")

    generated_dir = Path(CLOUDSHIELD_JOBS_DIR) / "terraform" / "generated" / org_id

    try:
        if not generated_dir.exists():
            logger.warning("Destroy requested but work dir not found: %s", generated_dir)
            set_progress("no run directory found")
            return {"message": "No run directory found; nothing to destroy", "removed_dir": False}

        set_progress("destroying infrastructure")
        region = "ca-central-1"
        destroy_infra(org_id, region=region, force_empty_s3=force, org_dir=generated_dir, server_logger=logger)

        set_progress("completed destroy")

        res = delete_inventory_by_org(db=db, org_id=org_id)
        if res:
            logger.info("Deleted assets from database (org_id=%s)", org_id)
        else:
            logger.error("AWS destroyed but no assets found in Inventory (org_id=%s)", org_id)


        logger.info("Destroy complete for org %s", org_id)
        return {"message": "Destroy complete", "removed_dir": True}

    except Exception as e:
        logger.exception("Destroy failed for org %s: %s", org_id, e)
        set_progress(f"failed destroy: {e}")
    raise