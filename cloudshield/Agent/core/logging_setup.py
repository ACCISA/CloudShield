import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path


def _resolve_log_dir() -> Path:
    """Return a persistent, writable log directory.

    On Windows the logs live under %PROGRAMDATA%\\CloudShield\\Agent\\logs.
    Falls back to ~/.cloudshield/agent/logs elsewhere.
    """
    program_data = os.getenv("PROGRAMDATA")
    if program_data:
        log_dir = Path(program_data) / "CloudShield" / "Agent" / "logs"
    else:
        log_dir = Path.home() / ".cloudshield" / "agent" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


LOG_DIR = _resolve_log_dir()
log_file = str(LOG_DIR / "agent.log")

logger = logging.getLogger("agent_logger")
logger.setLevel(logging.INFO)

formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5)
file_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

