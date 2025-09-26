import logging
import os
import sys

os.makedirs("logs", exist_ok=True)

def create_logger(name: str, log_file: str, prefix: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    fh = logging.FileHandler(log_file)
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

core_logger = create_logger("core", "logs/core.log", "CORE")
task_logger = create_logger("task", "logs/task.log", "TASK")
