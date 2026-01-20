import logging
from pathlib import Path
import os
import time
import sys
import types  # <-- new

if "jwt" not in sys.modules:
    dummy_jwt = types.ModuleType("jwt")
    setattr(dummy_jwt, "encode", lambda *a, **k: "dummy-token")
    setattr(dummy_jwt, "decode", lambda *a, **k: {"sub": "dummy"})
    sys.modules["jwt"] = dummy_jwt

import cloudshield.Server.utils.logging_setup as ls


def test_get_logger_api(tmp_path, monkeypatch):
    monkeypatch.setenv("CLOUDSHIELD_LOG_DIR", str(tmp_path))
    # Reimport module to pick up env var for BASE_LOG_DIR
    import importlib
    importlib.reload(ls)

    # Ensure any pre-existing logger for this name is reset so get_logger can reconfigure
    pre = logging.getLogger("cloudshield.api")
    for h in list(pre.handlers):
        pre.removeHandler(h)

    logger = ls.get_logger("api")
    assert isinstance(logger, logging.Logger)
    # Emit and verify a RotatingFileHandler is attached targeting server.log under tmp_path
    logger.info("hello")
    from logging.handlers import RotatingFileHandler
    targets = [
        getattr(h, "baseFilename", "")
        for h in logger.handlers
        if isinstance(h, RotatingFileHandler)
    ]
    assert any(str(Path(tmp_path) / "server.log") == t for t in targets)


def test_get_logger_job_and_helpers(tmp_path, monkeypatch):
    monkeypatch.setenv("CLOUDSHIELD_LOG_DIR", str(tmp_path))
    import importlib
    importlib.reload(ls)

    lg = ls.get_logger("job", job_id="abc")
    lg.debug("x")
    # Ensure job log path is computed as expected
    p = ls.get_job_log_path("abc")
    assert str(p).endswith("job_abc.log")

    # summarize_job_log should return zero size if file missing
    summary = ls.summarize_job_log(job_id="abc", org_id="org1", status="done")
    assert summary["job_id"] == "abc"
    assert "size_bytes" in summary

def test_cleanup_old_logs(tmp_path, monkeypatch, capsys):
    """Ensure cleanup_old_logs removes only logs older than N days."""
    # Point log directories to a temporary location
    monkeypatch.setenv("CLOUDSHIELD_LOG_DIR", str(tmp_path))
    import importlib
    importlib.reload(ls)

    # Create a mix of old and recent job logs
    old_log = ls.JOB_LOG_DIR / "job_old.log"
    new_log = ls.JOB_LOG_DIR / "job_new.log"
    old_log.write_text("old data")
    new_log.write_text("new data")

    # Modify modification time to simulate an old file (31 days ago)
    old_mtime = time.time() - (31 * 24 * 3600)
    os.utime(old_log, (old_mtime, old_mtime))

    # Run cleanup (threshold = 30 days)
    ls.cleanup_old_logs(days=30)

    # Capture printed output
    out = capsys.readouterr().out

    # Validate: old_log deleted, new_log kept
    assert not old_log.exists()
    assert new_log.exists()
    assert "deleted 1 old logs" in out

    # Re-run cleanup with no old logs → should delete 0
    ls.cleanup_old_logs(days=30)
    out2 = capsys.readouterr().out
    assert "deleted 0 old logs" in out2


def test_get_logger_permission_error_falls_back_to_console(
    tmp_path, monkeypatch, capsys
):
    """
    When RotatingFileHandler raises PermissionError, we should still get a
    logger and a warning should be printed (exercise the except branch).
    """
    monkeypatch.setenv("CLOUDSHIELD_LOG_DIR", str(tmp_path))
    import importlib

    importlib.reload(ls)

    logger_name = "cloudshield.service"
    pre = logging.getLogger(logger_name)
    for h in list(pre.handlers):
        pre.removeHandler(h)

    class FailingHandler:
        def __init__(self, *args, **kwargs):
            raise PermissionError("no permission")

    monkeypatch.setattr(ls, "RotatingFileHandler", FailingHandler)

    ls.get_logger("service")
    captured = capsys.readouterr()

    assert "Could not open log file" in captured.err
    assert "falling back to console logging only" in captured.err



def test_summarize_job_log_missing_file(tmp_path, monkeypatch):
    """
    If the job log file does not exist, summarize_job_log must return size_bytes = 0
    (exercise the FileNotFoundError branch).
    """
    monkeypatch.setenv("CLOUDSHIELD_LOG_DIR", str(tmp_path))
    import importlib
    importlib.reload(ls)

    summary = ls.summarize_job_log(job_id="does_not_exist", org_id="orgX")
    assert summary["job_id"] == "does_not_exist"
    assert summary["org_id"] == "orgX"
    assert summary["size_bytes"] == 0  # FileNotFoundError path
    assert summary["log_path"].endswith("job_does_not_exist.log")


def test_cleanup_old_logs_handles_unlink_errors(tmp_path, monkeypatch, capsys):
    """
    If deleting an old job log raises an exception, cleanup_old_logs should
    catch it and print the 'Could not delete ...' message (exercise the
    generic Exception branch).
    """
    monkeypatch.setenv("CLOUDSHIELD_LOG_DIR", str(tmp_path))
    import importlib
    importlib.reload(ls)

    # Create an old log file that should be deleted
    old_log = ls.JOB_LOG_DIR / "job_err.log"
    old_log.write_text("test")
    old_mtime = time.time() - (31 * 24 * 3600)  # 31 days ago
    os.utime(old_log, (old_mtime, old_mtime))

    # Make Path.unlink fail so we hit the except Exception block
    def fail_unlink(self, *args, **kwargs):
        raise RuntimeError("test unlink failure")

    monkeypatch.setattr(ls.Path, "unlink", fail_unlink)

    ls.cleanup_old_logs(days=30)
    out = capsys.readouterr().out

    assert "Could not delete" in out
    assert "job_err.log" in out
