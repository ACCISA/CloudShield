import sys
import time
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

# Provide lightweight stubs for optional dependencies used by the codebase so
# tests run in CI/local envs that don't have every library installed.


class _FakeRpcError(Exception):
    """Minimal stand-in for grpc.RpcError"""


class _FakeFutureTimeoutError(TimeoutError):
    """Raised when our fake future times out waiting for connectivity."""


class _FakeChannel:
    def __init__(self, target):
        self.target = target


class _FakeFuture:
    def __init__(self, channel):
        self._channel = channel

    def result(self, timeout=None):
        deadline = None if timeout is None else time.time() + timeout
        while True:
            if _SERVERS.get(self._channel.target):
                return True
            if deadline is not None and time.time() >= deadline:
                raise _FakeFutureTimeoutError()
            time.sleep(0.01)


class _FakeServer:
    def __init__(self):
        self._targets = []
        self._servicers = []

    def add_insecure_port(self, target):
        self._targets.append(target)
        return target

    def register_servicer(self, servicer):
        self._servicers.append(servicer)

    def start(self):
        for target in self._targets:
            _SERVERS[target] = self

    def stop(self, _grace):
        for target in list(self._targets):
            _SERVERS.pop(target, None)

    # Helpers used by our fake stubs
    def invoke(self, rpc_name, request):
        for servicer in self._servicers:
            handler = getattr(servicer, rpc_name, None)
            if handler:
                return handler(request, context=None)
        raise _FakeRpcError(f"RPC '{rpc_name}' not implemented")


_SERVERS = {}


def _fake_insecure_channel(target):
    return _FakeChannel(target)


def _fake_channel_ready_future(channel):
    return _FakeFuture(channel)


def _fake_server(*_args, **_kwargs):
    return _FakeServer()


grpc_attrs = {
    "insecure_channel": _fake_insecure_channel,
    "channel_ready_future": _fake_channel_ready_future,
    "server": _fake_server,
    "RpcError": _FakeRpcError,
    "FutureTimeoutError": _FakeFutureTimeoutError,
}


_grpc_module = _stub_module("grpc", grpc_attrs)
_grpc_module._FAKE_SERVER_REGISTRY = _SERVERS


class _Sched:
    def __init__(self, interval=None):
        self.interval = interval
        # emulate schedule.every(...).seconds returning an object with .do()
        self.seconds = self

    def do(self, func):
        # no-op scheduler in tests
        return None


_stub_module(
    "schedule",
    {
        "every": lambda interval=None: _Sched(interval),
        "run_pending": lambda: None,
        "cancel_job": lambda _job: None,
    },
)


# boto3, rq, redis are common optional dependencies in repo; provide minimal stubs
try:  # use real boto3 if available
    import boto3  # noqa: F401
except Exception:
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


try:  # prefer real rq for tests (provides Job, Queue, etc.)
    import rq  # noqa: F401
except Exception:
    _stub_module("rq", {"get_current_job": lambda: _get_current_job_stub()})

try:  # prefer real redis (for Redis class). If missing, provide minimal stub.
    import redis  # noqa: F401
except Exception:
    class _Redis:  # minimal placeholder
        def __init__(self, *a, **k):
            pass

        def ping(self):
            return True

    _stub_module("redis", {"Redis": _Redis})
