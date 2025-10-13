import json


from cloudshield.Agent.tasks import workstation
from cloudshield.Agent.tasks.workstation import EnsureDomainMembershipTask
from cloudshield.Agent.core.workstation_setup import DomainStatus


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message, *args):
        self.messages.append(("info", message % args if args else message))

    def warning(self, message, *args):
        self.messages.append(("warning", message % args if args else message))

    def error(self, message, *args):
        self.messages.append(("error", message % args if args else message))


def _collect(logger, level):
    return [msg for lvl, msg in logger.messages if lvl == level]


def test_load_config_missing_logs_once(monkeypatch, tmp_path):
    logger = DummyLogger()
    monkeypatch.setattr(workstation, "task_logger", logger)
    task = EnsureDomainMembershipTask({}, str(tmp_path / "missing.json"))

    task._load_config()
    task._load_config()

    warnings = _collect(logger, "warning")
    assert len(warnings) == 1
    assert "not found" in warnings[0]
    assert task.expected_domain is None
    assert task.setup_script is None
    assert task.setup_timeout == task.default_timeout


def test_load_config_invalid_json(monkeypatch, tmp_path):
    logger = DummyLogger()
    monkeypatch.setattr(workstation, "task_logger", logger)
    config_path = tmp_path / "bad.json"
    config_path.write_text("{", encoding="utf-8")

    task = EnsureDomainMembershipTask({}, str(config_path))
    task._load_config()

    errors = _collect(logger, "error")
    assert errors and "Failed to parse" in errors[0]
    assert task.expected_domain is None


def test_run_invokes_ensure_domain_membership(monkeypatch, tmp_path):
    logger = DummyLogger()
    monkeypatch.setattr(workstation, "task_logger", logger)

    script_dir = tmp_path / "scripts"
    script_dir.mkdir()
    config_path = tmp_path / "agent_config.json"
    config_path.write_text(
        json.dumps(
            {
                "expected_domain": "corp.example",
                "workstation_setup_script": "scripts/setup.ps1",
                "workstation_setup_args": "--flag value",
                "workstation_setup_timeout": "invalid",
            }
        ),
        encoding="utf-8",
    )

    captured = {}

    def fake_ensure(expected_domain, setup_script, setup_args, timeout_seconds):
        captured["args"] = (expected_domain, setup_script, setup_args, timeout_seconds)
        return DomainStatus(part_of_domain=True, domain="corp.example", domain_role=3)

    monkeypatch.setattr(workstation, "ensure_domain_membership", fake_ensure)

    task = EnsureDomainMembershipTask({}, str(config_path))
    status = task.run()

    assert status.domain == "corp.example"
    assert task.agent_state["domain_status"]["is_member"] is True
    assert task.agent_state["expected_domain"] == "corp.example"

    expected_script_path = str((config_path.parent / "scripts" / "setup.ps1").resolve())
    assert captured["args"] == (
        "corp.example",
        expected_script_path,
        "--flag value",
        task.default_timeout,
    )

    warnings = _collect(logger, "warning")
    assert any("Invalid workstation_setup_timeout" in msg for msg in warnings)
    infos = _collect(logger, "info")
    assert any("Workstation domain membership confirmed" in msg for msg in infos)