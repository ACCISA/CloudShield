import sys

from .task import BaseTask as BaseTask

# Expose this package as top-level 'tasks' so legacy imports keep working.
sys.modules.setdefault("tasks", sys.modules[__name__])

from .processes import GetProcessListTask as GetProcessListTask

__all__ = ["BaseTask", "GetProcessListTask"]
