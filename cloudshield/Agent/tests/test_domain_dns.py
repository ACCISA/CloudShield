import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

import cloudshield.Agent.core as core_pkg

sys.modules.setdefault("core", core_pkg)

from cloudshield.Agent.tasks import domain_dns
from cloudshield.Agent.tasks.domain_dns import DomainDnsCheckTask


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message, *args):
        self.messages.append(("info", self._format(message, *args)))

    def warning(self, message, *args):
        self.messages.append(("warning", self._format(message, *args)))

    def error(self, message, *args):
        self.messages.append(("error", self._format(message, *args)))

    @staticmethod
    def _format(message, *args):
        return message % args if args else message


@pytest.fixture
def agent_state():
    return {}


def test_resolve_config_path_defaults():
    default = DomainDnsCheckTask._resolve_config_path(None)
    expected = Path(domain_dns.__file__).resolve().parents[1] / "config" / "agent_config.json"
    assert default == expected


def test_resolve_config_path_respects_override(tmp_path, agent_state):
    override = tmp_path / "custom.json"
    task = DomainDnsCheckTask(agent_state, str(override))
    assert task.config_path == override


def test_load_config_missing_logs_once(tmp_path, agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, str(tmp_path / "missing.json"))

    task._load_config()
    task._load_config()

    assert task.expected_domain is None
    assert task.expected_dns_servers == set()
    warnings = [msg for level, msg in logger.messages if level == "warning"]
    assert len(warnings) == 1
    assert "not found" in warnings[0]


def test_load_config_invalid_json(tmp_path, agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    path = tmp_path / "bad.json"
    path.write_text("{", encoding="utf-8")

    task = DomainDnsCheckTask(agent_state, str(path))
    task._load_config()

    assert task.expected_domain is None
    assert task.expected_dns_servers == set()
    errors = [msg for level, msg in logger.messages if level == "error"]
    assert len(errors) == 1
    assert "Failed to parse" in errors[0]


def test_load_config_parses_values_from_list(tmp_path, agent_state):
    path = tmp_path / "config.json"
    payload = {
        "expected_domain": " corp.example.local ",
        "expected_dns_servers": ["10.0.0.2", "10.0.0.3 ", 42, ""],
    }
    path.write_text(json.dumps(payload), encoding="utf-8")

    task = DomainDnsCheckTask(agent_state, str(path))
    task._load_config()

    assert task.expected_domain == "corp.example.local"
    assert task.expected_dns_servers == {"10.0.0.2", "10.0.0.3"}


def test_load_config_parses_single_dns_string(tmp_path, agent_state):
    path = tmp_path / "config.json"
    path.write_text(json.dumps({"expected_dns_servers": "10.0.0.4 "}), encoding="utf-8")

    task = DomainDnsCheckTask(agent_state, str(path))
    task._load_config()

    assert task.expected_dns_servers == {"10.0.0.4"}


@pytest.mark.parametrize(
    "input_value, expected",
    [(None, None), (" Corp.LOCAL ", "corp.local")],
)
def test_normalize_domain(input_value, expected):
    assert DomainDnsCheckTask._normalize_domain(input_value) == expected


def test_check_domain_logs_detected_when_unconfigured(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_domain = None

    task._check_domain("corp.local", True)

    assert agent_state["domain_info"] == {"is_member": True, "domain": "corp.local"}
    assert logger.messages[-1][1].startswith("Detected domain membership")


def test_check_domain_workgroup_warning(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_domain = "workgroup"

    task._check_domain("corp.local", True)

    assert logger.messages[-1][0] == "warning"
    assert "expects no domain" in logger.messages[-1][1]


def test_check_domain_workgroup_pass(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_domain = "workgroup"

    task._check_domain(None, False)

    assert logger.messages[-1] == ("info", "Domain check passed: machine remains in WORKGROUP as expected")


def test_check_domain_warns_when_not_member(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_domain = "corp.local"

    task._check_domain(None, False)

    assert logger.messages[-1][0] == "warning"
    assert "not joined" in logger.messages[-1][1]


def test_check_domain_warns_on_mismatch(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_domain = "corp.local"

    task._check_domain("other.local", True)

    assert logger.messages[-1][0] == "warning"
    assert "mismatch" in logger.messages[-1][1]


def test_check_domain_logs_success_on_match(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_domain = "corp.local"

    task._check_domain("Corp.Local", True)

    assert logger.messages[-1] == ("info", "Domain check passed: Corp.Local")


def test_check_dns_logs_detected_when_unconfigured(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_dns_servers = set()

    task._check_dns(["10.0.0.1"])

    assert agent_state["dns_servers"] == ["10.0.0.1"]
    assert logger.messages[-1] == ("info", "Detected DNS servers: 10.0.0.1")


def test_check_dns_reports_missing_and_unexpected(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_dns_servers = {"10.0.0.1", "1.1.1.1"}

    task._check_dns(["10.0.0.1", "8.8.8.8"])

    warnings = [message for level, message in logger.messages if level == "warning"]
    assert "Missing expected DNS servers: 1.1.1.1" in warnings
    assert "Unexpected DNS servers detected: 8.8.8.8" in warnings


def test_check_dns_logs_success_when_match(agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    task = DomainDnsCheckTask(agent_state, "unused")
    task.expected_dns_servers = {"10.0.0.1"}

    task._check_dns(["10.0.0.1"])

    assert logger.messages[-1] == ("info", "DNS configuration matches expected entries")


def test_run_loads_config_and_updates_state(tmp_path, agent_state, monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(domain_dns, "task_logger", logger)
    config_path = tmp_path / "config.json"
    config_path.write_text(
        json.dumps({"expected_domain": "corp.local", "expected_dns_servers": ["10.0.0.2"]}),
        encoding="utf-8",
    )

    task = DomainDnsCheckTask(agent_state, str(config_path))

    status = SimpleNamespace(domain="corp.local", is_member=True)
    monkeypatch.setattr(domain_dns, "query_domain_status", lambda: status)
    monkeypatch.setattr(domain_dns, "query_dns_servers", lambda: ["10.0.0.2"])

    task.run()

    assert agent_state["domain_info"] == {"is_member": True, "domain": "corp.local"}
    assert agent_state["dns_servers"] == ["10.0.0.2"]
    info_messages = [msg for level, msg in logger.messages if level == "info"]
    assert any("Domain check passed" in msg for msg in info_messages)
    assert any("DNS configuration matches" in msg for msg in info_messages)
