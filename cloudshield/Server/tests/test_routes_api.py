import pytest
from cloudshield.Server.server import create_app
import cloudshield.Server.services as services
import cloudshield.Server.routes.api as api_mod


@pytest.fixture()
def client(monkeypatch):
    class DummyJob:
        def __init__(self, job_id):
            self.id = job_id

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
