import logging
from pathlib import Path
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
