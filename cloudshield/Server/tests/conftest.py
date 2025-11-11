import sys
import types
import unittest.mock
import pytest

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

@pytest.fixture(autouse=True)
def redis_mock_fixture():
    """
    Autouse fixture that yields the mock client for tests to assert calls.
    Because sys.modules was patched at import-time above, any module that does
    `import redis` (or `from redis import WatchError`) will get the fake symbols.
    """
    yield _redis_mock_client
# ...existing code...
