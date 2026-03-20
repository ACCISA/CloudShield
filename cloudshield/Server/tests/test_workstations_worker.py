"""Tests for the workstations_worker module."""
import runpy
import sys
import types
from unittest.mock import MagicMock, call
from datetime import datetime, timezone


UTC = timezone.utc


def _setup_base_mocks(monkeypatch):
    """Set up base mocks for workstations_worker tests."""
    # Fake redis_conn
    fake_conn = MagicMock()

    # Fake redis_client module used by workstations_worker.py
    fake_redis_client = types.SimpleNamespace(redis_conn=fake_conn)
    monkeypatch.setitem(sys.modules, "utils.redis_client", fake_redis_client)
    
    # Also mock the utils module itself
    fake_utils = types.SimpleNamespace(redis_client=fake_redis_client)
    monkeypatch.setitem(sys.modules, "utils", fake_utils)

    return fake_conn


def test_workstations_worker_scheduler_setup(monkeypatch):
    """Test that scheduler is properly initialized and configured."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    cleanup_called = {"count": 0}

    def fake_cleanup_old_logs(days):
        cleanup_called["count"] += 1
        cleanup_called["days"] = days

    fake_logging_setup = types.SimpleNamespace(cleanup_old_logs=fake_cleanup_old_logs)
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    # Mock Scheduler
    scheduler_init_args = {}
    schedule_calls = []

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            scheduler_init_args["connection"] = kwargs.get("connection")

        def schedule(self, *args, **kwargs):
            schedule_calls.append({"args": args, "kwargs": kwargs})

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Fake Worker and Queue
    class FakeWorker:
        def __init__(self, queues, connection=None):
            pass

        def work(self):
            pass

    class FakeSimpleWorker(FakeWorker):
        pass

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda name, connection=None: types.SimpleNamespace(name=name),
        SimpleWorker=FakeSimpleWorker,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify scheduler was initialized with redis_conn
    assert scheduler_init_args["connection"] is fake_conn

    # Verify scheduler.schedule was called
    assert len(schedule_calls) > 0
    schedule_kwargs = schedule_calls[0]["kwargs"]

    # Verify schedule parameters
    assert "func" in schedule_kwargs
    assert schedule_kwargs["args"] == (30,)
    assert schedule_kwargs["interval"] == 86400  # 1 day in seconds
    assert schedule_kwargs["repeat"] is None


def test_workstations_worker_queue_setup(monkeypatch):
    """Test that workstations queue is properly created."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    fake_logging_setup = types.SimpleNamespace(
        cleanup_old_logs=lambda days: None
    )
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    # Track Queue instantiation
    queue_calls = []

    def fake_queue(name, connection=None):
        queue_calls.append({"name": name, "connection": connection})
        return types.SimpleNamespace(name=name)

    class FakeWorker:
        def __init__(self, queues, connection=None):
            pass

        def work(self):
            pass

    class FakeSimpleWorker(FakeWorker):
        pass

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=fake_queue,
        SimpleWorker=FakeSimpleWorker,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify Queue was called with correct name
    assert len(queue_calls) > 0
    assert queue_calls[0]["name"] == "workstations"
    assert queue_calls[0]["connection"] is fake_conn


def test_workstations_worker_on_non_windows(monkeypatch):
    """Test that on non-Windows, standard Worker is used."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    fake_logging_setup = types.SimpleNamespace(
        cleanup_old_logs=lambda days: None
    )
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    # Make os.name return 'posix' (non-Windows)
    monkeypatch.setattr("os.name", "posix")

    worker_init_calls = []
    simple_worker_init_calls = []
    worked = {"count": 0}

    class FakeWorker:
        def __init__(self, queues, connection=None):
            worker_init_calls.append({"queues": queues, "connection": connection})

        def work(self):
            worked["count"] += 1

    class FakeSimpleWorker:
        def __init__(self, queues, connection=None):
            simple_worker_init_calls.append(
                {"queues": queues, "connection": connection}
            )

        def work(self):
            worked["count"] += 1

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda name, connection=None: types.SimpleNamespace(name=name),
        SimpleWorker=FakeSimpleWorker,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify standard Worker was used
    assert len(worker_init_calls) == 1
    assert worker_init_calls[0]["connection"] is fake_conn
    # SimpleWorker should not be used on non-Windows
    assert len(simple_worker_init_calls) == 0
    # Verify work was called
    assert worked["count"] == 1


def test_workstations_worker_on_windows_with_simple_worker(monkeypatch):
    """Test that on Windows with SimpleWorker, SimpleWorker is used."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    fake_logging_setup = types.SimpleNamespace(
        cleanup_old_logs=lambda days: None
    )
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    # Make os.name return 'nt' (Windows)
    monkeypatch.setattr("os.name", "nt")

    worker_init_calls = []
    simple_worker_init_calls = []
    worked = {"count": 0}

    class FakeWorker:
        def __init__(self, queues, connection=None):
            worker_init_calls.append({"queues": queues, "connection": connection})

        def work(self):
            worked["count"] += 1

    class FakeSimpleWorker:
        def __init__(self, queues, connection=None):
            simple_worker_init_calls.append(
                {"queues": queues, "connection": connection}
            )

        def work(self):
            worked["count"] += 1

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda name, connection=None: types.SimpleNamespace(name=name),
        SimpleWorker=FakeSimpleWorker,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify SimpleWorker was used on Windows
    assert len(simple_worker_init_calls) == 1
    assert simple_worker_init_calls[0]["connection"] is fake_conn
    # Standard Worker should not be used when SimpleWorker is available
    assert len(worker_init_calls) == 0
    # Verify work was called
    assert worked["count"] == 1


def test_workstations_worker_on_windows_without_simple_worker(monkeypatch):
    """Test that on Windows without SimpleWorker, standard Worker is used."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    fake_logging_setup = types.SimpleNamespace(
        cleanup_old_logs=lambda days: None
    )
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    # Make os.name return 'nt' (Windows)
    monkeypatch.setattr("os.name", "nt")

    worker_init_calls = []
    worked = {"count": 0}

    class FakeWorker:
        def __init__(self, queues, connection=None):
            worker_init_calls.append({"queues": queues, "connection": connection})

        def work(self):
            worked["count"] += 1

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda name, connection=None: types.SimpleNamespace(name=name),
        SimpleWorker=None,  # Not available
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify standard Worker was used when SimpleWorker is not available
    assert len(worker_init_calls) == 1
    assert worker_init_calls[0]["connection"] is fake_conn
    # Verify work was called
    assert worked["count"] == 1


def test_workstations_worker_work_called(monkeypatch):
    """Test that worker.work() is called."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    fake_logging_setup = types.SimpleNamespace(
        cleanup_old_logs=lambda days: None
    )
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    work_calls = {"count": 0}

    class FakeWorker:
        def __init__(self, queues, connection=None):
            pass

        def work(self):
            work_calls["count"] += 1

    class FakeSimpleWorker(FakeWorker):
        pass

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda name, connection=None: types.SimpleNamespace(name=name),
        SimpleWorker=FakeSimpleWorker,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify work was called exactly once
    assert work_calls["count"] == 1


def test_workstations_worker_cleanup_scheduled_with_correct_params(monkeypatch):
    """Test that cleanup_old_logs is scheduled with correct interval."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module with a mock to track calls
    cleanup_func = MagicMock()
    fake_logging_setup = types.SimpleNamespace(cleanup_old_logs=cleanup_func)
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    schedule_calls = []

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            schedule_calls.append(kwargs)

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    class FakeWorker:
        def __init__(self, queues, connection=None):
            pass

        def work(self):
            pass

    class FakeSimpleWorker(FakeWorker):
        pass

    fake_rq = types.SimpleNamespace(
        Worker=FakeWorker,
        Queue=lambda name, connection=None: types.SimpleNamespace(name=name),
        SimpleWorker=FakeSimpleWorker,
    )
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    # Run the worker module
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")

    # Verify schedule was called with correct parameters
    assert len(schedule_calls) == 1
    schedule_params = schedule_calls[0]

    # Verify func is cleanup_old_logs
    assert schedule_params["func"] is cleanup_func

    # Verify args is (30,) meaning 30 days
    assert schedule_params["args"] == (30,)

    # Verify interval is 86400 seconds (1 day)
    assert schedule_params["interval"] == 86400

    # Verify repeat is None (continue indefinitely)
    assert schedule_params["repeat"] is None


def test_workstations_worker_simple_worker_import_exception(monkeypatch):
    """Test that when SimpleWorker import fails, code still runs with standard Worker."""
    fake_conn = _setup_base_mocks(monkeypatch)

    # Fake logging_setup module
    fake_logging_setup = types.SimpleNamespace(
        cleanup_old_logs=lambda days: None
    )
    monkeypatch.setitem(sys.modules, "utils.logging_setup", fake_logging_setup)

    # Create a fake rq module that raises an exception when trying to access SimpleWorker
    class FakeRQModule:
        class FakeWorker:
            def __init__(self, queues, connection=None):
                pass

            def work(self):
                pass

        class NoAttr:
            def __getattr__(self, name):
                if name == "SimpleWorker":
                    raise ImportError("SimpleWorker not available")
                raise AttributeError(f"No attribute {name}")

        Worker = FakeWorker
        Queue = staticmethod(lambda name, connection=None: types.SimpleNamespace(name=name))
        SimpleWorker = property(lambda self: (_ for _ in ()).throw(
            ImportError("SimpleWorker not available")
        ))

    # Create a module that has SimpleWorker as None to simulate the except block
    fake_rq = types.SimpleNamespace(
        Worker=FakeRQModule.FakeWorker,
        Queue=FakeRQModule.Queue,
    )
    # Don't include SimpleWorker to force the except path
    monkeypatch.setitem(sys.modules, "rq", fake_rq)

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def schedule(self, *args, **kwargs):
            pass

    fake_rq_scheduler = types.SimpleNamespace(Scheduler=FakeScheduler)
    monkeypatch.setitem(sys.modules, "rq_scheduler", fake_rq_scheduler)

    # Clear the module from cache so it reimports
    if "cloudshield.Server.workstations_worker" in sys.modules:
        del sys.modules["cloudshield.Server.workstations_worker"]

    # Run the worker module - it should handle the missing SimpleWorker gracefully
    runpy.run_module("cloudshield.Server.workstations_worker", run_name="__main__")
