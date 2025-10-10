import json
import os
import sys
import types
from types import SimpleNamespace

import pytest

if "proto" not in sys.modules:
    proto_pkg = types.ModuleType("proto")
    proto_pkg.__path__ = []
    sys.modules["proto"] = proto_pkg

if "proto.agent_pb2" not in sys.modules:
    agent_pb2_module = types.ModuleType("proto.agent_pb2")

    class ProcessList:
        def __init__(self, *args, **kwargs):
            pass

    class ProcessListAckRes:
        def __init__(self, *args, **kwargs):
            pass

    agent_pb2_module.ProcessList = ProcessList
    agent_pb2_module.ProcessListAckRes = ProcessListAckRes
    sys.modules["proto.agent_pb2"] = agent_pb2_module
else:
    agent_pb2_module = sys.modules["proto.agent_pb2"]

if "proto.agent_pb2_grpc" not in sys.modules:
    agent_pb2_grpc_module = types.ModuleType("proto.agent_pb2_grpc")

    class AgentServiceStub:
        def __init__(self, *_args, **_kwargs):
            pass

    agent_pb2_grpc_module.AgentServiceStub = AgentServiceStub
    sys.modules["proto.agent_pb2_grpc"] = agent_pb2_grpc_module
else:
    agent_pb2_grpc_module = sys.modules["proto.agent_pb2_grpc"]

setattr(sys.modules["proto"], "agent_pb2", agent_pb2_module)
setattr(sys.modules["proto"], "agent_pb2_grpc", agent_pb2_grpc_module)

if "logger" not in sys.modules:
    def _noop(*_args, **_kwargs):
        pass

    logger_module = types.ModuleType("logger")
    logger_module.core_logger = SimpleNamespace(
        info=_noop,
        error=_noop,
        warning=_noop,
        critical=_noop,
    )
    sys.modules["logger"] = logger_module
else:
    logger_module = sys.modules["logger"]
    if not hasattr(logger_module, "core_logger"):
        logger_module.core_logger = SimpleNamespace(info=lambda *_a, **_k: None, error=lambda *_a, **_k: None, warning=lambda *_a, **_k: None, critical=lambda *_a, **_k: None)

from cloudshield.Agent.core import agent as agent_module  # noqa: E402


class FakeFutureTimeoutError(Exception):
    """Simulates grpc.FutureTimeoutError for tests."""


class FakeRpcError(Exception):
    """Simulates grpc.RpcError for tests."""


class FakeFuture:
    def __init__(self, should_timeout):
        self.should_timeout = should_timeout

    def result(self, timeout):
        if self.should_timeout:
            raise FakeFutureTimeoutError(f"timeout after {timeout}s")
        return True


class FakeGrpc:
    FutureTimeoutError = FakeFutureTimeoutError
    RpcError = FakeRpcError

    def __init__(self):
        self.should_timeout = False
        self.last_channel = None

    def insecure_channel(self, address):
        self.last_channel = address
        return f"channel:{address}"

    def channel_ready_future(self, _channel):
        return FakeFuture(self.should_timeout)


class FakeSchedule:
    def __init__(self):
        self.jobs = []
        self.canceled = []
        self.runs = 0

    class Every:
        def __init__(self, scheduler, interval):
            self.scheduler = scheduler
            self.interval = interval

        @property
        def seconds(self):
            return self

        def do(self, func):
            job = {"interval": self.interval, "func": func}
            self.scheduler.jobs.append(job)
            return job

    def every(self, interval):
        return FakeSchedule.Every(self, interval)

    def cancel_job(self, job):
        self.canceled.append(job)

    def run_pending(self):
        self.runs += 1


class FakeLogger:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(("info", message))

    def error(self, message):
        self.messages.append(("error", message))

    def warning(self, message):
        self.messages.append(("warning", message))

    def critical(self, message):
        self.messages.append(("critical", message))


@pytest.fixture
def agent_env(monkeypatch):
    schedule = FakeSchedule()
    logger = FakeLogger()
    grpc = FakeGrpc()

    monkeypatch.setattr(agent_module, "schedule", schedule)
    monkeypatch.setattr(agent_module, "core_logger", logger)
    monkeypatch.setattr(agent_module, "grpc", grpc)
    monkeypatch.setattr(
        agent_module.agent_pb2_grpc,
        "AgentServiceStub",
        lambda channel: SimpleNamespace(channel=channel),
    )
    monkeypatch.setattr(
        agent_module,
        "ParseDict",
        lambda data, _target: SimpleNamespace(**data),
    )

    class ProcessList:
        def __init__(self):
            self.created = True

    monkeypatch.setattr(agent_module.agent_pb2, "ProcessList", ProcessList)
    monkeypatch.setattr(agent_module.agent_pb2, "ProcessListAckRes", object())

    return SimpleNamespace(module=agent_module, schedule=schedule, logger=logger, grpc=grpc)


def make_agent(cache_path):
    agent = agent_module.Agent.__new__(agent_module.Agent)
    agent.agent_id = "agent"
    agent.server_addr = "localhost"
    agent.port = 50051
    agent.cache_path = cache_path
    agent.core_interval = 10
    agent.conn_attempt_interval = 10
    agent.state = {}
    agent.tasks = []
    agent.channel = object()
    agent.stub = None
    agent.conn_attempt_job = None
    return agent


def test_agent_init_success_sets_channel(agent_env, tmp_path):
    mod = agent_env.module
    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))

    assert agent.channel == "channel:localhost:50051"
    assert agent.stub.channel == "channel:localhost:50051"
    assert agent_env.schedule.canceled == [None]
    assert not any("Falling back to cache path" in message for _level, message in agent_env.logger.messages)


def test_agent_init_fallback_cache_path(agent_env, tmp_path, monkeypatch):
    mod = agent_env.module
    primary = tmp_path / "primary"
    fallback_root = tmp_path / "fallback"

    call_count = {"value": 0}

    def fake_makedirs(path, exist_ok=True):
        if call_count["value"] == 0:
            call_count["value"] += 1
            raise OSError("primary failure")
        call_count["value"] += 1

    monkeypatch.setattr(mod.os, "makedirs", fake_makedirs)
    monkeypatch.setitem(
        sys.modules,
        "tempfile",
        types.SimpleNamespace(gettempdir=lambda: str(fallback_root)),
    )

    agent = mod.Agent("agent-id", "localhost", 50051, str(primary))

    expected = os.path.join(str(fallback_root), "agent_cache")
    assert agent.cache_path == expected
    assert any(
        "Falling back to cache path" in message
        for level, message in agent_env.logger.messages
        if level == "info"
    )


def test_agent_init_fallback_failure_raises(agent_env, tmp_path, monkeypatch):
    mod = agent_env.module
    primary = tmp_path / "primary"

    def always_fail(*_args, **_kwargs):
        raise OSError("cannot create")

    monkeypatch.setattr(mod.os, "makedirs", always_fail)
    monkeypatch.setitem(
        sys.modules,
        "tempfile",
        types.SimpleNamespace(gettempdir=lambda: str(tmp_path / "fallback")),
    )

    with pytest.raises(OSError):
        mod.Agent("agent-id", "localhost", 50051, str(primary))

    assert any(level == "critical" for level, _ in agent_env.logger.messages)


def test_agent_init_schedules_retry_when_server_down(agent_env, tmp_path):
    mod = agent_env.module
    agent_env.grpc.should_timeout = True

    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))

    assert agent.channel is None
    assert agent.stub is None
    assert len(agent_env.schedule.jobs) == 1
    assert agent.conn_attempt_job == agent_env.schedule.jobs[0]
    assert any(
        "Unable to connect" in message
        for level, message in agent_env.logger.messages
        if level == "error"
    )


def test_set_task_channels_updates_registered_tasks(agent_env, tmp_path):
    mod = agent_env.module
    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))

    class DummyTask:
        def __init__(self):
            self.calls = []

        def set_channel(self, channel, stub):
            self.calls.append((channel, stub))

    dummy = DummyTask()
    agent.tasks.append({"function": dummy})

    new_channel = object()
    new_stub = object()
    agent.set_task_channels(new_channel, new_stub)

    assert dummy.calls == [(new_channel, new_stub)]
    assert any(
        "Channel has been set" in message
        for level, message in agent_env.logger.messages
        if level == "info"
    )


def test_create_grpc_channel_callback_reschedules(agent_env, tmp_path, monkeypatch):
    mod = agent_env.module
    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))

    call_counter = {"value": 0}

    def fake_create():
        call_counter["value"] += 1

    monkeypatch.setattr(agent, "create_grpc_channel", fake_create)
    agent_env.schedule.jobs.clear()
    agent.channel = object()

    agent.create_grpc_channel_cb()

    assert agent.channel is None
    assert call_counter["value"] == 1
    assert len(agent_env.schedule.jobs) == 1
    assert agent_env.schedule.jobs[0]["func"] == fake_create


def test_create_grpc_channel_failure_logs_and_returns_none(agent_env, tmp_path):
    mod = agent_env.module
    agent = make_agent(str(tmp_path))
    agent.conn_attempt_job = object()
    agent_env.schedule.canceled.clear()
    agent_env.grpc.should_timeout = True
    original_channel = agent.channel

    result = mod.Agent.create_grpc_channel(agent)

    assert result is None
    assert agent.channel is original_channel
    assert agent.stub is None
    assert any(
        "Unable to connect" in message
        for level, message in agent_env.logger.messages
        if level == "error"
    )


def test_create_grpc_channel_success_sets_stub(agent_env, tmp_path):
    mod = agent_env.module
    agent = make_agent(str(tmp_path))
    agent.conn_attempt_job = "job"
    agent_env.schedule.canceled.clear()

    mod.Agent.create_grpc_channel(agent)

    assert agent.channel == "channel:localhost:50051"
    assert agent.stub.channel == "channel:localhost:50051"
    assert agent_env.schedule.canceled == ["job"]


def test_register_task_appends_and_schedules(agent_env, tmp_path):
    mod = agent_env.module
    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))

    class DummyTask:
        def __init__(self):
            self.channels = []
            self.run = lambda: None

        def set_channel(self, channel, stub):
            self.channels.append((channel, stub))

    task = DummyTask()
    agent_env.schedule.jobs.clear()

    agent.register_task("dummy", task, 5)

    assert agent.tasks[0]["task_name"] == "dummy"
    assert task.channels[0][0] == agent.channel
    assert agent_env.schedule.jobs[0]["func"] == task.run


def test_check_workstation_is_noop(agent_env, tmp_path):
    mod = agent_env.module
    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))
    assert agent.check_workstation() is None


def test_is_grpc_server_up_success(agent_env):
    mod = agent_env.module
    agent = make_agent("/tmp/cache")
    agent_env.grpc.should_timeout = False

    assert mod.Agent.is_grpc_server_up(agent, object()) is True


def test_is_grpc_server_up_timeout(agent_env):
    mod = agent_env.module
    agent = make_agent("/tmp/cache")
    agent_env.grpc.should_timeout = True

    assert mod.Agent.is_grpc_server_up(agent, object()) is False


def test_send_pending_messages_returns_when_channel_missing(agent_env, tmp_path):
    agent = make_agent(str(tmp_path))
    agent.channel = None

    agent.send_pending_messages()

    assert agent_env.logger.messages == []


def test_send_pending_messages_skips_corrupted_json(agent_env, tmp_path):
    agent = make_agent(str(tmp_path))
    bad_file = os.path.join(agent.cache_path, "bad.json")
    with open(bad_file, "w", encoding="utf-8") as fh:
        fh.write("{ not-json")

    agent.send_pending_messages()

    assert any(
        "Skipping corrupted file" in message
        for level, message in agent_env.logger.messages
        if level == "warning"
    )


def test_send_pending_messages_missing_stub_raises(agent_env, tmp_path):
    agent = make_agent(str(tmp_path))
    payload = {"grpc": "SendProcessList", "data": {"foo": "bar"}}
    file_path = os.path.join(agent.cache_path, "pending.json")
    with open(file_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)

    agent.stub = SimpleNamespace()

    with pytest.raises(AttributeError):
        agent.send_pending_messages()


def test_send_pending_messages_missing_protobuf(agent_env, tmp_path, monkeypatch):
    mod = agent_env.module
    agent = make_agent(str(tmp_path))
    payload = {"grpc": "SendProcessList", "data": {"foo": "bar"}}
    file_path = os.path.join(agent.cache_path, "pending.json")
    with open(file_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)

    agent.stub = SimpleNamespace(SendProcessList=lambda _req: None)
    monkeypatch.delattr(mod.agent_pb2, "ProcessList")

    with pytest.raises(AttributeError):
        agent.send_pending_messages()


def test_send_pending_messages_success_removes_file(agent_env, tmp_path, monkeypatch):
    mod = agent_env.module
    agent = make_agent(str(tmp_path))
    payload = {"grpc": "SendProcessList", "data": {"foo": "bar"}}
    file_path = os.path.join(agent.cache_path, "pending.json")
    with open(file_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)

    removed = []

    def fake_remove(path):
        removed.append(path)

    monkeypatch.setattr(mod.os, "remove", fake_remove)

    calls = []

    class Stub:
        def SendProcessList(self, request):
            calls.append(request)

    agent.stub = Stub()

    mod.Agent.send_pending_messages(agent)

    assert removed == [file_path]
    assert calls and getattr(calls[0], "is_pending", False) is True
    assert any(
        "1 cached message" in message
        for level, message in agent_env.logger.messages
        if level == "info"
    )


def test_send_pending_messages_logs_rpc_error(agent_env, tmp_path):
    mod = agent_env.module
    agent = make_agent(str(tmp_path))
    payload = {"grpc": "SendProcessList", "data": {"foo": "bar"}}
    file_path = os.path.join(agent.cache_path, "pending.json")
    with open(file_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)

    class Stub:
        def SendProcessList(self, _request):
            raise FakeRpcError("boom")

    agent.stub = Stub()

    mod.Agent.send_pending_messages(agent)

    assert any(
        "Unable to send pending messages" in str(message)
        for level, message in agent_env.logger.messages
        if level == "error"
    )


def test_start_core_runs_and_handles_keyboard_interrupt(agent_env, tmp_path, monkeypatch):
    mod = agent_env.module
    agent = mod.Agent("agent-id", "localhost", 50051, str(tmp_path))

    run_calls = {"count": 0}

    def fake_run_pending():
        run_calls["count"] += 1

    def fake_sleep(_seconds):
        raise KeyboardInterrupt

    monkeypatch.setattr(agent_env.module.schedule, "run_pending", fake_run_pending)
    monkeypatch.setattr(agent_env.module.time, "sleep", fake_sleep)

    with pytest.raises(KeyboardInterrupt):
        agent.start_core()

    assert agent_env.schedule.jobs[0]["func"] == agent.send_pending_messages
    assert run_calls["count"] == 1
    assert any(
        "Main agent loop has started" in message
        for level, message in agent_env.logger.messages
        if level == "info"
    )
