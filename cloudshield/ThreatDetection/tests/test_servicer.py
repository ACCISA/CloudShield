import sys
import types
from types import SimpleNamespace

import pytest

import logger as logger_module

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
    assert response.action is True
    assert response.pids == [101]
    assert fake_state.set_calls == [("agent-x", "SendProcessList", "SendProcessListInformation")]
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
    assert response.pids == [88]
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
