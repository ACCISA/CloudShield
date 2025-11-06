"""Generated gRPC modules for the CloudShield Agent."""
from proto import agent_pb2, agent_pb2_grpc

from __future__ import annotations

import importlib
import sys
from types import ModuleType

__all__ = [
    "agent_pb2",
    "agent_pb2_grpc",
]


def _load_and_alias(module_name: str) -> ModuleType:
    """Load submodule and expose it via both package and top-level names."""
    full_name = f"{__name__}.{module_name}"
    module = importlib.import_module(full_name)
    sys.modules.setdefault(module_name, module)
    return module


# Maintain compatibility with code/tests that expect a top-level ``proto`` package
# or modules like ``agent_pb2`` rooted at sys.path.
sys.modules.setdefault("proto", sys.modules[__name__])

agent_pb2 = _load_and_alias("agent_pb2")
agent_pb2_grpc = _load_and_alias("agent_pb2_grpc")
