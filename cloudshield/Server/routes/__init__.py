try:
    from .api import api_bp as api_bp  # noqa: F401
except ImportError:  # pragma: no cover - happens in tests with partial mocks
    api_bp = None  # type: ignore[assignment]

# Auth blueprint – tests depend on this one
try:
    from .auth import auth_bp as auth_bp  # noqa: F401
except ImportError:  # pragma: no cover - should not happen in normal runs
    auth_bp = None  # type: ignore[assignment]

# Users management blueprint
try:
    from .users import users_bp as users_bp  # noqa: F401
except ImportError:  # pragma: no cover - e.g. when deep imports fail under mocks
    users_bp = None  # type: ignore[assignment]

# Read-only users blueprint
try:
    from .users_read import users_read_bp as users_read_bp  # noqa: F401
except ImportError:  # pragma: no cover
    users_read_bp = None  # type: ignore[assignment]