"""
Utility functions for Terraform operations.
"""
from pathlib import Path
import subprocess
from cloudshield.Server.utils import (
    get_logger,
)
try:
    import cloudshield.Cloud.provisioner.provision as _provision_mod
except ImportError:  # pragma: no cover - provisioner only available in Terraform image
    # Fallback for Docker image where modules sit alongside this file
    try:
        import provision as _provision_mod  # type: ignore[import]
    except ImportError as error:  # pragma: no cover - guard for misconfigured packaging
        raise ImportError("Provisioner modules are not available") from error
get_target_dir = _provision_mod.get_target_dir
logger = get_logger("utils")
def get_workstation_count(org_id: str, env: dict | None = None) -> int:
    """
    Retrieve the number of current workstations for the given organization.
    """
    initial_count = 0
    base_dir = Path("/var/lib/cloudshield")
    generated_dir = base_dir / "terraform" / "generated" / org_id
    target_dir = get_target_dir(org_id, str(generated_dir))
    try:
        count_cmd = f"terraform state list aws_instance.{org_id}_workstation | wc -l"
        output = subprocess.check_output(count_cmd, cwd=str(target_dir), env=env, shell=True, text=True)
        initial_count = int(output.strip())
    except subprocess.CalledProcessError as e:
        logger.info("[UTIL] No existing workstations found for org %s: %s", org_id, e)
    return initial_count