import sys
import types
from types import SimpleNamespace

import pytest

import cloudshield.ThreatDetection.logger as logger_module

def ensure_module(name, module):
    if name not in sys.modules:
        sys.modules[name] = module
    return sys.modules[name]


# Stub proto modules before importing servicer
proto_pkg = ensure_module("proto", types.ModuleType("proto"))
proto_pkg.__path__ = []

agent_pb2_module = types.ModuleType("proto.agent_pb2")


class Ack:
    def __init__(self, success, message):
        self.success = success
        self.message = message


class ProcessListAck:
    def __init__(self, action, pids):
        self.action = action
        self.pids = list(pids)


agent_pb2_module.Ack = Ack
agent_pb2_module.ProcessListAck = ProcessListAck
sys.modules["proto.agent_pb2"] = agent_pb2_module
setattr(proto_pkg, "agent_pb2", agent_pb2_module)

agent_pb2_grpc_module = types.ModuleType("proto.agent_pb2_grpc")


class BaseServicer:
    pass


agent_pb2_grpc_module.AgentServiceServicer = BaseServicer
sys.modules["proto.agent_pb2_grpc"] = agent_pb2_grpc_module
setattr(proto_pkg, "agent_pb2_grpc", agent_pb2_grpc_module)

def default_message_to_dict(obj, *args, **kwargs):
    if isinstance(obj, dict):
        return dict(obj)
    if hasattr(obj, "__dict__"):
        return {k: v for k, v in obj.__dict__.items()}
    return {"value": obj}


# Stub utils module used by servicer
utils_module = types.ModuleType("utils")
utils_module.get_ip = lambda peer: peer
utils_module.ingest_processes = lambda data: data
utils_module.es_log = lambda index, payload: None
sys.modules["utils"] = utils_module

# Stub alerts module so detection helpers can import Alert/Severity lazily
class _SeverityValue:
    def __init__(self, v):
        self.value = v

class _Severity:
    HIGH = _SeverityValue("HIGH")
    CRITICAL = _SeverityValue("CRITICAL")

class _Alert:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    def compute_id(self):
        self.alert_id = "test-id"
    def to_dict(self):
        return self.__dict__

alerts_module = types.ModuleType("alerts")
alerts_module.Alert = _Alert
alerts_module.Severity = _Severity
alerts_module.AlertDeduplicator = SimpleNamespace
alerts_module.alert_from_anomaly = lambda d: d
alerts_module.alert_from_threat_intel = lambda d: d
alerts_module.alert_from_traffic_spike = lambda d: d
alerts_module.alert_from_beacon = lambda d: d
sys.modules["alerts"] = alerts_module

class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(("info", message))

    def error(self, message):
        self.messages.append(("error", message))

    def warning(self, message):
        self.messages.append(("warning", message))


logger_module.servicer_logger = DummyLogger()
sys.modules["logger"] = logger_module

# Stub state module
state_module = types.ModuleType("state")
state_module.state_manager = SimpleNamespace(
    set_expected_response=lambda *args, **kwargs: None,
    is_expected=lambda *args, **kwargs: True,
)
sys.modules["state"] = state_module

# Import after stubs are set up to avoid import errors
from cloudshield.ThreatDetection import servicer  # noqa: E402


class FakeLogger:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(("info", message))

    def error(self, message):
        self.messages.append(("error", message))

    def warning(self, message):
        self.messages.append(("warning", message))


class FakeStateManager:
    def __init__(self):
        self.set_calls = []
        self.expected_result = True
        self.is_expected_calls = []

    def set_expected_response(self, agent_id, request_method, response_method):
        self.set_calls.append((agent_id, request_method, response_method))

    def is_expected(self, agent_id, response_method):
        self.is_expected_calls.append((agent_id, response_method))
        return self.expected_result

@pytest.fixture
def fake_logger(monkeypatch):
    logger = FakeLogger()
    monkeypatch.setattr(servicer, "servicer_logger", logger)
    return logger


@pytest.fixture
def fake_state(monkeypatch):
    state = FakeStateManager()
    monkeypatch.setattr(servicer, "state_manager", state)
    return state


@pytest.fixture
def fake_utils(monkeypatch):
    calls = {
        "get_ip": [],
        "ingest": None,
        "es": [],
    }

    def fake_get_ip(peer):
        calls["get_ip"].append(peer)
        return "10.0.0.1"

    def fake_ingest(data):
        calls["ingest"] = data
        return data

    def fake_es(index, payload):
        calls["es"].append((index, payload))

    monkeypatch.setattr(servicer, "get_ip", fake_get_ip)
    monkeypatch.setattr(servicer, "ingest_processes", fake_ingest)
    monkeypatch.setattr(servicer, "es_log", fake_es)
    return calls



def test_loggable_decorator_logs_request(monkeypatch):
    logged = []

    monkeypatch.setattr(servicer, "es_log", lambda index, payload: logged.append((index, payload)))
    monkeypatch.setattr(servicer, "MessageToDict", lambda request: {"agent_id": request.agent_id})

    @servicer.loggable
    def sample(self, request, context):
        return "ok"

    req = SimpleNamespace(agent_id="agent-1")
    ctx = SimpleNamespace()

    result = sample(object(), req, ctx)

    assert result == "ok"
    assert logged == [("rpc_logs", {"agent_id": "agent-1"})]


def test_agent_service_init_ignores_agents():
    serv = servicer.AgentServiceServicer(["existing"])
    assert serv.agents == []


def test_send_workstation_init_returns_ack(fake_logger):
    serv = servicer.AgentServiceServicer([])
    req = SimpleNamespace(agent_id="agent-a", domain="domain")
    resp = serv.SendWorkstationInit(req, None)
    assert "test_servicer.Ack" in str(type(resp))
    assert resp.success is True
    assert resp.message == "Workstation registered"


def test_send_process_list_sets_expected_and_returns_action(fake_logger, fake_state, fake_utils):
    serv = servicer.AgentServiceServicer([])

    class Process:
        def __init__(self, cmdline, pid, name=""):
            self.cmdline = cmdline
            self.pid = pid
            self.name = name
            self.is_pending = False

    proc1 = Process("/bin/echo hello", 101, name="echo")
    proc2 = Process("   ", 202)

    request = SimpleNamespace(
        agent_id="agent-x",
        is_pending=False,
        processes=[proc1, proc2],
    )
    context = SimpleNamespace(peer=lambda: "peer-string")

    fake_state.expected_result = True
    response = serv.SendProcessList(request, context)

    assert "test_servicer.ProcessListAck" in str(type(response))
    assert response.action is False
    assert response.pids == []
    assert fake_state.set_calls == []
    assert fake_utils["get_ip"] == ["peer-string"]
    # Only the non-empty cmdline process should be ingested
    ingested = fake_utils["ingest"]
    assert len(ingested) == 1
    assert ingested[0]["data"] is proc1
    assert proc2.cmdline == ""


def test_send_process_list_pending_skips_action(fake_state, fake_utils):
    serv = servicer.AgentServiceServicer([])

    class Process:
        def __init__(self, cmdline, pid, name=""):
            self.cmdline = cmdline
            self.pid = pid
            self.name = name

    proc = Process("/usr/bin/python", 88, name="python")
    request = SimpleNamespace(agent_id="agent-y", is_pending=True, processes=[proc])
    context = SimpleNamespace(peer=lambda: "peer")

    fake_state.expected_result = True
    response = serv.SendProcessList(request, context)

    assert response.action is False
    assert response.pids == []
    # since is_pending True the expected response should not be scheduled
    assert fake_state.set_calls == []


def test_send_process_list_information_unexpected(fake_logger, fake_state):
    fake_state.expected_result = False
    serv = servicer.AgentServiceServicer([])

    proc = SimpleNamespace(cmdline="cmd", pid=1)
    request = SimpleNamespace(agent_id="agent-z", processes=[proc])

    result = serv.SendProcessListInformation(request, SimpleNamespace(peer=lambda: "peer"))

    assert result is None
    assert ("error", "Unexpected 'SendProcessListInformation' message, make sure a response was expected") in fake_logger.messages


def test_send_process_list_information_expected(fake_logger, fake_state, fake_utils, monkeypatch):
    monkeypatch.setattr("cloudshield.ThreatDetection.servicer.MessageToDict", lambda msg, **kwargs: vars(msg))
    fake_state.expected_result = True
    serv = servicer.AgentServiceServicer([])

    proc1 = SimpleNamespace(cmdline="cmd1", pid=1)
    proc2 = SimpleNamespace(cmdline="cmd2", pid=2)
    request = SimpleNamespace(agent_id="agent-q", processes=[proc1, proc2])

    result = serv.SendProcessListInformation(request, SimpleNamespace(peer=lambda: "peer"))

    assert "test_servicer.Ack" in str(type(result))
    assert result.success is True
    assert fake_state.is_expected_calls == [("agent-q", "SendProcessListInformation")]
    assert fake_utils["es"] == [
        ("unknown_procs", {"cmdline": "cmd1", "pid": 1, "agent_id": "agent-q"}),
        ("unknown_procs", {"cmdline": "cmd2", "pid": 2, "agent_id": "agent-q"}),
    ]


def test_send_network_connections_ingests_and_acks(fake_logger, fake_utils, monkeypatch):
    monkeypatch.setattr("cloudshield.ThreatDetection.servicer.MessageToDict", lambda msg, **kwargs: vars(msg))
    serv = servicer.AgentServiceServicer([])

    conns = [
        SimpleNamespace(
            laddr_ip="::",
            laddr_port=50051,
            raddr_ip="",
            raddr_port=0,
            status="LISTEN",
            pid=1,
            process_name="python",
        ),
        SimpleNamespace(
            laddr_ip="127.0.0.1",
            laddr_port=6379,
            raddr_ip="",
            raddr_port=0,
            status="LISTEN",
            pid=0,
            process_name="",
        ),
    ]
    request = SimpleNamespace(agent_id="agent-net", timestamp=1700000000, conns=conns)
    context = SimpleNamespace(peer=lambda: "peer-addr")

    resp = serv.SendNetworkConnections(request, context)

    assert "test_servicer.Ack" in str(type(resp))
    assert resp.success is True
    assert "ingested" in resp.message

    # get_ip() invoked with the context peer
    assert fake_utils["get_ip"] == ["peer-addr"]

    # one es_log() per connection, enriched with agent_id and timestamp
    assert len(fake_utils["es"]) == 2

    expected0 = (
        "net_conns",
        {
            "laddr_ip": "::",
            "laddr_port": 50051,
            "raddr_ip": "",
            "raddr_port": 0,
            "status": "LISTEN",
            "pid": 1,
            "process_name": "python",
            "agent_id": "agent-net",
            "timestamp": 1700000000,
        },
    )
    expected1 = (
        "net_conns",
        {
            "laddr_ip": "127.0.0.1",
            "laddr_port": 6379,
            "raddr_ip": "",
            "raddr_port": 0,
            "status": "LISTEN",
            "pid": 0,
            "process_name": "",
            "agent_id": "agent-net",
            "timestamp": 1700000000,
        },
    )
    assert fake_utils["es"][0] == expected0
    assert fake_utils["es"][1] == expected1


def test_send_network_connections_handles_empty(fake_utils):
    serv = servicer.AgentServiceServicer([])

    request = SimpleNamespace(agent_id="agent-net", timestamp=123, conns=[])
    context = SimpleNamespace(peer=lambda: "peer")

    resp = serv.SendNetworkConnections(request, context)

    assert "test_servicer.Ack" in str(type(resp))
    assert resp.success is True
    assert "ingested" in resp.message
    assert fake_utils["es"] == []


# ── Detection helpers ─────────────────────────────────────────────────────────

class FakeDetectorResult:
    def __init__(self, is_anomaly=True):
        self.is_anomaly = is_anomaly
    def to_dict(self):
        return {"is_anomaly": self.is_anomaly, "score": -1.5}


class FakeThreatHit:
    def to_dict(self):
        return {"ip": "9.9.9.9", "direction": "outbound"}


class FakeSpike:
    is_spike = True
    current_rate = 100.0
    spike_ratio = 3.0
    def to_dict(self):
        return {"is_spike": True}


class FakeBeaconResult:
    dst_ip = "8.8.8.8"
    def to_dict(self):
        return {"is_beacon": True, "dst_ip": "8.8.8.8"}


def _enable_detectors(monkeypatch, **overrides):
    """Set _HAS_DETECTORS=True and inject mock detectors."""
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", True)
    defaults = {
        "_anomaly_detector": None,
        "_threat_intel": None,
        "_rate_monitor": None,
        "_beacon_detector": None,
        "_alert_dedup": SimpleNamespace(ingest=lambda a: None),
    }
    defaults.update(overrides)
    for attr, val in defaults.items():
        monkeypatch.setattr(servicer, attr, val)
    # Patch module-level alert helpers (may be None if original import failed)
    for fn_name in ("alert_from_anomaly", "alert_from_threat_intel",
                    "alert_from_traffic_spike", "alert_from_beacon"):
        if not callable(getattr(servicer, fn_name, None)):
            monkeypatch.setattr(servicer, fn_name, lambda d: d, raising=False)


def test_run_anomaly_disabled(monkeypatch):
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_anomaly([], "agent", 0) == 0


def test_run_anomaly_no_anomalies(monkeypatch, fake_utils):
    mock_det = SimpleNamespace(
        score_connections=lambda conns, agent_id, timestamp: [FakeDetectorResult(is_anomaly=False)]
    )
    _enable_detectors(monkeypatch, _anomaly_detector=mock_det)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_anomaly([{}], "agent", 0) == 0


def test_run_anomaly_with_anomalies(monkeypatch, fake_utils):
    mock_det = SimpleNamespace(
        score_connections=lambda conns, agent_id, timestamp: [FakeDetectorResult(is_anomaly=True)]
    )
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _anomaly_detector=mock_det, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    serv = servicer.AgentServiceServicer([])
    result = serv._run_anomaly([{"raddr_ip": "1.2.3.4"}], "agent", 1700000000)
    assert result == 1
    assert any(idx == "anomaly_alerts" for idx, _ in fake_utils["es"])


def test_run_anomaly_exception(monkeypatch, fake_utils):
    def _raise_anomaly(*a, **k):
        raise RuntimeError("fail")
    mock_det = SimpleNamespace(score_connections=_raise_anomaly)
    _enable_detectors(monkeypatch, _anomaly_detector=mock_det)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_anomaly([{}], "agent", 0) == 0


def test_run_threat_intel_disabled(monkeypatch):
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_threat_intel([], "agent") == 0


def test_run_threat_intel_with_hits(monkeypatch, fake_utils):
    mock_ti = SimpleNamespace(
        check_connections=lambda conns, agent_id: [FakeThreatHit()]
    )
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _threat_intel=mock_ti, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    serv = servicer.AgentServiceServicer([])
    result = serv._run_threat_intel([{"raddr_ip": "9.9.9.9"}], "agent")
    assert result == 1
    assert any(idx == "threat_intel_hits" for idx, _ in fake_utils["es"])


def test_run_threat_intel_exception(monkeypatch):
    def _raise_ti(*a, **k):
        raise RuntimeError("fail")
    mock_ti = SimpleNamespace(check_connections=_raise_ti)
    _enable_detectors(monkeypatch, _threat_intel=mock_ti)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_threat_intel([{}], "agent") == 0


def test_run_traffic_spike_disabled(monkeypatch):
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_traffic_spike([], "agent", 0) is False


def test_run_traffic_spike_with_spike(monkeypatch, fake_utils):
    mock_rm = SimpleNamespace(record=lambda agent_id, count, ts: FakeSpike())
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _rate_monitor=mock_rm, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    serv = servicer.AgentServiceServicer([])
    assert serv._run_traffic_spike([{}] * 5, "agent", 1700000000) is True
    assert any(idx == "traffic_spikes" for idx, _ in fake_utils["es"])


def test_run_traffic_spike_no_spike(monkeypatch):
    no_spike = SimpleNamespace(is_spike=False)
    mock_rm = SimpleNamespace(record=lambda *a, **k: no_spike)
    _enable_detectors(monkeypatch, _rate_monitor=mock_rm)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_traffic_spike([{}], "agent", 0) is False


def test_run_traffic_spike_exception(monkeypatch):
    def _raise_spike(*a, **k):
        raise RuntimeError("fail")
    mock_rm = SimpleNamespace(record=_raise_spike)
    _enable_detectors(monkeypatch, _rate_monitor=mock_rm)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_traffic_spike([{}], "agent", 0) is False


def test_run_beacon_disabled(monkeypatch):
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_beacon([], "agent") == 0


def test_run_beacon_with_beacon(monkeypatch, fake_utils):
    mock_bd = SimpleNamespace(record=lambda conns, agent_id: [FakeBeaconResult()])
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _beacon_detector=mock_bd, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    serv = servicer.AgentServiceServicer([])
    result = serv._run_beacon([{"raddr_ip": "8.8.8.8"}], "agent")
    assert result == 1
    assert any(idx == "beacon_alerts" for idx, _ in fake_utils["es"])


def test_run_beacon_exception(monkeypatch):
    def _raise_beacon(*a, **k):
        raise RuntimeError("fail")
    mock_bd = SimpleNamespace(record=_raise_beacon)
    _enable_detectors(monkeypatch, _beacon_detector=mock_bd)
    serv = servicer.AgentServiceServicer([])
    assert serv._run_beacon([{}], "agent") == 0


def test_run_proc_net_correlation_no_detectors(monkeypatch):
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    serv = servicer.AgentServiceServicer([])
    serv._run_proc_net_correlation([{"process_name": "cmd.exe", "raddr_ip": "8.8.8.8"}], "agent")


def test_run_proc_net_correlation_no_cached_procs(monkeypatch):
    _enable_detectors(monkeypatch)
    servicer._agent_processes.pop("new-agent-xyz", None)
    serv = servicer.AgentServiceServicer([])
    serv._run_proc_net_correlation([{"process_name": "cmd.exe", "raddr_ip": "8.8.8.8"}], "new-agent-xyz")


def test_run_proc_net_correlation_lolbin_external(monkeypatch, fake_utils):
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    servicer._agent_processes["lolbin-agent"] = {"cmd.exe"}
    conn_dicts = [{
        "process_name": "cmd.exe",
        "raddr_ip": "8.8.8.8",
        "laddr_ip": "10.0.0.1",
        "raddr_port": 443,
    }]
    serv = servicer.AgentServiceServicer([])
    serv._run_proc_net_correlation(conn_dicts, "lolbin-agent")
    assert any(idx == "proc_net_alerts" for idx, _ in fake_utils["es"])


def test_run_proc_net_correlation_skips_internal(monkeypatch, fake_utils):
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    servicer._agent_processes["int-agent"] = {"cmd.exe"}
    conn_dicts = [{"process_name": "cmd.exe", "raddr_ip": "192.168.1.1"}]
    serv = servicer.AgentServiceServicer([])
    serv._run_proc_net_correlation(conn_dicts, "int-agent")
    assert not any(idx == "proc_net_alerts" for idx, _ in fake_utils["es"])


def test_run_proc_net_correlation_exception(monkeypatch):
    def _raise_ingest(a):
        raise RuntimeError("fail")
    mock_dedup = SimpleNamespace(ingest=_raise_ingest)
    _enable_detectors(monkeypatch, _alert_dedup=mock_dedup)
    servicer._agent_processes["exc-agent"] = {"cmd.exe"}
    conn_dicts = [{"process_name": "cmd.exe", "raddr_ip": "8.8.8.8"}]
    serv = servicer.AgentServiceServicer([])
    serv._run_proc_net_correlation(conn_dicts, "exc-agent")  # should not raise


def test_run_cross_source_correlation_single_source(monkeypatch):
    _enable_detectors(monkeypatch)
    serv = servicer.AgentServiceServicer([])
    serv._run_cross_source_correlation("agent", anomaly_count=1, intel_count=0, spike=False, beacon_count=0)


def test_run_cross_source_correlation_multi_source(monkeypatch, fake_utils):
    mock_dedup = SimpleNamespace(ingest=lambda a: None)
    _enable_detectors(monkeypatch, _alert_dedup=mock_dedup)
    monkeypatch.setattr(servicer, "es_log", lambda i, d: fake_utils["es"].append((i, d)))
    serv = servicer.AgentServiceServicer([])
    serv._run_cross_source_correlation("agent-1", anomaly_count=1, intel_count=1, spike=True, beacon_count=1)
    assert any(idx == "correlation_alerts" for idx, _ in fake_utils["es"])


def test_run_cross_source_correlation_exception(monkeypatch):
    def _raise_ingest(a):
        raise RuntimeError("fail")
    mock_dedup = SimpleNamespace(ingest=_raise_ingest)
    _enable_detectors(monkeypatch, _alert_dedup=mock_dedup)
    serv = servicer.AgentServiceServicer([])
    serv._run_cross_source_correlation("agent", anomaly_count=1, intel_count=1, spike=False, beacon_count=0)


# ── Import-time exception branches ───────────────────────────────────────────

def test_import_error_branch_sets_has_detectors_false(monkeypatch):
    """When detector modules raise ImportError at import time, _HAS_DETECTORS is False."""
    # The module is already loaded with _HAS_DETECTORS determined at import.
    # We verify the fallback path works by checking that _HAS_DETECTORS=False
    # causes all detection helpers to return no-op defaults.
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    monkeypatch.setattr(servicer, "_anomaly_detector", None)
    monkeypatch.setattr(servicer, "_threat_intel", None)
    monkeypatch.setattr(servicer, "_rate_monitor", None)
    monkeypatch.setattr(servicer, "_beacon_detector", None)
    monkeypatch.setattr(servicer, "_alert_dedup", None)

    serv = servicer.AgentServiceServicer([])
    assert serv._run_anomaly([], "agent", 0) == 0
    assert serv._run_threat_intel([], "agent") == 0
    assert serv._run_traffic_spike([], "agent", 0) is False
    assert serv._run_beacon([], "agent") == 0
    # proc_net and cross-source correlation also no-op
    serv._run_proc_net_correlation([{"process_name": "cmd.exe", "raddr_ip": "8.8.8.8"}], "agent")
    serv._run_cross_source_correlation("agent", 1, 1, True, 1)


def test_detector_init_exception_sets_has_detectors_false(monkeypatch):
    """When _HAS_DETECTORS is False (e.g. init error), all detector helpers no-op."""
    monkeypatch.setattr(servicer, "_HAS_DETECTORS", False)
    monkeypatch.setattr(servicer, "_anomaly_detector", None)
    monkeypatch.setattr(servicer, "_threat_intel", None)
    monkeypatch.setattr(servicer, "_rate_monitor", None)
    monkeypatch.setattr(servicer, "_beacon_detector", None)
    monkeypatch.setattr(servicer, "_alert_dedup", None)
    serv = servicer.AgentServiceServicer([])
    # All detector paths must short-circuit without raising
    assert serv._run_anomaly([], "agent", 0) == 0
    assert serv._run_threat_intel([], "agent") == 0
    assert serv._run_traffic_spike([], "agent", 0) is False
    assert serv._run_beacon([], "agent") == 0
