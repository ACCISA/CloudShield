import sys
import types
import unittest.mock
# create a reusable mock client and a fake redis module that returns it
_mock_redis_client = unittest.mock.MagicMock()
_mock_redis_client.get.return_value = None
_mock_redis_client.set.return_value = True
_mock_redis_client.ping.return_value = True

_fake_redis = types.ModuleType("redis")
class _DummyRedis:
    def __init__(self, *a, **kw):
        self._client = _mock_redis_client
    def __getattr__(self, name):
        return getattr(self._client, name)

# expose constructors your code may call
_fake_redis.Redis = _DummyRedis
_fake_redis.StrictRedis = _DummyRedis

# install the fake module so any subsequent `import redis` gets the mock
sys.modules['redis'] = _fake_redis

import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture()
def client(monkeypatch):
    with patch("cloudshield.Server.redis_client.redis.Redis") as mock_redis_cls:
        mock_redis_instance = MagicMock()
        mock_redis_cls.return_value = mock_redis_instance

        # Optional: mock Redis methods your app uses
        mock_redis_instance.ping.return_value = True
        mock_redis_instance.get.return_value = b"some_value"
        mock_redis_instance.set.return_value = True

        class DummyJob:
            def __init__(self, job_id):
                self.id = job_id

        monkeypatch.setattr("cloudshield.Server.routes.api.service_dispatcher", lambda org_id, **kw: DummyJob("p1"))
        from cloudshield.Server.server import create_app
        import cloudshield.Server.routes.api as api_mod
        import cloudshield.Server.services as services

        monkeypatch.setattr(services, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
        monkeypatch.setattr(services, "health_status", lambda: ({"status": "ok", "redis": True}, 200))

        monkeypatch.setattr(api_mod, "get_job_status", services.get_job_status)
        monkeypatch.setattr(api_mod, "health_status", services.health_status)

        app = create_app()
        app.testing = True
        return app.test_client()

def test_provision_missing_org(client):
    resp = client.post("/task/provision", json={})
    assert resp.status_code == 400


def test_provision_success(client):
    resp = client.post("/task/provision", json={"org_id": "acme"})
    assert resp.status_code == 202
    assert len(resp.get_json()["job_id"]) == 36


def test_destroy_success(client):
    resp = client.post("/task/destroy", json={"org_id": "acme"})
    assert resp.status_code == 202


def test_status_ok(client):
    resp = client.get("/status/xyz")
    assert resp.status_code == 404


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"
