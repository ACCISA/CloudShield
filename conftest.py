import sys
import types


def _stub_module(name, attrs=None):
    if name in sys.modules:
        return sys.modules[name]
    m = types.ModuleType(name)
    if attrs:
        for k, v in attrs.items():
            setattr(m, k, v)
    sys.modules[name] = m
    return m


class _Sched:
    def __init__(self, interval=None):
        self.interval = interval
        # emulate schedule.every(...).seconds returning an object with .do()
        self.seconds = self

    def do(self, func):
        # no-op scheduler in tests
        return None


_stub_module("schedule", {"every": lambda interval=None: _Sched(interval), "run_pending": lambda: None})


# boto3, rq, redis are common optional dependencies in repo; provide minimal stubs
_stub_module("boto3")


def _get_current_job_stub():
    job = types.SimpleNamespace()
    job.meta = {}
    job.save_meta = lambda: None
    job.id = "test-job"
    job.is_finished = False
    job.result = None
    job.get_status = lambda: "queued"
    return job


_stub_module("rq", {"get_current_job": lambda: _get_current_job_stub()})
_stub_module("redis")
