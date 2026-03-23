from __future__ import annotations

from typing import Any

from .guards import require_auth as require_auth
from .guards import require_role as require_role

__all__ = [
	"require_auth",
	"require_role",
	"hash_password",
	"is_bcrypt_string",
	"verify_token",
]


def __getattr__(name: str) -> Any:
	if name == "hash_password":
		from .passwords import hash_password as _hash_password

		return _hash_password

	if name == "is_bcrypt_string":
		from .passwords import is_bcrypt_string as _is_bcrypt_string

		return _is_bcrypt_string

	if name == "verify_token":
		from .jwt_utils import verify_token as _verify_token

		return _verify_token

	raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
