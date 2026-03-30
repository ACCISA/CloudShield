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

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda *args, **kwargs: types.SimpleNamespace(),
        SimpleWorker=FakeSimpleWorker,
        get_current_job=lambda: None,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            # Do nothing
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    runpy.run_module("cloudshield.Server.api_worker", run_name="__main__")
    assert worked["count"] == 1


def test_worker_py_main_invokes_work(monkeypatch):
    """Cover cloudshield/Server/worker.py __main__ block."""
    fake_conn = object()
    fake_redis_client = types.SimpleNamespace(redis_conn=fake_conn)
    monkeypatch.setitem(sys.modules, "redis_client", fake_redis_client)

    worked = {"count": 0}

    class FakeWorker:
        def __init__(self, queues, connection=None):
            pass
        def work(self):
            worked["count"] += 1

    class FakeSimpleWorker(FakeWorker):
        pass

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda *a, **kw: types.SimpleNamespace(),
        SimpleWorker=FakeSimpleWorker,
        get_current_job=lambda: None,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *a, **kw): pass
        def schedule(self, *a, **kw): pass

    monkeypatch.setitem(sys.modules, "rq_scheduler",
                        types.SimpleNamespace(Scheduler=FakeScheduler))

    runpy.run_module("cloudshield.Server.worker", run_name="__main__")
    assert worked["count"] == 1


def test_worker_py_main_windows_uses_simple_worker(monkeypatch):
    """Cover the os.name == 'nt' branch in worker.py."""
    import os
    fake_conn = object()
    fake_redis_client = types.SimpleNamespace(redis_conn=fake_conn)
    monkeypatch.setitem(sys.modules, "redis_client", fake_redis_client)
    monkeypatch.setattr(os, "name", "nt")

    worked = {"worker_type": None}

    class FakeWorker:
        def __init__(self, queues, connection=None): pass
        def work(self): worked["worker_type"] = "Worker"

    class FakeSimpleWorker:
        def __init__(self, queues, connection=None): pass
        def work(self): worked["worker_type"] = "SimpleWorker"

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda *a, **kw: types.SimpleNamespace(),
        SimpleWorker=FakeSimpleWorker,
        get_current_job=lambda: None,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *a, **kw): pass
        def schedule(self, *a, **kw): pass

    monkeypatch.setitem(sys.modules, "rq_scheduler",
                        types.SimpleNamespace(Scheduler=FakeScheduler))

    runpy.run_module("cloudshield.Server.worker", run_name="__main__")
    assert worked["worker_type"] == "SimpleWorker"
