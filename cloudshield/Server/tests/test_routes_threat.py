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


# ── GET /api/threat/unified ────────────────────────────────────────────────

def test_unified_alerts_empty(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    import security.guards as guards_mod
    monkeypatch.setattr(threat_mod, "get_unified_alerts", lambda limit, org_id="": [])
    monkeypatch.setattr(guards_mod, "DEV_BYPASS_TOKEN", "test-dev-token")
    resp = client.get("/api/threat/unified", headers={"Authorization": "Bearer test-dev-token"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["alerts"] == []
    assert data["count"] == 0


def test_unified_alerts_with_limit(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    import security.guards as guards_mod
    captured = {}
    def fake_unified(limit, org_id=""):
        captured["limit"] = limit
        return [{"alert_id": "abc", "source": "snort", "severity": "HIGH"}]
    monkeypatch.setattr(threat_mod, "get_unified_alerts", fake_unified)
    monkeypatch.setattr(guards_mod, "DEV_BYPASS_TOKEN", "test-dev-token")
    resp = client.get("/api/threat/unified?limit=25", headers={"Authorization": "Bearer test-dev-token"})
    assert resp.status_code == 200
    assert captured["limit"] == 25
    assert resp.get_json()["count"] == 1


# ── POST /api/threat/ingest ────────────────────────────────────────────────

def test_ingest_missing_alerts(client):
    resp = client.post("/api/threat/ingest", json={"org_id": "org-1"})
    assert resp.status_code == 400
    assert "error" in resp.get_json()


def test_ingest_empty_alerts_list(client):
    resp = client.post("/api/threat/ingest", json={"org_id": "org-1", "alerts": []})
    assert resp.status_code == 400


def test_ingest_success(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    captured = {}
    def fake_ingest(alerts, org_id):
        captured["org_id"] = org_id
        captured["count"] = len(alerts)
        return {"ingested": len(alerts), "audit_written": 1, "errors": 0}
    monkeypatch.setattr(threat_mod, "ingest_threat_alerts", fake_ingest)
    payload = {
        "org_id": "org-abc",
        "alerts": [
            {"alert_id": "x1", "source": "snort", "severity": "CRITICAL",
             "timestamp": 1700000000, "title": "Test alert"},
        ],
    }
    resp = client.post("/api/threat/ingest", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ingested"] == 1
    assert data["errors"] == 0
    assert captured["org_id"] == "org-abc"
    assert captured["count"] == 1


def test_ingest_defaults_org_to_system(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    captured = {}
    def fake_ingest(alerts, org_id):
        captured["org_id"] = org_id
        return {"ingested": 1, "audit_written": 0, "errors": 0}
    monkeypatch.setattr(threat_mod, "ingest_threat_alerts", fake_ingest)
    resp = client.post("/api/threat/ingest", json={
        "alerts": [{"alert_id": "y1", "source": "anomaly", "severity": "MEDIUM"}],
    })
    assert resp.status_code == 200
    assert captured["org_id"] == "system"


# ── PATCH /api/threat/unified/<alert_id> ───────────────────────────────────

def test_patch_unified_alert_invalid_status(client, monkeypatch):
    import security.guards as guards_mod
    monkeypatch.setattr(guards_mod, "DEV_BYPASS_TOKEN", "test-dev-token")
    resp = client.patch(
        "/api/threat/unified/alert-123",
        json={"status": "invalid_status"},
        headers={"Authorization": "Bearer test-dev-token"},
    )
    assert resp.status_code == 400
    assert "error" in resp.get_json()


def test_patch_unified_alert_missing_status(client, monkeypatch):
    import security.guards as guards_mod
    monkeypatch.setattr(guards_mod, "DEV_BYPASS_TOKEN", "test-dev-token")
    resp = client.patch(
        "/api/threat/unified/alert-123",
        json={},
        headers={"Authorization": "Bearer test-dev-token"},
    )
    assert resp.status_code == 400


def test_patch_unified_alert_not_found(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    import security.guards as guards_mod
    monkeypatch.setattr(guards_mod, "DEV_BYPASS_TOKEN", "test-dev-token")
    monkeypatch.setattr(threat_mod, "update_alert_status", lambda aid, status, org_id="": False)
    resp = client.patch(
        "/api/threat/unified/alert-999",
        json={"status": "resolved"},
        headers={"Authorization": "Bearer test-dev-token"},
    )
    assert resp.status_code == 404


def test_patch_unified_alert_success(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    import security.guards as guards_mod
    monkeypatch.setattr(guards_mod, "DEV_BYPASS_TOKEN", "test-dev-token")
    monkeypatch.setattr(threat_mod, "update_alert_status", lambda aid, status, org_id="": True)
    resp = client.patch(
        "/api/threat/unified/alert-1",
        json={"status": "false_positive"},
        headers={"Authorization": "Bearer test-dev-token"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["alert_id"] == "alert-1"
    assert data["status"] == "false_positive"


# ── POST /api/threat/alerts/explain ───────────────────────────────────────

def test_explain_alert_no_body(client):
    resp = client.post("/api/threat/alerts/explain", json={})
    assert resp.status_code == 400


def test_explain_alert_success(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(
        threat_mod, "generate_alert_explanation",
        lambda data: "This alert indicates suspicious activity.",
    )
    resp = client.post("/api/threat/alerts/explain", json={
        "risk": "high", "type": "port_scan", "description": "test"
    })
    assert resp.status_code == 200
    assert "explanation" in resp.get_json()


def test_explain_alert_exception_returns_500(client, monkeypatch):
    import cloudshield.Server.routes.threat as threat_mod
    monkeypatch.setattr(
        threat_mod, "generate_alert_explanation",
        lambda data: (_ for _ in ()).throw(Exception("AI error")),
    )
    resp = client.post("/api/threat/alerts/explain", json={"risk": "high"})
    assert resp.status_code == 500
