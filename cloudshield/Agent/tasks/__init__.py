import importlib
import sys

from .task import BaseTask as BaseTask

# Expose this package as top-level 'tasks' so legacy imports keep working.
sys.modules.setdefault("tasks", sys.modules[__name__])

__all__ = ["BaseTask", "GetProcessListTask", "DomainDnsCheckTask"]


def __getattr__(name):
	if name == "GetProcessListTask":
		module = importlib.import_module(".processes", __name__)
		value = getattr(module, name)
		globals()[name] = value
		return value
	if name == "DomainDnsCheckTask":
		module = importlib.import_module(".domain_dns", __name__)
		value = getattr(module, name)
		globals()[name] = value
		return value
	raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
