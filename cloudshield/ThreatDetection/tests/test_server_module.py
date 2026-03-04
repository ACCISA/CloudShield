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

    def info(self, message, *args):
        self.messages.append(("info", message % args if args else message))

    def warning(self, message, *args):
        self.messages.append(("warning", message % args if args else message))


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


# ═══════════════════════════════════════════════════════════════════════════
# _start_threat_subsystems tests
# ═══════════════════════════════════════════════════════════════════════════


def test_start_threat_subsystems_skips_when_no_threat(monkeypatch):
    """When _HAS_THREAT is False the function logs and returns immediately."""
    monkeypatch.setattr(server, "_HAS_THREAT", False)
    server.server_logger.messages.clear()

    server._start_threat_subsystems()

    assert any(
        "unavailable" in msg.lower() or "skipping" in msg.lower()
        for _, msg in server.server_logger.messages
    )


def _enable_threat_subsystem(monkeypatch):
    """Helper: flip _HAS_THREAT and inject the attributes the try-block would have set."""
    monkeypatch.setattr(server, "_HAS_THREAT", True)
    # These attributes are normally set by the try-block at module level;
    # they don't exist when imports fail, so we must inject them.
    if not hasattr(server, "SnortAlertWatcher"):
        monkeypatch.setattr(server, "SnortAlertWatcher", None, raising=False)
    if not hasattr(server, "alert_from_snort"):
        monkeypatch.setattr(server, "alert_from_snort", None, raising=False)
    if not hasattr(server, "ensure_index_templates"):
        monkeypatch.setattr(server, "ensure_index_templates", None, raising=False)
    if not hasattr(server, "start_scheduled_tasks"):
        monkeypatch.setattr(server, "start_scheduled_tasks", None, raising=False)
    if not hasattr(server, "_anomaly_detector"):
        monkeypatch.setattr(server, "_anomaly_detector", None, raising=False)
    if not hasattr(server, "_threat_intel"):
        monkeypatch.setattr(server, "_threat_intel", None, raising=False)
    if not hasattr(server, "_alert_dedup"):
        monkeypatch.setattr(server, "_alert_dedup", None, raising=False)
    if not hasattr(server, "es_log"):
        monkeypatch.setattr(server, "es_log", None, raising=False)


def test_start_threat_subsystems_es_success(monkeypatch):
    """When _HAS_THREAT is True and ES connects, templates + watcher + tasks start."""
    _enable_threat_subsystem(monkeypatch)
    server.server_logger.messages.clear()

    # Stub Elasticsearch
    fake_es_instance = SimpleNamespace(ping=lambda: True)
    fake_es_class = lambda *a, **kw: fake_es_instance  # noqa: E731

    es_mod = types.ModuleType("elasticsearch")
    es_mod.Elasticsearch = fake_es_class
    monkeypatch.setitem(sys.modules, "elasticsearch", es_mod)

    # Stub ensure_index_templates
    template_calls = []
    monkeypatch.setattr(server, "ensure_index_templates",
                        lambda es, logger: template_calls.append(es))

    # Stub SnortAlertWatcher
    watcher_calls = []

    class FakeWatcher:
        def __init__(self, path, callback):
            self.path = path
            self.callback = callback

        def start(self):
            watcher_calls.append(self.path)

    monkeypatch.setattr(server, "SnortAlertWatcher", FakeWatcher)

    # Stub start_scheduled_tasks
    sched_calls = []
    monkeypatch.setattr(server, "start_scheduled_tasks",
                        lambda **kw: sched_calls.append(kw))

    # Stub es_log and alert_from_snort
    monkeypatch.setattr(server, "es_log", lambda idx, doc: None)
    monkeypatch.setattr(server, "alert_from_snort", lambda d: d)
    monkeypatch.setattr(server, "_alert_dedup", None)

    server._start_threat_subsystems()

    assert len(template_calls) == 1
    assert template_calls[0] is fake_es_instance
    assert len(watcher_calls) == 1
    assert len(sched_calls) == 1
    assert sched_calls[0]["es_client"] is fake_es_instance


def test_start_threat_subsystems_es_fails(monkeypatch):
    """When ES connection fails, templates are skipped but watcher + tasks still start."""
    _enable_threat_subsystem(monkeypatch)
    server.server_logger.messages.clear()

    # Stub Elasticsearch to raise
    def bad_es(*a, **kw):
        raise ConnectionError("no ES")

    es_mod = types.ModuleType("elasticsearch")
    es_mod.Elasticsearch = bad_es
    monkeypatch.setitem(sys.modules, "elasticsearch", es_mod)

    # ensure_index_templates should NOT be called
    template_calls = []
    monkeypatch.setattr(server, "ensure_index_templates",
                        lambda es, logger: template_calls.append(es))

    # Stub SnortAlertWatcher
    watcher_started = []

    class FakeWatcher:
        def __init__(self, path, callback):
            self.path = path
            self.callback = callback

        def start(self):
            watcher_started.append(self.path)

    monkeypatch.setattr(server, "SnortAlertWatcher", FakeWatcher)
    monkeypatch.setattr(server, "start_scheduled_tasks", lambda **kw: None)
    monkeypatch.setattr(server, "es_log", lambda idx, doc: None)
    monkeypatch.setattr(server, "alert_from_snort", lambda d: d)
    monkeypatch.setattr(server, "_alert_dedup", None)

    server._start_threat_subsystems()

    # Templates skipped because ES failed
    assert len(template_calls) == 0
    # Watcher should still start
    assert len(watcher_started) == 1
    # Warning should be logged
    assert any("skipped" in msg.lower() for _, msg in server.server_logger.messages)


def test_start_threat_subsystems_snort_env_var(monkeypatch):
    """SNORT_ALERT_FILE env var is passed to the watcher."""
    _enable_threat_subsystem(monkeypatch)
    monkeypatch.setenv("SNORT_ALERT_FILE", "/custom/snort/alert")

    es_mod = types.ModuleType("elasticsearch")
    es_mod.Elasticsearch = lambda *a, **kw: (_ for _ in ()).throw(Exception("no ES"))
    monkeypatch.setitem(sys.modules, "elasticsearch", es_mod)
    monkeypatch.setattr(server, "ensure_index_templates", lambda *a: None)
    monkeypatch.setattr(server, "start_scheduled_tasks", lambda **kw: None)
    monkeypatch.setattr(server, "es_log", lambda idx, doc: None)
    monkeypatch.setattr(server, "alert_from_snort", lambda d: d)
    monkeypatch.setattr(server, "_alert_dedup", None)

    captured_path = []

    class FakeWatcher:
        def __init__(self, path, callback):
            captured_path.append(path)
            self.callback = callback

        def start(self):
            pass

    monkeypatch.setattr(server, "SnortAlertWatcher", FakeWatcher)

    server._start_threat_subsystems()

    assert captured_path[0] == "/custom/snort/alert"


def test_on_snort_alert_callback_logs_and_dedup(monkeypatch):
    """The _on_snort_alert callback created inside _start_threat_subsystems
    calls es_log and the deduplicator."""
    _enable_threat_subsystem(monkeypatch)

    es_mod = types.ModuleType("elasticsearch")
    es_mod.Elasticsearch = lambda *a, **kw: (_ for _ in ()).throw(Exception("no ES"))
    monkeypatch.setitem(sys.modules, "elasticsearch", es_mod)
    monkeypatch.setattr(server, "ensure_index_templates", lambda *a: None)
    monkeypatch.setattr(server, "start_scheduled_tasks", lambda **kw: None)

    es_log_calls = []
    monkeypatch.setattr(server, "es_log", lambda idx, doc: es_log_calls.append((idx, doc)))

    dedup_calls = []
    fake_dedup = SimpleNamespace(ingest=lambda alert: dedup_calls.append(alert))
    monkeypatch.setattr(server, "_alert_dedup", fake_dedup)
    monkeypatch.setattr(server, "alert_from_snort", lambda d: {"converted": True, **d})

    captured_callback = []

    class FakeWatcher:
        def __init__(self, path, callback):
            captured_callback.append(callback)

        def start(self):
            pass

    monkeypatch.setattr(server, "SnortAlertWatcher", FakeWatcher)

    server._start_threat_subsystems()

    # Simulate a Snort alert arriving
    fake_alert = SimpleNamespace(to_dict=lambda: {"sid": 123, "msg": "test"})
    captured_callback[0](fake_alert)

    assert len(es_log_calls) == 1
    assert es_log_calls[0] == ("snort_alerts", {"sid": 123, "msg": "test"})
    assert len(dedup_calls) == 1
    assert dedup_calls[0]["converted"] is True


def test_on_snort_alert_callback_no_dedup(monkeypatch):
    """When _alert_dedup is None, the callback still logs but skips dedup."""
    _enable_threat_subsystem(monkeypatch)

    es_mod = types.ModuleType("elasticsearch")
    es_mod.Elasticsearch = lambda *a, **kw: (_ for _ in ()).throw(Exception("no ES"))
    monkeypatch.setitem(sys.modules, "elasticsearch", es_mod)
    monkeypatch.setattr(server, "ensure_index_templates", lambda *a: None)
    monkeypatch.setattr(server, "start_scheduled_tasks", lambda **kw: None)

    es_log_calls = []
    monkeypatch.setattr(server, "es_log", lambda idx, doc: es_log_calls.append((idx, doc)))
    monkeypatch.setattr(server, "_alert_dedup", None)
    monkeypatch.setattr(server, "alert_from_snort", lambda d: d)

    captured_callback = []

    class FakeWatcher:
        def __init__(self, path, callback):
            captured_callback.append(callback)

        def start(self):
            pass

    monkeypatch.setattr(server, "SnortAlertWatcher", FakeWatcher)

    server._start_threat_subsystems()

    fake_alert = SimpleNamespace(to_dict=lambda: {"sid": 456})
    captured_callback[0](fake_alert)

    assert len(es_log_calls) == 1
    # No crash even though dedup is None
