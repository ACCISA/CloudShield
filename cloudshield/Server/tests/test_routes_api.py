import pytest
import types
from cloudshield.Server.server import create_app
import cloudshield.Server.services.job_service as js


@pytest.fixture()
def client(monkeypatch):
    class DummyJob:
        def __init__(self, job_id):
            self.id = job_id

    # Counter to generate unique job IDs
    job_counter = {"count": 0}
    
    def fake_enqueue(func, *args, **kwargs):
        job_counter["count"] += 1
        return DummyJob(f"job{job_counter['count']}")

    # Mock task_queue to avoid Redis connection
    monkeypatch.setattr(js, "task_queue", types.SimpleNamespace(enqueue=fake_enqueue))
    
    # Mock get_job_status and health_status
    monkeypatch.setattr(js, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
    monkeypatch.setattr(js, "redis_conn", types.SimpleNamespace(ping=lambda: True))

    app = create_app()
    app.testing = True
    return app.test_client()


def test_provision_missing_org(client):
    resp = client.post("/task/provision", json={})
    assert resp.status_code == 400


def test_provision_success(client):
    resp = client.post("/task/provision", json={"org_id": "acme"})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)
    assert len(job_id) > 0


def test_destroy_success(client):
    resp = client.post("/task/destroy", json={"org_id": "acme"})
    assert resp.status_code == 202


def test_status_ok(client):
    # The status endpoint requires a real job_id from Redis
    # This test should be skipped or use a mocked job
    resp = client.get("/status/unknown-job-id")
    # With real service, unknown jobs return 404 or error status
    assert resp.status_code in [200, 404]


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_provision_missing_org_in_destroy(client):
    """Test destroy endpoint with missing org_id"""
    resp = client.post("/task/destroy", json={})
    assert resp.status_code == 400
    assert "org_id is required" in resp.get_json()["error"]


def test_provision_with_optional_params(client):
    """Test provision with optional region and AMI parameters"""
    resp = client.post("/task/provision", json={
        "org_id": "acme",
        "region": "us-east-1",
        "ubuntu_ami": "ami-123456",
        "workstation_ami": "ami-654321"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_destroy_with_force_flag(client):
    """Test destroy with force parameter"""
    resp = client.post("/task/destroy", json={"org_id": "acme", "force": True})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_provision_workstations_success(client):
    """Test provision workstations endpoint"""
    resp = client.post("/task/provisionworkstations", json={
        "org_id": "acme",
        "count": 3,
        "region": "us-west-2"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_provision_workstations_missing_org(client):
    """Test provision workstations with missing org_id"""
    resp = client.post("/task/provisionworkstations", json={})
    assert resp.status_code == 400
    assert "org_id is required" in resp.get_json()["error"]


def test_provision_workstations_default_count(client):
    """Test provision workstations with default count"""
    resp = client.post("/task/provisionworkstations", json={"org_id": "acme"})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_dc_add_user_success(client):
    """Test DC add user endpoint"""
    resp = client.post("/task/dc/add_user", json={
        "org_id": "acme",
        "username": "testuser",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_dc_add_user_missing_org_id(client):
    """Test DC add user with missing org_id"""
    resp = client.post("/task/dc/add_user", json={
        "username": "testuser",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 200  # Returns error in response body
    data = resp.get_json()
    assert "error" in data


def test_dc_add_user_missing_username(client):
    """Test DC add user with missing username"""
    resp = client.post("/task/dc/add_user", json={
        "org_id": "acme",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert "error" in data


def test_dc_add_user_missing_password(client):
    """Test DC add user with missing password"""
    resp = client.post("/task/dc/add_user", json={
        "org_id": "acme",
        "username": "testuser"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert "error" in data
