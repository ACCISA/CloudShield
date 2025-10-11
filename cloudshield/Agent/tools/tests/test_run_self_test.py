import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace, ModuleType

import pytest

class _FakeServer:
    def __init__(self):
        self.attached_servicer = None

    def add_insecure_port(self, *_args):
        return 1

    def register_servicer(self, servicer):
        self.attached_servicer = servicer

    def start(self):
        return None

    def stop(self, *_args):
        return None


grpc_module = SimpleNamespace(
    insecure_channel=lambda *_args, **_kwargs: None,
    channel_ready_future=lambda *_args, **_kwargs: SimpleNamespace(result=lambda timeout=None: True),
    server=lambda *_args, **_kwargs: _FakeServer(),
    __version__="1.74.0",
)
sys.modules["grpc"] = grpc_module

if "proto" not in sys.modules:
    proto_pkg = ModuleType("proto")
    proto_pkg.__path__ = []
    sys.modules["proto"] = proto_pkg

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
sys.modules["proto.agent_pb2"] = agent_pb2

agent_pb2_grpc = ModuleType("proto.agent_pb2_grpc")


class _AgentServiceStub:
    def __init__(self, *_args, **_kwargs):
        pass


class _AgentServiceServicer:
    pass


def _add_servicer_to_server(servicer, server):
    if hasattr(server, "register_servicer"):
        server.register_servicer(servicer)


agent_pb2_grpc.AgentServiceStub = _AgentServiceStub
agent_pb2_grpc.AgentServiceServicer = _AgentServiceServicer
agent_pb2_grpc.add_AgentServiceServicer_to_server = _add_servicer_to_server
sys.modules["proto.agent_pb2_grpc"] = agent_pb2_grpc

import cloudshield.Agent.tools.run_self_test as run_self_test

sys.modules.setdefault("grpc", SimpleNamespace(insecure_channel=None, channel_ready_future=None))


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
def ensure_tmp_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(run_self_test, "AGENT_ROOT", str(tmp_path))
    return tmp_path


@pytest.fixture
def log_file(tmp_path):
    return tmp_path / "received_requests_selftest.jsonl"


def test_main_success(monkeypatch, tmp_path, log_file, capsys):
    monkeypatch.setattr(run_self_test, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(run_self_test, "__file__", str(tmp_path / "run_self_test.py"))

    served = []

    out_file = log_file

    def fake_serve(**kwargs):
        served.append(kwargs)
        payload = {"grpc": "SendWorkstationInit", "data": {"agent_id": "selftest-agent"}}
        out_file.write_text(json.dumps(payload) + "\n", encoding="utf-8")

    monkeypatch.setattr(run_self_test, "serve", fake_serve)

    future = DummyChannelFuture()
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test.grpc, "channel_ready_future", lambda ch: ch.future)

    response = SimpleNamespace(message="ok")
    stub = DummyStub(response)
    monkeypatch.setattr(run_self_test.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)

    request = SimpleNamespace(agent_id="selftest-agent", domain="example.local")
    monkeypatch.setattr(run_self_test.agent_pb2, "WorkstationInit", lambda **_: request)

    def thread_factory(target, kwargs=None, **_thread_kwargs):
        kwargs = kwargs or {}

        def start():
            target(**kwargs)

        return SimpleNamespace(start=start, join=lambda timeout=None: None)

    monkeypatch.setattr(run_self_test.threading, "Thread", thread_factory)

    run_self_test.main()

    captured = capsys.readouterr()
    assert "RPC response:" in captured.out
    assert "Recorded entries:" in captured.out
    assert served[0]["host"] == "127.0.0.1"

    payload_lines = [json.loads(line) for line in out_file.read_text(encoding="utf-8").splitlines()]
    assert payload_lines[0]["grpc"] == "SendWorkstationInit"


def test_main_connection_failure(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(run_self_test, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(run_self_test, "__file__", str(tmp_path / "run_self_test.py"))

    future = DummyChannelFuture(exc=RuntimeError("boom"))
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test.grpc, "channel_ready_future", lambda ch: ch.future)

    run_self_test.main()

    captured = capsys.readouterr()
    assert "Failed to connect" in captured.out


def test_main_no_recorded_file(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(run_self_test, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(run_self_test, "__file__", str(tmp_path / "run_self_test.py"))

    future = DummyChannelFuture()
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test.grpc, "channel_ready_future", lambda ch: ch.future)

    stub = DummyStub(SimpleNamespace(message="ok"))
    monkeypatch.setattr(run_self_test.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)
    monkeypatch.setattr(run_self_test.agent_pb2, "WorkstationInit", lambda **_: SimpleNamespace())

    monkeypatch.setattr(run_self_test, "serve", lambda **_: None)

    class DummyThread:
        def __init__(self, *args, **kwargs):
            pass

        def start(self):
            pass

        def join(self, timeout=None):
            pass

    monkeypatch.setattr(run_self_test.threading, "Thread", lambda *args, **kwargs: DummyThread())

    out_file = tmp_path / "missing.jsonl"

    run_self_test.main()

    captured = capsys.readouterr()
    assert "No recorded file found" in captured.out
