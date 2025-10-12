import importlib
import json
import sys
from types import ModuleType, SimpleNamespace

import pytest


def _create_fake_grpc():
    fake_grpc = ModuleType("grpc")
    fake_grpc.__version__ = "1.74.0"
    fake_grpc.insecure_channel = lambda *_args, **_kwargs: None
    fake_grpc.channel_ready_future = lambda channel: SimpleNamespace(result=lambda timeout=None: True)
    fake_grpc.server = lambda *_args, **_kwargs: SimpleNamespace()
    return fake_grpc


def _create_fake_proto_modules():
    proto_pkg = ModuleType("proto")
    proto_pkg.__path__ = []  # Mark as package.

    agent_pb2 = ModuleType("proto.agent_pb2")

    class _WorkstationInit:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    agent_pb2.WorkstationInit = _WorkstationInit

    agent_pb2_grpc = ModuleType("proto.agent_pb2_grpc")

    class _AgentServiceStub:
        def __init__(self, *_args, **_kwargs):
            pass

    class _AgentServiceServicer:
        pass

    def _add_servicer_to_server(servicer, server):
        if hasattr(server, "register_servicer"):
            server.register_servicer(servicer)
        else:
            setattr(server, "attached_servicer", servicer)

    agent_pb2_grpc.AgentServiceStub = _AgentServiceStub
    agent_pb2_grpc.AgentServiceServicer = _AgentServiceServicer
    agent_pb2_grpc.add_AgentServiceServicer_to_server = _add_servicer_to_server

    return proto_pkg, agent_pb2, agent_pb2_grpc


class DummyChannelFuture:
    def __init__(self, *, exc=None):
        self._exc = exc

    def result(self, timeout=None):
        if self._exc:
            raise self._exc
        return True


class DummyChannel:
    def __init__(self, future):
        self.future = future


class DummyStub:
    def __init__(self, response):
        self._response = response
        self.requests = []

    def SendWorkstationInit(self, request):
        self.requests.append(request)
        return self._response


@pytest.fixture
def run_self_test_module(monkeypatch, tmp_path):
    fake_grpc = _create_fake_grpc()
    monkeypatch.setitem(sys.modules, "grpc", fake_grpc)

    proto_pkg, agent_pb2, agent_pb2_grpc = _create_fake_proto_modules()
    monkeypatch.setitem(sys.modules, "proto", proto_pkg)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2", agent_pb2)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2_grpc", agent_pb2_grpc)

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.tools.run_self_test", raising=False)
    module = importlib.import_module("cloudshield.Agent.tools.run_self_test")

    monkeypatch.setattr(module, "SCRIPT_DIR", str(tmp_path))
    monkeypatch.setattr(module, "AGENT_ROOT", str(tmp_path))
    monkeypatch.setattr(module, "__file__", str(tmp_path / "run_self_test.py"))
    return module


@pytest.fixture
def stubbed_grpc(monkeypatch, run_self_test_module):
    future = DummyChannelFuture()
    channel = DummyChannel(future)

    monkeypatch.setattr(run_self_test_module.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test_module.grpc, "channel_ready_future", lambda ch: ch.future)
    return channel


def test_main_success(monkeypatch, tmp_path, capsys, run_self_test_module, stubbed_grpc):
    served = {}
    out_file = tmp_path / "received_requests_selftest.jsonl"

    def fake_serve(**kwargs):
        served.update(kwargs)
        payload = {"grpc": "SendWorkstationInit", "data": {"agent_id": "selftest-agent"}}
        out_file.write_text(json.dumps(payload) + "\n", encoding="utf-8")

    monkeypatch.setattr(run_self_test_module, "serve", fake_serve)

    response = SimpleNamespace(message="ok")
    stub = DummyStub(response)
    monkeypatch.setattr(run_self_test_module.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)
    monkeypatch.setattr(run_self_test_module.agent_pb2, "WorkstationInit", lambda **_: SimpleNamespace())

    def thread_factory(target, kwargs=None, **_thread_kwargs):
        kwargs = kwargs or {}

        class _Thread:
            def start(self_inner):
                target(**kwargs)

            def join(self_inner, timeout=None):
                return None

        return _Thread()

    monkeypatch.setattr(run_self_test_module.threading, "Thread", thread_factory)

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "RPC response:" in captured.out
    assert "Recorded entries:" in captured.out
    assert served["host"] == "127.0.0.1"

    payload = [json.loads(line) for line in out_file.read_text(encoding="utf-8").splitlines()]
    assert payload[0]["grpc"] == "SendWorkstationInit"


def test_main_connection_failure(monkeypatch, capsys, run_self_test_module):
    future = DummyChannelFuture(exc=RuntimeError("boom"))
    channel = DummyChannel(future)
    monkeypatch.setattr(run_self_test_module.grpc, "insecure_channel", lambda addr: channel)
    monkeypatch.setattr(run_self_test_module.grpc, "channel_ready_future", lambda ch: ch.future)

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "Failed to connect" in captured.out


def test_main_no_recorded_file(monkeypatch, capsys, run_self_test_module, stubbed_grpc):
    stub = DummyStub(SimpleNamespace(message="ok"))
    monkeypatch.setattr(run_self_test_module.agent_pb2_grpc, "AgentServiceStub", lambda ch: stub)
    monkeypatch.setattr(run_self_test_module.agent_pb2, "WorkstationInit", lambda **_: SimpleNamespace())

    monkeypatch.setattr(run_self_test_module, "serve", lambda **kwargs: None)

    class _Thread:
        def start(self):
            return None

        def join(self, timeout=None):
            return None

    monkeypatch.setattr(run_self_test_module.threading, "Thread", lambda *a, **kw: _Thread())

    run_self_test_module.main()

    captured = capsys.readouterr()
    assert "No recorded file found" in captured.out
