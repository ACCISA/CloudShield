import os
import sys
import types
import unittest.mock
import pytest

TEST_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if TEST_ROOT not in sys.path:
    sys.path.insert(0, TEST_ROOT)

# ...existing code...
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

# Provide common redis exceptions and aliases (add more as needed)
class _WatchError(Exception):
    pass

class _RedisError(Exception):
    pass

class _ConnectionError(Exception):
    pass

# Export exceptions at module level so `from redis import WatchError` works
_fake_redis.WatchError = _WatchError
_fake_redis.RedisError = _RedisError
_fake_redis.ConnectionError = _ConnectionError

# client submodule
_client_mod = types.ModuleType("redis.client")
setattr(_client_mod, "Redis", DummyRedis)
setattr(_client_mod, "StrictRedis", DummyRedis)
sys.modules["redis.client"] = _client_mod
_fake_redis.client = _client_mod

# exceptions submodule for `redis.exceptions`
_ex_mod = types.ModuleType("redis.exceptions")
_ex_mod.WatchError = _WatchError
_ex_mod.RedisError = _RedisError
_ex_mod.ConnectionError = _ConnectionError
sys.modules["redis.exceptions"] = _ex_mod

# Install the fake redis module
sys.modules["redis"] = _fake_redis

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
    Because sys.modules was patched at import-time above, any module that does
    `import redis` (or `from redis import WatchError`) will get the fake symbols.
    """
    yield _redis_mock_client
# ...existing code...
_mock_crypto = unittest.mock.MagicMock()

# 1. Base Paths
sys.modules["cryptography"] = _mock_crypto
sys.modules["cryptography.hazmat"] = _mock_crypto
sys.modules["cryptography.hazmat.bindings"] = _mock_crypto
sys.modules["cryptography.hazmat.bindings._rust"] = _mock_crypto

# *** ADD THIS LINE FOR THE NEW ERROR ***
sys.modules["cryptography.hazmat.backends"] = _mock_crypto 

# 2. Primitives & Submodules
sys.modules["cryptography.hazmat.primitives"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.serialization"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.hashes"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.asymmetric"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.asymmetric.rsa"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.asymmetric.ed25519"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.kdf"] = _mock_crypto
sys.modules["cryptography.hazmat.primitives.kdf.scrypt"] = _mock_crypto

# 3. Conflicting Libraries
sys.modules["bcrypt"] = _mock_crypto
sys.modules["paramiko"] = _mock_crypto