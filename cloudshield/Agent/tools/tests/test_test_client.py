import importlib
import sys
from types import ModuleType, SimpleNamespace

import pytest


def _fake_grpc_module():
    fake = ModuleType("grpc")

    class _FakeChannel:
        def __init__(self, target):
            self.target = target

    class _FakeFuture:
        def __init__(self, channel):
            self._channel = channel

        def result(self, timeout=None):
            return True

    def insecure_channel(target):
        return _FakeChannel(target)

    def channel_ready_future(channel):
        return _FakeFuture(channel)

    fake.insecure_channel = insecure_channel
    fake.channel_ready_future = channel_ready_future
    return fake


def _fake_proto_package(response):
    proto_pkg = ModuleType("proto")
    proto_pkg.__path__ = []

    agent_pb2 = ModuleType("proto.agent_pb2")

    class WorkstationInit:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    agent_pb2.WorkstationInit = WorkstationInit

    agent_pb2_grpc = ModuleType("proto.agent_pb2_grpc")

    class AgentServiceStub:
        def __init__(self, channel):
            self.channel = channel
            self.calls = []

        def SendWorkstationInit(self, request):
            self.calls.append(("SendWorkstationInit", request))
            return response

    agent_pb2_grpc.AgentServiceStub = AgentServiceStub

    return proto_pkg, agent_pb2, agent_pb2_grpc


@pytest.fixture
def test_client_module(monkeypatch):
    fake_grpc = _fake_grpc_module()
    monkeypatch.setitem(sys.modules, "grpc", fake_grpc)

    response = SimpleNamespace(message="ok")
    proto_pkg, agent_pb2, agent_pb2_grpc = _fake_proto_package(response)
    monkeypatch.setitem(sys.modules, "proto", proto_pkg)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2", agent_pb2)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2_grpc", agent_pb2_grpc)

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.tools.test_client", raising=False)
    module = importlib.import_module("cloudshield.Agent.tools.test_client")
    return module, response


def test_main_logs_response(monkeypatch, capsys, test_client_module):
    module, response = test_client_module

    printed = {}

    def fake_print(*args, **kwargs):
        printed["line"] = " ".join(map(str, args))

    monkeypatch.setitem(module.__dict__, "print", fake_print)

    module.main()

    assert printed["line"] == f"Response: {response}"


def test_main_connection_error(monkeypatch):
    fake_grpc = ModuleType("grpc")
    error = RuntimeError("boom")

    class _BadFuture:
        def result(self, timeout=None):
            raise error

    fake_grpc.insecure_channel = lambda target: SimpleNamespace(target=target)
    fake_grpc.channel_ready_future = lambda channel: _BadFuture()

    monkeypatch.setitem(sys.modules, "grpc", fake_grpc)

    proto_pkg, agent_pb2, agent_pb2_grpc = _fake_proto_package(SimpleNamespace(message="ignored"))
    monkeypatch.setitem(sys.modules, "proto", proto_pkg)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2", agent_pb2)
    monkeypatch.setitem(sys.modules, "proto.agent_pb2_grpc", agent_pb2_grpc)

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.tools.test_client", raising=False)
    module = importlib.import_module("cloudshield.Agent.tools.test_client")

    future = _BadFuture()
    monkeypatch.setattr(module.grpc, "channel_ready_future", lambda _ch: future)

    with pytest.raises(RuntimeError):
        module.main()


def test_main_stub_called(monkeypatch, test_client_module):
    module, response = test_client_module
    calls = {}

    def fake_ready_future(channel):
        calls["channel"] = channel

        class _Future:
            def result(self_inner, timeout=None):
                return True

        return _Future()

    monkeypatch.setattr(module.grpc, "channel_ready_future", fake_ready_future)

    stub_instance = module.agent_pb2_grpc.AgentServiceStub(module.grpc.insecure_channel("127.0.0.1:50051"))
    monkeypatch.setattr(module.agent_pb2_grpc, "AgentServiceStub", lambda channel: stub_instance)

    module.main()

    assert stub_instance.calls
    assert calls["channel"].target == "127.0.0.1:50051"
