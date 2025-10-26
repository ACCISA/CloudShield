import json
from pathlib import Path
from typing import List, Optional, Set

from logger import task_logger

from .workstation_setup import query_dns_servers, query_domain_status
from .task import BaseTask


class DomainDnsCheckTask(BaseTask):
    """
    Validate the workstation domain membership and DNS configuration.

    The expected values are stored in a JSON configuration file. Example schema:

    {
        "expected_domain": "corp.example.local",
        "expected_dns_servers": ["10.0.0.2", "10.0.0.3"]
    }

    Both properties are optional. When omitted, the task simply reports the
    detected values without raising any warnings.
    """

    def __init__(self, agent_state, config_path: Optional[str] = None):
        super().__init__(agent_state)
        self.config_path = self._resolve_config_path(config_path)
        self.expected_domain: Optional[str] = None
        self.expected_dns_servers: Set[str] = set()
        self._missing_warning_emitted = False

    @staticmethod
    def _resolve_config_path(config_path: Optional[str]) -> Path:
        if config_path:
            return Path(config_path)
        default_path = Path(__file__).resolve().parents[1] / "config" / "agent_config.json"
        return default_path

    def _load_config(self) -> None:
        if not self.config_path.exists():
            if not self._missing_warning_emitted:
                task_logger.warning(
                    "Domain/DNS config '%s' not found; task will log observed values only",
                    self.config_path,
                )
                self._missing_warning_emitted = True
            self.expected_domain = None
            self.expected_dns_servers = set()
            return

        # Reset flag so a future missing-file event logs again.
        self._missing_warning_emitted = False

        try:
            with self.config_path.open("r", encoding="utf-8") as cfg:
                data = json.load(cfg)
        except json.JSONDecodeError as exc:
            task_logger.error("Failed to parse config '%s': %s", self.config_path, exc)
            self.expected_domain = None
            self.expected_dns_servers = set()
            return

        domain = data.get("expected_domain")
        self.expected_domain = domain.strip() if isinstance(domain, str) else None

        dns_entries: List[str] = []
        raw_dns = data.get("expected_dns_servers", [])
        if isinstance(raw_dns, list):
            for entry in raw_dns:
                if isinstance(entry, str) and entry.strip():
                    dns_entries.append(entry.strip())
        elif isinstance(raw_dns, str) and raw_dns.strip():
            dns_entries.append(raw_dns.strip())

        self.expected_dns_servers = {value.lower() for value in dns_entries}

    @staticmethod
    def _normalize_domain(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return value.strip().lower()

    def _check_domain(self, actual_domain: Optional[str], is_member: bool) -> None:
        expected = self._normalize_domain(self.expected_domain)
        actual = self._normalize_domain(actual_domain)

        # Persist the value in agent state for other components/tests.
        self.agent_state["domain_info"] = {
            "is_member": is_member,
            "domain": actual_domain,
        }

        if expected is None:
            task_logger.info("Detected domain membership: joined=%s domain=%s", is_member, actual_domain)
            return

        if expected == "workgroup":
            if is_member:
                task_logger.warning(
                    "Workstation is domain-joined (%s) but configuration expects no domain",
                    actual_domain,
                )
            else:
                task_logger.info("Domain check passed: machine remains in WORKGROUP as expected")
            return

        if not is_member:
            task_logger.warning(
                "Workstation is not joined to any domain (expected '%s')", self.expected_domain
            )
            return

        if actual != expected:
            task_logger.warning(
                "Workstation domain mismatch. Expected '%s', observed '%s'",
                self.expected_domain,
                actual_domain,
            )
        else:
            task_logger.info("Domain check passed: %s", actual_domain)

    def _check_dns(self, actual_dns: List[str]) -> None:
        observed_normalised = {value.lower() for value in actual_dns if value}
        self.agent_state["dns_servers"] = actual_dns

        if not self.expected_dns_servers:
            task_logger.info("Detected DNS servers: %s", ", ".join(actual_dns) or "none")
            return

        missing = self.expected_dns_servers - observed_normalised
        unexpected = observed_normalised - self.expected_dns_servers

        if missing:
            task_logger.warning(
                "Missing expected DNS servers: %s", ", ".join(sorted(missing))
            )
        if unexpected:
            task_logger.warning(
                "Unexpected DNS servers detected: %s", ", ".join(sorted(unexpected))
            )

        if not missing and not unexpected:
            task_logger.info("DNS configuration matches expected entries")

    def run(self):
        self._load_config()

        status = query_domain_status()
        dns_servers = query_dns_servers()

        self._check_domain(status.domain, status.is_member)
        self._check_dns(dns_servers)

        # This task does not send data over gRPC; it purely logs and updates
        # agent state for downstream inspection.
