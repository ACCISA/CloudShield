import pytest

from cloudshield.Agent.core import workstation_setup as ws


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message, *args):
        self.messages.append(("info", message % args if args else message))

    def warning(self, message, *args):
        self.messages.append(("warning", message % args if args else message))

    def error(self, message, *args):
        self.messages.append(("error", message % args if args else message))

    def debug(self, message, *args):
        self.messages.append(("debug", message % args if args else message))


@pytest.fixture(autouse=True)
def replace_logger(monkeypatch):
    logger = DummyLogger()
    monkeypatch.setattr(ws, "core_logger", logger)
    return logger


class FakeCompleted:
    def __init__(self, returncode=0, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


def test_run_powershell_json_success(monkeypatch):
    def fake_run(args, capture_output, text, timeout):
        assert args[0] == "powershell"
        return FakeCompleted(0, '{"key": "value"}')

    monkeypatch.setattr(ws.subprocess, "run", fake_run)
    assert ws._run_powershell_json("cmd") == {"key": "value"}


def test_run_powershell_json_returns_none_on_empty(monkeypatch):
    monkeypatch.setattr(ws.subprocess, "run", lambda *args, **kwargs: FakeCompleted(0, ""))
    assert ws._run_powershell_json("cmd") is None


def test_run_powershell_json_handles_error(monkeypatch, replace_logger):
    monkeypatch.setattr(ws.subprocess, "run", lambda *args, **kwargs: FakeCompleted(1, "", "err"))
    assert ws._run_powershell_json("cmd") is None
    assert any(level == "error" for level, _ in replace_logger.messages)


def test_run_powershell_json_handles_invalid_json(monkeypatch, replace_logger):
    monkeypatch.setattr(ws.subprocess, "run", lambda *args, **kwargs: FakeCompleted(0, "not json"))
    assert ws._run_powershell_json("cmd") is None
    assert any(level == "error" for level, _ in replace_logger.messages)


def test_query_domain_status_non_windows(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Linux")
    status = ws.query_domain_status()
    assert status.is_member is False
    assert status.detail.startswith("Domain checks are only supported")


def test_query_domain_status_windows(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Windows")
    monkeypatch.setattr(ws, "_run_powershell_json", lambda _cmd: {
        "PartOfDomain": True,
        "Domain": "corp.example",
        "DomainRole": 3,
    })
    status = ws.query_domain_status()
    assert status.is_member is True
    assert status.domain == "corp.example"


def test_query_domain_status_handles_list(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Windows")
    monkeypatch.setattr(ws, "_run_powershell_json", lambda _cmd: [{
        "PartOfDomain": False,
        "Domain": None,
        "DomainRole": 0,
    }])
    status = ws.query_domain_status()
    assert status.is_member is False
    assert status.domain is None


def test_query_domain_status_failure(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Windows")
    monkeypatch.setattr(ws, "_run_powershell_json", lambda _cmd: None)
    status = ws.query_domain_status()
    assert status.is_member is False
    assert status.detail == "Unable to query Win32_ComputerSystem"


def test_query_dns_servers_non_windows(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Linux")
    assert ws.query_dns_servers() == []


def test_query_dns_servers_with_list(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Windows")
    monkeypatch.setattr(ws, "_run_powershell_json", lambda _cmd: ["8.8.8.8", "1.1.1.1"])
    assert ws.query_dns_servers() == ["8.8.8.8", "1.1.1.1"]


def test_query_dns_servers_with_single_value(monkeypatch):
    monkeypatch.setattr(ws.platform, "system", lambda: "Windows")
    monkeypatch.setattr(ws, "_run_powershell_json", lambda _cmd: "8.8.4.4")
    assert ws.query_dns_servers() == ["8.8.4.4"]


def test_build_script_command_variants(monkeypatch):
    monkeypatch.setenv("CLOUDSHIELD_PYTHON_FOR_SETUP", "pythonw.exe")
    assert ws._build_script_command("script.ps1", ["-Arg"]) == [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "script.ps1",
        "-Arg",
    ]
    assert ws._build_script_command("script.cmd", []) == ["cmd.exe", "/c", "script.cmd"]
    assert ws._build_script_command("script.bat", ["/q"]) == ["cmd.exe", "/c", "script.bat", "/q"]
    assert ws._build_script_command("script.py", []) == ["pythonw.exe", "script.py"]
    assert ws._build_script_command("script.bin", ["--flag"]) == ["script.bin", "--flag"]


def test_parse_extra_args(monkeypatch, replace_logger):
    assert ws._parse_extra_args(None) == []
    assert ws._parse_extra_args("--foo bar") == ["--foo", "bar"]
    assert ws._parse_extra_args("\"") == []
    assert any(level == "warning" for level, _ in replace_logger.messages)


def make_status(member, domain, detail=None):
    return ws.DomainStatus(part_of_domain=member, domain=domain, domain_role=0, detail=detail)


def test_ensure_domain_membership_matches_expected(monkeypatch):
    monkeypatch.setattr(ws, "query_domain_status", lambda: make_status(True, "corp"))
    result = ws.ensure_domain_membership("corp", None, None)
    assert result.domain == "corp"


def test_ensure_domain_membership_no_script(monkeypatch):
    status = make_status(False, None, detail="manual")
    monkeypatch.setattr(ws, "query_domain_status", lambda: status)
    result = ws.ensure_domain_membership("corp", None, None)
    assert result is status


def test_ensure_domain_membership_missing_script(monkeypatch):
    status = make_status(False, None)
    monkeypatch.setattr(ws, "query_domain_status", lambda: status)
    monkeypatch.setattr(ws.os.path, "exists", lambda path: False)
    result = ws.ensure_domain_membership("corp", "missing.ps1", None)
    assert result is status


def test_ensure_domain_membership_script_failure(monkeypatch):
    status = make_status(False, None)
    calls = {"count": 0}

    def fake_query():
        calls["count"] += 1
        return status

    monkeypatch.setattr(ws, "query_domain_status", fake_query)
    monkeypatch.setattr(ws.os.path, "exists", lambda path: True)
    monkeypatch.setattr(ws.subprocess, "run", lambda *args, **kwargs: FakeCompleted(returncode=5))

    result = ws.ensure_domain_membership("corp", "script.ps1", None)
    assert result is status
    assert calls["count"] == 1


def test_ensure_domain_membership_script_timeout(monkeypatch):
    status = make_status(False, None)
    monkeypatch.setattr(ws, "query_domain_status", lambda: status)
    monkeypatch.setattr(ws.os.path, "exists", lambda path: True)

    def fake_run(*_args, **_kwargs):
        raise ws.subprocess.TimeoutExpired(cmd="script.ps1", timeout=5)

    monkeypatch.setattr(ws.subprocess, "run", fake_run)
    result = ws.ensure_domain_membership("corp", "script.ps1", None)
    assert result is status


def test_ensure_domain_membership_script_not_found(monkeypatch):
    status = make_status(False, None)
    monkeypatch.setattr(ws, "query_domain_status", lambda: status)
    monkeypatch.setattr(ws.os.path, "exists", lambda path: True)

    def fake_run(*_args, **_kwargs):
        raise FileNotFoundError("script")

    monkeypatch.setattr(ws.subprocess, "run", fake_run)
    result = ws.ensure_domain_membership("corp", "script.ps1", None)
    assert result is status


def test_ensure_domain_membership_script_success(monkeypatch):
    statuses = [make_status(False, None), make_status(True, "corp")]

    def fake_query():
        return statuses.pop(0)

    monkeypatch.setattr(ws, "query_domain_status", fake_query)
    monkeypatch.setattr(ws.os.path, "exists", lambda path: True)
    monkeypatch.setattr(ws.subprocess, "run", lambda *args, **kwargs: FakeCompleted(0, "output", ""))

    result = ws.ensure_domain_membership("corp", "script.ps1", "-Arg")
    assert result.domain == "corp"
    assert statuses == []


def test_ensure_domain_membership_script_success_but_still_wrong(monkeypatch):
    statuses = [make_status(False, None), make_status(True, "other")]

    def fake_query():
        return statuses.pop(0)

    monkeypatch.setattr(ws, "query_domain_status", fake_query)
    monkeypatch.setattr(ws.os.path, "exists", lambda path: True)
    monkeypatch.setattr(ws.subprocess, "run", lambda *args, **kwargs: FakeCompleted(0, "", ""))

    result = ws.ensure_domain_membership("corp", "script.ps1", None)
    assert result.domain == "other"
