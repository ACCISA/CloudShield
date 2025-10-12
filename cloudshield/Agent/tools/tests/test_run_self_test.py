import importlib
import json
import sys
from types import ModuleType, SimpleNamespace

import pytest


def _create_fake_grpc():
    fake_grpc = ModuleType("grpc")
    fake_grpc.__version__ = "1.74.0"

    def _fake_channel(*_args, **_kwargs):
        return SimpleNamespace()

    def _fake_future(*_args, **_kwargs):
        return SimpleNamespace(result=lambda timeout=None: True)

    class _FakeServer:
        def __init__(self):
            self.bound = []

        def add_insecure_port(self, addr):
            self.bound.append(addr)

        def start(self):
            return None

        def stop(self, *_args):
            return None

    fake_grpc.insecure_channel = _fake_channel
    fake_grpc.channel_ready_future = _fake_future
    fake_grpc.server = lambda *_args, **_kwargs: _FakeServer()
    return fake_grpc


def _create_fake_proto_modules():
    proto_pkg = ModuleType("proto")
    proto_pkg.__path__ = []

    agent_pb2 = ModuleType("proto.agent_pb2")

    class _WorkstationInit:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _Ack:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _ProcessListAck:
        def __init__(self, action=False, **kwargs):
            self.action = action
            for key, value in kwargs.items():
                setattr(self, key, value)

    agent_pb2.WorkstationInit = _WorkstationInit
    agent_pb2.Ack = _Ack
    agent_pb2.ProcessListAck = _ProcessListAck

    agent_pb2_grpc = ModuleType("proto.agent_pb2_grpc")

    class _AgentServiceStub:
        def __init__(self, *_args, **_kwargs):
            self.calls = []

        def SendWorkstationInit(self, request):
            self.calls.append(request)
            return SimpleNamespace(message="ok")

    class _AgentServiceServicer:
        pass

    def _add_servicer_to_server(servicer, server):
        # Mock server stub used by tests expects this hook.
        if hasattr(server, "register_servicer"):
            server.register_servicer(servicer)
        if hasattr(server, "add_servicer"):
            server.add_servicer(servicer)

    agent_pb2_grpc.AgentServiceStub = _AgentServiceStub
    agent_pb2_grpc.AgentServiceServicer = _AgentServiceServicer
    agent_pb2_grpc.add_AgentServiceServicer_to_server = _add_servicer_to_server

    return proto_pkg, agent_pb2, agent_pb2_grpc


@pytest.fixture
def run_self_test_module(monkeypatch):
    fake_grpc = _create_fake_grpc()
    existing_grpc = sys.modules.get("grpc")
    if existing_grpc is None:
        sys.modules["grpc"] = fake_grpc
    else:
        monkeypatch.setitem(sys.modules, "grpc", fake_grpc)

    proto_pkg, agent_pb2, agent_pb2_grpc = _create_fake_proto_modules()
    monkeypatch.setitem(sys.modules, "proto", proto_pkg)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2", agent_pb2)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2_grpc", agent_pb2_grpc)

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.tools.run_self_test", raising=False)
    module = importlib.import_module("cloudshield.Agent.tools.run_self_test")
    return module


class DummyStub:
    def __init__(self, response):
        self.response = response
        self.requests = []

    def SendWorkstationInit(self, request):
        self.requests.append(request)
        return self.response


class DummyChannelFuture:
    def __init__(self, ready=True, exc=None):
        self._ready = ready
        self._exc = exc

    def result(self, timeout=None):
        if self._exc:
            raise self._exc
        return self._ready


class DummyChannel:
    def __init__(self, future):
        self.future = future


@pytest.fixture(autouse=True)
def ensure_tmp_dir(tmp_path, monkeypatch, run_self_test_module):
    monkeypatch.setattr(run_self_test_module, "AGENT_ROOT", str(tmp_path))
    return tmp_path


@pytest.fixture
def log_file(tmp_path):
    return tmp_path / "received_requests_selftest.jsonl"


def test_main_success(monkeypatch, tmp_path, log_file, capsys, run_self_test_module):
    monkeypatch.setattr(run_self_test_module, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(run_self_test_module, "__file__", str(tmp_path / "run_self_test.py"))

    served = []

    out_file = log_file

    def fake_serve(**kwargs):
        served.append(kwargs)
        payload = {"grpc": "SendWorkstationInit", "data": {"agent_id": "selftest-agent"}}
        out_file.write_text(json.dumps(payload) + "\n", encoding="utf-8")

    monkeypatch.setattr(run_self_test_module, "serve", fake_serve)

    future = DummyChannelFuture()
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test_module.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test_module.grpc, "channel_ready_future", lambda ch: ch.future)

    response = SimpleNamespace(message="ok")
    stub = DummyStub(response)
    monkeypatch.setattr(run_self_test_module.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)

    request = SimpleNamespace(agent_id="selftest-agent", domain="example.local")
    monkeypatch.setattr(run_self_test_module.agent_pb2, "WorkstationInit", lambda **_: request)

    def thread_factory(target, kwargs=None, **_thread_kwargs):
        kwargs = kwargs or {}

        def start():
            target(**kwargs)

        return SimpleNamespace(start=start, join=lambda timeout=None: None)

    monkeypatch.setattr(run_self_test_module.threading, "Thread", thread_factory)

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "RPC response:" in captured.out
    assert "Recorded entries:" in captured.out
    assert served[0]["host"] == "127.0.0.1"

    payload_lines = [json.loads(line) for line in out_file.read_text(encoding="utf-8").splitlines()]
    assert payload_lines[0]["grpc"] == "SendWorkstationInit"


def test_main_connection_failure(monkeypatch, tmp_path, capsys, run_self_test_module):
    monkeypatch.setattr(run_self_test_module, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(run_self_test_module, "__file__", str(tmp_path / "run_self_test.py"))

    future = DummyChannelFuture(exc=RuntimeError("boom"))
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test_module.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test_module.grpc, "channel_ready_future", lambda ch: ch.future)

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "Failed to connect" in captured.out


def test_main_no_recorded_file(monkeypatch, tmp_path, capsys, run_self_test_module):
    monkeypatch.setattr(run_self_test_module, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(run_self_test_module, "__file__", str(tmp_path / "run_self_test.py"))

    future = DummyChannelFuture()
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test_module.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test_module.grpc, "channel_ready_future", lambda ch: ch.future)

    stub = DummyStub(SimpleNamespace(message="ok"))
    monkeypatch.setattr(run_self_test_module.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)
    monkeypatch.setattr(run_self_test_module.agent_pb2, "WorkstationInit", lambda **_: SimpleNamespace())

    monkeypatch.setattr(run_self_test_module, "serve", lambda **_: None)

    class DummyThread:
        def __init__(self, *args, **kwargs):
            pass

        def start(self):
            pass

        def join(self, timeout=None):
            pass

    monkeypatch.setattr(run_self_test_module.threading, "Thread", lambda *args, **kwargs: DummyThread())

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "No recorded file found" in captured.out


def test_main_handles_remove_errors(monkeypatch, tmp_path, capsys, run_self_test_module):
    monkeypatch.setattr(run_self_test_module, "SCRIPT_DIR", str(tmp_path))
    module_path = tmp_path / "run_self_test.py"
    monkeypatch.setattr(run_self_test_module, "__file__", str(module_path))

    out_file = tmp_path / "received_requests_selftest.jsonl"
    out_file.write_text("stale", encoding="utf-8")
    out_file_str = str(out_file)

    exists_calls = {"count": 0}
    real_exists = run_self_test_module.os.path.exists

    def fake_exists(path):
        if path == out_file_str:
            exists_calls["count"] += 1
            # First call returns True to trigger os.remove; subsequent calls report False.
            return exists_calls["count"] == 1
        return real_exists(path)

    monkeypatch.setattr(run_self_test_module.os.path, "exists", fake_exists)
    monkeypatch.setattr(run_self_test_module.os, "remove", lambda _path: (_ for _ in ()).throw(PermissionError("denied")))

    future = DummyChannelFuture()
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test_module.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test_module.grpc, "channel_ready_future", lambda ch: ch.future)

    stub = DummyStub(SimpleNamespace(message="ok"))
    monkeypatch.setattr(run_self_test_module.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)
    monkeypatch.setattr(run_self_test_module.agent_pb2, "WorkstationInit", lambda **_: SimpleNamespace())

    monkeypatch.setattr(run_self_test_module, "serve", lambda **_: None)

    class DummyThread:
        def start(self):
            return None

        def join(self, timeout=None):
            return None

    monkeypatch.setattr(run_self_test_module.threading, "Thread", lambda *args, **kwargs: DummyThread())

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "No recorded file found" in captured.out
    assert exists_calls["count"] >= 2
