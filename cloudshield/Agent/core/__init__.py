from .agent import Agent as Agent
from .logging_setup import logger as logger

__all__ = ["Agent", "logger"]

import sys

# Make sure `import core` resolves when the package is frozen or executed as a script.
sys.modules.setdefault("core", sys.modules[__name__])
