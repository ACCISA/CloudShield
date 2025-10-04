from rq import get_current_job
import os
import shutil
import subprocess
from pathlib import Path
from logging_setup import logger


def _run(cmd: list[str], cwd: str, env: dict | None = None):
    """Run a shell command yielding output lines and raising on nonzero exit."""
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


def provision_network(org_id: str, region: str = "us-west-2", ubuntu_ami: str | None = None, workstation_ami: str | None = None):
    """
    Provisions the full network using Terraform templates.
    Copies the templates to a per-org working directory, injects org_id/region,
    optionally overrides AMIs via terraform.tfvars, and runs terraform init/apply.
    """
    logger.info("Provision requested: org_id=%s region=%s ubuntu_ami=%s workstation_ami=%s", org_id, region, ubuntu_ami, workstation_ami)
    job = get_current_job()
    if job is not None:
        job.meta["progress"] = "starting"
        job.save_meta()

    base_dir = Path(__file__).resolve().parents[1]  # .../cloudshield
    templates_dir = base_dir / "Cloud" / "templates"
    runs_dir = base_dir / "Cloud" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    work_dir = runs_dir / org_id
    if work_dir.exists():
        logger.warning("Work dir already exists for org '%s', removing: %s", org_id, work_dir)
        shutil.rmtree(work_dir)
    logger.debug("Copying templates from %s to %s", templates_dir, work_dir)
    shutil.copytree(templates_dir, work_dir)

    # Templating: replace org_id token and region/AZ in main.tf
    main_tf_path = work_dir / "main.tf"
    main_tf = main_tf_path.read_text(encoding="utf-8")
    main_tf = main_tf.replace("org_id", org_id)
    main_tf = main_tf.replace('region = "ca-central-1"', f'region = "{region}"')
    # naive AZ mapping: use "a" for requested region
    main_tf = main_tf.replace('"ca-central-1a"', f'"{region}a"')
    main_tf_path.write_text(main_tf, encoding="utf-8")
    logger.debug("Patched main.tf for org %s region %s", org_id, region)

    # Optional variable overrides
    tfvars_lines: list[str] = []
    if ubuntu_ami:
        tfvars_lines.append(f'ubuntu_ami = "{ubuntu_ami}"')
    if workstation_ami:
        tfvars_lines.append(f'workstation_ami = "{workstation_ami}"')
    if tfvars_lines:
        (work_dir / "terraform.tfvars").write_text("\n".join(tfvars_lines) + "\n", encoding="utf-8")
        logger.debug("Wrote terraform.tfvars overrides: %s", ", ".join(tfvars_lines))

    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")

    logs_tail: list[str] = []
    try:
        if job is not None:
            job.meta["progress"] = "terraform init"
            job.save_meta()
        logger.info("Running terraform init for org %s", org_id)
        for line in _run(["terraform", "init", "-input=false"], cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        if job is not None:
            job.meta["progress"] = "terraform apply"
            job.save_meta()
        logger.info("Running terraform apply for org %s", org_id)
        for line in _run(["terraform", "apply", "-auto-approve", "-input=false"], cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        if job is not None:
            job.meta["progress"] = "completed"
            job.save_meta()
        logger.info("Provisioning complete for org %s", org_id)
        return {"message": "Provisioning complete", "work_dir": str(work_dir), "logs_tail": logs_tail}
    except Exception as e:
        logger.exception("Provisioning failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed: {e}"
            job.meta["logs_tail"] = logs_tail
            job.save_meta()
        raise


def destroy_environment(org_id: str, force: bool = False):
    """
    Destroys an environment for the given org_id and removes the run directory.
    In mock mode (or when terraform is missing), simulates a destroy and deletes the folder.
    """
    logger.info("Destroy requested: org_id=%s force=%s", org_id, force)
    job = get_current_job()
    if job is not None:
        job.meta["progress"] = "starting destroy"
        job.save_meta()

    base_dir = Path(__file__).resolve().parents[1]
    runs_dir = base_dir / "Cloud" / "runs"
    work_dir = runs_dir / org_id

    logs_tail: list[str] = []
    try:
        if not work_dir.exists():
            logger.warning("Destroy requested for org %s but work dir not found (%s)", org_id, work_dir)
            if job is not None:
                job.meta["progress"] = "no run directory found"
                job.save_meta()
            return {"message": "No run directory found; nothing to destroy", "removed_dir": False, "logs_tail": []}

        env = os.environ.copy()
        env.setdefault("TF_IN_AUTOMATION", "1")
        logger.info("Current working directory: %s", os.getcwd())
        logger.info("Subprocess working directory: %s", work_dir)
        logger.info("AWS_PROFILE in env: %s", env.get("AWS_PROFILE", "NOT SET"))
        logger.info("AWS_ACCESS_KEY_ID in env: %s", "SET" if env.get("AWS_ACCESS_KEY_ID") else "NOT SET")
        logger.info("Terraform path: %s", shutil.which("terraform"))
        logger.info("Work dir exists: %s", work_dir.exists())
        logger.info("Work dir contents: %s", list(work_dir.iterdir()) if work_dir.exists() else "N/A")

        logs_tail: list[str] = []

        

        if job is not None:
            job.meta["progress"] = "terraform init (destroy)"
            job.save_meta()
        logger.info("Running terraform init (destroy) for org %s", org_id)
        for line in _run(["terraform", "init", "-input=false"], cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        if job is not None:
            job.meta["progress"] = "terraform destroy"
            job.save_meta()
        destroy_cmd = ["terraform", "destroy", "-auto-approve", "-input=false"]
        if force:
            # No direct force flag in terraform destroy, but we keep param for API compatibility
            pass
        logger.info("Running terraform destroy for org %s", org_id)
        for line in _run(destroy_cmd, cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        # Remove directory after successful destroy
        shutil.rmtree(work_dir, ignore_errors=True)
        logger.info("Removed work dir for org %s: %s", org_id, work_dir)

        if job is not None:
            job.meta["progress"] = "completed destroy"
            job.save_meta()
        logger.info("Destroy complete for org %s", org_id)
        return {"message": "Destroy complete", "removed_dir": True, "logs_tail": logs_tail}
    except Exception as e:
        logger.exception("Destroy failed for org %s: %s", org_id, e)
        if job is not None:
            job.meta["progress"] = f"failed destroy: {e}"
            job.save_meta()
        if force and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
            logger.warning("Force flag: removed work dir after failure for org %s", org_id)
        raise

