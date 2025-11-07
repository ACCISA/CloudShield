import importlib
import importlib.util
import sys
from pathlib import Path
from types import ModuleType
def test_calculate_base_dir_prefers_meipass(monkeypatch):
    module = importlib.import_module("cloudshield.Agent.main")
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(Path("C:/tmp/meipass")), raising=False)
    assert module._calculate_base_dir() == Path("C:/tmp/meipass")


def test_module_inserts_base_dir_when_missing(monkeypatch):
    module = importlib.import_module("cloudshield.Agent.main")
    monkeypatch.setattr(sys, "path", [p for p in sys.path if p != str(module.BASE_DIR)])
    reloaded = importlib.reload(module)
    assert str(reloaded.BASE_DIR) in sys.path
    assert sys.path[0] == str(reloaded.BASE_DIR)


def test_main_import_fallback_to_top_level(monkeypatch):
    main_path = Path(__file__).resolve().parent.parent / "main.py"

    fake_core = ModuleType("core")

    class FakeAgent:  # pragma: no cover - simple stub
        pass

    fake_core.Agent = FakeAgent

    fake_tasks = ModuleType("tasks")

    class _Stub:
        def __init__(self, *_, **__):
            pass

    fake_tasks.CallBootstrapTask = _Stub
    fake_tasks.DomainDnsCheckTask = _Stub
    fake_tasks.EnsureDomainMembershipTask = _Stub
    fake_tasks.GetProcessListTask = _Stub
    fake_tasks.NetworkListingTask = _Stub

    monkeypatch.setitem(sys.modules, "core", fake_core)
    monkeypatch.setitem(sys.modules, "tasks", fake_tasks)
    monkeypatch.setattr(sys, "path", list(sys.path))

    spec = importlib.util.spec_from_file_location("standalone_agent_main", main_path)
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, "standalone_agent_main", module)
    spec.loader.exec_module(module)  # type: ignore[union-attr]

    assert module.Agent is FakeAgent
    assert module.CallBootstrapTask is _Stub


def test_resolve_config_path_defaults_to_base_dir(monkeypatch):
    module = importlib.import_module("cloudshield.Agent.main")
    monkeypatch.delenv("CLOUDSHIELD_AGENT_CONFIG", raising=False)
    expected = Path(module.BASE_DIR) / "config" / "agent_config.json"
    assert module.resolve_config_path() == str(expected)



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
    cache_path = Path(module.resolve_cache_path())
    created["init"]["cache_path"] = str(cache_path)
    assert cache_path == expected_cache
    assert created["init"]["agent_id"] == "agent-1"
    assert created["init"]["server_addr"] == "127.0.0.1"
    assert created["init"]["port"] == 50051


def test_resolve_cache_path_uses_home_when_programdata_missing(monkeypatch, tmp_path):
    module, _ = _prepare_fakes(monkeypatch, tmp_path, program_data=None)

    fake_home = tmp_path / "home"
    monkeypatch.setattr(module.Path, "home", lambda: fake_home)

    path = module.resolve_cache_path()
    expected = fake_home / ".cloudshield" / "agent"
    assert Path(path) == expected
    assert expected.is_dir()


def test_main_executes_and_registers_tasks(monkeypatch, tmp_path):
    import runpy

    created = {"registered": []}

    class FakeAgent:
        def __init__(self, agent_id, server_addr, port, cache_path):
            created["init"] = {
                "agent_id": agent_id,
                "server_addr": server_addr,
                "port": port,
                "cache_path": cache_path,
            }
            self.state = {"cache_path": cache_path}
        def register_task(self, name, task, interval=5, run_once=False, run_immediately=False):
            created["registered"].append({
                "name": name,
                "interval": interval,
                "run_once": run_once,
                "run_immediately": run_immediately,
                "task": task,
            })
        def start_core(self):
            created["started"] = True

    class FakeCallBootstrapTask:
        def __init__(self, state):
            self.state = state

    class FakeDomainDnsCheckTask:
        def __init__(self, state, config_path=None):
            self.state = state
            self.config_path = config_path
            created.setdefault("domain_task_configs", []).append(config_path)

    class FakeEnsureDomainMembershipTask:
        def __init__(self, state, config_path=None):
            self.state = state
            self.config_path = config_path
            created.setdefault("ensure_task_configs", []).append(config_path)

    class FakeGetProcessListTask:
        def __init__(self, state):
            self.state = state

    class FakeNetworkListingTask:
        def __init__(self, state):
            self.state = state

    fake_core = ModuleType("core")
    fake_core.Agent = FakeAgent

    fake_tasks = ModuleType("tasks")
    fake_tasks.CallBootstrapTask = FakeCallBootstrapTask
    fake_tasks.DomainDnsCheckTask = FakeDomainDnsCheckTask
    fake_tasks.EnsureDomainMembershipTask = FakeEnsureDomainMembershipTask
    fake_tasks.GetProcessListTask = FakeGetProcessListTask
    fake_tasks.NetworkListingTask = FakeNetworkListingTask

    monkeypatch.delitem(sys.modules, "core", raising=False)
    monkeypatch.delitem(sys.modules, "tasks", raising=False)
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.core", raising=False)
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.tasks", raising=False)
    monkeypatch.delitem(sys.modules, "cloudshield.Agent.main", raising=False)

    monkeypatch.setitem(sys.modules, "core", fake_core)
    monkeypatch.setitem(sys.modules, "tasks", fake_tasks)
    monkeypatch.setitem(sys.modules, "cloudshield.Agent.core", fake_core)
    monkeypatch.setitem(sys.modules, "cloudshield.Agent.tasks", fake_tasks)

    program_root = tmp_path / "ProgramData"
    monkeypatch.setenv("PROGRAMDATA", str(program_root))
    cfg_path = tmp_path / "cfg.json"
    monkeypatch.setenv("CLOUDSHIELD_AGENT_CONFIG", str(cfg_path))
    monkeypatch.setenv("AGENT_ID", "agent-x")
    monkeypatch.setenv("SERVER_ADDR", "10.1.2.3")
    monkeypatch.setenv("SERVER_PORT", "60000")

    runpy.run_module("cloudshield.Agent.main", run_name="__main__")

    expected_cache = program_root / "CloudShield" / "Agent"
    assert Path(created["init"]["cache_path"]) == expected_cache
    assert expected_cache.is_dir()
    assert created["init"]["agent_id"] == "agent-x"
    assert created["init"]["server_addr"] == "10.1.2.3"
    assert created["init"]["port"] == 60000

    assert created["started"] is True

    names = [r["name"] for r in created["registered"]]
    assert names == [
        "ensure_domain_membership",
        "bootstrap_check",
        "get_process_list",
        "domain_dns_check",
        "network_list",
    ]

    process_task = next(r for r in created["registered"] if r["name"] == "get_process_list")
    assert process_task["interval"] == 5
    assert process_task["run_once"] is False

    ensure_task = next(r for r in created["registered"] if r["name"] == "ensure_domain_membership")
    assert ensure_task["run_once"] is True

    domain_task = next(r for r in created["registered"] if r["name"] == "domain_dns_check")
    assert domain_task["interval"] == 300
    assert domain_task["run_immediately"] is True

    assert created["ensure_task_configs"][0] == str(cfg_path)
    assert created["domain_task_configs"][0] == str(cfg_path)
