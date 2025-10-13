import builtins
import json
import runpy
import sys
import types
from types import SimpleNamespace

import pytest

if "grpc" not in sys.modules:
    fake_grpc_module = types.ModuleType("grpc")
    fake_grpc_module.__version__ = "test"
    fake_grpc_module.server = lambda _executor: None
    sys.modules["grpc"] = fake_grpc_module

if "google" not in sys.modules:
    google_module = types.ModuleType("google")
    sys.modules["google"] = google_module
else:
    google_module = sys.modules["google"]

if "google.protobuf" not in sys.modules:
    protobuf_module = types.ModuleType("google.protobuf")
    sys.modules["google.protobuf"] = protobuf_module
else:
    protobuf_module = sys.modules["google.protobuf"]

if "google.protobuf.json_format" not in sys.modules:
    json_format_module = types.ModuleType("google.protobuf.json_format")

    def default_message_to_dict(message, **_kwargs):
        if hasattr(message, "__dict__"):
            return dict(message.__dict__)
        return {}

    json_format_module.MessageToDict = default_message_to_dict
    sys.modules["google.protobuf.json_format"] = json_format_module
else:
    json_format_module = sys.modules["google.protobuf.json_format"]

setattr(google_module, "protobuf", protobuf_module)
setattr(protobuf_module, "json_format", json_format_module)

if "proto" not in sys.modules:
    proto_module = types.ModuleType("proto")
    proto_module.__path__ = []
    sys.modules["proto"] = proto_module
else:
    proto_module = sys.modules["proto"]

if "proto.agent_pb2" not in sys.modules:
    agent_pb2_module = types.ModuleType("proto.agent_pb2")

    class ProcessListAck:
        def __init__(self, action):
            self.action = action

    class Ack:
        def __init__(self, success, message):
            self.success = success
            self.message = message

    agent_pb2_module.ProcessListAck = ProcessListAck
    agent_pb2_module.Ack = Ack
    sys.modules["proto.agent_pb2"] = agent_pb2_module
else:
    agent_pb2_module = sys.modules["proto.agent_pb2"]

if "proto.agent_pb2_grpc" not in sys.modules:
    agent_pb2_grpc_module = types.ModuleType("proto.agent_pb2_grpc")

    class AgentServiceServicer:
        def __init__(self, *args, **kwargs):
            pass

    def add_servicer_to_server(servicer, server):
        if hasattr(server, "register_servicer"):
            server.register_servicer(servicer)
        else:
            setattr(server, "attached_servicer", servicer)

    agent_pb2_grpc_module.AgentServiceServicer = AgentServiceServicer
    agent_pb2_grpc_module.add_AgentServiceServicer_to_server = add_servicer_to_server
    sys.modules["proto.agent_pb2_grpc"] = agent_pb2_grpc_module
else:
    agent_pb2_grpc_module = sys.modules["proto.agent_pb2_grpc"]

    # Ensure required attributes exist when another test installed a minimal stub.
    if not hasattr(agent_pb2_grpc_module, "AgentServiceServicer"):
        class AgentServiceServicer:
            def __init__(self, *args, **kwargs):
                pass

        agent_pb2_grpc_module.AgentServiceServicer = AgentServiceServicer

    if not hasattr(agent_pb2_grpc_module, "add_AgentServiceServicer_to_server"):
        def add_servicer_to_server(servicer, server):
            if hasattr(server, "register_servicer"):
                server.register_servicer(servicer)
            else:
                setattr(server, "attached_servicer", servicer)

        agent_pb2_grpc_module.add_AgentServiceServicer_to_server = add_servicer_to_server

setattr(proto_module, "agent_pb2", agent_pb2_module)
setattr(proto_module, "agent_pb2_grpc", agent_pb2_grpc_module)

from cloudshield.Agent.tools import mock_grpc_server  # noqa: E402


ORIGINAL_MESSAGE_TO_DICT = mock_grpc_server.MessageToDict


class FakeServer:
    def __init__(self):
        self.started = False
        self.stopped = False
        self.bound = []

    def add_insecure_port(self, addr):
        self.bound.append(addr)

    def start(self):
        self.started = True

    def stop(self, grace):
        self.stopped = True


class DummyExecutor:
    def __init__(self, *args, **kwargs):
        pass


@pytest.fixture(autouse=True)
def reset_message_to_dict(monkeypatch):
    # Restore MessageToDict after tests that monkeypatch it
    monkeypatch.setattr(mock_grpc_server, "MessageToDict", ORIGINAL_MESSAGE_TO_DICT, raising=False)
    yield


def test_agent_servicer_records_process_list(monkeypatch):
    recorded = []

    class Recorder:
        def record(self, entry):
            recorded.append(entry)

    monkeypatch.setattr(
        mock_grpc_server,
        "MessageToDict",
        lambda request, preserving_proto_field_name=True: {"process_count": len(request.processes)},
    )

    servicer = mock_grpc_server.AgentServicer(Recorder())
    request = SimpleNamespace(agent_id="agent-1", processes=[1, 2, 3])
    response = servicer.SendProcessList(request, context=None)

    assert recorded[0]["rpc"] == "SendProcessList"
    assert recorded[0]["payload"] == {"process_count": 3}
    assert response.action is False


def test_agent_servicer_record_fallback(monkeypatch):
    recorded = []

    class Recorder:
        def record(self, entry):
            recorded.append(entry)

    def broken_message_to_dict(*_args, **_kwargs):
        raise ValueError("boom")

    monkeypatch.setattr(mock_grpc_server, "MessageToDict", broken_message_to_dict)

    servicer = mock_grpc_server.AgentServicer(Recorder())

    class Request:
        agent_id = "agent-2"
        domain = "example.local"

        def __str__(self):
            return "Request(agent-2)"

    response = servicer.SendWorkstationInit(Request(), context=None)

    assert recorded[0]["payload"] == "Request(agent-2)"
    assert response.success is True
    assert response.message == "Initialized"


def test_request_recorder_writes_json_lines(tmp_path):
    out_file = tmp_path / "requests.jsonl"
    recorder = mock_grpc_server.RequestRecorder(str(out_file))
    recorder.record({"rpc": "Sample"})

    lines = out_file.read_text(encoding="utf-8").strip().splitlines()
    assert json.loads(lines[-1]) == {"rpc": "Sample"}


def test_request_recorder_init_handles_failures(tmp_path, monkeypatch, caplog):
    out_file = tmp_path / "subdir" / "requests.jsonl"

    def failing_makedirs(*_args, **_kwargs):
        raise OSError("cannot create")

    def failing_open(*_args, **_kwargs):
        raise OSError("cannot touch")

    monkeypatch.setattr(mock_grpc_server.os, "makedirs", failing_makedirs)
    monkeypatch.setattr(builtins, "open", failing_open)

    with caplog.at_level("DEBUG"):
        recorder = mock_grpc_server.RequestRecorder(str(out_file))

    assert recorder.out_file == str(out_file)
    assert any("Could not touch out_file" in message for message in caplog.messages)


def test_request_recorder_logs_write_exceptions(tmp_path, monkeypatch, caplog):
    out_file = tmp_path / "requests.jsonl"
    recorder = mock_grpc_server.RequestRecorder(str(out_file))

    def failing_open(*_args, **_kwargs):
        raise OSError("cannot write")

    monkeypatch.setattr(builtins, "open", failing_open)

    with caplog.at_level("ERROR"):
        recorder.record({"rpc": "fail"})

    assert any("Failed to write request entry" in message for message in caplog.messages)


def test_serve_stops_after_max_calls(tmp_path, monkeypatch):
    out_file = tmp_path / "requests.jsonl"
    fake_server = FakeServer()

    monkeypatch.setattr(mock_grpc_server.grpc, "server", lambda executor: fake_server, raising=False)
    monkeypatch.setattr(mock_grpc_server, "ThreadPoolExecutor", lambda max_workers: DummyExecutor())
    monkeypatch.setattr(
        mock_grpc_server.agent_pb2_grpc,
        "add_AgentServiceServicer_to_server",
        lambda servicer, server: None,
    )

    loop_ticks = {"count": 0}

    def fake_sleep(_interval):
        loop_ticks["count"] += 1
        if loop_ticks["count"] == 1:
            out_file.write_text("{}\n", encoding="utf-8")

    monkeypatch.setattr(mock_grpc_server.time, "sleep", fake_sleep)

    mock_grpc_server.serve(host="localhost", port=12345, out_file=str(out_file), max_calls=1, timeout=None)

    assert fake_server.started is True
    assert fake_server.stopped is True
    assert fake_server.bound == ["localhost:12345"]


def test_serve_respects_timeout(tmp_path, monkeypatch):
    fake_server = FakeServer()

    monkeypatch.setattr(mock_grpc_server.grpc, "server", lambda executor: fake_server, raising=False)
    monkeypatch.setattr(mock_grpc_server, "ThreadPoolExecutor", lambda max_workers: DummyExecutor())
    monkeypatch.setattr(
        mock_grpc_server.agent_pb2_grpc,
        "add_AgentServiceServicer_to_server",
        lambda servicer, server: None,
    )

    def fake_sleep(_interval):
        pass

    current_time = {"value": 0}

    def fake_time():
        value = current_time["value"]
        current_time["value"] += 1
        return value

    def failing_open(*_args, **_kwargs):
        raise OSError("cannot read")

    monkeypatch.setattr(mock_grpc_server.time, "sleep", fake_sleep)
    monkeypatch.setattr(mock_grpc_server.time, "time", fake_time)
    monkeypatch.setattr(builtins, "open", failing_open)

    mock_grpc_server.serve(host="127.0.0.1", port=54321, out_file=str(tmp_path / "requests.jsonl"), max_calls=1, timeout=2)

    assert fake_server.stopped is True


def test_serve_handles_keyboard_interrupt(monkeypatch):
    fake_server = FakeServer()

    monkeypatch.setattr(mock_grpc_server.grpc, "server", lambda executor: fake_server, raising=False)
    monkeypatch.setattr(mock_grpc_server, "ThreadPoolExecutor", lambda max_workers: DummyExecutor())
    monkeypatch.setattr(
        mock_grpc_server.agent_pb2_grpc,
        "add_AgentServiceServicer_to_server",
        lambda servicer, server: None,
    )

    def raising_sleep(_interval):
        raise KeyboardInterrupt

    monkeypatch.setattr(mock_grpc_server.time, "sleep", raising_sleep)

    mock_grpc_server.serve(max_calls=None, timeout=None)

    assert fake_server.stopped is True