import os
import redis
from rq import Queue


def _first_env(*keys: str, default: str | None = None) -> str | None:
    for k in keys:
        v = os.getenv(k)
        if v is not None and str(v).strip() != "":
            return v
    return default

REDIS_URL = _first_env("CLOUDSHIELD_REDIS_URL", "REDIS_URL")

REDIS_HOST = _first_env("CLOUDSHIELD_REDIS_HOST", "REDIS_HOST", default="redis") or "redis"
REDIS_PORT = int(_first_env("CLOUDSHIELD_REDIS_PORT", "REDIS_PORT", default="6379") or "6379")
REDIS_DB = int(_first_env("CLOUDSHIELD_REDIS_DB", "REDIS_DB", default="0") or "0")

DEFAULT_JOB_TIMEOUT = int(os.getenv("CLOUDSHIELD_JOB_TIMEOUT", "1200"))  


if REDIS_URL:
    redis_conn = redis.Redis.from_url(REDIS_URL)
else:
    redis_conn = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)

task_queue = Queue(connection=redis_conn, default_timeout=DEFAULT_JOB_TIMEOUT)
