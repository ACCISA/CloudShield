import importlib
import sys
from .processes import GetProcessListTask as GetProcessListTask
from .bootstrap import CallBootstrapTask as CallBootstrapTask
from .task import BaseTask as BaseTask

# Expose this package as top-level 'tasks' so legacy imports keep working.
sys.modules.setdefault("tasks", sys.modules[__name__])


__all__ = ["BaseTask", "GetProcessListTask"]


def __getattr__(name):
	if name == "GetProcessListTask":
		module = importlib.import_module(".processes", __name__)
		value = getattr(module, name)
		globals()[name] = value
		return value
	raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
