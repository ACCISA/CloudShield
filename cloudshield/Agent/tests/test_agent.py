import importlib
import sys
import pathlib


def _repo_root():
    return pathlib.Path(__file__).parents[3]


def test_register_task_adds_task():
    # Ensure repo root is on sys.path so package imports work
    repo = str(_repo_root())
    if repo not in sys.path:
        sys.path.insert(0, repo)

    # Import as a proper package
    agent_mod = importlib.import_module("cloudshield.Agent.core.agent")

    class DummyTask:
        def __init__(self):
            self.run = lambda: "ok"

    ag = agent_mod.Agent("agent1", "localhost", 1234)
    d = DummyTask()
    ag.register_task("dummy", d, 2)

    assert len(ag.tasks) == 1
    assert ag.tasks[0]["task_name"] == "dummy"
