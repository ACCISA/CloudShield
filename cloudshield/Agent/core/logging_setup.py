import logging
from logging.handlers import RotatingFileHandler
import os

os.makedirs("logs", exist_ok=True)
log_file = os.path.join("logs", "agent.log")

logger = logging.getLogger("agent_logger")
logger.setLevel(logging.INFO)

formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
file_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

