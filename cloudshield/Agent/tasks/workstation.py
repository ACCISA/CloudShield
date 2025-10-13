from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

try:  # Honour legacy flat module first for compatibility with tests
    from logger import task_logger  # type: ignore
except ImportError:  # pragma: no cover - fallback to package-relative import
    from ..logger import task_logger

from ..core.workstation_setup import DomainStatus, ensure_domain_membership
from .task import BaseTask


class EnsureDomainMembershipTask(BaseTask):
    """Run workstation domain bootstrap as part of agent initialisation."""

    def __init__(
        self,
        agent_state,
        config_path: Optional[str] = None,
        default_timeout: int = 300,
    ) -> None:
        super().__init__(agent_state)
        self.config_path = self._resolve_config_path(config_path)
        self.default_timeout = max(1, int(default_timeout))
        self.expected_domain: Optional[str] = None
        self.setup_script: Optional[str] = None
        self.setup_args: Optional[str] = None
        self.setup_timeout: int = self.default_timeout
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
                    "Domain setup config '%s' not found; skipping bootstrap run",
                    self.config_path,
                )
                self._missing_warning_emitted = True
            self.expected_domain = None
            self.setup_script = None
            self.setup_args = None
            self.setup_timeout = self.default_timeout
            return

        self._missing_warning_emitted = False

        try:
            with self.config_path.open("r", encoding="utf-8") as cfg:
                data = json.load(cfg)
        except json.JSONDecodeError as exc:
            task_logger.error(
                "Failed to parse domain setup config '%s': %s",
                self.config_path,
                exc,
            )
            self.expected_domain = None
            self.setup_script = None
            self.setup_args = None
            self.setup_timeout = self.default_timeout
            return

        raw_domain = data.get("expected_domain")
        self.expected_domain = raw_domain.strip() if isinstance(raw_domain, str) and raw_domain.strip() else None

        raw_script = data.get("workstation_setup_script")
        self.setup_script = self._normalise_script_path(raw_script)

        raw_args = data.get("workstation_setup_args")
        self.setup_args = raw_args.strip() if isinstance(raw_args, str) and raw_args.strip() else None

        self.setup_timeout = self._parse_timeout(data.get("workstation_setup_timeout"))

    def _normalise_script_path(self, raw_value: object) -> Optional[str]:
        if not isinstance(raw_value, str) or not raw_value.strip():
            return None
        candidate = Path(raw_value.strip())
        if not candidate.is_absolute():
            candidate = (self.config_path.parent / candidate).resolve()
        return str(candidate)

    def _parse_timeout(self, raw_value: object) -> int:
        if raw_value is None:
            return self.default_timeout
        try:
            timeout = int(raw_value)
        except (TypeError, ValueError):
            task_logger.warning(
                "Invalid workstation_setup_timeout '%s'; using default of %s seconds",
                raw_value,
                self.default_timeout,
            )
            return self.default_timeout
        return max(1, timeout)

    def run(self) -> DomainStatus:
        self._load_config()

        status = ensure_domain_membership(
            expected_domain=self.expected_domain,
            setup_script=self.setup_script,
            setup_args=self.setup_args,
            timeout_seconds=self.setup_timeout,
        )

        self.agent_state["domain_status"] = {
            "is_member": status.is_member,
            "domain": status.domain,
            "detail": status.detail,
        }
        self.agent_state["expected_domain"] = self.expected_domain

        if status.is_member:
            task_logger.info(
                "Workstation domain membership confirmed (domain=%s)",
                status.domain,
            )
        else:
            task_logger.warning(
                "Workstation remains outside expected domain after bootstrap (detail=%s)",
                status.detail or status.domain,
            )

        return status