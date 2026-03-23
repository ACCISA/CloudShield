import os
from utils.logging_setup import cleanup_old_logs
from utils.redis_client import redis_conn
from rq import Worker, Queue
from rq_scheduler import Scheduler
from datetime import datetime, timezone

UTC = timezone.utc

try:
    from rq import SimpleWorker
except Exception:
    SimpleWorker = None  # type: ignore

if __name__ == "__main__":
    scheduler = Scheduler(connection=redis_conn)
    # Run cleanup every day
    scheduler.schedule(
        scheduled_time=datetime.now(UTC),
        func=cleanup_old_logs,
        args=(30,),
        interval=86400,
        repeat=None
    )

    queue = Queue('api',connection=redis_conn)
    queues = [queue]
    # On Windows, use SimpleWorker (no fork). Else, use standard Worker.
    if os.name == "nt" and SimpleWorker is not None:
        worker = SimpleWorker(queues, connection=redis_conn)
    else:
        worker = Worker(queues, connection=redis_conn)
    worker.work()

