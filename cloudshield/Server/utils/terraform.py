"""
Utility functions for Terraform operations.
"""
from pathlib import Path
import subprocess
from cloudshield.Server.utils import (
    get_logger,
)

from provisioner import get_target_dir

logger = get_logger("utils")
base_dir = Path("/var/lib/cloudshield")

def get_workstation_count(org_id: str, env: dict | None = None) -> int:
    """
    Retrieve the number of current workstations for the given organization.
    """
    initial_count = 0
    generated_dir = base_dir / "terraform" / "generated" / org_id
    target_dir = get_target_dir(org_id, str(generated_dir))
    if not target_dir:
        logger.info("[UTIL] No target dir for org %s; defaulting workstation count to 0", org_id)
        return 0
    try:
        count_cmd = f"terraform state list aws_instance.{org_id}_workstation | wc -l"
        output = subprocess.check_output(count_cmd, cwd=str(target_dir), env=env, shell=True, text=True)
        initial_count = int(output.strip())
    except subprocess.CalledProcessError as e:
        logger.info("[UTIL] No existing workstations found for org %s: %s", org_id, e)
    except Exception as e:  # pragma: no cover - fail-safe for missing terraform state/paths
        logger.warning("[UTIL] Unable to read workstation count for org %s, defaulting high: %s", org_id, e, exc_info=True)
        return 1_000_000  # fallback high limit so we don't block user creation
    return initial_count
