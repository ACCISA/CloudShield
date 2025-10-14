from __future__ import annotations

import importlib
import sys

from .bootstrap import CallBootstrapTask as CallBootstrapTask
from .processes import GetProcessListTask as GetProcessListTask
from .task import BaseTask as BaseTask

__all__ = [
	"BaseTask",
	"GetProcessListTask",
	"CallBootstrapTask",
	"DomainDnsCheckTask",
	"EnsureDomainMembershipTask",
	"NetworkListingTask",
]

# Expose this package as top-level 'tasks' so legacy imports keep working.
sys.modules.setdefault("tasks", sys.modules[__name__])


def __getattr__(name: str):
	if name == "DomainDnsCheckTask":
		module = importlib.import_module(".domain_dns", __name__)
	elif name == "EnsureDomainMembershipTask":
		module = importlib.import_module(".workstation", __name__)
	elif name == "NetworkListingTask":
		module = importlib.import_module(".network", __name__)
	else:
		raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

	value = getattr(module, name)
	globals()[name] = value
	return value
