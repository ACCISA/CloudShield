"""Generated gRPC modules for the CloudShield Agent."""

from __future__ import annotations

import sys

__all__ = [
    "agent_pb2",
    "agent_pb2_grpc",
]

# Maintain compatibility with code/tests that expect a top-level ``proto`` package.
sys.modules.setdefault("proto", sys.modules[__name__])
