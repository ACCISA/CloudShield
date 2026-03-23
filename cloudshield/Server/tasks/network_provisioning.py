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
from typing import Any, Iterator, Sequence
import subprocess
from collections import deque

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

try:
    # Your repo layout (Cloud provisioner)
    from cloudshield.Cloud.provisioner.provision import (  # type: ignore
        provision_network_terraform,  # noqa: F401
        get_target_dir,  # noqa: F401
        provision_workstation,  # noqa: F401
    )
    from cloudshield.Cloud.provisioner.destroyer import destroy_infra  # type: ignore  # noqa: F401
except Exception:
    provision_network_terraform = None  # type: ignore
    get_target_dir = None  # type: ignore
    provision_workstation = None  # type: ignore
    destroy_infra = None  # type: ignore

# Tests expect this attribute to exist so they can monkeypatch it
provision_network_docker = None  # type: ignore


def destroy_network_docker(*args, **kwargs):
    """
    Some tests expect this symbol to exist (even if docker destroy logic
    is implemented in destroy_environment()).
    """
    return None


def _run(
    cmd: Sequence[str],
    cwd: str | None = None,
    env: dict | None = None,
    logger=None,
) -> Iterator[str]:
    """
    Stream command output line-by-line.

    Test expectations:
      - logs "Executing command:" at DEBUG
      - yields lines WITHOUT trailing newline
      - on failure: logs "Command failed" and "Last 30 lines of output:"
      - on success: logs "Command succeeded:" at DEBUG
    """
    lg = logger or _module_logger

    if lg:
        try:
            lg.debug("Executing command: %s", list(cmd))
        except Exception:
            pass

    proc = subprocess.Popen(  # nosec - tests monkeypatch Popen
        list(cmd),
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    tail: deque[str] = deque(maxlen=30)

    stdout_iter = proc.stdout or []
    for raw in stdout_iter:
        line = (raw or "").rstrip("\n")
        tail.append(line)

        if lg:
            try:
                lg.debug(line)
            except Exception:
                pass

        yield line

    rc = proc.returncode
    if rc is None:
        # In real runs, returncode may still be None until wait() is called.
        try:
            rc = proc.wait()
        except Exception:
            rc = 0

    if rc != 0:
        if lg:
            try:
                lg.error("Command failed (%s): %s", rc, list(cmd))
                lg.error("Last 30 lines of output:\n%s", "\n".join(tail))
            except Exception:
                pass
        raise subprocess.CalledProcessError(rc, list(cmd), "\n".join(tail), "")
    else:
        if lg:
            try:
                lg.debug("Command succeeded: %s", list(cmd))
            except Exception:
                pass

def run_command(cmd: Sequence[str], cwd: str | None = None, env: dict | None = None, logger=None) -> Iterator[str]:
    # Simple wrapper used by tests
    return _run(cmd, cwd=cwd, env=env, logger=logger)


def _import_provision_network_docker():
    """
    Import provision_network_docker in a way that preserves package context.
    """
    try:
        from cloudshield.Cloud.docker_provisioner.provision import provision_network_docker as fn
        return fn
    except ModuleNotFoundError:
        pass

    try:
        from provisioner.provision import provision_network_docker as fn
        return fn
    except ModuleNotFoundError:
        import sys
        if "/app" not in sys.path:
            sys.path.insert(0, "/app")
        from provisioner.provision import provision_network_docker as fn
        return fn


def _import_terraform_provisioner():
    """
    Terraform provisioner is not needed for api-test docker mode,
    but we keep it lazily for completeness.
    """
    try:
        from cloudshield.Cloud.terraform.provisioner import (  # type: ignore
            provision_network_terraform as pnt,
            get_target_dir as gtd,
            destroy_infra as di,
            provision_workstation as pw,
        )
        return pnt, gtd, di, pw
    except ModuleNotFoundError:
        pass

    candidates = [
        Path("/app/cloudshield/Cloud/terraform/provisioner.py"),
        Path("/var/lib/cloudshield/terraform/provisioner.py"),
    ]
    for p in candidates:
        spec = importlib.util.spec_from_file_location("cloudshield_terraform_provisioner", str(p))
        if spec and spec.loader:
            try:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)  # type: ignore[attr-defined]
                return (
                    getattr(module, "provision_network_terraform"),
                    getattr(module, "get_target_dir"),
                    getattr(module, "destroy_infra"),
                    getattr(module, "provision_workstation"),
                )
            except (FileNotFoundError, OSError, AttributeError):
                continue

    raise ModuleNotFoundError(
        "Terraform provisioner not found inside this container. "
        "If you only want docker mode, this is fine."
    )


def _coerce_int(val, default: int | None) -> int | None:
    """
    Tests expect:
      - bool -> default
      - str (even digit strings like "10") -> default
      - int/float -> int(val)
    """
    if isinstance(val, bool):
        return default
    if isinstance(val, (int, float)):
        return int(val)
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


def _enqueue_welcome_email_post_success(org_id: str, logger) -> None:
    """
    Trigger post-provision welcome email with centralized import/error handling.
    """
    try:
        from cloudshield.Server.services.job_service import enqueue_org_welcome_email_if_ready  # type: ignore
        enqueue_org_welcome_email_if_ready(org_id)
    except Exception as exc:
        logger.warning("Post-provision welcome email enqueue failed for org %s: %s", org_id, exc)


def _detect_mode(logger) -> str:
    mode = (os.environ.get("DEPLOYMENT_MODE") or "").strip().lower()
    docker_sock = Path("/var/run/docker.sock")

    if mode in {"docker", "terraform"}:
        return mode

    if docker_sock.exists():
        logger.warning("DEPLOYMENT_MODE unset; docker runtime detected. Using mode='docker'.")
        return "docker"

    return "terraform"



def _validate_inventory_assets(logger, org_id: str, assets_raw: list[Any]) -> list[dict[str, Any]]:
    drop_keys = {"_id", "created_at", "updated_at"}

    normalized: list[dict[str, Any]] = []
    for a in assets_raw:
        if isinstance(a, dict):
            d = dict(a)
        elif hasattr(a, "model_dump"):
            d = a.model_dump(by_alias=False)
        else:
            d = {"value": repr(a)}

        for k in drop_keys:
            d.pop(k, None)

        normalized.append(d)

    try:
        inv = Inventory.model_validate({"org_id": org_id, "assets": normalized})
        out = inv.model_dump(by_alias=False, exclude_none=True)
        assets = out.get("assets", [])
        for asset in assets:
            asset.pop("_id", None)
        return assets
    except Exception as exc:
        logger.warning("Inventory validation failed; saving normalized assets. Error: %s", exc)
        for asset in normalized:
            asset.pop("_id", None)
        return normalized




def provision_workstations(org_id: str, region: str = "ca-central-1", count: int = 1):
    job = get_current_job()
    job_id = job.id if job else get_job_id_fallback()
    logger = get_logger("job", job_id=job_id)

    set_progress("starting")

    # In api-test we intentionally use docker-backed provisioning, not terraform.
    mode = (os.environ.get("DEPLOYMENT_MODE") or "").strip().lower()
    if mode == "docker":
        base_dir = Path(CLOUDSHIELD_JOBS_DIR)
        templates_dir = base_dir / "templates"
        generated_dir = base_dir / "terraform" / "generated" / org_id

        org_doc = organizations.find_one(org_filter(org_id)) or {}
        docker_org_data = {
            "org_id": org_id,
            "domain_name": org_doc.get("domain_name"),
            "realm_name": org_doc.get("realm_name"),
            "dc_admin_password": org_doc.get("dc_admin_password"),
        }

        try:
            set_progress("provisioning docker workstations")
            docker_fn = provision_network_docker or _import_provision_network_docker()
            metadata = docker_fn(
                org_data=docker_org_data,
                region=region,
                templates_dir=str(templates_dir),
                generated_dir=str(generated_dir),
                count=count,
                server_logger=logger,
            )

            if not metadata:
                set_progress("failed")
                return {
                    "message": "Docker workstation provisioning returned no metadata",
                    "metadata": [],
                }

            set_progress("completed")
            return {
                "message": "Provisioning workstations complete",
                "metadata": metadata,
            }
        except Exception as e:
            set_progress(f"failed: {e}")
            raise

    tf_get_target_dir = get_target_dir
    if tf_get_target_dir is None:
        _, tf_get_target_dir, _, _ = _import_terraform_provisioner()

    base_dir = Path(CLOUDSHIELD_JOBS_DIR)
    generated_dir = base_dir / "terraform" / "generated" / org_id

    target_dir_res = tf_get_target_dir(org_id, str(generated_dir))
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
            "work_dir": str(target_dir_res).replace("\\", "/"),
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

            docker_fn = provision_network_docker or _import_provision_network_docker()

            docker_org_data = {
                "org_id": org_id,
                "domain_name": org_doc.get("domain_name"),
                "realm_name": org_doc.get("realm_name"),
                "dc_admin_password": org_doc.get("dc_admin_password"),
            }

            metadata = docker_fn(
                org_data=docker_org_data,
                region=region,
                templates_dir=str(templates_dir),
                generated_dir=str(generated_dir),
                count=desired_workstations,
                server_logger=logger,
            )

            if not metadata:
                set_progress("failed")
                _update_org_provisioning_status(org_id, "failed", job_id, logger)
                # include a details key for consistency (harmless if not asserted)
                if job is not None:
                    job.meta["details"] = "Docker provisioning returned no metadata"
                return {"status": "error", "message": "Docker provisioning returned no metadata"}

            # Link Docker container IDs back to seeded workstation documents
            # so the workstation callback can find them by container_id.
            try:
                workstations_col = db_admin["workstations"]
                for entry in metadata:
                    if entry.get("os") == "windows11" and entry.get("instance_id"):
                        workstations_col.update_one(
                            {"org_id": org_id, "status": "provisioning", "container_id": {"$exists": False}},
                            {"$set": {"container_id": entry["instance_id"]}},
                        )
                        logger.info("Linked container_id=%s to seeded workstation for org %s",
                                    entry["instance_id"], org_id)
            except Exception as link_err:
                logger.error("Failed to link container IDs to workstation docs: %s", link_err)

            try:
                assets_raw = map_metadata_to_ec2_instances(metadata)
                assets = _validate_inventory_assets(logger, org_id, assets_raw)
                insert_inventory(db=db, org_id=org_id, assets=assets)
                logger.info("Stored Docker assets in Inventory for org %s", org_id)
            except Exception as db_err:
                logger.error("Failed to save Docker assets to DB: %s", db_err)

            set_progress("completed")
            _update_org_provisioning_status(org_id, "completed", job_id, logger)
            # Post-success trigger only:
            # welcome email is intentionally deferred until provisioning completes.
            _enqueue_welcome_email_post_success(org_id, logger)
            return {"status": "success", "message": "Provisioning complete", "metadata": metadata}

        set_progress("provisioning infrastructure")

        tf_provision = provision_network_terraform
        if tf_provision is None:
            tf_provision, _, _, _ = _import_terraform_provisioner()

        # IMPORTANT: call with the signature the tests monkeypatch:
        # (org_data, region, templates_dir, generated_dir, count, server_logger)
        try:
            metadata = tf_provision(
                org_data=org_doc,
                region=region,
                templates_dir=templates_dir,
                generated_dir=str(generated_dir),
                count=desired_workstations,
                server_logger=logger,
            )
        except TypeError:
            # fallback for alternate signatures in real provisioners
            metadata = tf_provision(
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

            # TEST EXPECTS: details exists in job.meta
            if job is not None:
                job.meta["details"] = "Terraform provisioning returned None"

            return {"status": "error", "message": "Provisioning failed"}

        if isinstance(metadata, dict):
            metadata = [metadata]

        # Only call provision_workstation if it exists (tests usually don't patch it)
        if provision_workstation is not None:
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
        # Same post-success behavior for the terraform path.
        _enqueue_welcome_email_post_success(org_id, logger)
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

        if not generated_dir.exists() and not force:
            set_progress("no run directory found")
            return {"message": "No run directory found; nothing to destroy", "removed_dir": False}

        destroy_impl = destroy_infra
        if destroy_impl is None:
            _, _, destroy_impl, _ = _import_terraform_provisioner()

        destroy_impl(
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
        logger.error(e)
        set_progress(f"failed destroy: {e}")
        _update_org_provisioning_status(org_id, "failed", job_id, logger)
        # tests expect None on exception
        return None
