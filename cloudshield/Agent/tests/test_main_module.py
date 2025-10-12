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

        def register_task(self, name, task, interval):
            self.registered.append((name, task, interval))
            created["task_call"] = {
                "name": name,
                "interval": interval,
                "task_state": getattr(task, "state", None),
            }

        def start_core(self):
            self.started = True
            created["started"] = True

    class FakeGetProcessListTask:
        def __init__(self, state):
            self.state = state

    fake_core = ModuleType("core")
    fake_core.Agent = FakeAgent
    fake_tasks = ModuleType("tasks")
    fake_tasks.GetProcessListTask = FakeGetProcessListTask

    monkeypatch.setitem(sys.modules, "core", fake_core)
    monkeypatch.setitem(sys.modules, "tasks", fake_tasks)

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
    assert Path(created["init"]["cache_path"]) == expected_cache
    assert created["init"]["agent_id"] == "agent-1"
    assert created["init"]["server_addr"] == "127.0.0.1"
    assert created["init"]["port"] == 50051

    assert created["started"] is True
    assert created["task_call"]["name"] == "get_process_list"
    assert created["task_call"]["interval"] == 5
    assert created["task_call"]["task_state"] == created["instance"].state
    assert expected_cache.is_dir()


def test_resolve_cache_path_uses_home_when_programdata_missing(monkeypatch, tmp_path):
    module, _ = _prepare_fakes(monkeypatch, tmp_path, program_data=None)

    fake_home = tmp_path / "home"
    monkeypatch.setattr(module.Path, "home", lambda: fake_home)

    path = module.resolve_cache_path()
    expected = fake_home / ".cloudshield" / "agent"
    assert Path(path) == expected
    assert expected.is_dir()