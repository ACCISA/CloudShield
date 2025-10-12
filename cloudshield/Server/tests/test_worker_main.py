import runpy
import sys
import types


def test_worker_main_invokes_work(monkeypatch):
    # Fake redis_conn
    fake_conn = object()

    # Fake redis_client module used by worker.py
    fake_redis_client = types.SimpleNamespace(redis_conn=fake_conn)
    monkeypatch.setitem(sys.modules, "redis_client", fake_redis_client)

    # Fake Worker and SimpleWorker classes
    worked = {"count": 0}

    class FakeWorker:
        def __init__(self, queues, connection=None):
            pass

        def work(self):
            worked["count"] += 1

    class FakeSimpleWorker(FakeWorker):
        pass

    fake_rq = types.SimpleNamespace(Worker=FakeWorker, Queue=lambda connection: types.SimpleNamespace(), SimpleWorker=FakeSimpleWorker)
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    # Run the module as __main__; it should call work() exactly once
    runpy.run_module("cloudshield.Server.worker", run_name="__main__")
    assert worked["count"] == 1
