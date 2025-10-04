import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = os.getenv("CLOUDSHIELD_LOG_DIR", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "server.log")
LOG_LEVEL = os.getenv("CLOUDSHIELD_LOG_LEVEL", "INFO").upper()

logger = logging.getLogger("cloudshield.server")
# Avoid duplicate handlers if reloaded
if not logger.handlers:
    level = getattr(logging, LOG_LEVEL, logging.INFO)
    logger.setLevel(level)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s %(message)s")

    console = logging.StreamHandler()
    console.setFormatter(fmt)

    file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=3)
    file_handler.setFormatter(fmt)

    logger.addHandler(console)
    logger.addHandler(file_handler)

__all__ = ["logger"]
