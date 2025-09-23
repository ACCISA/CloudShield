import importlib.util
import pathlib


def _load_module(path_parts, name="mod"):
    path = pathlib.Path(__file__).parents[2].joinpath(*path_parts)
    spec = importlib.util.spec_from_file_location(name, str(path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_register_task_adds_task():
    agent_mod = _load_module(["cloudshield", "Agent", "core", "agent.py"], "agent_mod")

    class DummyTask:
        def __init__(self):
            self.run = lambda: "ok"

    ag = agent_mod.Agent("agent1", "localhost", 1234)
    d = DummyTask()
    ag.register_task("dummy", d, 2)

    assert len(ag.tasks) == 1
    assert ag.tasks[0]["task_name"] == "dummy"
