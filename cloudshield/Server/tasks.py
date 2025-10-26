from rq import get_current_job
import os
import shutil
import subprocess
from pathlib import Path
from .utils.logging_setup import get_logger
import sys

# Add the Cloud/terraform directory to the path to import main and destroy_infra
base_dir = Path(__file__).resolve().parents[1]
terraform_dir = base_dir / "Cloud" / "terraform"
sys.path.insert(0, str(terraform_dir))

from main import main as provision_main
from destroy_infra import destroy as destroy_infra

logger = get_logger("tasks")


def provision_network(org_id: str, region: str = "us-west-2", ubuntu_ami: str | None = None, workstation_ami: str | None = None):
    """
    Provisions the full network using Terraform templates.
    Calls the main() function from cloudshield/Cloud/terraform/main.py
    """
    logger.info("Provision requested: org_id=%s region=%s ubuntu_ami=%s workstation_ami=%s", org_id, region, ubuntu_ami, workstation_ami)
    job = get_current_job()
    if job is not None:
        job.meta["progress"] = "starting"
        job.save_meta()

    base_dir = Path(__file__).resolve().parents[1]  # .../cloudshield
    templates_dir = base_dir / "Cloud" / "templates"
    generated_dir = base_dir / "Cloud" / "terraform" / "generated" / org_id

    try:
        if job is not None:
            job.meta["progress"] = "provisioning infrastructure"
            job.save_meta()
        
        logger.info("Calling provision_main for org %s", org_id)
        # Call the main function from main.py with the appropriate arguments
        metadata = provision_main([
            "--org-id", org_id,
            "--region", region,
            "--templates-dir", str(templates_dir),
            "--generated-dir", str(generated_dir)
        ])

        if job is not None:
            job.meta["progress"] = "completed"
            job.save_meta()
        logger.info("Provisioning complete for org %s", org_id)
        return {
            "message": "Provisioning complete",
            "work_dir": str(generated_dir),
            "metadata": metadata
        }
    except Exception as e:
        logger.exception("Provisioning failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed: {e}"
            job.save_meta()
        raise


def destroy_environment(org_id: str, force: bool = False):
    """
    Destroys an environment for the given org_id and removes the run directory.
    Calls the destroy() function from cloudshield/Cloud/terraform/destroy_infra.py
    """
    logger.info("Destroy requested: org_id=%s force=%s", org_id, force)
    job = get_current_job()
    if job is not None:
        job.meta["progress"] = "starting destroy"
        job.save_meta()

    base_dir = Path(__file__).resolve().parents[1]
    generated_dir = base_dir / "Cloud" / "terraform" / "generated" / org_id

    try:
        if not generated_dir.exists():
            logger.warning("Destroy requested for org %s but work dir not found (%s)", org_id, generated_dir)
            if job is not None:
                job.meta["progress"] = "no run directory found"
                job.save_meta()
            return {"message": "No run directory found; nothing to destroy", "removed_dir": False}

        if job is not None:
            job.meta["progress"] = "destroying infrastructure"
            job.save_meta()
        
        logger.info("Calling destroy_infra for org %s", org_id)
        # Call the destroy function from destroy_infra.py
        # Note: destroy_infra.destroy() doesn't return a value, it prints to console
        # We'll assume region is ca-central-1 by default (can be made configurable if needed)
        region = "ca-central-1"
        destroy_infra(org_id, region=region, force_empty_s3=force)

        if job is not None:
            job.meta["progress"] = "completed destroy"
            job.save_meta()
        logger.info("Destroy complete for org %s", org_id)
        return {"message": "Destroy complete", "removed_dir": True}
    except Exception as e:
        logger.exception("Destroy failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed destroy: {e}"
            job.save_meta()
        raise


