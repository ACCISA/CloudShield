import sys
import types
import unittest.mock
import uuid
from bson import ObjectId
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
    with patch("cloudshield.Server.utils.redis_client.redis.Redis") as mock_redis_cls:
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


@pytest.fixture()
def auth_client(client, monkeypatch):
    """Client that bypasses require_auth by pre-populating g.user on every request."""
    from flask import g as flask_g
    from cloudshield.Server.server import create_app
    import cloudshield.Server.routes.api as api_mod
    import cloudshield.Server.services as services

    with patch("cloudshield.Server.utils.redis_client.redis.Redis") as mock_redis_cls:
        mock_redis_instance = MagicMock()
        mock_redis_cls.return_value = mock_redis_instance
        mock_redis_instance.ping.return_value = True
        mock_redis_instance.get.return_value = b"some_value"
        mock_redis_instance.set.return_value = True

        class DummyJob:
            def __init__(self, job_id):
                self.id = job_id

        monkeypatch.setattr("cloudshield.Server.routes.api.service_dispatcher", lambda org_id, **kw: DummyJob("p1"))
        monkeypatch.setattr(services, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
        monkeypatch.setattr(services, "health_status", lambda: ({"status": "ok", "redis": True}, 200))
        monkeypatch.setattr(api_mod, "get_job_status", services.get_job_status)
        monkeypatch.setattr(api_mod, "health_status", services.health_status)

        app = create_app()
        app.testing = True

        @app.before_request
        def _inject_test_user():
            # Use a valid ObjectId for org_id
            flask_g.user = {"id": "test-user", "role": "admin", "org_id": "507f1f77bcf86cd799439011"}

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
        "password": "SecurePass123!",
        "email":"magg@gmail.com"
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
        "password": "SecurePass123!",
        "email":"am@gmail.com"
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
    
    # Success path - org_id is now in the URL path
    resp = client.patch("/api/file_shares/acme/Finance", json={"description": "New description"})
    assert resp.status_code == 200
    assert resp.json["status"] == "SUCCESS"
    
    # No update fields provided
    resp = client.patch("/api/file_shares/acme/Finance", json={})
    assert resp.status_code == 400
    
    # Share not found failure
    mock_update_share.return_value = False
    resp = client.patch("/api/file_shares/acme/Finance", json={"description": "New description"})
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

def test_task_dc_add_group(client):
    # Success
    resp = client.post("/api/task/dc/add_group", json={"org_id": "acme", "group_name": "devs"})
    assert resp.status_code == 202
    # Missing org_id
    resp = client.post("/api/task/dc/add_group", json={"group_name": "devs"})
    assert resp.status_code == 422
    # Missing group_name
    resp = client.post("/api/task/dc/add_group", json={"org_id": "acme"})
    assert resp.status_code == 422

def test_task_dc_remove_group(client):
    # Success
    resp = client.post("/api/task/dc/remove_group", json={"org_id": "acme", "group_name": "devs"})
    assert resp.status_code == 202
    # Missing org_id
    resp = client.post("/api/task/dc/remove_group", json={"group_name": "devs"})
    assert resp.status_code == 422
    # Missing group_name
    resp = client.post("/api/task/dc/remove_group", json={"org_id": "acme"})
    assert resp.status_code == 422

def test_task_dc_update_file_share(client):
    # Success with all fields
    resp = client.post("/api/task/dc/update_file_share", json={
        "org_id": "acme", "share_name": "Finance", "groups": ["devs"], "users": ["alice"]
    })
    assert resp.status_code == 202
    # Success with only required fields (groups/users are optional)
    resp = client.post("/api/task/dc/update_file_share", json={
        "org_id": "acme", "share_name": "Finance"
    })
    assert resp.status_code == 202
    # Missing org_id
    resp = client.post("/api/task/dc/update_file_share", json={"share_name": "Finance"})
    assert resp.status_code == 422
    # Missing share_name
    resp = client.post("/api/task/dc/update_file_share", json={"org_id": "acme"})
    assert resp.status_code == 422

# --- Signup Admin Endpoints ---

# A valid payload that satisfies the UserCreate Pydantic model
VALID_SIGNUP_PAYLOAD = {
    "email": "admin@example.com", 
    "password": "Password123!",
    "full_name": "Test Admin",
    "role": "admin",
}


def _unique_signup_payload():
    payload = dict(VALID_SIGNUP_PAYLOAD)
    payload["email"] = f"admin_{uuid.uuid4().hex}@example.com"
    return payload


@pytest.fixture()
def signup_admin_client(monkeypatch):
    """
    Dedicated fixture for signup_admin tests that patches create_user
    BEFORE the Flask app is created.
    """
    with patch("cloudshield.Server.utils.redis_client.redis.Redis") as mock_redis_cls:
        mock_redis_instance = MagicMock()
        mock_redis_cls.return_value = mock_redis_instance
        mock_redis_instance.ping.return_value = True
        mock_redis_instance.get.return_value = b"some_value"
        mock_redis_instance.set.return_value = True

        class DummyJob:
            def __init__(self, job_id="p1"):
                self.id = job_id

        # Import modules BEFORE create_app so we can patch them.
        # NOTE: depending on PYTHONPATH, the app may import either
        # `cloudshield.Server.routes.*` OR the top-level `routes.*` package.
        import cloudshield.Server.routes.users as users_mod
        import cloudshield.Server.services as services_mod
        import cloudshield.Server.services.user_service as user_service_mod
        from cloudshield.Server.services import job_service
        from cloudshield.Server.services import dispatcher

        # Create a configurable mock that tests can modify
        mock_create_user = MagicMock()
        
        def default_create_user(user_data, current_user=None, reason=None):
            user_data.org_id = "org_123"
            return "new_user_123"
        
        mock_create_user.side_effect = default_create_user
        
        # Patch at all levels BEFORE app creation
        monkeypatch.setattr(users_mod, "create_user", mock_create_user)
        monkeypatch.setattr(services_mod, "create_user", mock_create_user)
        monkeypatch.setattr(user_service_mod, "create_user", mock_create_user)
        monkeypatch.setattr(dispatcher, "service_dispatcher", lambda *args, **kwargs: DummyJob())

        # Also patch alternative import paths used by `cloudshield/Server/server.py`
        # when it falls back to `from routes import ...`.
        try:
            import routes.users as users_mod_alt  # type: ignore
            monkeypatch.setattr(users_mod_alt, "create_user", mock_create_user)
        except Exception:
            pass

        try:
            import services as services_mod_alt  # type: ignore
            monkeypatch.setattr(services_mod_alt, "create_user", mock_create_user)
        except Exception:
            pass

        try:
            import services.user_service as user_service_mod_alt  # type: ignore
            monkeypatch.setattr(user_service_mod_alt, "create_user", mock_create_user)
        except Exception:
            pass

        monkeypatch.setattr("cloudshield.Server.routes.api.service_dispatcher", lambda org_id, **kw: DummyJob("p1"))
        monkeypatch.setattr("cloudshield.Server.routes.users.service_dispatcher", lambda *args, **kw: DummyJob("p1"))
        try:
            monkeypatch.setattr("routes.api.service_dispatcher", lambda org_id, **kw: DummyJob("p1"))
        except Exception:
            pass
        
        from cloudshield.Server.server import create_app
        import cloudshield.Server.routes.api as api_mod
        import cloudshield.Server.services as services

        monkeypatch.setattr(services, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
        monkeypatch.setattr(services, "health_status", lambda: ({"status": "ok", "redis": True}, 200))
        monkeypatch.setattr(api_mod, "get_job_status", services.get_job_status)
        monkeypatch.setattr(api_mod, "health_status", services.health_status)

        app = create_app()
        app.testing = True

        # Ensure the *actual* registered view function uses our mock regardless
        # of which module path (`cloudshield.Server.routes.*` vs `routes.*`) was
        # used when creating the Flask app.
        for view_func in app.view_functions.values():
            if getattr(view_func, "__name__", None) == "signup_admin_endpoint":
                view_func.__globals__["create_user"] = mock_create_user
                break
        yield app.test_client(), mock_create_user

def test_signup_admin_success_returns_org_id(signup_admin_client, monkeypatch):
    client, mock_create_user = signup_admin_client
    
    def success_create_user(user_data, current_user=None, reason=None):
        user_data.org_id = "org_123"
        return "new_user_123"
    
    mock_create_user.side_effect = success_create_user

    resp = client.post("/api/signup_admin", json=_unique_signup_payload())
    assert mock_create_user.call_count == 1, (
        f"create_user not called; status={resp.status_code} body={resp.get_json() or resp.data.decode()}"
    )
    assert resp.status_code == 202
    assert "job_id" in resp.json

def test_signup_admin_validation_error(signup_admin_client):
    client, mock_create_user = signup_admin_client
    
    def raise_value_error(*args, **kwargs):
        raise ValueError("User already exists")
    
    mock_create_user.side_effect = raise_value_error

    resp = client.post("/api/signup_admin", json=_unique_signup_payload())
    assert mock_create_user.call_count == 1, (
        f"create_user not called; status={resp.status_code} body={resp.get_json() or resp.data.decode()}"
    )
    assert resp.status_code == 409

def test_signup_admin_permission_error(signup_admin_client):
    client, mock_create_user = signup_admin_client
    
    def raise_permission_error(*args, **kwargs):
        raise PermissionError("Unauthorized")
    
    mock_create_user.side_effect = raise_permission_error

    resp = client.post("/api/signup_admin", json=_unique_signup_payload())
    assert mock_create_user.call_count == 1, (
        f"create_user not called; status={resp.status_code} body={resp.get_json() or resp.data.decode()}"
    )
    assert resp.status_code == 403

def test_signup_admin_internal_error(signup_admin_client):
    client, mock_create_user = signup_admin_client
    
    def raise_exception(*args, **kwargs):
        raise Exception("DB Down")
    
    mock_create_user.side_effect = raise_exception

    resp = client.post("/api/signup_admin", json=_unique_signup_payload())
    assert mock_create_user.call_count == 1, (
        f"create_user not called; status={resp.status_code} body={resp.get_json() or resp.data.decode()}"
    )
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


# ---------------------------------------------------------------------------
# GET /api/vpn/config tests
# ---------------------------------------------------------------------------


def test_vpn_config_missing_params(auth_client):
    """Returns 400 when org_id or username is missing."""
    resp = auth_client.get("/api/vpn/config")
    assert resp.status_code == 400

    resp = auth_client.get("/api/vpn/config?org_id=acme")
    assert resp.status_code == 400

    resp = auth_client.get("/api/vpn/config?username=alice")
    assert resp.status_code == 400


@patch("cloudshield.Server.routes.api.get_vpn_config")
def test_vpn_config_not_found(mock_get, auth_client):
    """Returns 404 when no config exists for the org/user pair."""
    mock_get.return_value = None

    resp = auth_client.get("/api/vpn/config?org_id=acme&username=nobody")
    assert resp.status_code == 404
    assert "not found" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.get_vpn_config")
def test_vpn_config_success(mock_get, auth_client):
    """Returns 200 with base64-encoded VPN config."""
    mock_get.return_value = {
        "filename": "alice.ovpn",
        "content_b64": "Y2xpZW50CmRldiB0dW4K",
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
    }

    resp = auth_client.get("/api/vpn/config?org_id=acme&username=alice")
    assert resp.status_code == 200

    data = resp.get_json()
    assert data["filename"] == "alice.ovpn"
    assert data["content_b64"] == "Y2xpZW50CmRldiB0dW4K"


# ---------------------------------------------------------------------------
# Helper Function Tests
# ---------------------------------------------------------------------------

def test_coerce_int():
    """Test the _coerce_int helper function."""
    from cloudshield.Server.routes.api import _coerce_int
    
    assert _coerce_int(5) == 5
    assert _coerce_int("10") == 10
    assert _coerce_int("abc") is None
    assert _coerce_int(None) is None
    assert _coerce_int(3.14) == 3


def test_serialize_org():
    """Test the _serialize_org helper function."""
    from cloudshield.Server.routes.api import _serialize_org
    from datetime import datetime, timezone
    
    now = datetime.now(timezone.utc)
    doc = {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Acme Corp",
        "logo": "data:image/png;base64,abc",
        "package": "enterprise",
        "domain_name": "acme.local",
        "realm_name": "ACME.LOCAL",
        "workstation_limit": 50,
        "user_limit": 100,
        "storage_limit_gb": 1000,
        "provisioning_status": "complete",
        "provisioning_job_id": "job_123",
        "created_at": now,
        "updated_at": now,
    }
    
    result = _serialize_org(doc)
    assert result["id"] == "507f1f77bcf86cd799439011"
    assert result["name"] == "Acme Corp"
    assert result["logo"] == "data:image/png;base64,abc"
    assert result["package"] == "enterprise"
    assert result["domain_name"] == "acme.local"
    assert result["workstation_limit"] == 50
    assert result["created_at"] == now.isoformat()


@patch("cloudshield.Server.routes.api.db_admin")
def test_seed_workstations(mock_db_admin):
    """Test the _seed_workstations helper function."""
    from cloudshield.Server.routes.api import _seed_workstations
    
    mock_collection = MagicMock()
    mock_db_admin.__getitem__.return_value = mock_collection
    
    # Test with count > 0
    _seed_workstations("test_org", 3)
    assert mock_collection.insert_many.call_count == 1
    inserted_docs = mock_collection.insert_many.call_args[0][0]
    assert len(inserted_docs) == 3
    assert all(doc["org_id"] == "test_org" for doc in inserted_docs)
    assert all(doc["status"] == "provisioning" for doc in inserted_docs)
    
    # Test with count <= 0 (should not insert)
    mock_collection.reset_mock()
    _seed_workstations("test_org", 0)
    assert mock_collection.insert_many.call_count == 0


# ---------------------------------------------------------------------------
# GET /api/organization/<org_id> - Additional Coverage
# ---------------------------------------------------------------------------

def test_get_organization_invalid_id(client):
    """GET /api/organization with invalid ObjectId format should return 400."""
    with patch("bson.ObjectId") as mock_oid:
        from bson.errors import InvalidId
        mock_oid.side_effect = InvalidId("invalid ID")
        resp = client.get("/api/organization/invalid_id_format")
        assert resp.status_code == 400
        assert "Invalid organization ID format" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_get_organization_not_found(mock_orgs, client):
    """GET /api/organization when org doesn't exist should return 404."""
    mock_orgs.find_one.return_value = None
    resp = client.get("/api/organization/507f1f77bcf86cd799439011")
    assert resp.status_code == 404
    assert "not found" in resp.get_json()["error"]


# ---------------------------------------------------------------------------
# GET /api/organizations/me
# ---------------------------------------------------------------------------

@patch("cloudshield.Server.routes.api.organizations")
def test_get_my_organization_success(mock_orgs, auth_client, monkeypatch):
    """GET /api/organizations/me should return current user's org."""
    from datetime import datetime, timezone
    from flask import g as flask_g
    
    # Mock g.user with org_id
    now = datetime.now(timezone.utc)
    fake_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "name": "Test Org",
        "package": "enterprise",
        "workstation_limit": 10,
        "created_at": now,
    }
    mock_orgs.find_one.return_value = fake_doc
    
    resp = auth_client.get("/api/organizations/me")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["organization"]["name"] == "Test Org"


@patch("cloudshield.Server.routes.api.organizations")
def test_get_my_organization_missing_org_id(mock_orgs, client):
    """GET /api/organizations/me without org_id in token should return 401."""
    from cloudshield.Server.server import create_app
    from flask import g as flask_g
    
    app = create_app()
    app.testing = True
    
    @app.before_request
    def _inject_user_without_org():
        flask_g.user = {"id": "test-user", "role": "user"}  # No org_id
    
    client = app.test_client()
    resp = client.get("/api/organizations/me")
    assert resp.status_code == 401
    assert "org_id missing" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_get_my_organization_invalid_format(mock_orgs, auth_client):
    """GET /api/organizations/me with invalid org_id format should return 400."""
    from cloudshield.Server.server import create_app
    from flask import g as flask_g
    
    app = create_app()
    app.testing = True
    
    @app.before_request
    def _inject_user_bad_org():
        flask_g.user = {"id": "test-user", "role": "user", "org_id": "invalid_format"}
    
    client = app.test_client()
    resp = client.get("/api/organizations/me")
    assert resp.status_code == 400


@patch("cloudshield.Server.routes.api.organizations")
def test_get_my_organization_not_found(mock_orgs, auth_client):
    """GET /api/organizations/me when org doesn't exist should return 404."""
    mock_orgs.find_one.return_value = None
    resp = auth_client.get("/api/organizations/me")
    assert resp.status_code == 404
    assert "not found" in resp.get_json()["error"]


# ---------------------------------------------------------------------------
# PATCH /api/organizations/me
# ---------------------------------------------------------------------------

@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_success(mock_orgs, auth_client):
    """PATCH /api/organizations/me should update org successfully."""
    from datetime import datetime, timezone
    
    updated_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "name": "Updated Org",
        "logo": "data:image/png;base64,new",
        "package": "enterprise",
        "updated_at": datetime.now(timezone.utc),
    }
    mock_orgs.find_one.return_value = updated_doc
    
    resp = auth_client.patch("/api/organizations/me", json={"name": "Updated Org"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["organization"]["name"] == "Updated Org"


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_non_admin(mock_orgs, client):
    """PATCH /api/organizations/me by non-admin should return 403."""
    from cloudshield.Server.server import create_app
    from flask import g as flask_g
    
    app = create_app()
    app.testing = True
    
    @app.before_request
    def _inject_non_admin():
        flask_g.user = {"id": "test-user", "role": "user", "org_id": "507f1f77bcf86cd799439011"}
    
    client = app.test_client()
    resp = client.patch("/api/organizations/me", json={"name": "New Name"})
    assert resp.status_code == 403
    assert "Admin role required" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_missing_org_in_token(mock_orgs, client):
    """PATCH /api/organizations/me without org_id in token should return 401."""
    from cloudshield.Server.server import create_app
    from flask import g as flask_g
    
    app = create_app()
    app.testing = True
    
    @app.before_request
    def _inject_user_no_org():
        flask_g.user = {"id": "test-user", "role": "admin"}  # No org_id
    
    client = app.test_client()
    resp = client.patch("/api/organizations/me", json={"name": "New Name"})
    assert resp.status_code == 401
    assert "org_id missing" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_invalid_org_id_format(mock_orgs, client):
    """PATCH /api/organizations/me with invalid org_id format should return 400."""
    from cloudshield.Server.server import create_app
    from flask import g as flask_g
    
    app = create_app()
    app.testing = True
    
    @app.before_request
    def _inject_bad_org():
        flask_g.user = {"id": "test-user", "role": "admin", "org_id": "invalid_format"}
    
    client = app.test_client()
    resp = client.patch("/api/organizations/me", json={"name": "New Name"})
    assert resp.status_code == 400
    assert "Invalid organization ID format" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_unknown_fields(mock_orgs, auth_client):
    """PATCH /api/organizations/me with unknown fields should return 400."""
    # Need to make find_one return something for update to proceed to validation
    mock_orgs.find_one.return_value = {"_id": ObjectId("507f1f77bcf86cd799439011"), "name": "Test"}
    resp = auth_client.patch("/api/organizations/me", json={"unknown_field": "value"})
    assert resp.status_code == 400
    assert "Unknown fields" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_logo_too_large(mock_orgs, auth_client):
    """PATCH /api/organizations/me with oversized logo should return 400."""
    mock_orgs.find_one.return_value = {"_id": ObjectId("507f1f77bcf86cd799439011"), "name": "Test"}
    large_logo = "data:image/png;base64," + ("A" * 1_500_000)
    resp = auth_client.patch("/api/organizations/me", json={"logo": large_logo})
    assert resp.status_code == 400
    assert "Logo must be under 1 MB" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_invalid_name_type(mock_orgs, auth_client):
    """PATCH /api/organizations/me with non-string name should return 400."""
    mock_orgs.find_one.return_value = {"_id": ObjectId("507f1f77bcf86cd799439011"), "name": "Test"}
    resp = auth_client.patch("/api/organizations/me", json={"name": 123})
    assert resp.status_code == 400
    assert "name must be a string" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_clear_logo(mock_orgs, auth_client):
    """PATCH /api/organizations/me with null logo should clear it."""
    updated_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "name": "Test Org",
        "logo": None,
        "package": "enterprise",
    }
    mock_orgs.find_one.return_value = updated_doc
    
    resp = auth_client.patch("/api/organizations/me", json={"logo": None})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["organization"]["logo"] is None


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_db_error(mock_orgs, auth_client):
    """PATCH /api/organizations/me with DB error should return 500."""
    mock_orgs.update_one.side_effect = Exception("DB Error")
    mock_orgs.find_one.return_value = {"_id": ObjectId("507f1f77bcf86cd799439011"), "name": "Test"}
    
    resp = auth_client.patch("/api/organizations/me", json={"name": "New Name"})
    assert resp.status_code == 500
    assert "Internal server error" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_empty_payload(mock_orgs, auth_client):
    """PATCH /api/organizations/me with empty payload should still update timestamp."""
    updated_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "name": "Test Org",
        "package": "enterprise",
    }
    mock_orgs.find_one.return_value = updated_doc
    
    resp = auth_client.patch("/api/organizations/me", json={})
    assert resp.status_code == 200
    # Verify update_one was called even with empty payload (to update timestamp)
    assert mock_orgs.update_one.called


@patch("cloudshield.Server.routes.api.organizations")
def test_update_my_organization_not_found_after_update(mock_orgs, auth_client):
    """PATCH /api/organizations/me when org disappears after update."""
    # First find_one returns None (simulating race condition)
    mock_orgs.find_one.return_value = None
    
    resp = auth_client.patch("/api/organizations/me", json={"name": "New Name"})
    assert resp.status_code == 404
    assert "not found" in resp.get_json()["error"]


# ---------------------------------------------------------------------------
# GET /api/organizations/me/metrics
# ---------------------------------------------------------------------------

@patch("cloudshield.Server.routes.api.db")
@patch("cloudshield.Server.routes.api.db_admin")
def test_get_my_organization_metrics_success(mock_db_admin, mock_db, auth_client):
    """GET /api/organizations/me/metrics should return resource counts."""
    mock_users = MagicMock()
    mock_users.count_documents.return_value = 25
    mock_db.__getitem__.return_value = mock_users
    
    mock_workstations = MagicMock()
    mock_workstations.count_documents.return_value = 10
    mock_groups = MagicMock()
    mock_groups.count_documents.return_value = 5
    mock_shares = MagicMock()
    mock_shares.count_documents.return_value = 3
    
    def get_collection(name):
        if name == "workstations":
            return mock_workstations
        elif name == "access_groups":
            return mock_groups
        elif name == "shares":
            return mock_shares
        return MagicMock()
    
    mock_db_admin.__getitem__.side_effect = get_collection
    
    resp = auth_client.get("/api/organizations/me/metrics")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["stats"]["users"] == 25
    assert data["stats"]["workstations"] == 10
    assert data["stats"]["access_groups"] == 5
    assert data["stats"]["shares"] == 3


@patch("cloudshield.Server.routes.api.db_admin")
def test_get_my_organization_metrics_missing_org_id(mock_db_admin, client):
    """GET /api/organizations/me/metrics without org_id should return 401."""
    from cloudshield.Server.server import create_app
    from flask import g as flask_g
    
    app = create_app()
    app.testing = True
    
    @app.before_request
    def _inject_user_no_org():
        flask_g.user = {"id": "test-user", "role": "user"}
    
    client = app.test_client()
    resp = client.get("/api/organizations/me/metrics")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/file_shares/<org_id>/<share_name> - Additional Coverage
# ---------------------------------------------------------------------------

@patch("cloudshield.Server.routes.api.service_dispatcher")
@patch("cloudshield.Server.routes.api.update_share")
def test_update_file_share_all_fields(mock_update_share, mock_dispatcher, client):
    """Test updating file share with all possible fields."""
    mock_update_share.return_value = True
    mock_dispatcher.return_value = MagicMock(id="dc_job_123")
    
    resp = client.patch("/api/file_shares/acme/Finance", json={
        "kind": "folder",
        "groups": ["finance"],
        "users": ["alice", "bob"],
        "description": "Finance files",
        "owner": "admin@acme.com",
        "current_size": 1024000,
        "max_size": 50
    })
    
    assert resp.status_code == 200
    assert resp.json["status"] == "SUCCESS"
    assert "dc_job_id" in resp.json


@patch("cloudshield.Server.routes.api.service_dispatcher")
@patch("cloudshield.Server.routes.api.update_share")
def test_update_file_share_dc_sync_failure(mock_update_share, mock_dispatcher, client):
    """Test that DC sync failure is non-blocking."""
    mock_update_share.return_value = True
    mock_dispatcher.side_effect = Exception("DC connection failed")
    
    resp = client.patch("/api/file_shares/acme/Finance", json={"description": "New desc"})
    
    # Should still return 200 even if DC sync fails
    assert resp.status_code == 200
    assert resp.json["status"] == "SUCCESS"
    assert "dc_job_id" not in resp.json


# ---------------------------------------------------------------------------
# POST /api/task/provisionworkstations - Additional Coverage
# ---------------------------------------------------------------------------

def test_provision_workstations_invalid_count_type(client):
    """Test provision workstations with invalid count type."""
    resp = client.post("/api/task/provisionworkstations", json={
        "org_id": "acme",
        "count": "not_a_number"
    })
    assert resp.status_code == 400
    assert "count must be an integer" in resp.get_json()["error"]


@patch("cloudshield.Server.routes.api.service_dispatcher")
def test_provision_workstations_negative_count(mock_dispatcher, client):
    """Test provision workstations with negative count defaults to 1."""
    mock_dispatcher.return_value = MagicMock(id="job_neg")
    
    resp = client.post("/api/task/provisionworkstations", json={
        "org_id": "acme",
        "count": -5
    })
    assert resp.status_code == 202
    
    # Verify dispatcher was called with count 1
    call_kwargs = mock_dispatcher.call_args[1]
    assert call_kwargs["count"] == 1


# ---------------------------------------------------------------------------
# POST /api/task/dc/add_user - Missing Email Test
# ---------------------------------------------------------------------------

def test_dc_add_user_missing_email(client):
    """Test DC add user with missing email."""
    resp = client.post("/api/task/dc/add_user", json={
        "org_id": "acme",
        "username": "testuser",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert "email" in data["error"]


# ---------------------------------------------------------------------------
# POST /api/task/dc/add_user_to_group - Complete Coverage
# ---------------------------------------------------------------------------

def test_task_dc_add_user_to_group_all_params(client):
    """Test DC add user to group with all parameters."""
    resp = client.post("/api/task/dc/add_user_to_group", json={
        "org_id": "acme",
        "username": "alice",
        "group_name": "engineering"
    })
    assert resp.status_code == 202
    assert "job_id" in resp.get_json()


def test_task_dc_add_user_to_group_missing_org(client):
    """Test DC add user to group with missing org_id."""
    resp = client.post("/api/task/dc/add_user_to_group", json={
        "username": "alice",
        "group_name": "engineering"
    })
    assert resp.status_code == 422
    assert "org_id" in resp.get_json()["error"]


def test_task_dc_add_user_to_group_missing_username(client):
    """Test DC add user to group with missing username."""
    resp = client.post("/api/task/dc/add_user_to_group", json={
        "org_id": "acme",
        "group_name": "engineering"
    })
    assert resp.status_code == 422
    assert "username" in resp.get_json()["error"]


def test_task_dc_add_user_to_group_missing_group(client):
    """Test DC add user to group with missing group_name."""
    resp = client.post("/api/task/dc/add_user_to_group", json={
        "org_id": "acme",
        "username": "alice"
    })
    assert resp.status_code == 422
    assert "group_name" in resp.get_json()["error"]

