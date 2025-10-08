import pytest
from cloudshield.Server.server import create_app
import cloudshield.Server.services.job_service as js
import cloudshield.Server.routes.api as api_mod


@pytest.fixture()
def client(monkeypatch):
    class DummyJob:
        def __init__(self, job_id):
            self.id = job_id

    monkeypatch.setattr(js, "enqueue_provision", lambda org_id, **kw: DummyJob("p1"))
    monkeypatch.setattr(js, "enqueue_destroy", lambda org_id, **kw: DummyJob("d1"))
    monkeypatch.setattr(js, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
    monkeypatch.setattr(js, "health_status", lambda: ({"status": "ok", "redis": True}, 200))

    monkeypatch.setattr(api_mod, "enqueue_provision", js.enqueue_provision)
    monkeypatch.setattr(api_mod, "enqueue_destroy", js.enqueue_destroy)
    monkeypatch.setattr(api_mod, "get_job_status", js.get_job_status)
    monkeypatch.setattr(api_mod, "health_status", js.health_status)

    app = create_app()
    app.testing = True
    return app.test_client()


def test_provision_missing_org(client):
    resp = client.post("/task/provision", json={})
    assert resp.status_code == 400


def test_provision_success(client):
    resp = client.post("/task/provision", json={"org_id": "acme"})
    assert resp.status_code == 202
    assert resp.get_json()["job_id"] == "p1"


def test_destroy_success(client):
    resp = client.post("/task/destroy", json={"org_id": "acme"})
    assert resp.status_code == 202


def test_status_ok(client):
    resp = client.get("/status/xyz")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "finished"


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"
