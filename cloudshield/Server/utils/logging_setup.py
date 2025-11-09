"""Centralized logging configuration for CloudShield with job-specific logging."""
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from datetime import datetime, timedelta, timezone

BASE_LOG_DIR = Path(os.getenv("CLOUDSHIELD_LOG_DIR", "logs"))
BASE_LOG_DIR.mkdir(parents=True, exist_ok=True)

JOB_LOG_DIR = BASE_LOG_DIR / "jobs"
JOB_LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_LEVEL = os.getenv("CLOUDSHIELD_LOG_LEVEL", "INFO").upper()
MAX_BYTES = 10 * 1024 * 1024
BACKUP_COUNT = 5


def _create_formatter() -> logging.Formatter:
    """Create consistent log format for all CloudShield logs."""
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    return logging.Formatter(fmt)


def _add_handlers(logger: logging.Logger, log_path: Path):
    """Attach console and rotating file handlers to logger."""
    formatter = _create_formatter()

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def get_logger(context: str = "api", job_id: str | None = None) -> logging.Logger:
    """
    Get or create CloudShield logger instance.

    Usage:
      - get_logger("api")                  → logs/server.log
      - get_logger("job", job_id="abc123") → logs/jobs/job_abc123.log
    """
    logger_name = f"cloudshield.{context}"
    if job_id:
        logger_name += f".{job_id}"

    logger = logging.getLogger(logger_name)
    if logger.handlers:
        return logger

    level = getattr(logging, LOG_LEVEL, logging.INFO)
    logger.setLevel(level)

    if context == "api":
        log_path = BASE_LOG_DIR / "server.log"
    elif context == "job" and job_id:
        log_path = JOB_LOG_DIR / f"job_{job_id}.log"
    else:
        log_path = BASE_LOG_DIR / "general.log"

    _add_handlers(logger, log_path)
    logger.propagate = False

    logger.debug("Logger initialized for %s (%s)", logger_name, log_path)
    return logger


def summarize_job_log(job_id: str, org_id: str, status: str = "completed") -> dict:
    """Generate JSON-serializable summary of job log for MongoDB storage."""
    log_path = JOB_LOG_DIR / f"job_{job_id}.log"
    try:
        size_bytes = log_path.stat().st_size
    except FileNotFoundError:
        size_bytes = 0

    return {
        "job_id": job_id,
        "org_id": org_id,
        "status": status,
        "log_path": str(log_path),
        "size_bytes": size_bytes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def get_job_log_path(job_id: str) -> Path:
    """Get absolute path to job log file."""
    return JOB_LOG_DIR / f"job_{job_id}.log"


def cleanup_old_logs(days: int = 30):
    """Remove job logs older than specified days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    deleted = 0
    for log_file in JOB_LOG_DIR.glob("job_*.log"):
        try:
            if datetime.fromtimestamp(log_file.stat().st_mtime, tz=timezone.utc) < cutoff:
                log_file.unlink()
                deleted += 1
        except Exception as e:
            print(f"Could not delete {log_file}: {e}")
    print(f"Cleanup complete: deleted {deleted} old logs (> {days} days)")
