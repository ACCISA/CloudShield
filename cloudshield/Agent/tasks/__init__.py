import importlib
import sys
from typing import Any

from .task import BaseTask

__all__ = ["BaseTask", "CallBootstrapTask", "GetProcessListTask"]

# Preserve legacy alias so "import tasks" resolves to this module.
sys.modules.setdefault("tasks", sys.modules[__name__])

# Lazy-load implementations that depend on the legacy alias to avoid circular imports.
_LAZY_ATTRS = {
	"CallBootstrapTask": ".bootstrap",
	"GetProcessListTask": ".processes",
}


def __getattr__(name: str) -> Any:
	if name not in _LAZY_ATTRS:
		raise AttributeError(name)

	module = importlib.import_module(f"{__name__}{_LAZY_ATTRS[name]}")
	value = getattr(module, name)
	globals()[name] = value
	return value


def __dir__():
	return sorted(set(globals()) | set(__all__))
