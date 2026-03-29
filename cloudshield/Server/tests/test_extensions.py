"""Tests for cloudshield/Server/extensions.py — _storage_uri() branches."""

# Import the function once; test its logic by mocking os.getenv in-place.
from cloudshield.Server.extensions import _storage_uri, _testing, limiter


class TestStorageUri:
    def test_flask_testing_1_returns_memory(self, monkeypatch):
        monkeypatch.setenv("FLASK_TESTING", "1")
        assert _storage_uri() == "memory://"

    def test_flask_testing_true_returns_memory(self, monkeypatch):
        monkeypatch.setenv("FLASK_TESTING", "true")
        assert _storage_uri() == "memory://"

    def test_flask_testing_uppercase_true_returns_memory(self, monkeypatch):
        monkeypatch.setenv("FLASK_TESTING", "TRUE")
        assert _storage_uri() == "memory://"

    def test_cloudshield_redis_url_takes_precedence(self, monkeypatch):
        monkeypatch.delenv("FLASK_TESTING", raising=False)
        monkeypatch.setenv("CLOUDSHIELD_REDIS_URL", "redis://custom-host:1234/2")
        monkeypatch.delenv("REDIS_URL", raising=False)
        assert _storage_uri() == "redis://custom-host:1234/2"

    def test_redis_url_fallback(self, monkeypatch):
        monkeypatch.delenv("FLASK_TESTING", raising=False)
        monkeypatch.delenv("CLOUDSHIELD_REDIS_URL", raising=False)
        monkeypatch.setenv("REDIS_URL", "redis://fallback-host:6380/1")
        assert _storage_uri() == "redis://fallback-host:6380/1"

    def test_builds_uri_from_cloudshield_host_port_db(self, monkeypatch):
        monkeypatch.delenv("FLASK_TESTING", raising=False)
        monkeypatch.delenv("CLOUDSHIELD_REDIS_URL", raising=False)
        monkeypatch.delenv("REDIS_URL", raising=False)
        monkeypatch.setenv("CLOUDSHIELD_REDIS_HOST", "my-redis")
        monkeypatch.setenv("CLOUDSHIELD_REDIS_PORT", "6380")
        monkeypatch.setenv("CLOUDSHIELD_REDIS_DB", "3")
        monkeypatch.delenv("REDIS_HOST", raising=False)
        monkeypatch.delenv("REDIS_PORT", raising=False)
        monkeypatch.delenv("REDIS_DB", raising=False)
        assert _storage_uri() == "redis://my-redis:6380/3"

    def test_uses_redis_host_port_db_as_secondary(self, monkeypatch):
        monkeypatch.delenv("FLASK_TESTING", raising=False)
        monkeypatch.delenv("CLOUDSHIELD_REDIS_URL", raising=False)
        monkeypatch.delenv("REDIS_URL", raising=False)
        monkeypatch.delenv("CLOUDSHIELD_REDIS_HOST", raising=False)
        monkeypatch.delenv("CLOUDSHIELD_REDIS_PORT", raising=False)
        monkeypatch.delenv("CLOUDSHIELD_REDIS_DB", raising=False)
        monkeypatch.setenv("REDIS_HOST", "secondary-redis")
        monkeypatch.setenv("REDIS_PORT", "6399")
        monkeypatch.setenv("REDIS_DB", "5")
        assert _storage_uri() == "redis://secondary-redis:6399/5"

    def test_defaults_when_no_env_vars(self, monkeypatch):
        for key in ("FLASK_TESTING", "CLOUDSHIELD_REDIS_URL", "REDIS_URL",
                    "CLOUDSHIELD_REDIS_HOST", "REDIS_HOST",
                    "CLOUDSHIELD_REDIS_PORT", "REDIS_PORT",
                    "CLOUDSHIELD_REDIS_DB", "REDIS_DB"):
            monkeypatch.delenv(key, raising=False)
        assert _storage_uri() == "redis://redis:6379/0"


class TestLimiterConfig:
    def test_testing_flag_is_true_in_test_env(self):
        # conftest.py sets FLASK_TESTING=1 before extensions is imported
        assert _testing is True

    def test_limiter_disabled_in_testing_mode(self):
        assert limiter.enabled is False

    def test_limiter_disabled_is_sufficient_in_testing(self):
        # When _testing=True, limiter is disabled — no need to inspect internals
        assert not limiter.enabled
