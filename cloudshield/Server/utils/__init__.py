"""Utility package.

This module intentionally avoids importing submodules eagerly.

Some submodules (notably database connections) perform I/O at import time.
Keeping this package lightweight improves startup time and makes unit tests
possible without requiring external services.
"""

from __future__ import annotations

import importlib
from typing import Any


_EXPORTS: dict[str, tuple[str, str]] = {
    "get_logger": (".logging_setup", "get_logger"),
    "derive_username": (".usernames", "derive_username"),
    "cleanup_old_logs": (".logging_setup", "cleanup_old_logs"),
    "task_queue": (".redis_client", "task_queue"),
    "workstations_queue": (".redis_client", "workstations_queue"),
    "redis_conn": (".redis_client", "redis_conn"),
    "update_job": (".job_status", "update_job"),

    # Database / collections
    "users_admin": (".database", "users_admin"),
    "users_public": (".database", "users_public"),
    "organizations": (".database", "organizations"),
    "access_groups": (".database", "access_groups"),
    "shares": (".database", "shares"),
    "vpn_configs": (".database", "vpn_configs"),
    "db_admin": (".database", "db_admin"),
    "db": (".database", "db"),
    "get_inventory_from_org_id": (".database", "get_inventory_from_org_id"),
    "org_filter": (".database", "org_filter"),

    # Audit
    "log_audit": (".audit", "log_audit"),
    "audit_bp": (".audit", "audit_bp"),

    # Progress
    "set_progress": (".progress", "set_progress"),
    "get_job_id_fallback": (".progress", "get_job_id_fallback"),

    # Shell / Terraform
    "run_stream": (".shell", "run_stream"),
    "get_workstation_count": (".terraform", "get_workstation_count"),
}


def __getattr__(name: str) -> Any:  # pragma: no cover
    if name == "redis_client":
        module = importlib.import_module(".redis_client", __name__)
        globals()[name] = module
        return module

    if name not in _EXPORTS:
        raise AttributeError(name)

    module_name, attr_name = _EXPORTS[name]
    module = importlib.import_module(module_name, __name__)
    value = getattr(module, attr_name)
    globals()[name] = value
    return value


def __dir__() -> list[str]:  # pragma: no cover
    return sorted(list(globals().keys()) + list(_EXPORTS.keys()))


__all__ = list(_EXPORTS.keys())
