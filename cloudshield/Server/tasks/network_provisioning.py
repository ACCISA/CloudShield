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
from provisioner import provision_network_terraform, get_target_dir, destroy_infra, provision_workstation
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
    except Exception as exc:  # pragma: no cover - status update should not break task
        if logger:
            logger.warning("Failed to update provisioning status for org %s: %s", org_id, exc)


def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    """
    Provisions only the workstations via Terraform.
    Uses shared 'run_stream' + 'set_progress' for less boilerplate and reuse.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)
    
    logger.info("Provision %d workstations requested: org_id=%s region=%s", count, org_id, region)
    set_progress("starting")
    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    generated_dir = base_dir / "terraform" / "generated" / org_id
    target_dir = get_target_dir(org_id, str(generated_dir))
    if not target_dir:
        target_dir = str(generated_dir)
    work_dir = Path(target_dir)
    
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

        try:
            workstations = db_admin["workstations"]
            workstations.update_many(
                {"org_id": org_id, "status": "provisioning"},
                {"$set": {"status": "online", "last_seen": datetime.now(timezone.utc)}},
            )
        except Exception as exc:  # pragma: no cover - best effort only
            logger.warning("Failed to mark workstations online: %s", exc)
            
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
    Isolates progress, mapping, and DB writes via helpers for reuse.
    """
    job_id = get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    logger.info(
        "Provision requested: org_id=%s region=%s ubuntu_ami=%s workstation_ami=%s",
        org_id, region, ubuntu_ami, workstation_ami,
    )
    set_progress("starting")

    org_doc = organizations.find_one(org_filter(org_id)) or {}
    org_doc["org_id"] = org_id

    org_limit = _coerce_int(org_doc.get("workstation_limit"), default=None)
    desired_workstations = workstation_count if workstation_count not in (None, 0) else org_limit or 1
    desired_workstations = _coerce_int(desired_workstations, default=1)
    if desired_workstations <= 0:
        raise ValueError("workstation_count must be positive for provisioning")
    if org_limit is not None and desired_workstations > org_limit:
        raise ValueError("Requested workstation_count exceeds organization limit")

    workstation_count = desired_workstations

    _update_org_provisioning_status(org_id, "in_progress", job_id, logger)

    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    templates_dir = base_dir / "templates"
    generated_dir = base_dir / "terraform" / "generated" / org_id

    # Begin provisioning
    try:
        # --- START DOCKER INTERCEPTION ---
        if os.environ.get("DEPLOYMENT_MODE", "docker") == "docker":
            set_progress("provisioning docker infrastructure")
            logger.info("Engaging Docker Provisioner for org %s", org_id)

            org_data_payload = {
                "org_id": org_id,
                "domain_name": "cloudshield.local",
                "realm_name": "CLOUDSHIELD.LOCAL",
                "dc_admin_password": "Password123!"
            }

            metadata = provision_network_docker(
                org_data=org_data_payload,
                region=region,
                templates_dir=templates_dir,
                generated_dir=generated_dir,
                count=workstation_count,
                server_logger=logger
            )
            
            assets = []
            if metadata:
                for item in metadata:
                    cpu_val = 1
                    try:
                        cpu_raw = item.get("cpu", "1")
                        cpu_val = int(float(cpu_raw)) 
                        if cpu_val < 1:
                            cpu_val = 1
                    except Exception:
                        cpu_val = 1

                    assets.append({
                        "resource_id": item.get("instance_id"),
                        "instance_id": item.get("instance_id"),
                        "name": item.get("name"),
                        "private_ip": item.get("private_ip"),
                        "public_ip": item.get("public_ip", ""),
                        "type": "container",
                        "status": "running",
                        "org_id": org_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "vpc_id": item.get("vpc_id", f"{org_id}-net"),
                        "subnet_id": item.get("subnet_id", "docker-subnet"),
                        "ami_id": item.get("ami_id", "docker-image"),
                        "os": item.get("os", "linux"),
                        "cpu": cpu_val, 
                        "ram_gb": str(item.get("ram_gb", "1")),
                        "storage_size_gb": str(item.get("storage_size_gb", "10")),
                        "ports": item.get("ports", []),
                        "priv_key_path": item.get("ssh_key", "managed_by_docker"),
                        "port": item.get("port", "0") 
                    })

            set_progress("saving inventory")
            _update_org_provisioning_status(org_id, "completed", job_id, logger)
            res = insert_inventory(db=db, org_id=org_id, assets=assets)
            logger.info("Stored assets in Inventory (inventory_id=%s)", getattr(res, "inserted_id", None))
            logger.info("Provisioning complete for org %s", org_id)
            
            # EARLY RETURN: Skips all following Terraform code
            return {"message": "Provisioning complete", "work_dir": str(generated_dir), "metadata": metadata}
        # --- END DOCKER INTERCEPTION ---

        set_progress("provisioning infrastructure")
        logger.info("Calling provision_network_terraform for org %s", org_id)

        metadata = provision_network_terraform(
                org_data=org_doc,
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

        logger.info("Starting to provision 1 workstation for testing")

        ws_metadata = provision_workstation(org_id, logger)
        metadata.append(ws_metadata)

        assets = map_metadata_to_ec2_instances(metadata)
        res = insert_inventory(db=db, org_id=org_id, assets=assets)

        logger.info("Stored assets in Inventory (inventory_id=%s)", getattr(res, "inserted_id", None))
        logger.info("Provisioning complete for org %s", org_id)

        return {"message": "Provisioning complete", "work_dir": str(generated_dir), "metadata": metadata}

    except Exception as e:
        logger.exception("Provisioning failed for org %s: %s", org_id, e)
        set_progress(f"failed: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)
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
        # --- START DOCKER INTERCEPTION ---
        if os.environ.get("DEPLOYMENT_MODE", "docker") == "docker":
            import python_on_whales
            try:
                docker = python_on_whales.DockerClient()
                for c in docker.container.list(filters={"name": f"{org_id}-"}):
                    logger.info("Stopping container %s", c.name)
                    c.remove(force=True)
                try:
                    docker.network.remove(f"{org_id}-net")
                except Exception:
                    pass
            except Exception:
                pass
            
            set_progress("completed destroy")
            delete_inventory_by_org(db=db, org_id=org_id)
            _update_org_provisioning_status(org_id, "destroyed", job_id, logger)
            return {"message": "Destroy complete", "removed_dir": True}
        # --- END DOCKER INTERCEPTION ---

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
