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

state_logger = create_logger("state", "logs/state.log", "STATE")
server_logger = create_logger("server", "logs/server.log", "SERVER")
servicer_logger = create_logger("servicer", "logs/servicer.log", "SERVICER")
interceptor_logger = create_logger("interceptor", "logs/interceptor.log", "INTERCEPTOR")
