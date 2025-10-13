"""
Utility helpers for agent workstation preflight checks.

The agent needs to verify that the underlying workstation is joined to the
expected domain before it begins forwarding telemetry. When the machine is not
joined (or joined to the wrong domain), we optionally trigger a bootstrap
script that can perform the required configuration (for example, domain join
commands, policy application, etc.).

All functionality in this module is implemented with built-in Windows tooling
so the capstone project does not require any paid third-party services.
"""
from __future__ import annotations

import json
import os
import platform
import shlex
import subprocess
from dataclasses import dataclass
from typing import Iterable, List, Optional

try:  # Honour legacy flat module first for compatibility with tests
    from logger import core_logger  # type: ignore
except ImportError:  # pragma: no cover - fallback to package-relative import
    from ..logger import core_logger

_DOMAIN_QUERY = (
    "Get-CimInstance -ClassName Win32_ComputerSystem "
    "| Select-Object PartOfDomain, Domain, DomainRole "
    "| ConvertTo-Json -Depth 2"
)

_DNS_QUERY = (
    "Get-DnsClientServerAddress -AddressFamily IPv4,IPv6 "
    "| ForEach-Object { $_.ServerAddresses } "
    "| Where-Object { $_ } "
    "| Select-Object -Unique "
    "| ConvertTo-Json"
)


@dataclass
class DomainStatus:
    """Simple container describing the workstation domain membership."""

    part_of_domain: bool
    domain: Optional[str]
    domain_role: Optional[int]
    detail: Optional[str] = None

    @property
    def is_member(self) -> bool:
        return bool(self.part_of_domain and (self.domain or ""))


def _run_powershell_json(command: str, timeout: int = 15) -> Optional[dict]:
    """Run a PowerShell command that returns JSON and parse the result."""
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            command,
        ],
        capture_output=True,
        text=True,
        timeout=timeout,
    )

    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        core_logger.error(
            "PowerShell command failed (rc=%s): %s", completed.returncode, stderr
        )
        return None

    try:
        payload = completed.stdout.strip()
        if not payload:
            return None
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        core_logger.error("Failed to parse PowerShell output as JSON: %s", exc)
        core_logger.debug("Raw payload: %s", completed.stdout)
        return None


def query_domain_status() -> DomainStatus:
    """Inspect the local workstation to determine domain membership state."""
    if platform.system() != "Windows":
        return DomainStatus(
            part_of_domain=False,
            domain=None,
            domain_role=None,
            detail="Domain checks are only supported on Windows",
        )

    data = _run_powershell_json(_DOMAIN_QUERY)
    if not data:
        return DomainStatus(
            part_of_domain=False,
            domain=None,
            domain_role=None,
            detail="Unable to query Win32_ComputerSystem",
        )

    # ConvertTo-Json returns either an object or array; normalise to dict
    if isinstance(data, list) and data:
        data = data[0]

    part_of_domain = bool(data.get("PartOfDomain"))
    domain = data.get("Domain")
    domain_role = data.get("DomainRole")

    return DomainStatus(
        part_of_domain=part_of_domain,
        domain=domain,
        domain_role=domain_role,
        detail=None,
    )


def query_dns_servers() -> List[str]:
    """Return the list of DNS server addresses configured on the host."""
    if platform.system() != "Windows":
        return []
    data = _run_powershell_json(_DNS_QUERY)
    if not data:
        return []
    if isinstance(data, list):
        return [str(entry) for entry in data]
    return [str(data)]


def _build_script_command(script_path: str, extra_args: Iterable[str]) -> List[str]:
    """Build the command used to invoke the bootstrap script."""
    script_ext = os.path.splitext(script_path.lower())[1]
    if script_ext == ".ps1":
        return [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            script_path,
            *extra_args,
        ]
    if script_ext in {".cmd", ".bat"}:
        return ["cmd.exe", "/c", script_path, *extra_args]
    if script_ext == ".py":
        python_exec = os.getenv("CLOUDSHIELD_PYTHON_FOR_SETUP", "python")
        return [python_exec, script_path, *extra_args]

    # Default: attempt direct execution
    return [script_path, *extra_args]


def _parse_extra_args(raw_args: Optional[str]) -> List[str]:
    if not raw_args:
        return []
    try:
        return shlex.split(raw_args)
    except ValueError as exc:
        core_logger.warning("Failed to parse setup args '%s': %s", raw_args, exc)
        return []


def ensure_domain_membership(
    expected_domain: Optional[str],
    setup_script: Optional[str],
    setup_args: Optional[str],
    timeout_seconds: int = 300,
) -> DomainStatus:
    """Ensure the workstation is joined to the expected domain.

    If the machine is not domain joined (or joined to the wrong domain), the
    optional *setup_script* is executed. The script can perform any domain join
    procedures required for the environment. The agent does not depend on any
    commercial tooling—everything is powered by local PowerShell or Python.

    The function always returns the final ``DomainStatus`` so the caller can
    decide whether to continue initialisation or raise an alert.
    """
    status = query_domain_status()

    if not status.is_member:
        core_logger.warning(
            "Workstation is not joined to any domain: %s", status.detail or "unknown"
        )
    elif expected_domain and status.domain and status.domain.lower() != expected_domain.lower():
        core_logger.warning(
            "Workstation joined to unexpected domain '%s' (expected '%s')",
            status.domain,
            expected_domain,
        )
    else:
        # We are already joined to the expected domain (or no expectation set).
        core_logger.info(
            "Domain check passed. Joined=%s domain=%s",
            status.part_of_domain,
            status.domain,
        )
        return status

    if not setup_script:
        core_logger.info(
            "No setup script provided. Domain bootstrap must be handled manually."
        )
        return status

    if not os.path.exists(setup_script):
        core_logger.error("Setup script '%s' not found", setup_script)
        return status

    extra_args = _parse_extra_args(setup_args)
    cmd = _build_script_command(setup_script, extra_args)

    core_logger.info("Invoking workstation bootstrap script: %s", " ".join(cmd))
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
        if completed.stdout:
            core_logger.debug("Bootstrap stdout: %s", completed.stdout.strip())
        if completed.stderr:
            core_logger.debug("Bootstrap stderr: %s", completed.stderr.strip())

        if completed.returncode != 0:
            core_logger.error(
                "Bootstrap script exited with rc=%s", completed.returncode
            )
            return status
    except subprocess.TimeoutExpired:
        core_logger.error(
            "Bootstrap script timed out after %s seconds", timeout_seconds
        )
        return status
    except FileNotFoundError as exc:
        core_logger.error("Unable to execute bootstrap script: %s", exc)
        return status

    # Re-query domain state after running the setup script
    refreshed = query_domain_status()
    if refreshed.is_member and (
        not expected_domain
        or not refreshed.domain
        or refreshed.domain.lower() == expected_domain.lower()
    ):
        core_logger.info(
            "Workstation domain state updated successfully: %s", refreshed.domain
        )
        return refreshed

    core_logger.warning(
        "Bootstrap script completed but workstation is still not in the expected domain."
    )
    return refreshed
