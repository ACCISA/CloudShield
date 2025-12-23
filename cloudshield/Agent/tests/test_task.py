import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from cloudshield.Agent.tasks import task as task_module
from cloudshield.Agent.tasks.task import BaseTask


class DummyTask(BaseTask):
    def run(self):
        return None


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(("info", message))

    def error(self, message):
        self.messages.append(("error", message))


def make_task(tmp_path):
    cb_calls = []

    def cb():
        cb_calls.append(True)

    state = {
        "agent_id": "agent",
        "server_addr": "localhost",
        "port": 50051,
        "cache_path": str(tmp_path),
        "create_grpc_channel_cb": cb,
        "_cb_calls": cb_calls,
    }
    return DummyTask(state)


def test_set_channel_ignores_none(tmp_path):
    task = make_task(tmp_path)
    task.set_channel(None, object())
    assert task.channel is None
    assert task.stub is None


def test_set_channel_assigns_values(tmp_path):
    task = make_task(tmp_path)
    channel = object()
    stub = object()
    task.set_channel(channel, stub)
    assert task.channel is channel
    assert task.stub is stub


def test_cache_message_writes_json(tmp_path, monkeypatch):
    task = make_task(tmp_path)

    recorded = {}

    def fake_message_to_dict(request, preserving_proto_field_name):
        recorded["request"] = request
        recorded["preserve"] = preserving_proto_field_name
        return request.payload

    monkeypatch.setattr(task_module, "MessageToDict", fake_message_to_dict)
    request = SimpleNamespace(payload={"foo": "bar"})

    task.cache_message("SendFoo", request)

    files = list(Path(task.agent_state["cache_path"]).iterdir())
    assert len(files) == 1
    data = json.loads(files[0].read_text(encoding="utf-8"))
    assert data == {"grpc": "SendFoo", "data": {"foo": "bar"}}
    assert recorded["request"] is request
    assert recorded["preserve"] is True


def test_send_when_channel_missing_caches(monkeypatch, tmp_path):
    task = make_task(tmp_path)
    logger = DummyLogger()
    monkeypatch.setattr(task_module, "task_logger", logger)

    cached = []
    monkeypatch.setattr(task, "cache_message", lambda name, payload: cached.append((name, payload)))

    result = task.send("SendFoo", "payload")

    assert result is None
    assert cached == [("SendFoo", "payload")]
    assert logger.messages[0][0] == "info"


def test_send_raises_when_stub_missing(monkeypatch, tmp_path):
    task = make_task(tmp_path)
    logger = DummyLogger()
    monkeypatch.setattr(task_module, "task_logger", logger)

    task.set_channel("channel", SimpleNamespace())

    with pytest.raises(AttributeError):
        task.send("SendFoo", "payload")


def test_send_success_returns_response(monkeypatch, tmp_path):
    task = make_task(tmp_path)
    logger = DummyLogger()
    monkeypatch.setattr(task_module, "task_logger", logger)

    response = object()

    class Stub:
        def SendFoo(self, request):
            return response

    task.set_channel("channel", Stub())

    result = task.send("SendFoo", "payload")

    assert result is response
    assert logger.messages[0] == ("info", "Sending RPC 'SendFoo'")


def test_send_handles_grpc_error(monkeypatch, tmp_path):
    task = make_task(tmp_path)
    logger = DummyLogger()
    monkeypatch.setattr(task_module, "task_logger", logger)

    cached = []
    monkeypatch.setattr(task, "cache_message", lambda name, payload: cached.append((name, payload)))

    class Stub:
        def SendFoo(self, request):
            raise task_module.grpc.RpcError("boom")

    task.set_channel("channel", Stub())

    result = task.send("SendFoo", "payload")

    assert result is None
    assert cached == [("SendFoo", "payload")]
    assert logger.messages[-2][0] == "error"
    assert task.channel is None
    assert task.agent_state["_cb_calls"] == [True]
