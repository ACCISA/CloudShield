import logging
from pathlib import Path
import cloudshield.Server.utils.logging_setup as ls
import os
import time


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
