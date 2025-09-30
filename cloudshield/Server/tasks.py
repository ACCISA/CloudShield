
from rq import get_current_job
import time
import os
import shutil
import subprocess
from pathlib import Path


def create_ec2(instance_type="t2.micro", ami="ami-1234567890abcdef0"):
    job = get_current_job()
    job.meta["progress"] = "starting this task"
    print(job.meta)
    job.save_meta()
    """Create an EC2 instance"""
    time.sleep(10)
    return "EC2 instance created."

def create_vpc(cidr="10.0.0.0/16"):
    """Create a VPC"""
    time.sleep(10)
    return "VPC created."


def _run(cmd: list[str], cwd: str, env: dict | None = None):
    """Run a shell command yielding output lines and raising on nonzero exit."""
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
        yield line.rstrip()
    proc.wait()
    if proc.returncode != 0:
        raise subprocess.CalledProcessError(proc.returncode, cmd)


def provision_network(org_id: str, region: str = "us-west-2", ubuntu_ami: str | None = None, workstation_ami: str | None = None):
    """
    Provisions the full network using Terraform templates.
    Copies the templates to a per-org working directory, injects org_id/region,
    optionally overrides AMIs via terraform.tfvars, and runs terraform init/apply.
    """
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
        shutil.rmtree(work_dir)
    shutil.copytree(templates_dir, work_dir)

    # Templating: replace org_id token and region/AZ in main.tf
    main_tf_path = work_dir / "main.tf"
    main_tf = main_tf_path.read_text(encoding="utf-8")
    main_tf = main_tf.replace("org_id", org_id)
    main_tf = main_tf.replace('region = "us-west-2"', f'region = "{region}"')
    # naive AZ mapping: use "a" for requested region
    main_tf = main_tf.replace('"us-west-2a"', f'"{region}a"')
    main_tf_path.write_text(main_tf, encoding="utf-8")

    # Optional variable overrides
    tfvars_lines: list[str] = []
    if ubuntu_ami:
        tfvars_lines.append(f'ubuntu_ami = "{ubuntu_ami}"')
    if workstation_ami:
        tfvars_lines.append(f'workstation_ami = "{workstation_ami}"')
    if tfvars_lines:
        (work_dir / "terraform.tfvars").write_text("\n".join(tfvars_lines) + "\n", encoding="utf-8")

    # Decide whether to run in mock mode (no real terraform) either when requested
    # via env var or when terraform is not available on PATH.
    mock_mode = os.getenv("CLOUDSHIELD_MOCK_TERRAFORM") == "1" or shutil.which("terraform") is None

    # Fast path: mock provisioning to exercise Redis/RQ and API without real AWS.
    if mock_mode:
        logs_tail: list[str] = []
        try:
            if job is not None:
                job.meta["progress"] = "terraform init (mock)"
                job.save_meta()
            time.sleep(1)
            logs_tail.append("Initializing the backend... (mock)")

            if job is not None:
                job.meta["progress"] = "terraform plan (mock)"
                job.save_meta()
            time.sleep(1)
            logs_tail.append("Planning changes... (mock)")

            if job is not None:
                job.meta["progress"] = "terraform apply (mock)"
                job.save_meta()
            # Simulate a few steps with progress updates
            for step in [
                "Creating VPC (mock)",
                "Creating subnets (mock)",
                "Attaching IGW (mock)",
                "Creating route tables (mock)",
                "Launching instances (mock)",
            ]:
                time.sleep(0.8)
                logs_tail.append(step)
                if job is not None:
                    job.meta["progress"] = step
                    job.save_meta()

            # Write a small mock file so work_dir has artifacts
            (work_dir / "apply.log").write_text("\n".join(logs_tail) + "\n", encoding="utf-8")

            if job is not None:
                job.meta["progress"] = "completed (mock)"
                job.save_meta()
            return {"message": "Provisioning complete (mock)", "work_dir": str(work_dir), "logs_tail": logs_tail, "mock": True}
        except Exception as e:
            if job is not None:
                job.meta["progress"] = f"failed (mock): {e}"
                job.save_meta()
            raise

    env = os.environ.copy()
    env.setdefault("TF_IN_AUTOMATION", "1")

    logs_tail: list[str] = []
    try:
        if job is not None:
            job.meta["progress"] = "terraform init"
            job.save_meta()
        for line in _run(["terraform", "init", "-input=false"], cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        if job is not None:
            job.meta["progress"] = "terraform apply"
            job.save_meta()
        for line in _run(["terraform", "apply", "-auto-approve", "-input=false"], cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        if job is not None:
            job.meta["progress"] = "completed"
            job.save_meta()
        return {"message": "Provisioning complete", "work_dir": str(work_dir), "logs_tail": logs_tail}
    except Exception as e:
        if job is not None:
            job.meta["progress"] = f"failed: {e}"
            job.save_meta()
        raise


def destroy_environment(org_id: str, force: bool = False):
    """
    Destroys an environment for the given org_id and removes the run directory.
    In mock mode (or when terraform is missing), simulates a destroy and deletes the folder.
    """
    job = get_current_job()
    if job is not None:
        job.meta["progress"] = "starting destroy"
        job.save_meta()

    base_dir = Path(__file__).resolve().parents[1]
    runs_dir = base_dir / "Cloud" / "runs"
    work_dir = runs_dir / org_id

    mock_mode = os.getenv("CLOUDSHIELD_MOCK_TERRAFORM") == "1" or shutil.which("terraform") is None

    logs_tail: list[str] = []
    try:
        if mock_mode:
            if job is not None:
                job.meta["progress"] = "terraform destroy (mock)"
                job.save_meta()
            for step in [
                "Reading state (mock)",
                "Destroying resources (mock)",
                "Cleanup files (mock)",
            ]:
                time.sleep(0.6)
                logs_tail.append(step)
                if job is not None:
                    job.meta["progress"] = step
                    job.save_meta()

            # Remove working directory if present
            if work_dir.exists():
                shutil.rmtree(work_dir, ignore_errors=True)

            if job is not None:
                job.meta["progress"] = "completed (mock destroy)"
                job.save_meta()
            return {"message": "Destroy complete (mock)", "removed_dir": True, "logs_tail": logs_tail, "mock": True}

        # Real terraform destroy path
        if not work_dir.exists():
            if job is not None:
                job.meta["progress"] = "no run directory found"
                job.save_meta()
            return {"message": "No run directory found; nothing to destroy", "removed_dir": False, "logs_tail": []}

        env = os.environ.copy()
        env.setdefault("TF_IN_AUTOMATION", "1")

        if job is not None:
            job.meta["progress"] = "terraform init (destroy)"
            job.save_meta()
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
        for line in _run(destroy_cmd, cwd=str(work_dir), env=env):
            logs_tail.append(line)
            logs_tail = logs_tail[-50:]
            if job is not None and line.strip():
                job.meta["progress"] = line[-200:]
                job.save_meta()

        # Remove directory after successful destroy
        shutil.rmtree(work_dir, ignore_errors=True)

        if job is not None:
            job.meta["progress"] = "completed destroy"
            job.save_meta()
        return {"message": "Destroy complete", "removed_dir": True, "logs_tail": logs_tail}
    except Exception as e:
        if job is not None:
            job.meta["progress"] = f"failed destroy: {e}"
            job.save_meta()
        # Optionally still try to remove directory if force is True
        if force and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
        raise

