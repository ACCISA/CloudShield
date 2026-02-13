"""
Network provisioning tasks for CloudShield infrastructure.

This module handles AWS infrastructure provisioning and destruction using Terraform.
Expects the provisioner module to be available in the same directory (configured
via Docker volume mounts in docker-compose.yml).
"""
import os
import subprocess
from pathlib import Path
from datetime import datetime, timezone

from rq import get_current_job

from utils import (
    get_logger,
    db,
    set_progress,
    get_job_id_fallback,
    run_stream,
    get_workstation_count,
    organizations,
    org_filter,
)
from cloudshield.Server.utils.database import db_admin
from adapters import map_metadata_to_ec2_instances
from repos import insert_inventory, delete_inventory_by_org
from provisioner import (
    provision_network_terraform, 
    get_target_dir, 
    destroy_infra, 
    provision_workstation
)
from cloudshield.Cloud.docker_provisioner.provision import provision_network_docker

_module_logger = get_logger("tasks")
CLOUDSHIELD_JOBS_DIR = "/var/lib/cloudshield"


def _coerce_int(val, default: int | None) -> int:
    """Return int(val) when numeric; otherwise a safe default."""
    if isinstance(val, bool):
        return default
    if isinstance(val, (int, float)):
        return int(val)
    return default


def _run(cmd: list[str], cwd: str, env: dict | None = None, logger=None):
    """Run a shell command yielding output lines and raising on nonzero exit."""
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


def _update_org_provisioning_status(org_id: str, status: str, job_id: str | None, logger=None) -> None:
    """Best-effort update of provisioning status on the organization document."""
    update = {
        "provisioning_status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if job_id is not None:
        update["provisioning_job_id"] = job_id

    try:
        organizations.update_one(org_filter(org_id), {"$set": update})
    except Exception as exc:
        if logger:
            logger.warning("Failed to update provisioning status for org %s: %s", org_id, exc)


def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    job = get_current_job()
    job_id = job.id if job else get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)
    
    set_progress("starting")
    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    generated_dir = base_dir / "terraform" / "generated" / org_id
    
    target_dir_res = get_target_dir(org_id, str(generated_dir))
    if not target_dir_res:
        target_dir_res = str(generated_dir)
    work_dir = Path(target_dir_res)
    
    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")
    try:
        set_progress("terraform get init workstation count")
        initial_count = get_workstation_count(org_id, env=env)
        set_progress("terraform apply workstations")
        cmd = [
            "terraform", "apply", "-auto-approve", "-input=false",
            "-var", f"workstation_count={count+initial_count}",
            "-var", f"org_id={org_id}",
            "-var", f"region={region}",
        ]
        logs_tail = run_stream(cmd, cwd=str(work_dir), env=env, logger=logger)

        try:
            workstations = db_admin["workstations"]
            workstations.update_many(
                {"org_id": org_id, "status": "provisioning"},
                {"$set": {"status": "online", "last_seen": datetime.now(timezone.utc)}},
            )
        except Exception as exc:
            logger.warning("Failed to update workstation status: %s", exc)

        set_progress("completed")
        return {
            "message": "Provisioning workstations complete", 
            "work_dir": str(target_dir_res), 
            "new_workstation_count": count + initial_count,
            "logs_tail": logs_tail
            }
    except Exception as e:
        set_progress(f"failed: {e}")
        raise

# Full Network Provisioning Task
def provision_network(org_id: str, region: str = "ca-central-1", ubuntu_ami: str | None = None, workstation_ami: str | None = None, workstation_count: int | None = None):
    job = get_current_job()
    job_id = job.id if job else get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)
    set_progress("starting")

    org_doc = organizations.find_one(org_filter(org_id)) or {}
    org_doc["org_id"] = org_id

    org_limit = _coerce_int(org_doc.get("workstation_limit"), default=None)
    desired_workstations = workstation_count if workstation_count not in (None, 0) else org_limit or 1
    desired_workstations = _coerce_int(desired_workstations, default=1)

    if org_limit is not None and desired_workstations > org_limit:
        raise ValueError("Requested workstation_count exceeds organization limit")

    _update_org_provisioning_status(org_id, "in_progress", job_id, logger)

    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    templates_dir = base_dir / "templates"
    generated_dir = base_dir / "terraform" / "generated" / org_id

    try:
        # --- DOCKER PATH ---
        # This handles local Docker provisioning (Fast Mode)
        if os.environ.get("DEPLOYMENT_MODE") == "docker":
            set_progress("provisioning docker infrastructure")
            metadata = provision_network_docker(
                org_data={"org_id": org_id},
                region=region,
                templates_dir=templates_dir,
                generated_dir=generated_dir,
                count=desired_workstations,
                server_logger=logger
            )

            # If metadata is empty or None, treat it as a failure
            if not metadata:
                set_progress("failed")
                if job:
                    job.meta["details"] = "Docker provisioner returned no metadata"
                _update_org_provisioning_status(org_id, "failed", job_id, logger)
                return {"status": "error", "message": "Provisioning failed"}

            # --- [CRITICAL] SAVE ASSETS TO DB ---
            # We must map the Docker metadata to the internal asset format and save it
            # so they appear in the Dashboard/Inventory.
            try:
                assets = map_metadata_to_ec2_instances(metadata)
                insert_inventory(db=db, org_id=org_id, assets=assets)
                logger.info("Stored Docker assets in Inventory for org %s", org_id)
            except Exception as db_err:
                logger.error("Failed to save Docker assets to DB: %s", db_err)
                # We do not raise here, so the user still sees 'Success'
            # --------------------------------------

            # SUCCESS: Return here so we DO NOT fall through to Terraform logic
            set_progress("completed")
            _update_org_provisioning_status(org_id, "completed", job_id, logger)
            
            return {
                "status": "success",
                "message": "Provisioning complete", 
                "metadata": metadata
            }

        # --- TERRAFORM PATH (Production / AWS) ---
        set_progress("provisioning infrastructure")
        metadata = provision_network_terraform(
                org_data=org_doc,
                region=region,
                templates_dir=templates_dir,
                generated_dir=generated_dir,
                count=desired_workstations,
                server_logger=logger
        )

        if metadata is None:
            set_progress("failed")
            if job:
                job.meta["details"] = "Provisioning failed"
            _update_org_provisioning_status(org_id, "failed", job_id, logger)
            return {"status": "error", "message": "Provisioning failed"}

        if isinstance(metadata, dict):
            metadata = [metadata]

        set_progress("completed")
        _update_org_provisioning_status(org_id, "completed", job_id, logger)

        ws_metadata = provision_workstation(org_id, logger)
        if isinstance(ws_metadata, dict) and "private_ip" in ws_metadata:
            metadata.append(ws_metadata)

        assets = map_metadata_to_ec2_instances(metadata)
        insert_inventory(db=db, org_id=org_id, assets=assets)

        return {
            "status": "success",
            "message": "Provisioning complete", 
            "metadata": metadata
        }

    except Exception as e:
        set_progress(f"failed: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)
        raise

def destroy_environment(org_id: str, force: bool = False):
    job = get_current_job()
    job_id = job.id if job else get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)
    set_progress("starting destroy")

    generated_dir = Path(CLOUDSHIELD_JOBS_DIR) / "terraform" / "generated" / org_id

    if not generated_dir.exists() and not force:
        set_progress("no run directory found")
        return {"message": "No run directory found; nothing to destroy", "removed_dir": False}

    try:
        # --- DOCKER DESTROY ---
        if os.environ.get("DEPLOYMENT_MODE") == "docker":
            import python_on_whales
            docker_client = python_on_whales.DockerClient()
            for c in docker_client.container.list(filters=[("name", f"{org_id}-")]):
                c.remove(force=True)
            set_progress("completed destroy")
            delete_inventory_by_org(db=db, org_id=org_id)
            _update_org_provisioning_status(org_id, "destroyed", job_id, logger)
            return {"message": "Destroy complete", "removed_dir": True}

        # --- TERRAFORM DESTROY ---
        destroy_infra(org_id, region="ca-central-1", force_empty_s3=force, org_dir=generated_dir, server_logger=logger)
        set_progress("completed destroy")
        delete_inventory_by_org(db=db, org_id=org_id)
        _update_org_provisioning_status(org_id, "destroyed", job_id, logger)
        return {"message": "Destroy complete", "removed_dir": True}

    except Exception as e:
        set_progress(f"failed destroy: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)

def destroy_network_docker():
    pass