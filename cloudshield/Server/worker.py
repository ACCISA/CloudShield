"""Legacy worker entrypoint kept for backward compatibility with tests and scripts."""
import os
from datetime import datetime, timezone

from utils.logging_setup import cleanup_old_logs

try:
    from redis_client import redis_conn  # type: ignore
except Exception:
    from utils.redis_client import redis_conn

from rq import Worker, Queue
from rq_scheduler import Scheduler

UTC = timezone.utc

try:
    from rq import SimpleWorker
except Exception:
    SimpleWorker = None  # type: ignore

if __name__ == "__main__":
    scheduler = Scheduler(connection=redis_conn)
    scheduler.schedule(
        scheduled_time=datetime.now(UTC),
        func=cleanup_old_logs,
        args=(30,),
        interval=86400,
        repeat=None,
    )

    queue = Queue(connection=redis_conn)
    queues = [queue]

    # On Windows, use SimpleWorker (no fork). Else, use standard Worker.
    if os.name == "nt" and SimpleWorker is not None:
        worker = SimpleWorker(queues, connection=redis_conn)
    else:
        worker = Worker(queues, connection=redis_conn)

    worker.work()
