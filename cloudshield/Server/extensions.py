"""Shared Flask extensions — initialized here, wired to the app in create_app()."""
import os

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def _storage_uri() -> str:
    """Return a rate-limit storage URI.

    Uses in-memory storage when FLASK_TESTING=1 (unit tests) or when no Redis
    env var is set AND the default redis host is unreachable.  Falls back to
    Redis otherwise.
    """
    if os.getenv("FLASK_TESTING") in {"1", "true", "TRUE"}:
        return "memory://"

    url = os.getenv("CLOUDSHIELD_REDIS_URL") or os.getenv("REDIS_URL")
    if url:
        return url
    host = os.getenv("CLOUDSHIELD_REDIS_HOST") or os.getenv("REDIS_HOST", "redis")
    port = os.getenv("CLOUDSHIELD_REDIS_PORT") or os.getenv("REDIS_PORT", "6379")
    db   = os.getenv("CLOUDSHIELD_REDIS_DB")   or os.getenv("REDIS_DB", "0")
    return f"redis://{host}:{port}/{db}"


_testing = os.getenv("FLASK_TESTING") in {"1", "true", "TRUE"}

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[] if _testing else ["200 per minute", "1000 per hour"],
    storage_uri=_storage_uri(),
    storage_options={"socket_connect_timeout": 2},
    enabled=not _testing,
)
