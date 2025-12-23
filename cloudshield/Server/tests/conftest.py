import sys
import types
import unittest.mock
import pytest

# Only install fake redis if real redis is not available
# This allows tests to run in CI where real redis is installed
_use_fake_redis = False
try:
    # Check if real redis is available and has needed symbols that rq requires
    import redis  # noqa: F401
    from redis import WatchError, Redis, ConnectionPool  # noqa: F401
    from redis.exceptions import ResponseError, RedisError, ConnectionError  # noqa: F401
    from redis.client import Pipeline  # noqa: F401
except (ImportError, AttributeError, ModuleNotFoundError):
    _use_fake_redis = True

if _use_fake_redis:
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

    class DummyConnectionPool:
        def __init__(self, *args, **kwargs):
            pass

    _fake_redis.Redis = DummyRedis
    _fake_redis.StrictRedis = DummyRedis
    _fake_redis.ConnectionPool = DummyConnectionPool

    # Provide common redis exceptions and aliases
    class _WatchError(Exception):
        pass

    class _RedisError(Exception):
        pass

    class _ConnectionError(Exception):
        pass

    class _ResponseError(Exception):
        pass

    # Export exceptions at module level
    _fake_redis.WatchError = _WatchError
    _fake_redis.RedisError = _RedisError
    _fake_redis.ConnectionError = _ConnectionError
    _fake_redis.ResponseError = _ResponseError

    # client submodule
    _client_mod = types.ModuleType("redis.client")
    setattr(_client_mod, "Redis", DummyRedis)
    setattr(_client_mod, "StrictRedis", DummyRedis)
    setattr(_client_mod, "Pipeline", unittest.mock.MagicMock)
    sys.modules["redis.client"] = _client_mod
    _fake_redis.client = _client_mod

    # exceptions submodule
    _ex_mod = types.ModuleType("redis.exceptions")
    _ex_mod.WatchError = _WatchError
    _ex_mod.RedisError = _RedisError
    _ex_mod.ConnectionError = _ConnectionError
    _ex_mod.ResponseError = _ResponseError
    sys.modules["redis.exceptions"] = _ex_mod

    # Install the fake redis module
    sys.modules["redis"] = _fake_redis

# Create a mock client for tests that want to verify redis calls
_redis_mock_client = unittest.mock.MagicMock(name="redis_client")
_redis_mock_client.get.return_value = None
_redis_mock_client.set.return_value = True
_redis_mock_client.ping.return_value = True

@pytest.fixture(autouse=True)
def redis_mock_fixture():
    """
    Autouse fixture that yields the mock client for tests to assert calls.
    """
    yield _redis_mock_client
