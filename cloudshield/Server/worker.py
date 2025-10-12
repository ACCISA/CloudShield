import os
from redis_client import redis_conn
from rq import Worker, Queue
try:
    from rq import SimpleWorker
except Exception:
    SimpleWorker = None  # type: ignore

if __name__ == "__main__":
    queue = Queue(connection=redis_conn)
    queues = [queue]
    # On Windows, use SimpleWorker (no fork). Else, use standard Worker.
    if os.name == "nt" and SimpleWorker is not None:
        worker = SimpleWorker(queues, connection=redis_conn)
    else:
        worker = Worker(queues, connection=redis_conn)
    worker.work()

