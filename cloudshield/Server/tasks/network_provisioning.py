"""
Network provisioning tasks for CloudShield infrastructure.

This module handles AWS infrastructure provisioning and destruction using Terraform.
Expects the provisioner module to be available in the same directory (configured
via Docker volume mounts in docker-compose.yml).
"""
from rq import get_current_job
import os
import subprocess
from pathlib import Path

from provisioner import provision_network_terraform, get_target_dir  # noqa: E402
from provisioner import destroy as destroy_infra  # noqa: E402
from utils import get_logger, db
from models import Inventory, EC2Instance

_module_logger = get_logger("tasks")
CLOUDSHIELD_JOBS_DIR = "/var/lib/cloudshield"


def _run(cmd: list[str], cwd: str, env: dict | None = None, logger=None):
    """
    Execute shell command and yield output lines.
    
    Raises subprocess.CalledProcessError on non-zero exit.
    """
    if logger is None:
        logger = _module_logger
    
    logger.debug("Executing command: %s (cwd=%s)", " ".join(cmd), cwd)
    
    all_output = []
    
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
        logger.error("Last 30 lines of output:\n" + "\n".join(all_output[-30:]))
        raise subprocess.CalledProcessError(proc.returncode, cmd)
    
    logger.debug("Command succeeded: %s", " ".join(cmd))


def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    """
    Provision workstation instances for an org using Terraform.
    
    Requires existing network infrastructure to be provisioned first.
    """
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)
    
    logger.info("Provision %d workstations requested: org_id=%s region=%s", count, org_id, region)
    if job is not None:
        job.meta["progress"] = "starting destroy"
        job.save_meta()
    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    generated_dir = base_dir / "terraform" / "generated" / org_id
    target_dir = get_target_dir(org_id, str(generated_dir))
    work_dir = Path(target_dir)
    if not work_dir.exists():
        logger.warning("Work dir does not exist for org '%s', cannot provision workstations: %s", org_id, work_dir)
        raise FileNotFoundError(f"Work dir does not exist for org '{org_id}'")
    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")

    logs_tail: list[str] = []
    try:
        if job is not None:
            job.meta["progress"] = "get existing workstation count"
            job.save_meta()
        logger.info("[TASK] Getting existing workstation count for org %s", org_id)
        initial_count=0
        try:
            count_cmd = f"terraform state list aws_instance.{org_id}_workstation | wc -l"
            output = subprocess.check_output(count_cmd, cwd=str(target_dir), env=env, shell=True, text=True)
            initial_count = int(output.strip())
        except subprocess.CalledProcessError as e:
            logger.info("[TASK] No existing workstations found for org %s: %s", org_id, e)
        logger.info("[TASK] Existing workstation count for org %s: %d", org_id, initial_count)
        if job is not None:
            job.meta["progress"] = "terraform apply"
            job.save_meta()
        logger.info("[TASK] Running terraform apply for org %s", org_id)
        cmd = [
            "terraform", "apply", "-auto-approve", "-input=false",
            "-var", f"workstation_count={count+initial_count}",
            "-var", f"org_id={org_id}",
            "-var", f"region={region}",
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
            
        logger.info("[TASK] Provisioning workstations complete for org %s", org_id)
        return {"message": "Provisioning workstations complete", "work_dir": str(target_dir), "logs_tail": logs_tail, "new_workstation_count": count + initial_count}
    except Exception as e:
        logger.exception("Provisioning workstations failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed: {e}"
            job.meta["logs_tail"] = logs_tail
            job.save_meta()
        raise


def provision_network(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None, workstation_count: int = 0):
    """
    Provision AWS network infrastructure with VPC, domain controller, and workstations.
    
    Stores asset inventory in MongoDB and updates RQ job metadata with progress.
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
        metadata = provision_network_terraform(
                org_id=org_id,
                region=region,
                templates_dir=templates_dir,
                generated_dir=generated_dir,
                count=workstation_count,
                server_logger=logger
        )
        
        if metadata is None:
            details = "Provisioning failed since the generated directory already exists"
            logger.error("[TASK] %s (org_id=%s)", details, org_id)
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

            res = itam_db.insert_one(Inventory(
                org_id = org_id,
                assets = assets
            ).dict(by_alias=True))

            logger.info(f"[TASK] Stored assets (invetory_id={res.inserted_id})")

        logger.info("Provisioning complete for org %s", org_id)

        

        return {
            "message": "Provisioning complete",
            "work_dir": str(generated_dir),
            "metadata": metadata
        }
    except Exception as e:
        logger.exception("[TASK] Provisioning failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed: {e}"
            job.save_meta()
        raise


def destroy_environment(org_id: str, force: bool = False):
    """
    Destroy AWS infrastructure and remove assets from ITAM inventory.
    
    Deletes Terraform state directory and updates RQ job progress.
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
