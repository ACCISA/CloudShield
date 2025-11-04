from __future__ import annotations

import importlib
import sys

from .bootstrap import CallBootstrapTask as CallBootstrapTask
from .processes import GetProcessListTask as GetProcessListTask
from .task import BaseTask as BaseTask
from .domain_dns import DomainDnsCheckTask as DomainDnsCheckTask
from .workstation import EnsureDomainMembershipTask as EnsureDomainMembershipTask
from .network import NetworkListingTask as NetworkListingTask

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

# Provide module-level aliases (e.g. ``import task``) for legacy consumers.
for _alias, _target in {
	"task": ".task",
	"domain_dns": ".domain_dns",
	"workstation": ".workstation",
	"network": ".network",
}.items():
	module = importlib.import_module(_target, __name__)
	sys.modules.setdefault(_alias, module)
