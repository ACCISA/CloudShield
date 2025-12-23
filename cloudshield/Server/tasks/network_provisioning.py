"""
Network provisioning tasks for CloudShield infrastructure.

This module handles AWS infrastructure provisioning and destruction using Terraform.
Expects the provisioner module to be available in the same directory (configured
via Docker volume mounts in docker-compose.yml).
"""
import os
import subprocess
from datetime import datetime
from pathlib import Path

from rq import get_current_job

from utils import (
    get_logger,
    db,
    set_progress,
    get_job_id_fallback,
    run_stream,
    get_workstation_count
)
from adapters import map_metadata_to_ec2_instances
from repos import insert_inventory, delete_inventory_by_org
from provisioner import provision_network_terraform, get_target_dir, destroy_infra

# Organization collection for status updates
_organizations = db["organizations"]


def _update_org_provisioning_status(org_id: str, status: str, job_id: str | None = None, logger=None):
    """
    Update organization's provisioning status in the database.

    Args:
        org_id: Organization identifier.
        status: New provisioning status ("pending", "in_progress", "completed", "failed").
        job_id: Optional job ID to associate with provisioning.
        logger: Optional logger instance.
    """
    update_doc = {
        "provisioning_status": status,
        "updated_at": datetime.utcnow(),
    }
    if job_id is not None:
        update_doc["provisioning_job_id"] = job_id

    result = _organizations.update_one(
        {"org_id": org_id},
        {"$set": update_doc}
    )
    if logger:
        if result.modified_count > 0:
            logger.info("Updated org '%s' provisioning_status to '%s'", org_id, status)
        else:
            logger.warning("No org found with org_id='%s' to update status", org_id)


def _get_org_config(org_id: str, logger=None) -> dict | None:
    """
    Retrieve organization configuration from the database.

    Args:
        org_id: Organization identifier.
        logger: Optional logger instance.

    Returns:
        Organization document dict or None if not found.
    """
    org = _organizations.find_one({"org_id": org_id})
    if org and logger:
        logger.info("Found org config for '%s': package=%s, workstation_limit=%d",
                    org_id, org.get("package_type"), org.get("workstation_limit", 0))
    return org


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


def _run(cmd: list[str], cwd: str, env: dict | None = None, logger=None):
    """Run a shell command yielding output lines and raising on nonzero exit."""
    if logger is None:
        logger = _module_logger
    
    logger.debug("Executing command: %s (cwd=%s)", " ".join(cmd), cwd)
    
    all_output = []  # Capture everything
    
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        stripped = line.rstrip()
        all_output.append(stripped)  # Save it
        logger.debug("[cmd output] %s", stripped)
        yield stripped
    
    proc.wait()
    if proc.returncode != 0:
        logger.error("Command failed (%s): return code %s", " ".join(cmd), proc.returncode)
        # Log the last 30 lines before failure
        logger.error("Last 30 lines of output:\n" + "\n".join(all_output[-30:]))
        raise subprocess.CalledProcessError(proc.returncode, cmd)
    
    logger.debug("Command succeeded: %s", " ".join(cmd))


def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    """
    Provisions additional workstations via Terraform.
    
    Validates against the organization's workstation_limit before provisioning.
    Uses shared 'run_stream' + 'set_progress' for less boilerplate and reuse.
    
    Args:
        org_id: Organization identifier.
        region: AWS region (default: ca-central-1).
        count: Number of additional workstations to provision.
        
    Raises:
        ValueError: If adding workstations would exceed org's workstation_limit.
        FileNotFoundError: If Terraform work directory doesn't exist.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)
    
    logger.info("Provision %d workstations requested: org_id=%s region=%s", count, org_id, region)
    set_progress("starting")
    
    # Check workstation limit from organization config
    org_config = _get_org_config(org_id, logger)
    if org_config:
        workstation_limit = org_config.get("workstation_limit", float("inf"))
        current_count = get_workstation_count(org_id)
        if current_count + count > workstation_limit:
            error_msg = f"Cannot provision {count} workstations: would exceed limit ({current_count} + {count} > {workstation_limit})"
            logger.error(error_msg)
            set_progress(f"failed: {error_msg}")
            raise ValueError(error_msg)
    
    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    generated_dir = base_dir / "terraform" / "generated" / org_id
    target_dir = get_target_dir(org_id, str(generated_dir))
    work_dir = Path(target_dir)
    if not work_dir.exists():
        logger.warning("Work dir missing for org '%s': %s", org_id, work_dir)
        raise FileNotFoundError(f"Work dir does not exist for org '{org_id}'")
    
    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")
    # Run terraform apply for workstations only
    try:
        set_progress("terraform get init workstation count")
        initial_count = get_workstation_count(org_id, env=env)
        logger.info("[TASK] Existing workstation count for org %s: %d", org_id, initial_count)
        set_progress("terraform apply workstations")
        logger.info("[TASK] Running terraform apply for org %s", org_id)
        cmd = [
            "terraform", "apply", "-auto-approve", "-input=false",
            "-var", f"workstation_count={count+initial_count}",
            "-var", f"org_id={org_id}",
            "-var", f"region={region}",
        ]
        logs_tail = run_stream(cmd, cwd=str(work_dir), env=env, logger=logger)

        set_progress("completed")
            
        logger.info("[TASK] Provisioning workstations complete for org %s", org_id)
        return {
            "message": "Provisioning workstations complete", 
            "work_dir": str(target_dir), 
            "new_workstation_count": count + initial_count,
            "logs_tail": logs_tail
            }
    except Exception as e:
        logger.exception("Provisioning workstations failed: org=%s err=%s", org_id, e)
        set_progress(f"failed: {e}")
        raise

# Full Network Provisioning Task
def provision_network(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None, workstation_count: int | None = None):

    """
    Provisions the full network using Terraform templates.
    
    If workstation_count is not provided, it will be looked up from the organization's
    package configuration in the database.
    
    Isolates progress, mapping, and DB writes via helpers for reuse.
    
    Args:
        org_id: Organization identifier.
        region: AWS region for provisioning (default: ca-central-1).
        ubuntu_ami: Optional override for Ubuntu AMI ID.
        workstation_ami: Optional override for workstation AMI ID.
        workstation_count: Number of workstations to provision. If None, uses org's package limit.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    # Look up org config to get workstation_count from package if not provided
    org_config = _get_org_config(org_id, logger)
    
    if workstation_count is None:
        if org_config:
            workstation_count = org_config.get("workstation_limit", 0)
            logger.info("Using workstation_count=%d from org package '%s'", 
                       workstation_count, org_config.get("package_type"))
        else:
            workstation_count = 0
            logger.warning("No org config found for '%s', using workstation_count=0", org_id)

    logger.info(
        "Provision requested: org_id=%s region=%s ubuntu_ami=%s workstation_ami=%s workstation_count=%d",
        org_id, region, ubuntu_ami, workstation_ami, workstation_count,
    )
    
    # Update org status to in_progress
    _update_org_provisioning_status(org_id, "in_progress", job_id, logger)
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
                count=workstation_count,
                server_logger=logger
        )


        if metadata is None:
            # Early return with explicit failure details, still sets progress.
            details = "Provisioning failed since the generated directory already exists"
            set_progress("failed")
            _update_org_provisioning_status(org_id, "failed", job_id, logger)
            job = get_current_job()
            if job:
                job.meta["details"] = details
                job.save_meta()
            logger.error(details)
            return {"message": "Provisioning failed", "details": details}
        
        # Keeps orchestration clean, makes mapping/DB writes available to other tasks.
        set_progress("completed")
        _update_org_provisioning_status(org_id, "completed", job_id, logger)


        logger.info("Metadata from provisioner: %s", metadata)
        assets = map_metadata_to_ec2_instances(metadata)


        # Centralized persistence via repository helper (insert_inventory)
        res = insert_inventory(db=db, org_id=org_id, assets=assets)
        logger.info("Stored assets in Inventory (inventory_id=%s)", getattr(res, "inserted_id", None))

        logger.info("Provisioning complete for org %s", org_id)
        return {"message": "Provisioning complete", "work_dir": str(generated_dir), "metadata": metadata}

        

        return {
            "message": "Provisioning complete",
            "org_id": org_id,
            "region": region,
            "work_dir": str(generated_dir),
            "metadata": metadata
        }
    except Exception as e:
        logger.exception("Provisioning failed for org %s: %s", org_id, e)
        set_progress(f"failed: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)
        raise

def destroy_environment(org_id: str, force: bool = False):
    """
    Destroys an environment and removes its Inventory entry.
    
    Also resets the organization's provisioning_status to "pending" so it can
    be re-provisioned if needed.
    
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

        # Reset org provisioning status to pending so it can be re-provisioned
        _update_org_provisioning_status(org_id, "pending", job_id, logger)

        logger.info("Destroy complete for org %s", org_id)
        return {"message": "Destroy complete", "removed_dir": True}

    except Exception as e:
        logger.exception("Destroy failed for org %s: %s", org_id, e)
        set_progress(f"failed destroy: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)
    raise
