"""Generated gRPC modules for the CloudShield Agent."""

from __future__ import annotations

import importlib
import importlib.metadata
import sys
from types import ModuleType

import grpc

try:
    # grpc 1.75 dropped ``__version__``; provide a stable fallback so generated
    # stubs keep working without pinning an older release.
    grpc.__version__  # type: ignore[attr-defined]
except AttributeError:
    try:
        grpc.__version__ = importlib.metadata.version("grpcio")  # type: ignore[attr-defined]
    except importlib.metadata.PackageNotFoundError:
        grpc.__version__ = "0.0.0"  # type: ignore[attr-defined]

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
