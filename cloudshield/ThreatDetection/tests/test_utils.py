import importlib
import json
import sys
import types

import pytest


@pytest.fixture()
def utils_module(monkeypatch, tmp_path):
    # Provide fake data files the module expects.
    (tmp_path / "hashes").write_text("knownhash\n")
    agents_payload = {"agents": [{"ip": "10.0.0.8", "agent_id": "agent-123"}]}
    (tmp_path / "agents.json").write_text(json.dumps(agents_payload))

    # Capture warnings emitted when the ES client fails to ping.
    class CapturingLogger:
        def __init__(self) -> None:
            self.messages = []

        def warning(self, message: str) -> None:
            self.messages.append(message)

    from pathlib import Path
    repo_root = Path(__file__).resolve().parents[3]
    monkeypatch.syspath_prepend(str(repo_root))

    import cloudshield.ThreatDetection.logger as logger_module
    sys.modules["logger"] = logger_module
    capturing_logger = CapturingLogger()
    monkeypatch.setattr(logger_module, "server_logger", capturing_logger)

    # Replace the elasticsearch client with a lightweight stub.
    class DummyES:
        def __init__(self, *args, **kwargs) -> None:
            self.index_calls = []

        def ping(self):
            raise RuntimeError("ping failure")

        def index(self, index, document):
            self.index_calls.append((index, document))

    fake_es_module = types.ModuleType("elasticsearch")
    fake_es_module.Elasticsearch = DummyES
    monkeypatch.setitem(sys.modules, "elasticsearch", fake_es_module)

    # Ensure the module reload picks up our stubs and fixture files.
    monkeypatch.chdir(tmp_path)
    sys.modules.pop("cloudshield.ThreatDetection.utils", None)
    module = importlib.import_module("cloudshield.ThreatDetection.utils")

    yield module, capturing_logger

    sys.modules.pop("cloudshield.ThreatDetection.utils", None)


def test_read_hashes_and_global_cache(utils_module):
    module, logger = utils_module

    assert module.hashes == ["knownhash"]
    assert module.read_hashes() == ["knownhash"]
    assert logger.messages == ["Unable to connect to ElasticSearch instance"]


def test_ingest_processes_filters_unknown_hashes(utils_module):
    module, _logger = utils_module

    processes = [
        {"hash": "knownhash", "name": "python"},
        {"hash": "mystery", "name": "sneaky"},
    ]

    assert module.ingest_processes(processes) == [{"hash": "mystery", "name": "sneaky"}]


def test_get_agents_and_validation(utils_module):
    module, _logger = utils_module

    agents = module.get_agents()
    assert agents == [{"ip": "10.0.0.8", "agent_id": "agent-123"}]
    assert module.is_valid_agent(agents, "10.0.0.8", "agent-123")
    assert not module.is_valid_agent(agents, "10.0.0.9", "agent-123")


def test_es_log_records_and_swallow_errors(utils_module, monkeypatch):
    module, _logger = utils_module

    module.es_log("process-index", {"value": 1})
    assert module.es.index_calls == [("process-index", {"value": 1})]

    def boom(index, document):
        raise RuntimeError("boom")

    monkeypatch.setattr(module.es, "index", boom)
    module.es_log("process-index", {"value": 2})


def test_get_ip_variants(utils_module):
    module, _logger = utils_module

    assert module.get_ip("ipv4:203.0.113.10:5000") == "203.0.113.10"
    assert module.get_ip("ipv6:%5B2001:db8::1%5D:7000") == "2001:db8::1"
    assert module.get_ip("peer") == "unknown"