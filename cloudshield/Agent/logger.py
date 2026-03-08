import logging
from logging.handlers import RotatingFileHandler
import os
import sys
from pathlib import Path


def _resolve_log_dir() -> Path:
    """Return a persistent, writable log directory.

    On Windows the logs are stored under %PROGRAMDATA%\\CloudShield\\Agent\\logs
    so they survive reboots and are readable by administrators at any time.
    Falls back to a home-directory location on non-Windows systems.
    """
    program_data = os.getenv("PROGRAMDATA")
    if program_data:
        log_dir = Path(program_data) / "CloudShield" / "Agent" / "logs"
    else:
        log_dir = Path.home() / ".cloudshield" / "agent" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


LOG_DIR = _resolve_log_dir()


def create_logger(name: str, log_file: str, prefix: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    fh = RotatingFileHandler(
        str(LOG_DIR / log_file), maxBytes=5 * 1024 * 1024, backupCount=5
    )
    fh.setLevel(logging.DEBUG)

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.DEBUG)

    formatter = logging.Formatter(f"[{prefix}] %(asctime)s - %(levelname)s - %(message)s")
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)

    if not logger.handlers:
        logger.addHandler(fh)
        logger.addHandler(ch)

    return logger

core_logger = create_logger("core", "core.log", "CORE")
task_logger = create_logger("task", "task.log", "TASK")
