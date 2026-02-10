from __future__ import annotations

from typing import Any

__all__ = [
	"api_bp",
	"users_bp",
	"users_read_bp",
	"auth_bp",
    "access_groups_bp", 
	"workstations_bp",
	"activity_bp",
]


def __getattr__(name: str) -> Any:
	if name == "api_bp":
		from .api import api_bp as _api_bp

		return _api_bp

	if name == "users_bp":
		from .users import users_bp as _users_bp

		return _users_bp

	if name == "users_read_bp":
		from .users_read import users_read_bp as _users_read_bp

		return _users_read_bp

	if name == "auth_bp":
		from .auth import auth_bp as _auth_bp

		return _auth_bp

	if name == "access_groups_bp":
		from .access_groups import access_groups_bp as _access_groups_bp

		return _access_groups_bp

	if name == "workstations_bp":
		from .workstations import workstations_bp as _workstations_bp

		return _workstations_bp
	
	if name == "activity_bp":
		from .activity import activity_bp as _activity_bp

		return _activity_bp

	raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
