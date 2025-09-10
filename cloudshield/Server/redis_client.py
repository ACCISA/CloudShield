import redis
from rq import Queue

redis_conn = redis.Redis(host="localhost", port=6379, db=0)
task_queue = Queue(connection=redis_conn)

