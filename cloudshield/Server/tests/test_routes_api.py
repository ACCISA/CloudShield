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
    assert resp.status_code == 200  # Returns error in response body
    data = resp.get_json()
    assert "error" in data


def test_dc_add_user_missing_username(client):
    """Test DC add user with missing username"""
    # Added /api prefix
    resp = client.post("/api/task/dc/add_user", json={
        "org_id": "acme",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert "error" in data


def test_dc_add_user_missing_password(client):
    """Test DC add user with missing password"""
    # Added /api prefix
    resp = client.post("/api/task/dc/add_user", json={
        "org_id": "acme",
        "username": "testuser"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert "error" in data


def test_dc_remove_user_success(client):
    """Test DC remove user endpoint"""
    resp = client.post("/api/task/dc/remove_user", json={
        "org_id": "acme",
        "username": "testuser"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None
    assert isinstance(job_id, str)


def test_dc_remove_user_missing_org_id(client):
    """Test DC remove user with missing org_id"""
    resp = client.post("/api/task/dc/remove_user", json={
        "username": "testuser"
    })
    assert resp.status_code == 422
    assert "org_id is required" in resp.get_json()["error"]


def test_dc_remove_user_missing_username(client):
    """Test DC remove user with missing username"""
    resp = client.post("/api/task/dc/remove_user", json={
        "org_id": "acme"
    })
    assert resp.status_code == 422
    assert "username is required" in resp.get_json()["error"]


def test_dc_set_password_success(client):
    """Test DC set password endpoint"""
    resp = client.post("/api/task/dc/set_password", json={
        "org_id": "acme",
        "username": "testuser",
        "new_password": "NewSecure123!"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None


def test_dc_set_password_missing_fields(client):
    """Test DC set password with missing fields"""
    # Missing org_id
    resp = client.post("/api/task/dc/set_password", json={
        "username": "testuser",
        "new_password": "NewSecure123!"
    })
    assert resp.status_code == 422
    
    # Missing username
    resp = client.post("/api/task/dc/set_password", json={
        "org_id": "acme",
        "new_password": "NewSecure123!"
    })
    assert resp.status_code == 422
    
    # Missing new_password
    resp = client.post("/api/task/dc/set_password", json={
        "org_id": "acme",
        "username": "testuser"
    })
    assert resp.status_code == 422


def test_dc_user_list_success(client):
    """Test DC user list endpoint"""
    resp = client.post("/api/task/dc/user_list", json={
        "org_id": "acme"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None


def test_dc_user_list_missing_org_id(client):
    """Test DC user list with missing org_id"""
    resp = client.post("/api/task/dc/user_list", json={})
    assert resp.status_code == 422
    assert "org_id is required" in resp.get_json()["error"]


def test_dc_restart_samba_success(client):
    """Test DC restart samba service endpoint"""
    resp = client.post("/api/task/dc/restart_samba", json={
        "org_id": "acme"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None


def test_dc_restart_samba_missing_org_id(client):
    """Test DC restart samba with missing org_id"""
    resp = client.post("/api/task/dc/restart_samba", json={})
    assert resp.status_code == 422
    assert "org_id is required" in resp.get_json()["error"]


def test_dc_create_file_share_success(client):
    """Test DC create file share endpoint"""
    resp = client.post("/api/task/dc/create_file_share", json={
        "org_id": "acme",
        "share_name": "shared_docs"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None


def test_dc_create_file_share_missing_fields(client):
    """Test DC create file share with missing fields"""
    # Missing org_id
    resp = client.post("/api/task/dc/create_file_share", json={
        "share_name": "shared_docs"
    })
    assert resp.status_code == 422
    
    # Missing share_name
    resp = client.post("/api/task/dc/create_file_share", json={
        "org_id": "acme"
    })
    assert resp.status_code == 422


def test_dc_delete_file_share_success(client):
    """Test DC delete file share endpoint"""
    resp = client.post("/api/task/dc/delete_file_share", json={
        "org_id": "acme",
        "share_name": "shared_docs"
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None


def test_dc_delete_file_share_missing_fields(client):
    """Test DC delete file share with missing fields"""
    # Missing org_id
    resp = client.post("/api/task/dc/delete_file_share", json={
        "share_name": "shared_docs"
    })
    assert resp.status_code == 422
    
    # Missing share_name
    resp = client.post("/api/task/dc/delete_file_share", json={
        "org_id": "acme"
    })
    assert resp.status_code == 422


def test_signup_admin_endpoint_success(client, monkeypatch):
    """Test public signup admin endpoint"""
    # Mock the create_user service to avoid DB operations
    def mock_create_user(user_data, current_user, reason):
        return "507f1f77bcf86cd799439011"
    
    import cloudshield.Server.routes.api as api_mod
    monkeypatch.setattr(api_mod, "create_user", mock_create_user)
    
    resp = client.post("/api/signup_admin", json={
        "email": "admin@example.com",
        "password": "SecurePass123!",
        "full_name": "Admin User",
        "org_id": "neworg",
        "role": "employee"  # Should be forced to admin
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert "user_id" in data
    assert data["user_id"] == "507f1f77bcf86cd799439011"


def test_signup_admin_validation_error(client, monkeypatch):
    """Test signup admin with validation errors"""
    resp = client.post("/api/signup_admin", json={
        "email": "invalid-email",  # Invalid email format
        "password": "short",  # Too short
        "full_name": "A",  # Too short
        "org_id": "AB"  # Too short
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data
    assert data["error"] == "Validation failed"


def test_signup_admin_duplicate_email(client, monkeypatch):
    """Test signup admin with duplicate email"""
    def mock_create_user_duplicate(user_data, current_user, reason):
        raise ValueError("User with email admin@example.com already exists")
    
    import cloudshield.Server.routes.api as api_mod
    monkeypatch.setattr(api_mod, "create_user", mock_create_user_duplicate)
    
    resp = client.post("/api/signup_admin", json={
        "email": "admin@example.com",
        "password": "SecurePass123!",
        "full_name": "Admin User",
        "org_id": "neworg"
    })
    assert resp.status_code == 409
    data = resp.get_json()
    assert "error" in data


def test_signup_admin_permission_error(client, monkeypatch):
    """Test signup admin when org already has users"""
    def mock_create_user_permission(user_data, current_user, reason):
        raise PermissionError("Public signup is disabled for this organization")
    
    import cloudshield.Server.routes.api as api_mod
    monkeypatch.setattr(api_mod, "create_user", mock_create_user_permission)
    
    resp = client.post("/api/signup_admin", json={
        "email": "admin@example.com",
        "password": "SecurePass123!",
        "full_name": "Admin User",
        "org_id": "existingorg"
    })
    assert resp.status_code == 403
    data = resp.get_json()
    assert "error" in data


def test_signup_admin_internal_error(client, monkeypatch):
    """Test signup admin with unexpected server error"""
    def mock_create_user_error(user_data, current_user, reason):
        raise Exception("Unexpected database error")
    
    import cloudshield.Server.routes.api as api_mod
    monkeypatch.setattr(api_mod, "create_user", mock_create_user_error)
    
    resp = client.post("/api/signup_admin", json={
        "email": "admin@example.com",
        "password": "SecurePass123!",
        "full_name": "Admin User",
        "org_id": "neworg"
    })
    assert resp.status_code == 500
    data = resp.get_json()
    assert "error" in data
    assert data["error"] == "Internal server error"


def test_empty_json_body_handling(client):
    """Test endpoints handle empty or missing JSON bodies gracefully"""
    # Test with None/empty body
    resp = client.post("/api/task/provision", data=None)
    assert resp.status_code == 400
    
    resp = client.post("/api/task/destroy", data="")
    assert resp.status_code in [400, 415]  # Either bad request or unsupported media type


def test_provision_with_workstation_count(client):
    """Test provision endpoint with workstation_count parameter"""
    resp = client.post("/api/task/provision", json={
        "org_id": "acme",
        "workstation_count": 10
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None


def test_provision_with_all_parameters(client):
    """Test provision endpoint with all optional parameters"""
    resp = client.post("/api/task/provision", json={
        "org_id": "acme",
        "region": "eu-west-1",
        "ubuntu_ami": "ami-111111",
        "workstation_ami": "ami-222222",
        "workstation_count": 5
    })
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    assert job_id is not None