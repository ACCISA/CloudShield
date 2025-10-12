import importlib
import sys
import types
from types import SimpleNamespace

import pytest

# Stub proto package and modules
proto_pkg = types.ModuleType("proto")
proto_pkg.__path__ = []

agent_pb2_module = types.ModuleType("proto.agent_pb2")
sys.modules["proto.agent_pb2"] = agent_pb2_module
setattr(proto_pkg, "agent_pb2", agent_pb2_module)

agent_pb2_grpc_module = types.ModuleType("proto.agent_pb2_grpc")
agent_pb2_grpc_module.AgentServiceServicer = type("BaseServicer", (), {})


def _default_add_servicer(servicer, server):
    server._attached_servicer = servicer


def _default_stub(channel, *args, **kwargs):
    return SimpleNamespace(channel=channel)


agent_pb2_grpc_module.add_AgentServiceServicer_to_server = _default_add_servicer
agent_pb2_grpc_module.AgentServiceStub = _default_stub
sys.modules["proto.agent_pb2_grpc"] = agent_pb2_grpc_module
setattr(proto_pkg, "agent_pb2_grpc", agent_pb2_grpc_module)

sys.modules["proto"] = proto_pkg

# Stub grpc module with minimal functionality

grpc_module = types.ModuleType("grpc")


class _StatusCode:
    PERMISSION_DENIED = "PERMISSION_DENIED"


def _rpc_method_handler(func, request_deserializer=None, response_serializer=None):
    return SimpleNamespace(
        unary_unary=func,
        request_deserializer=request_deserializer,
        response_serializer=response_serializer,
    )


def _noop_server(*args, **kwargs):
    return SimpleNamespace(
        interceptors=kwargs.get("interceptors", []),
        add_insecure_port=lambda *_a: None,
        start=lambda: None,
        wait_for_termination=lambda: None,
    )


grpc_module.StatusCode = _StatusCode
class _ServerInterceptor:  # noqa: D401 - minimal stub
    """Lightweight base class to satisfy inheritance."""


grpc_module.ServerInterceptor = _ServerInterceptor

grpc_module.unary_unary_rpc_method_handler = _rpc_method_handler
grpc_module.server = _noop_server
sys.modules["grpc"] = grpc_module

# Stub utils module
utils_module = types.ModuleType("utils")
utils_module.get_agents = lambda: [
    {"ip": "1.1.1.1", "agent_id": "agent-1"},
]
utils_module.get_ip = lambda peer: peer
utils_module.is_valid_agent = lambda agents, ip, agent_id: ip == "1.1.1.1" and agent_id == "agent-1"
sys.modules["utils"] = utils_module

# Stub servicer module
servicer_module = types.ModuleType("servicer")


class _Servicer:
    def __init__(self, channel):
        self.channel = channel


servicer_module.AgentServiceServicer = _Servicer
sys.modules["servicer"] = servicer_module

# Stub state module
state_module = types.ModuleType("state")
state_module.state_manager = SimpleNamespace(alert_missing_responses=lambda: None)
sys.modules["state"] = state_module


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(("info", message))

    def warning(self, message):
        self.messages.append(("warning", message))


logger_module = types.ModuleType("logger")
logger_module.state_logger = DummyLogger()
logger_module.server_logger = DummyLogger()
logger_module.interceptor_logger = DummyLogger()
sys.modules["logger"] = logger_module

# Import the module under test after stubbing dependencies
server = importlib.import_module("cloudshield.ThreatDetection.server")


class FakeContext:
    def __init__(self, peer_value):
        self._peer = peer_value
        self.aborted = []

    def peer(self):
        return self._peer

    def abort(self, status, message):
        self.aborted.append((status, message))
        raise RuntimeError(message)


@pytest.fixture(autouse=True)
def reset_env(monkeypatch):
    # Reset mutable module-level state before each test
    server.heartbeats = {}
    server.interceptor_logger.messages.clear()
    server.server_logger.messages.clear()
    server.state_logger.messages.clear()
    monkeypatch.setattr(server, "is_valid_agent", utils_module.is_valid_agent)
    yield


def test_log_heartbeat_tracks_methods():
    server.log_heartbeat("agent-1", "method-one")
    assert server.heartbeats["agent-1"] == ["method-one"]

    server.log_heartbeat("agent-1", "method-two")
    assert server.heartbeats["agent-1"] == ["method-one", "method-two"]


def test_interceptor_returns_none_when_handler_missing():
    interceptor = server.ClientIPInterceptor()

    def continuation(_):
        return None

    result = interceptor.intercept_service(continuation, SimpleNamespace(method="/no/handler"))
    assert result is None


def test_interceptor_allows_valid_ipv4_agent():
    interceptor = server.ClientIPInterceptor()

    handler = SimpleNamespace(
        unary_unary=lambda request, context: ("ok", context.peer()),
        request_deserializer="req",
        response_serializer="resp",
    )

    wrapped = interceptor.intercept_service(
        lambda details: handler,
        SimpleNamespace(method="/AgentService/ProcessList"),
    )

    request = SimpleNamespace(agent_id="agent-1")
    context = FakeContext("ipv4:1.1.1.1:5000")
    assert wrapped.unary_unary(request, context) == ("ok", "ipv4:1.1.1.1:5000")
    assert server.heartbeats["agent-1"] == ["/AgentService/ProcessList"]


def test_interceptor_blocks_invalid_agent(monkeypatch):
    monkeypatch.setattr(server, "is_valid_agent", lambda *_: False)

    interceptor = server.ClientIPInterceptor()
    handler = SimpleNamespace(
        unary_unary=lambda request, context: None,
        request_deserializer=None,
        response_serializer=None,
    )
    wrapped = interceptor.intercept_service(
        lambda details: handler,
        SimpleNamespace(method="/AgentService/ProcessList"),
    )

    with pytest.raises(RuntimeError, match="Invalid Agent"):
        wrapped.unary_unary(SimpleNamespace(agent_id="agent-1"), FakeContext("ipv6:%5B::1%5D:65000"))

    assert any("invalid agent" in message.lower() for level, message in server.interceptor_logger.messages)


def test_interceptor_blocks_missing_agent_id(monkeypatch):
    monkeypatch.setattr(server, "is_valid_agent", lambda *_: True)

    interceptor = server.ClientIPInterceptor()
    handler = SimpleNamespace(
        unary_unary=lambda request, context: None,
        request_deserializer=None,
        response_serializer=None,
    )
    wrapped = interceptor.intercept_service(
        lambda details: handler,
        SimpleNamespace(method="/AgentService/ProcessList"),
    )

    with pytest.raises(RuntimeError, match="Invalid RPC call"):
        wrapped.unary_unary(SimpleNamespace(), FakeContext("unix:/tmp/socket"))

    assert any("no agent_id" in message for level, message in server.interceptor_logger.messages)


def test_interceptor_returns_original_handler_for_non_unary():
    interceptor = server.ClientIPInterceptor()
    handler = SimpleNamespace(unary_unary=None)

    result = interceptor.intercept_service(lambda _: handler, SimpleNamespace(method="/noop"))
    assert result is handler


def test_serve_starts_grpc_server(monkeypatch):
    recorded = {}

    class FakeServer:
        def __init__(self):
            self.calls = []

        def add_insecure_port(self, address):
            self.calls.append(("bind", address))

        def start(self):
            self.calls.append(("start",))

        def wait_for_termination(self):
            self.calls.append(("wait",))

    fake_server = FakeServer()

    def fake_grpc_server(executor, interceptors):
        recorded["executor"] = executor
        recorded["interceptors"] = interceptors
        return fake_server

    monkeypatch.setattr(server.grpc, "server", fake_grpc_server)
    monkeypatch.setattr(server.futures, "ThreadPoolExecutor", lambda max_workers: ("executor", max_workers))

    def fake_add(servicer, server_obj):
        recorded["servicer"] = servicer
        recorded["server"] = server_obj

    monkeypatch.setattr(server.agent_pb2_grpc, "add_AgentServiceServicer_to_server", fake_add)

    server.server_logger.messages.clear()
    server.serve("127.0.0.1:7000")

    assert fake_server.calls == [("bind", "127.0.0.1:7000"), ("start",), ("wait",)]
    assert isinstance(recorded["servicer"], server.AgentServiceServicer)
    assert recorded["server"] is fake_server
    assert any("127.0.0.1:7000" in message for level, message in server.server_logger.messages)


def test_print_heartbeats_handles_interrupt(monkeypatch):
    def fake_sleep(seconds):
        raise KeyboardInterrupt("stop")

    monkeypatch.setattr(server.time, "sleep", fake_sleep)

    with pytest.raises(KeyboardInterrupt):
        server.print_heartbeats()


def test_monitor_state_invokes_alert(monkeypatch):
    calls = []

    def fake_alert():
        calls.append("alert")

    def fake_sleep(_seconds):
        raise KeyboardInterrupt("stop")

    monkeypatch.setattr(server.state_manager, "alert_missing_responses", fake_alert)
    monkeypatch.setattr(server.time, "sleep", fake_sleep)

    with pytest.raises(KeyboardInterrupt):
        server.monitor_state()

    assert calls == ["alert"]
    assert any("monitoring thread has started" in message for level, message in server.state_logger.messages)
