import os
import sys
import types
import unittest.mock
import pytest

TEST_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if TEST_ROOT not in sys.path:
    sys.path.insert(0, TEST_ROOT)

# ---------------------------------------------------------------------------
# Redis mock: keep the *real* redis package in sys.modules so that libraries
# like ``rq`` can import its internal classes (Pipeline, ConnectionPool, etc.)
# but monkey-patch the constructors so no actual TCP connection is attempted.
# ---------------------------------------------------------------------------
import redis as _real_redis  # noqa: E402 (must come after sys.path setup)

_redis_mock_client = unittest.mock.MagicMock(name="redis_client")
_redis_mock_client.get.return_value = None
_redis_mock_client.set.return_value = True
_redis_mock_client.ping.return_value = True


class DummyRedis:
    """Drop-in replacement that proxies every call to *_redis_mock_client*."""
    def __init__(self, *args, **kwargs):
        self._client = _redis_mock_client
    def __getattr__(self, name):
        return getattr(self._client, name)


# Patch the constructors on the *real* module so any ``redis.Redis(...)`` call
# returns a DummyRedis and no socket is opened.
_real_redis.Redis = DummyRedis          # type: ignore[attr-defined]
_real_redis.StrictRedis = DummyRedis    # type: ignore[attr-defined]

# --- FLASK CORS MOCKING ---
_fake_flask_cors = types.ModuleType("flask_cors")

class CORS:
    def __init__(self, *args, **kwargs):
        pass

_fake_flask_cors.CORS = CORS
sys.modules["flask_cors"] = _fake_flask_cors

@pytest.fixture(autouse=True)
def redis_mock_fixture():
    """
    Autouse fixture that yields the mock client for tests to assert calls.
    """
    yield _redis_mock_client
_missing_modules = set()
for _mod in ("cryptography", "bcrypt", "paramiko"):
    try:
        __import__(_mod)
    except (ImportError, RuntimeError):
        _missing_modules.add(_mod)

if _missing_modules:
    _mock_sym = unittest.mock.MagicMock()

    modules_to_mock = []
    if "cryptography" in _missing_modules:
        modules_to_mock.extend([
            "cryptography",
            "cryptography.hazmat",
            "cryptography.hazmat.bindings",
            "cryptography.hazmat.bindings._rust",
            "cryptography.hazmat.backends",
            "cryptography.hazmat.primitives",
            "cryptography.hazmat.primitives.serialization",
            "cryptography.hazmat.primitives.hashes",
            "cryptography.hazmat.primitives.asymmetric",
            "cryptography.hazmat.primitives.asymmetric.rsa",
            "cryptography.hazmat.primitives.asymmetric.ed25519",
            "cryptography.hazmat.primitives.kdf",
            "cryptography.hazmat.primitives.kdf.scrypt",
        ])
    if "bcrypt" in _missing_modules:
        modules_to_mock.append("bcrypt")
    if "paramiko" in _missing_modules:
        modules_to_mock.append("paramiko")

    for mod in modules_to_mock:
        sys.modules[mod] = _mock_sym