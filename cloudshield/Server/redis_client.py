import os
import redis
from rq import Queue

# Allow configuring Redis connection & default job timeout via environment
REDIS_HOST = os.getenv("CLOUDSHIELD_REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("CLOUDSHIELD_REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("CLOUDSHIELD_REDIS_DB", "0"))

# Default timeout for jobs (Terraform can exceed 3 minutes easily). Use env override.
DEFAULT_JOB_TIMEOUT = int(os.getenv("CLOUDSHIELD_JOB_TIMEOUT", "1200"))  # seconds

redis_conn = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)
task_queue = Queue(connection=redis_conn, default_timeout=DEFAULT_JOB_TIMEOUT)


