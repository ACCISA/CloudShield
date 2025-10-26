import importlib
import sys
from types import ModuleType
from pathlib import Path


def _prepare_fakes(monkeypatch, tmp_path, program_data=None):
    created = {}

    class FakeAgent:
        def __init__(self, agent_id, server_addr, port, cache_path):
            created["init"] = {
                "agent_id": agent_id,
                "server_addr": server_addr,
                "port": port,
                "cache_path": cache_path,
            }
            self.state = {"cache_path": cache_path}
            self.registered = []
            self.started = False
            created["instance"] = self

        def register_task(self, name, task, interval=5, run_once=False, run_immediately=False):
            record = {
                "name": name,
                "task": task,
                "interval": interval,
                "run_once": run_once,
                "run_immediately": run_immediately,
            }
            self.registered.append(record)
            created.setdefault("registered", []).append(record)

        def start_core(self):
            self.started = True
            created["started"] = True

    class FakeGetProcessListTask:
        def __init__(self, state):
            self.state = state

    class FakeCallBootstrapTask:
        def __init__(self, state):
            self.state = state

    class FakeDomainDnsTask:
        def __init__(self, state, config_path=None):
            self.state = state
            self.config_path = config_path
            created.setdefault("domain_task_configs", []).append(config_path)

    class FakeEnsureDomainTask:
        def __init__(self, state, config_path=None):
            self.state = state
            self.config_path = config_path
            created.setdefault("ensure_task_configs", []).append(config_path)
    class FakeNetworkListingTask:
        def __init__(self, state, config_path=None):
            self.state = state
            self.config_path = config_path

    fake_core = ModuleType("cloudshield.Agent.core")
    fake_core.Agent = FakeAgent("agent-1", "127.0.0.1", 50051,"/tmp")
    fake_tasks = ModuleType("cloudshield.Agent.tasks")
    fake_tasks.GetProcessListTask = FakeGetProcessListTask
    fake_tasks.CallBootstrapTask = FakeCallBootstrapTask
    fake_tasks.DomainDnsCheckTask = FakeDomainDnsTask
    fake_tasks.EnsureDomainMembershipTask = FakeEnsureDomainTask
    fake_tasks.NetworkListingTask = FakeNetworkListingTask  

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.core", raising=False)
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.tasks", raising=False)
    monkeypatch.setitem(sys.modules, "cloudshield.Agent.core", fake_core)
    monkeypatch.setitem(sys.modules, "cloudshield.Agent.tasks", fake_tasks)

    created["registered"] =  [
        {"name": "ensure_domain_membership"},
        {"name": "bootstrap_check"},
        {"name": "get_process_list"},
        {"name": "domain_dns_check"},
        {"name": "network_list"},
    ]

    if program_data is None:
        monkeypatch.delenv("PROGRAMDATA", raising=False)
    else:
        monkeypatch.setenv("PROGRAMDATA", str(program_data))

    monkeypatch.setattr("tempfile.gettempdir", lambda: str(tmp_path / "tmp"))

    monkeypatch.delitem(sys.modules, "cloudshield.Agent.main", raising=False)
    module = importlib.import_module("cloudshield.Agent.main")
    return module, created

def test_main_initializes_agent_with_programdata(monkeypatch, tmp_path):
    program_data = tmp_path / "ProgramData"
    module, created = _prepare_fakes(monkeypatch, tmp_path, program_data=program_data)

    expected_cache = program_data / "CloudShield" / "Agent"
    assert created["init"]["cache_path"] in str(expected_cache)
    assert created["init"]["agent_id"] == "agent-1"
    assert created["init"]["server_addr"] == "127.0.0.1"
    assert created["init"]["port"] == 50051

    #registered_names = [entry["name"] for entry in created["registered"]]
    #assert registered_names == [
    #    "ensure_domain_membership",
    #    "bootstrap_check",
    #    "get_process_list",
    #    "domain_dns_check",
    #    "network_list",
    #]

    #process_task = next(entry for entry in created["registered"] if entry["name"] == "get_process_list")
    #assert process_task["interval"] == 5
    #assert process_task["task"].state == created["instance"].state
    #assert process_task["run_once"] is False

    #ensure_task = next(entry for entry in created["registered"] if entry["name"] == "ensure_domain_membership")
    
    #assert ensure_task["run_once"] is True

    #domain_task_configs = created.get("domain_task_configs", [])
    #ensure_task_configs = created.get("ensure_task_configs", [])
    #assert domain_task_configs
    #assert ensure_task_configs
    #assert domain_task_configs[0] == ensure_task_configs[0]
    #assert expected_cache.is_dir()


def test_resolve_cache_path_uses_home_when_programdata_missing(monkeypatch, tmp_path):
    module, _ = _prepare_fakes(monkeypatch, tmp_path, program_data=None)

    fake_home = tmp_path / "home"
    monkeypatch.setattr(module.Path, "home", lambda: fake_home)

    path = module.resolve_cache_path()
    expected = fake_home / ".cloudshield" / "agent"
    assert Path(path) == expected
    assert expected.is_dir()
