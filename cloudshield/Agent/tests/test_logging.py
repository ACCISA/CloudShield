"""Tests for logger.py and core/logging_setup.py – _resolve_log_dir() paths."""
import importlib
import logging
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# logger.py  (_resolve_log_dir + create_logger)
# ---------------------------------------------------------------------------


def test_logger_resolve_log_dir_uses_programdata(monkeypatch, tmp_path):
    """When PROGRAMDATA is set, logs land under <PROGRAMDATA>/CloudShield/Agent/logs."""
    monkeypatch.setenv("PROGRAMDATA", str(tmp_path))

    # Force reimport so _resolve_log_dir() re-evaluates
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.logger", raising=False)
    mod = importlib.import_module("cloudshield.Agent.logger")

    expected = tmp_path / "CloudShield" / "Agent" / "logs"
    assert mod.LOG_DIR == expected
    assert expected.is_dir()


def test_logger_resolve_log_dir_falls_back_to_home(monkeypatch, tmp_path):
    """Without PROGRAMDATA the fallback is ~/.cloudshield/agent/logs."""
    monkeypatch.delenv("PROGRAMDATA", raising=False)
    monkeypatch.setattr(Path, "home", staticmethod(lambda: tmp_path / "fakehome"))

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.logger", raising=False)
    mod = importlib.import_module("cloudshield.Agent.logger")

    expected = tmp_path / "fakehome" / ".cloudshield" / "agent" / "logs"
    assert mod.LOG_DIR == expected
    assert expected.is_dir()


def test_create_logger_returns_logger_with_handlers(monkeypatch, tmp_path):
    """create_logger attaches both a file and stream handler."""
    monkeypatch.setenv("PROGRAMDATA", str(tmp_path))
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.logger", raising=False)

    # Remove any pre-existing loggers with our test name so handlers are fresh
    logging.getLogger("test_create").handlers.clear()

    mod = importlib.import_module("cloudshield.Agent.logger")
    lg = mod.create_logger("test_create", "test_create.log", "TST")

    assert isinstance(lg, logging.Logger)
    assert lg.level == logging.DEBUG
    assert any(isinstance(h, logging.handlers.RotatingFileHandler) for h in lg.handlers)
    assert any(isinstance(h, logging.StreamHandler) for h in lg.handlers)


def test_create_logger_writes_to_file(monkeypatch, tmp_path):
    """Verify messages actually land on disk."""
    monkeypatch.setenv("PROGRAMDATA", str(tmp_path))
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.logger", raising=False)
    logging.getLogger("test_disk").handlers.clear()

    mod = importlib.import_module("cloudshield.Agent.logger")
    lg = mod.create_logger("test_disk", "test_disk.log", "DISK")
    lg.info("hello from test")

    log_file = tmp_path / "CloudShield" / "Agent" / "logs" / "test_disk.log"
    assert log_file.exists()
    assert "hello from test" in log_file.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# core/logging_setup.py  (_resolve_log_dir)
# ---------------------------------------------------------------------------


def test_logging_setup_resolve_log_dir_uses_programdata(monkeypatch, tmp_path):
    monkeypatch.setenv("PROGRAMDATA", str(tmp_path))
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.core.logging_setup", raising=False)
    logging.getLogger("agent_logger").handlers.clear()

    mod = importlib.import_module("cloudshield.Agent.core.logging_setup")

    expected = tmp_path / "CloudShield" / "Agent" / "logs"
    assert mod.LOG_DIR == expected
    assert expected.is_dir()


def test_logging_setup_resolve_log_dir_falls_back_to_home(monkeypatch, tmp_path):
    monkeypatch.delenv("PROGRAMDATA", raising=False)
    monkeypatch.setattr(Path, "home", staticmethod(lambda: tmp_path / "fakehome"))
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.core.logging_setup", raising=False)
    logging.getLogger("agent_logger").handlers.clear()

    mod = importlib.import_module("cloudshield.Agent.core.logging_setup")

    expected = tmp_path / "fakehome" / ".cloudshield" / "agent" / "logs"
    assert mod.LOG_DIR == expected
    assert expected.is_dir()


def test_logging_setup_logger_writes_to_agent_log(monkeypatch, tmp_path):
    monkeypatch.setenv("PROGRAMDATA", str(tmp_path))
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.core.logging_setup", raising=False)
    logging.getLogger("agent_logger").handlers.clear()

    mod = importlib.import_module("cloudshield.Agent.core.logging_setup")
    mod.logger.info("setup-test-msg")

    log_file = tmp_path / "CloudShield" / "Agent" / "logs" / "agent.log"
    assert log_file.exists()
    assert "setup-test-msg" in log_file.read_text(encoding="utf-8")
