from redis_client import redis_conn
from rq import Worker, Queue

if __name__ == "__main__":
    queue = Queue(connection=redis_conn)
    worker = Worker([queue], connection=redis_conn)
    worker.work()

