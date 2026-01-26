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
    # Added /api prefix
    resp = client.post("/api/task/provision", json={})
    assert resp.status_code == 400


def test_provision_success(client):
    # Added /api prefix
    resp = client.post("/api/task/provision", json={"org_id": "acme"})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)
    assert len(job_id) > 0


def test_destroy_success(client):
    # Added /api prefix
    resp = client.post("/api/task/destroy", json={"org_id": "acme"})
    assert resp.status_code == 202


def test_status_ok(client):
    # Added /api prefix
    resp = client.get("/api/status/unknown-job-id")
    # With real service, unknown jobs return 404 or error status
    assert resp.status_code in [200, 404]


def test_job_status_returns_progress(client, monkeypatch):
    """GET /api/status/<job_id> should forward progress fields"""
    import cloudshield.Server.services as services
    import cloudshield.Server.routes.api as api_mod

    monkeypatch.setattr(services, "get_job_status", lambda jid: ({"job_id": jid, "status": "in_progress", "progress": 42, "progress_text": "Halfway"}, 200))
    monkeypatch.setattr(api_mod, "get_job_status", services.get_job_status)

    resp = client.get("/api/status/job_1")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get("progress") == 42
    assert data.get("progress_text") == "Halfway"


def test_health_ok(client):
    # Added /api prefix
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_provision_missing_org_in_destroy(client):
    """Test destroy endpoint with missing org_id"""
    # Added /api prefix
    resp = client.post("/api/task/destroy", json={})
    assert resp.status_code == 400
    assert "org_id is required" in resp.get_json()["error"]


def test_provision_with_optional_params(client):
    """Test provision with optional region and AMI parameters"""
    # Added /api prefix
    resp = client.post("/api/task/provision", json={
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
    # Added /api prefix
    resp = client.post("/api/task/destroy", json={"org_id": "acme", "force": True})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_provision_workstations_success(client):
    """Test provision workstations endpoint"""
    # Added /api prefix
    resp = client.post("/api/task/provisionworkstations", json={
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
    # Added /api prefix
    resp = client.post("/api/task/provisionworkstations", json={})
    assert resp.status_code == 400
    assert "org_id is required" in resp.get_json()["error"]


def test_provision_workstations_default_count(client):
    """Test provision workstations with default count"""
    # Added /api prefix
    resp = client.post("/api/task/provisionworkstations", json={"org_id": "acme"})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_dc_add_user_success(client):
    """Test DC add user endpoint"""
    # Added /api prefix
    resp = client.post("/api/task/dc/add_user", json={
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
    # Added /api prefix
    resp = client.post("/api/task/dc/add_user", json={
        "username": "testuser",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 400  # Returns error in response body
    data = resp.get_json()
    assert "error" in data


def test_dc_add_user_missing_username(client):
    """Test DC add user with missing username"""
    # Added /api prefix
    resp = client.post("/api/task/dc/add_user", json={
        "org_id": "acme",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data


def test_dc_add_user_missing_password(client):
    """Test DC add user with missing password"""
    # Added /api prefix
    resp = client.post("/api/task/dc/add_user", json={
        "org_id": "acme",
        "username": "testuser"
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data


from datetime import datetime, timezone
import cloudshield.Server.routes.api as api_mod

def test_share_doc_to_payload():
    """Test the _share_doc_to_payload helper function"""
    now = datetime.now(timezone.utc)
    doc = {
        "_id": "507f1f77bcf86cd799439011",
        "org_id": "acme",
        "name": "HR_Share",
        "groups": ["hr"],
        "drive": "Z",
        "created_at": now
    }
    result = api_mod._share_doc_to_payload(doc)
    assert result["id"] == "507f1f77bcf86cd799439011"
    assert result["name"] == "HR_Share"
    assert result["groups"] == ["hr"]
    assert result["created_at"] == now.isoformat()


def test_get_organization_includes_job_id(client, monkeypatch):
    """GET /api/organization should include provisioning_job_id when set"""
    # Arrange: mock organizations.find_one to return an org doc with provisioning_job_id
    fake_doc = {
        "_id": "507f1f77bcf86cd799439011",
        "provisioning_status": "in_progress",
        "provisioning_job_id": "job_123",
        "package": "basic",
        "user_limit": 10,
        "workstation_limit": 5,
    }
    monkeypatch.setattr(api_mod, "organizations", MagicMock(find_one=lambda _filter: fake_doc))

    # Act
    resp = client.get("/api/organization/507f1f77bcf86cd799439011")

    # Assert
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get("provisioning_job_id") == "job_123"

# --- File Share Endpoints ---

def test_task_delete_file_share(client):
    # Success path
    resp = client.post("/api/task/dc/delete_file_share", json={"org_id": "acme", "share_name": "Finance"})
    assert resp.status_code == 202
    
    # Missing org_id
    resp = client.post("/api/task/dc/delete_file_share", json={"share_name": "Finance"})
    assert resp.status_code == 422
    
    # Missing share_name
    resp = client.post("/api/task/dc/delete_file_share", json={"org_id": "acme"})
    assert resp.status_code == 422

def test_task_create_file_share(client):
    # Success path
    resp = client.post("/api/task/dc/create_file_share", json={"org_id": "acme", "share_name": "Finance"})
    assert resp.status_code == 202
    
    # Missing org_id
    resp = client.post("/api/task/dc/create_file_share", json={"share_name": "Finance"})
    assert resp.status_code == 422
    
    # Missing share_name
    resp = client.post("/api/task/dc/create_file_share", json={"org_id": "acme"})
    assert resp.status_code == 422

@patch("cloudshield.Server.routes.api.list_shares")
def test_list_file_shares(mock_list_shares, client):
    mock_list_shares.return_value = [{"name": "Finance", "drive": "Z"}]
    
    # Success path
    resp = client.get("/api/file_shares?org_id=acme")
    assert resp.status_code == 200
    assert len(resp.json["shares"]) == 1
    
    # Missing org_id
    resp = client.get("/api/file_shares")
    assert resp.status_code == 422

@patch("cloudshield.Server.routes.api.list_groups_with_shares")
def test_list_file_share_groups(mock_list_groups, client):
    mock_list_groups.return_value = [{"group": {"name": "engineering", "shares": ["Dev"]}}]
    
    # Success path
    resp = client.get("/api/file_share_groups?org_id=acme")
    assert resp.status_code == 200
    assert len(resp.json["groups"]) == 1
    
    # Missing org_id
    resp = client.get("/api/file_share_groups")
    assert resp.status_code == 422

@patch("cloudshield.Server.routes.api.update_share")
def test_update_file_share(mock_update_share, client):
    mock_update_share.return_value = True
    
    # Success path
    resp = client.patch("/api/file_shares/Finance", json={"org_id": "acme", "description": "New description"})
    assert resp.status_code == 200
    assert resp.json["status"] == "SUCCESS"
    
    # Missing org_id
    resp = client.patch("/api/file_shares/Finance", json={"description": "New description"})
    assert resp.status_code == 422
    
    # No update fields provided
    resp = client.patch("/api/file_shares/Finance", json={"org_id": "acme"})
    assert resp.status_code == 400
    
    # Share not found failure
    mock_update_share.return_value = False
    resp = client.patch("/api/file_shares/Finance", json={"org_id": "acme", "description": "New description"})
    assert resp.status_code == 404

# --- DC Task Endpoints ---

def test_task_dc_set_password(client):
    # Success path
    resp = client.post("/api/task/dc/set_password", json={"org_id": "acme", "username": "user1", "new_password": "newpass"})
    assert resp.status_code == 202
    
    # Missing inputs
    assert client.post("/api/task/dc/set_password", json={"username": "user1", "new_password": "p"}).status_code == 422
    assert client.post("/api/task/dc/set_password", json={"org_id": "acme", "new_password": "p"}).status_code == 422
    assert client.post("/api/task/dc/set_password", json={"org_id": "acme", "username": "user1"}).status_code == 422

def test_task_dc_user_list(client):
    # Success
    resp = client.post("/api/task/dc/user_list", json={"org_id": "acme"})
    assert resp.status_code == 202
    # Missing org_id
    resp = client.post("/api/task/dc/user_list", json={})
    assert resp.status_code == 422

def test_task_dc_restart_samba(client):
    # Success
    resp = client.post("/api/task/dc/restart_samba", json={"org_id": "acme"})
    assert resp.status_code == 202
    # Missing org_id
    resp = client.post("/api/task/dc/restart_samba", json={})
    assert resp.status_code == 422

def test_task_dc_remove_user(client):
    # Success
    resp = client.post("/api/task/dc/remove_user", json={"org_id": "acme", "username": "user1"})
    assert resp.status_code == 202
    # Missing org_id
    resp = client.post("/api/task/dc/remove_user", json={"username": "user1"})
    assert resp.status_code == 422
    # Missing username
    resp = client.post("/api/task/dc/remove_user", json={"org_id": "acme"})
    assert resp.status_code == 422

def test_dc_add_user_with_group(client):
    # Success
    resp = client.post("/api/task/dc/add_user_with_group", json={"org_id": "acme", "username": "user1", "password": "pass", "group_name": "devs"})
    assert resp.status_code == 202
    # Missing fields
    resp = client.post("/api/task/dc/add_user_with_group", json={"username": "user1", "password": "pass"})
    assert resp.status_code == 422

# --- Signup Admin Endpoints ---

# A valid payload that satisfies the UserCreate Pydantic model
VALID_SIGNUP_PAYLOAD = {
    "email": "admin@example.com", 
    "password": "Password123!",
    "full_name": "Test Admin",
    "company_name": "Acme Corp"
}

@patch("cloudshield.Server.routes.api.create_user")
def test_signup_admin_success(mock_create_user, client):
    mock_create_user.return_value = "new_user_123"
    
    # Success Path 
    resp = client.post("/api/signup_admin", json=VALID_SIGNUP_PAYLOAD)
    assert resp.status_code == 201
    assert "user_id" in resp.json

@patch("cloudshield.Server.routes.api.create_user")
def test_signup_admin_validation_error(mock_create_user, client):
    # Forcing a generic ValueError which hits the 409 block
    mock_create_user.side_effect = ValueError("User already exists")
    resp = client.post("/api/signup_admin", json=VALID_SIGNUP_PAYLOAD)
    assert resp.status_code == 409

@patch("cloudshield.Server.routes.api.create_user")
def test_signup_admin_permission_error(mock_create_user, client):
    # Testing the 403 block
    mock_create_user.side_effect = PermissionError("Unauthorized")
    resp = client.post("/api/signup_admin", json=VALID_SIGNUP_PAYLOAD)
    assert resp.status_code == 403

@patch("cloudshield.Server.routes.api.create_user")
def test_signup_admin_internal_error(mock_create_user, client):
    # Testing the 500 catch-all Exception block
    mock_create_user.side_effect = Exception("DB Down")
    resp = client.post("/api/signup_admin", json=VALID_SIGNUP_PAYLOAD)
    assert resp.status_code == 500

# ==========================================
# PROVISIONING LOGIC COVERAGE TESTS
# ==========================================

@patch("cloudshield.Server.routes.api.organizations")
def test_provision_invalid_count_type(mock_orgs, client):
    """Hits the 'workstation_count must be an integer' 400 error"""
    mock_orgs.find_one.return_value = None
    resp = client.post("/api/task/provision", json={
        "org_id": "acme",
        "workstation_count": "invalid_string"
    })
    assert resp.status_code == 400
    assert "must be an integer" in resp.get_json()["error"]

@patch("cloudshield.Server.routes.api.service_dispatcher")
@patch("cloudshield.Server.routes.api.organizations")
def test_provision_exceeds_limit(mock_orgs, mock_dispatcher, client):
    """Hits the limit capping logic (workstation_count = org_limit)"""
    # Org limit is 5, requested count is 10
    mock_orgs.find_one.return_value = {"workstation_limit": 5, "status": "pending"}
    
    # Mock dispatcher to return a job
    mock_dispatcher.return_value = MagicMock(id="job_cap")

    resp = client.post("/api/task/provision", json={
        "org_id": "acme",
        "workstation_count": 10
    })
    assert resp.status_code == 202
    
    # Verify dispatcher was called with the capped limit (5), not 10
    mock_dispatcher.assert_called_once_with(
        service_name="provision_network",
        org_id="acme",
        region="ca-central-1",
        ubuntu_ami=None,
        workstation_ami=None,
        workstation_count=5
    )

@patch("cloudshield.Server.routes.api.service_dispatcher")
@patch("cloudshield.Server.routes.api.organizations")
def test_provision_negative_or_zero_count(mock_orgs, mock_dispatcher, client):
    """Hits the 'if workstation_count <= 0: workstation_count = 1' line"""
    mock_orgs.find_one.return_value = None
    mock_dispatcher.return_value = MagicMock(id="job_neg")

    # Requesting 0 workstations should default to 1
    resp = client.post("/api/task/provision", json={
        "org_id": "acme",
        "workstation_count": 0
    })
    assert resp.status_code == 202
    
    # Verify dispatcher was called with count 1
    mock_dispatcher.assert_called_once_with(
        service_name="provision_network",
        org_id="acme",
        region="ca-central-1",
        ubuntu_ami=None,
        workstation_ami=None,
        workstation_count=1
    )

@patch("os.environ.get")
@patch("cloudshield.Server.routes.api.organizations")
def test_provision_already_completed(mock_orgs, mock_env, client):
    """Hits the 'Environment already provisioned' 400 error"""
    # Pretend we are NOT in pytest so the bypass doesn't trigger
    mock_env.return_value = None 
    
    # Return a document indicating status is already complete
    mock_orgs.find_one.return_value = {"org_id": "acme", "status": "complete"}

    resp = client.post("/api/task/provision", json={"org_id": "acme"})
    
    assert resp.status_code == 400
    assert "already provisioned" in resp.get_json()["error"]