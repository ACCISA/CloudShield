"""Tests for the /api/threat/* routes."""

import sys
import types
import unittest.mock
import pytest

from unittest.mock import patch, MagicMock

# ── Fake Redis (same pattern as other route tests) ──────────────────────────
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

_fake_redis.Redis = _DummyRedis
_fake_redis.StrictRedis = _DummyRedis

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
_client_mod.Redis = _DummyRedis
_client_mod.StrictRedis = _DummyRedis
sys.modules.setdefault("redis.client", _client_mod)

_ex_mod = types.ModuleType("redis.exceptions")
_ex_mod.WatchError = _WatchError
_ex_mod.RedisError = _RedisError
_ex_mod.ConnectionError = _ConnectionError
sys.modules.setdefault("redis.exceptions", _ex_mod)
sys.modules.setdefault("redis", _fake_redis)


@pytest.fixture()
def client(monkeypatch):
    """Flask test client with threat routes available."""
    with patch("cloudshield.Server.utils.redis_client.redis.Redis") as mock_cls:
        mock_inst = MagicMock()
        mock_cls.return_value = mock_inst
        mock_inst.ping.return_value = True

        class DummyJob:
            def __init__(self, jid):
                self.id = jid

        monkeypatch.setattr(
            "cloudshield.Server.routes.api.service_dispatcher",
            lambda org_id, **kw: DummyJob("p1"),
        )

        import cloudshield.Server.services as services
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(services, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
        monkeypatch.setattr(services, "health_status", lambda: ({"status": "ok", "redis": True}, 200))
        monkeypatch.setattr(api_mod, "get_job_status", services.get_job_status)
        monkeypatch.setattr(api_mod, "health_status", services.health_status)

        from cloudshield.Server.server import create_app
        app = create_app()
        app.testing = True
        return app.test_client()


# ── GET /api/threat/status ──────────────────────────────────────────────────

def test_monitoring_status(client, monkeypatch):
    monkeypatch.setattr(
        "cloudshield.Server.services.threat_service.get_monitoring_status",
        lambda: {"timestamp": 1, "anomaly_detector": {"trained": False}},
    )
    # Also patch the route module's import
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(
        threat_mod, "get_monitoring_status",
        lambda: {"timestamp": 1, "anomaly_detector": {"trained": False}},
    )
    resp = client.get("/api/threat/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "timestamp" in data or "anomaly_detector" in data


# ── GET /api/threat/alerts ──────────────────────────────────────────────────

def test_list_alerts_empty(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(threat_mod, "get_recent_alerts", lambda limit: [])
    resp = client.get("/api/threat/alerts")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["alerts"] == []
    assert data["count"] == 0


def test_list_alerts_with_limit(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    captured = {}
    def fake_alerts(limit):
        captured["limit"] = limit
        return [{"sid": 9000001}]
    monkeypatch.setattr(threat_mod, "get_recent_alerts", fake_alerts)
    resp = client.get("/api/threat/alerts?limit=10")
    assert resp.status_code == 200
    assert captured["limit"] == 10
    assert resp.get_json()["count"] == 1


# ── GET /api/threat/anomalies ──────────────────────────────────────────────

def test_list_anomalies(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(threat_mod, "get_recent_anomalies", lambda limit: [{"is_anomaly": True}])
    resp = client.get("/api/threat/anomalies")
    assert resp.status_code == 200
    assert resp.get_json()["count"] == 1


# ── GET /api/threat/intel ──────────────────────────────────────────────────

def test_list_threat_intel(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(threat_mod, "get_recent_threat_intel_hits", lambda limit: [])
    resp = client.get("/api/threat/intel")
    assert resp.status_code == 200


# ── POST /api/threat/scan ──────────────────────────────────────────────────

def test_scan_missing_connections(client, monkeypatch):
    resp = client.post("/api/threat/scan", json={"agent_id": "a1"})
    assert resp.status_code == 400


def test_scan_success(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(threat_mod, "score_connections", lambda conns, agent_id: [])
    monkeypatch.setattr(threat_mod, "check_threat_intel", lambda conns, agent_id: [])
    resp = client.post("/api/threat/scan", json={
        "agent_id": "a1",
        "connections": [{"laddr_ip": "10.0.0.1", "raddr_ip": "8.8.8.8"}],
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert "anomalies" in data
    assert "threat_intel_hits" in data


# ── POST /api/threat/geo-check ─────────────────────────────────────────────

def test_geo_check_missing_ips(client):
    resp = client.post("/api/threat/geo-check", json={})
    assert resp.status_code == 400


def test_geo_check_success(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(threat_mod, "check_geo", lambda ips: [{"ip": "10.0.0.1", "is_bogon": True}])
    resp = client.post("/api/threat/geo-check", json={"ips": ["10.0.0.1"]})
    assert resp.status_code == 200
    assert resp.get_json()["count"] == 1
