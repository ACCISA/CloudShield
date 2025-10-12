import importlib
import sys
from pathlib import Path

import pytest


@pytest.fixture(name="state_module")
def fixture_state_module(monkeypatch):
    repo_root = Path(__file__).resolve().parents[3]
    monkeypatch.syspath_prepend(str(repo_root))

    import cloudshield.ThreatDetection.logger as logger_module

    class CapturingLogger:
        def __init__(self):
            self.messages = []

        def info(self, message):
            self.messages.append(("info", message))

        def warning(self, message):
            self.messages.append(("warning", message))

    capturing_logger = CapturingLogger()
    monkeypatch.setattr(logger_module, "state_logger", capturing_logger)
    sys.modules["logger"] = logger_module

    sys.modules.pop("cloudshield.ThreatDetection.state", None)
    module = importlib.import_module("cloudshield.ThreatDetection.state")
    return module, capturing_logger


def test_set_expected_response_adds_request(state_module, monkeypatch):
    module, logger = state_module
    manager = module.GRPCStateManager(delay=5)

    monkeypatch.setattr(module.time, "time", lambda: 100)
    manager.set_expected_response("agent-a", "SendProcessList", "SendProcessListInformation")

    assert manager.expected == [
        {
            "agent_id": "agent-a",
            "request_method": "SendProcessList",
            "request_timestamp": 100,
            "response_method": "SendProcessListInformation",
        }
    ]
    assert logger.messages[-1][0] == "info"


def test_set_expected_response_duplicate_logs(state_module, monkeypatch):
    module, logger = state_module
    manager = module.GRPCStateManager(delay=5)
    manager.expected.append(
        {
            "agent_id": "agent-a",
            "request_method": "SendProcessList",
            "request_timestamp": 50,
            "response_method": "SendProcessListInformation",
        }
    )

    manager.set_expected_response("agent-a", "SendProcessList", "SendProcessListInformation")

    assert len(manager.expected) == 1
    assert logger.messages[-1] == (
        "info",
        "'agent-a' is already expecting a response (request_method='SendProcessList', response_method='SendProcessListInformation'",
    )


def test_get_agent_requests_filters_by_agent(state_module):
    module, _logger = state_module
    manager = module.GRPCStateManager(delay=5)
    manager.expected = [
        {"agent_id": "agent-a", "request_method": "A", "response_method": "RespA"},
        {"agent_id": "agent-b", "request_method": "B", "response_method": "RespB"},
    ]

    result = manager.get_agent_requests("agent-b")
    assert result == [{"agent_id": "agent-b", "request_method": "B", "response_method": "RespB"}]


def test_alert_missing_responses_logs_when_delay_exceeded(state_module, monkeypatch):
    module, logger = state_module
    manager = module.GRPCStateManager(delay=10)
    monkeypatch.setattr(module.time, "time", lambda: 200)
    manager.expected = [
        {
            "agent_id": "agent-c",
            "request_method": "SendProcessList",
            "response_method": "SendProcessListInformation",
            "request_timestamp": 100,
        },
        {
            "agent_id": "agent-d",
            "request_method": "SendProcessList",
            "response_method": "SendProcessListInformation",
            "request_timestamp": 195,
        },
    ]

    manager.alert_missing_responses()

    assert ("warning", "Agent 'agent-c' was expected to respond with 'SendProcessListInformation' after a 'SendProcessList' call") in logger.messages
    assert all(entry[0] == "warning" for entry in logger.messages if entry[1].startswith("Agent"))


def test_is_expected_returns_false_when_no_requests(state_module):
    module, logger = state_module
    manager = module.GRPCStateManager(delay=5)

    assert not manager.is_expected("agent-x", "SendProcessListInformation")
    assert logger.messages == []


def test_is_expected_matches_and_clears_entry(state_module):
    module, logger = state_module
    manager = module.GRPCStateManager(delay=5)
    manager.expected = [
        {
            "agent_id": "agent-y",
            "request_method": "SendProcessList",
            "response_method": "SendProcessListInformation",
        },
        {
            "agent_id": "agent-y",
            "request_method": "Other",
            "response_method": "OtherResp",
        },
    ]

    assert manager.is_expected("agent-y", "SendProcessListInformation") is True
    assert manager.expected == [
        {
            "agent_id": "agent-y",
            "request_method": "Other",
            "response_method": "OtherResp",
        }
    ]
    assert logger.messages[-1] == (
        "info",
        "Agent 'agent-y' has responded with 'SendProcessListInformation' after 'SendProcessList' as expected",
    )


def test_is_expected_logs_when_mismatch(state_module):
    module, logger = state_module
    manager = module.GRPCStateManager(delay=5)
    manager.expected = [
        {
            "agent_id": "agent-z",
            "request_method": "SendProcessList",
            "response_method": "SendProcessListInformation",
        }
    ]

    assert not manager.is_expected("agent-z", "UnexpectedResp")
    assert logger.messages[-1] == ("warning", "Agent 'agent-z' was not expecting a 'UnexpectedResp'")
