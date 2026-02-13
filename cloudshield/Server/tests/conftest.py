import os
import sys
import types
import unittest.mock
import pytest

TEST_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if TEST_ROOT not in sys.path:
    sys.path.insert(0, TEST_ROOT)

# --- REDIS MOCKING ---
_redis_mock_client = unittest.mock.MagicMock(name="redis_client")
_redis_mock_client.get.return_value = None
_redis_mock_client.set.return_value = True
_redis_mock_client.ping.return_value = True

_fake_redis = types.ModuleType("redis")

class DummyRedis:
    def __init__(self, *args, **kwargs):
        self._client = _redis_mock_client
    def __getattr__(self, name):
        return getattr(self._client, name)

_fake_redis.Redis = DummyRedis
_fake_redis.StrictRedis = DummyRedis

class _WatchError(Exception):
    pass

class _RedisError(Exception):
    pass

class _ConnectionError(Exception):
    pass

_fake_redis.WatchError = _WatchError
_fake_redis.RedisError = _RedisError
_fake_redis.ConnectionError = _ConnectionError

_client_mod = types.ModuleType("redis.client")
setattr(_client_mod, "Redis", DummyRedis)
setattr(_client_mod, "StrictRedis", DummyRedis)
sys.modules["redis.client"] = _client_mod
_fake_redis.client = _client_mod

_ex_mod = types.ModuleType("redis.exceptions")
_ex_mod.WatchError = _WatchError
_ex_mod.RedisError = _RedisError
_ex_mod.ConnectionError = _ConnectionError
sys.modules["redis.exceptions"] = _ex_mod

sys.modules["redis"] = _fake_redis

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

# --- CONDITIONAL CRYPTOGRAPHY & BCRYPT MOCKING ---
# This bypasses the Rust/PyO3 crash on local machines but allows CI to run real security tests.
try:
    import cryptography
    import bcrypt
    import paramiko
    # If the environment is healthy (like CI), these will load fine.
except (ImportError, RuntimeError):
    # If loading fails (like the Rust conflict on local), we neutralize them.
    _mock_sym = unittest.mock.MagicMock()
    
    modules_to_mock = [
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
        "bcrypt",
        "paramiko"
    ]
    
    for mod in modules_to_mock:
        sys.modules[mod] = _mock_sym