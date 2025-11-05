from rq import get_current_job
import os
import subprocess
from pathlib import Path
from collections import deque

# Add the Cloud/terraform directory to the path to import main and destroy_infra
#base_dir = Path(__file__).resolve().parents[1]
#terraform_dir = base_dir / "Cloud" / "terraform"
#sys.path.insert(0, str(terraform_dir))
# we wont be running the above code because we can just move the scripts to the same location using docker.
# This setup only works in the docker container
# run: sudo docker-compose up api
from provisioner import provision_network_terraform  # noqa: E402
from provisioner import destroy as destroy_infra  # noqa: E402
from ..utils import get_logger, db
from ..models import Inventory, EC2Instance

# Module-level logger for non-job logging
_module_logger = get_logger("tasks")
CLOUDSHIELD_JOBS_DIR = "/var/lib/cloudshield"


def _run(cmd: list[str], cwd: str, env: dict | None = None, logger=None):
    """Run a shell command yielding output lines and raising on nonzero exit."""
    if logger is None:
        logger = _module_logger
    
    logger.debug("Executing command: %s (cwd=%s)", " ".join(cmd), cwd)
    
    all_output = deque(maxlen=100)
    
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
        all_output.append(stripped)
        logger.debug("[cmd output] %s", stripped)
        yield stripped
    
    proc.wait()
    if proc.returncode != 0:
        logger.error("Command failed (%s): return code %s", " ".join(cmd), proc.returncode)
        logger.error("Last 30 lines of output:\n" + "\n".join(list(all_output)[-30:]))
        raise subprocess.CalledProcessError(proc.returncode, cmd)
    
    logger.debug("Command succeeded: %s", " ".join(cmd))


def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    """
    Provisions only the workstations using Terraform templates.
    Copies the templates to a per-org working directory, injects org_id/region,
    optionally overrides AMIs via terraform.tfvars, and runs terraform init/apply.
    """
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)
    
    logger.info("Provision %d workstations requested: org_id=%s region=%s", count, org_id, region)
    if job is not None:
        job.meta["progress"] = "starting destroy"
        job.save_meta()
    base_dir = Path(__file__).resolve().parents[1]  # .../cloudshield
    runs_dir = base_dir / "Cloud" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    work_dir = runs_dir / org_id
    if not work_dir.exists():
        logger.warning("Work dir does not exist for org '%s', cannot provision workstations: %s", org_id, work_dir)
        raise FileNotFoundError(f"Work dir does not exist for org '{org_id}'")
    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")

    logs_tail: list[str] = []
    try:
        if job is not None:
            job.meta["progress"] = "terraform apply"
            job.save_meta()
        logger.info("Running terraform apply for org %s", org_id)
        cmd = [
            "terraform", "apply", "-auto-approve", "-input=false",
            "-target=aws_instance.workstation",
            f"-var=\"workstation_count={count}\"",
            "-var=\"workstation_enable=true\""
        ]
        for line in _run(cmd, cwd=str(work_dir), env=env, logger=logger):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        if job is not None:
            job.meta["progress"] = "completed"
            job.save_meta()
            
        logger.info("Provisioning workstations complete for org %s", org_id)
        return {"message": "Provisioning workstations complete", "work_dir": str(work_dir), "logs_tail": logs_tail}
    except Exception as e:
        logger.exception("Provisioning workstations failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed: {e}"
            job.meta["logs_tail"] = logs_tail
            job.save_meta()
        raise


def provision_network(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None):
    """
    Provisions the full network using Terraform templates.
    Calls the main() function from cloudshield/Cloud/terraform/main.py
    """
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)
    
    logger.info("Provision requested: org_id=%s region=%s ubuntu_ami=%s workstation_ami=%s", org_id, region, ubuntu_ami, workstation_ami)
    if job is not None:
        job.meta["progress"] = "starting"
        job.save_meta()

    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    templates_dir = base_dir / "templates"
    generated_dir = base_dir / "terraform" / "generated" / org_id

    try:
        if job is not None:
            job.meta["progress"] = "provisioning infrastructure"
            job.save_meta()
        
        logger.info("Calling provision_network_terraform for org %s", org_id)
        # Call the provisioner function with the appropriate arguments
        metadata = provision_network_terraform(
                org_id=org_id,
                region=region,
                templates_dir=templates_dir,
                generated_dir=generated_dir,
                server_logger=logger
        )
        
        if metadata is None:
            details = "Provisioning failed since the generated directory already exists"
            job.meta["progress"] = "failed"
            job.meta["details"] = details
            job.save_meta()
            return {
                    "message": "Provisioning failed",
                    "details": details
            }

        if job is not None:
            job.meta["progress"] = "completed"
            job.save_meta()
            
            assets = []
            # Store our aws assets into mongo db for future automated operations
            logger.info(metadata)
            for asset in metadata:
                assets.append(EC2Instance(
                    public_ip       = asset["public_ip"] or "",
                    private_ip      = asset["private_ip"],
                    vpc_id          = asset["vpc_id"],
                    name            = asset["name"],
                    priv_key_path   = asset["ssh_key"],
                    ami_id          = asset["ami_id"],
                    cpu             = asset["cpu"],
                    created_at      = asset["created_at"],
                    instance_id     = asset["instance_id"],
                    os              = asset["os"],
                    ports           = asset["ports"],
                    ram_gb          = asset["ram_gb"],
                    status          = asset["status"],
                    storage_size_gb = asset["storage_size_gb"],
                    subnet_id       = asset["subnet_id"],
                    updated_at      = asset["updated_at"]
                ))

            itam_db = db.itam

            # Instances will be stored in an inventory under an org_id
            res = itam_db.insert_one(Inventory(
                org_id = org_id,
                assets = assets
            ).dict(by_alias=True))

            logger.info(f"Stored assets (invetory_id={res.inserted_id})")

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
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)
    
    logger.info("Destroy requested: org_id=%s force=%s", org_id, force)
    if job is not None:
        job.meta["progress"] = "starting destroy"
        job.save_meta()

    generated_dir = Path(CLOUDSHIELD_JOBS_DIR) / "terraform" / "generated" / org_id

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
        destroy_infra(org_id, region=region, force_empty_s3=force, org_dir=generated_dir, server_logger=logger)

        if job is not None:
            job.meta["progress"] = "completed destroy"
            job.save_meta()

            itam_db = db.itam

            res = itam_db.find_one_and_delete({"org_id": org_id})

            if res:
                logger.info(f"Delete assets from database (org_id={org_id})")
            else:
                logger.error(f"AWS resources were destroyed but no assets were found in ITAM inventory (org_id={org_id})")

        logger.info("Destroy complete for org %s", org_id)
        return {"message": "Destroy complete", "removed_dir": True}
    except Exception as e:
        logger.exception("Destroy failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed destroy: {e}"
            job.save_meta()
        raise
