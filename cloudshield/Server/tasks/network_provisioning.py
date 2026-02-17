"""
Network provisioning tasks for CloudShield infrastructure.

- AWS provisioning via Terraform (when available)
- Local Docker provisioning when DEPLOYMENT_MODE=docker
"""

from __future__ import annotations

import os
import importlib.util
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

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

from cloudshield.Server.models.itam import Inventory

_module_logger = get_logger("tasks")
CLOUDSHIELD_JOBS_DIR = "/var/lib/cloudshield"


def _import_provision_network_docker():
    """
    Import provision_network_docker in a way that preserves package context.

    DO NOT load provision.py via spec/exec_module, because provision.py uses
    relative imports like `from .keygen import ...` which require package context.
    """
    try:
        from cloudshield.Cloud.docker_provisioner.provision import provision_network_docker
        return provision_network_docker
    except ModuleNotFoundError:
        pass

    try:
        from provisioner.provision import provision_network_docker
        return provision_network_docker
    except ModuleNotFoundError:
        import sys
        if "/app" not in sys.path:
            sys.path.insert(0, "/app")
        from provisioner.provision import provision_network_docker
        return provision_network_docker


def _import_terraform_provisioner():
    """
    Terraform provisioner is not needed for api-test docker mode,
    but we keep it lazily for completeness.

    Adjust these paths if/when you re-enable Terraform in-container.
    """
    try:
        from cloudshield.Cloud.terraform.provisioner import (  # type: ignore
            provision_network_terraform,
            get_target_dir,
            destroy_infra,
            provision_workstation,
        )
        return provision_network_terraform, get_target_dir, destroy_infra, provision_workstation
    except ModuleNotFoundError:
        pass

    candidates = [
        Path("/app/cloudshield/Cloud/terraform/provisioner.py"),
        Path("/var/lib/cloudshield/terraform/provisioner.py"),
    ]
    for p in candidates:
        if p.exists():
            spec = importlib.util.spec_from_file_location("cloudshield_terraform_provisioner", str(p))
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)  # type: ignore[attr-defined]

                return (
                    getattr(module, "provision_network_terraform"),
                    getattr(module, "get_target_dir"),
                    getattr(module, "destroy_infra"),
                    getattr(module, "provision_workstation"),
                )

    raise ModuleNotFoundError(
        "Terraform provisioner not found inside this container. "
        "If you only want docker mode, this is fine."
    )


def _coerce_int(val, default: int | None) -> int | None:
    if isinstance(val, bool):
        return default
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str) and val.strip().isdigit():
        return int(val.strip())
    return default


def _update_org_provisioning_status(org_id: str, status: str, job_id: str | None, logger=None) -> None:
    update: dict[str, Any] = {
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


def _detect_mode(logger) -> str:
    """
    Mode detection that won't silently fall into Terraform if env is missing.

    If DEPLOYMENT_MODE isn't set but we clearly have:
      - docker.sock mounted
      - /app/provisioner/provision.py present (your api-test layout)
    then we force docker mode.
    """
    mode = (os.environ.get("DEPLOYMENT_MODE") or "").strip().lower()
    docker_sock = Path("/var/run/docker.sock")
    docker_prov_file = Path("/app/provisioner/provision.py")

    if mode != "docker" and docker_sock.exists() and docker_prov_file.exists():
        logger.warning(
            "DEPLOYMENT_MODE is '%s' but docker runtime detected (docker.sock + provisioner file). "
            "Forcing mode='docker' to avoid Terraform path.",
            mode or "<unset>",
        )
        return "docker"

    return mode


def _validate_inventory_assets(logger, org_id: str, assets_raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Validate/coerce assets using Pydantic (itam.py models).
    If the model doesn't match the dict shape yet, we log and fall back to raw assets
    (so we never break provisioning).
    """
    try:
        inv = Inventory.model_validate({"org_id": org_id, "assets": assets_raw})
        assets_validated = inv.model_dump()["assets"]
        logger.info("Inventory assets (validated): %s", assets_validated)
        return assets_validated
    except Exception as exc:
        logger.warning("Inventory validation failed; saving raw assets. Error: %s", exc)
        return assets_raw


def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    """
    Terraform-only. Not used in your api-test docker mode.
    """
    job = get_current_job()
    job_id = job.id if job else get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    set_progress("starting")

    provision_network_terraform, get_target_dir, _, _ = _import_terraform_provisioner()

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
        initial_count = get_workstation_count(org_id, env=env) or 0

        set_progress("terraform apply workstations")
        cmd = [
            "terraform",
            "apply",
            "-auto-approve",
            "-input=false",
            "-var",
            f"workstation_count={count + initial_count}",
            "-var",
            f"org_id={org_id}",
            "-var",
            f"region={region}",
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
            "logs_tail": logs_tail,
        }
    except Exception as e:
        set_progress(f"failed: {e}")
        raise


def provision_network(
    org_id: str,
    region: str = "ca-central-1",
    ubuntu_ami: str | None = None,
    workstation_ami: str | None = None,
    workstation_count: int | None = None,
):
    job = get_current_job()
    job_id = job.id if job else get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    set_progress("starting")

    if not org_id or org_id == "unknown":
        raise ValueError("provision_network requires a valid org_id")

    org_doc = organizations.find_one(org_filter(org_id)) or {}
    org_doc["org_id"] = org_id

    org_limit = _coerce_int(org_doc.get("workstation_limit"), default=None)
    desired_workstations = workstation_count if workstation_count not in (None, 0) else (org_limit or 1)
    desired_workstations = _coerce_int(desired_workstations, default=1) or 1

    if org_limit is not None and desired_workstations > org_limit:
        raise ValueError("Requested workstation_count exceeds organization limit")

    _update_org_provisioning_status(org_id, "in_progress", job_id, logger)

    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    templates_dir = base_dir / "templates"
    generated_dir = base_dir / "terraform" / "generated" / org_id

    mode = _detect_mode(logger)
    logger.info("Provision mode resolved to: %s", mode or "<unset>")

    try:
        if mode == "docker":
            set_progress("provisioning docker infrastructure")

            provision_network_docker = _import_provision_network_docker()

            metadata = provision_network_docker(
                org_data={"org_id": org_id},
                region=region,
                templates_dir=templates_dir,
                generated_dir=generated_dir,
                count=desired_workstations,
                server_logger=logger,
            )

            if not metadata:
                set_progress("failed")
                _update_org_provisioning_status(org_id, "failed", job_id, logger)
                return {"status": "error", "message": "Docker provisioning returned no metadata"}

            try:
                assets_raw = map_metadata_to_ec2_instances(metadata)
                assets = _validate_inventory_assets(logger, org_id, assets_raw)
                insert_inventory(db=db, org_id=org_id, assets=assets)
                logger.info("Stored Docker assets in Inventory for org %s", org_id)
            except Exception as db_err:
                logger.error("Failed to save Docker assets to DB: %s", db_err)

            set_progress("completed")
            _update_org_provisioning_status(org_id, "completed", job_id, logger)
            return {"status": "success", "message": "Provisioning complete", "metadata": metadata}

        set_progress("provisioning infrastructure")

        provision_network_terraform, _, _, provision_workstation = _import_terraform_provisioner()

        metadata = provision_network_terraform(
            org_id=org_id,
            region=region,
            templates_dir=templates_dir,
            generated_dir=str(generated_dir),
            count=desired_workstations,
            server_logger=logger,
            org_data=org_doc,
        )

        if metadata is None:
            set_progress("failed")
            _update_org_provisioning_status(org_id, "failed", job_id, logger)
            return {"status": "error", "message": "Provisioning failed"}

        if isinstance(metadata, dict):
            metadata = [metadata]

        try:
            ws_metadata = provision_workstation(org_id, logger)
            if isinstance(ws_metadata, dict):
                metadata.append(ws_metadata)
        except Exception as exc:
            logger.warning("provision_workstation failed; continuing: %s", exc)

        assets_raw = map_metadata_to_ec2_instances(metadata)
        assets = _validate_inventory_assets(logger, org_id, assets_raw)
        insert_inventory(db=db, org_id=org_id, assets=assets)

        set_progress("completed")
        _update_org_provisioning_status(org_id, "completed", job_id, logger)

        return {"status": "success", "message": "Provisioning complete", "metadata": metadata}

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
    mode = _detect_mode(logger)

    try:
        if mode == "docker":
            import python_on_whales

            docker_client = python_on_whales.DockerClient()
            for c in docker_client.container.list(filters=[("name", f"{org_id}-")]):
                c.remove(force=True)

            set_progress("completed destroy")
            delete_inventory_by_org(db=db, org_id=org_id)
            _update_org_provisioning_status(org_id, "destroyed", job_id, logger)
            return {"message": "Destroy complete", "removed_dir": True}

        _, _, destroy_infra, _ = _import_terraform_provisioner()

        if not generated_dir.exists() and not force:
            set_progress("no run directory found")
            return {"message": "No run directory found; nothing to destroy", "removed_dir": False}

        destroy_infra(
            org_id,
            region="ca-central-1",
            force_empty_s3=force,
            org_dir=generated_dir,
            server_logger=logger,
        )

        set_progress("completed destroy")
        delete_inventory_by_org(db=db, org_id=org_id)
        _update_org_provisioning_status(org_id, "destroyed", job_id, logger)
        return {"message": "Destroy complete", "removed_dir": True}

    except Exception as e:
        set_progress(f"failed destroy: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)
        raise
