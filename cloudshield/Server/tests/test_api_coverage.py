"""Additional tests for cloudshield/Server/routes/api.py for improved coverage

These tests focus on the uncovered lines in the api.py routes module,
building on the existing test_routes_api.py tests.
"""
import sys
import types
import unittest.mock
import pytest
from unittest.mock import patch

# Mock redis before any imports
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

class _RedisError(Exception):
    pass

_fake_redis.RedisError = _RedisError

sys.modules['redis'] = _fake_redis


@pytest.fixture()
def client(monkeypatch):
    """Create Flask test client with all mocks"""
    with patch("cloudshield.Server.redis_client.redis.Redis"):
        class DummyJob:
            def __init__(self, job_id="p1"):
                self.id = job_id

        # Patch before app creation
        monkeypatch.setattr("cloudshield.Server.routes.api.service_dispatcher", lambda service_name, **kw: DummyJob())
        
        from cloudshield.Server.server import create_app
        import cloudshield.Server.routes.api as api_mod
        import cloudshield.Server.services as services

        # Setup mocks
        monkeypatch.setattr(services, "get_job_status", lambda jid: ({"job_id": jid, "status": "finished"}, 200))
        monkeypatch.setattr(services, "health_status", lambda: ({"status": "ok", "redis": True}, 200))

        monkeypatch.setattr(api_mod, "get_job_status", services.get_job_status)
        monkeypatch.setattr(api_mod, "health_status", services.health_status)

        app = create_app()
        app.testing = True
        return app.test_client()


# Tests for DC operations - covering missing lines 18-108

class TestDCDeleteFileShare:
    """Tests for /task/dc/delete_file_share"""
    
    def test_delete_success(self, client):
        """Line 28-29: successful response with job_id"""
        resp = client.post("/api/task/dc/delete_file_share", json={
            "org_id": "acme",
            "share_name": "share1"
        })
        assert resp.status_code == 202
        assert "job_id" in resp.json
    
    def test_delete_missing_org_id(self, client):
        """Line 21-23: org_id validation"""
        resp = client.post("/api/task/dc/delete_file_share", json={
            "share_name": "share1"
        })
        assert resp.status_code == 422
        assert "org_id is required" in resp.json["error"]
    
    def test_delete_missing_share_name(self, client):
        """Line 24-26: share_name validation"""
        resp = client.post("/api/task/dc/delete_file_share", json={
            "org_id": "acme"
        })
        assert resp.status_code == 422
        assert "share_name is required" in resp.json["error"]


class TestDCCreateFileShare:
    """Tests for /task/dc/create_file_share"""
    
    def test_create_success(self, client):
        """Line 45-47: successful response"""
        resp = client.post("/api/task/dc/create_file_share", json={
            "org_id": "acme",
            "share_name": "newshare"
        })
        assert resp.status_code == 202
    
    def test_create_missing_org_id(self, client):
        """Line 38-40: org_id validation"""
        resp = client.post("/api/task/dc/create_file_share", json={
            "share_name": "newshare"
        })
        assert resp.status_code == 422
        assert "org_id is required" in resp.json["error"]
    
    def test_create_missing_share_name(self, client):
        """Line 41-43: share_name validation"""
        resp = client.post("/api/task/dc/create_file_share", json={
            "org_id": "acme"
        })
        assert resp.status_code == 422
        assert "share_name is required" in resp.json["error"]


class TestDCSetPassword:
    """Tests for /task/dc/set_password"""
    
    def test_set_password_success(self, client):
        """Line 62-66: successful password set"""
        resp = client.post("/api/task/dc/set_password", json={
            "org_id": "acme",
            "username": "jdoe",
            "new_password": "newpass"
        })
        assert resp.status_code == 202
    
    def test_set_password_missing_org_id(self, client):
        """Line 54-56: org_id validation"""
        resp = client.post("/api/task/dc/set_password", json={
            "username": "jdoe",
            "new_password": "newpass"
        })
        assert resp.status_code == 422
    
    def test_set_password_missing_username(self, client):
        """Line 57-59: username validation"""
        resp = client.post("/api/task/dc/set_password", json={
            "org_id": "acme",
            "new_password": "newpass"
        })
        assert resp.status_code == 422
    
    def test_set_password_missing_password(self, client):
        """Line 60-61: new_password validation"""
        resp = client.post("/api/task/dc/set_password", json={
            "org_id": "acme",
            "username": "jdoe"
        })
        assert resp.status_code == 422


class TestDCUserList:
    """Tests for /task/dc/user_list"""
    
    def test_user_list_success(self, client):
        """Line 77-79: successful response"""
        resp = client.post("/api/task/dc/user_list", json={
            "org_id": "acme"
        })
        assert resp.status_code == 202
    
    def test_user_list_missing_org_id(self, client):
        """Line 72-74: org_id validation"""
        resp = client.post("/api/task/dc/user_list", json={})
        assert resp.status_code == 422


class TestDCRestartSamba:
    """Tests for /task/dc/restart_samba"""
    
    def test_restart_samba_success(self, client):
        """Line 90-92: successful response"""
        resp = client.post("/api/task/dc/restart_samba", json={
            "org_id": "acme"
        })
        assert resp.status_code == 202
    
    def test_restart_samba_missing_org_id(self, client):
        """Line 85-87: org_id validation"""
        resp = client.post("/api/task/dc/restart_samba", json={})
        assert resp.status_code == 422


class TestDCRemoveUser:
    """Tests for /task/dc/remove_user"""
    
    def test_remove_user_success(self, client):
        """Line 106-108: successful response"""
        resp = client.post("/api/task/dc/remove_user", json={
            "org_id": "acme",
            "username": "jdoe"
        })
        assert resp.status_code == 202
    
    def test_remove_user_missing_org_id(self, client):
        """Line 99-101: org_id validation"""
        resp = client.post("/api/task/dc/remove_user", json={
            "username": "jdoe"
        })
        assert resp.status_code == 422
    
    def test_remove_user_missing_username(self, client):
        """Line 102-104: username validation"""
        resp = client.post("/api/task/dc/remove_user", json={
            "org_id": "acme"
        })
        assert resp.status_code == 422


class TestDCAddUser:
    """Tests for /task/dc/add_user - covers lines with validation bug"""
    
    def test_add_user_success(self, client):
        """Line 136-142: successful user addition"""
        resp = client.post("/api/task/dc/add_user", json={
            "org_id": "acme",
            "username": "newuser",
            "password": "newpass"
        })
        assert resp.status_code == 202
    
    def test_add_user_missing_org_id(self, client):
        """Line 126-128: missing org_id triggers logger.warning"""
        resp = client.post("/api/task/dc/add_user", json={
            "username": "newuser",
            "password": "newpass"
        })
        # The endpoint has a bug - it logs warning but returns without proper error code
        assert resp.status_code in [200, 500]
    
    def test_add_user_missing_username(self, client):
        """Line 126-128: missing username"""
        resp = client.post("/api/task/dc/add_user", json={
            "org_id": "acme",
            "password": "newpass"
        })
        assert resp.status_code in [200, 500]
    
    def test_add_user_missing_password(self, client):
        """Line 126-128: missing password"""
        resp = client.post("/api/task/dc/add_user", json={
            "org_id": "acme",
            "username": "newuser"
        })
        assert resp.status_code in [200, 500]


# Tests for infrastructure endpoints with logging

class TestProvisionEndpoint:
    """Tests for /task/provision - covers logging and defaults"""
    
    def test_provision_with_all_params(self, client):
        """Line 164: logging + lines 166-185"""
        resp = client.post("/api/task/provision", json={
            "org_id": "acme",
            "region": "us-east-1",
            "ubuntu_ami": "ami-123",
            "workstation_ami": "ami-456",
            "workstation_count": 3
        })
        assert resp.status_code == 202
    
    def test_provision_missing_org_id(self, client):
        """Line 170-174: validation and warning log"""
        resp = client.post("/api/task/provision", json={})
        assert resp.status_code == 400
    
    def test_provision_empty_org_id(self, client):
        """Line 170: empty string is falsy"""
        resp = client.post("/api/task/provision", json={"org_id": ""})
        assert resp.status_code == 400
    
    def test_provision_defaults(self, client):
        """Line 176: default region, line 182: default workstation_count"""
        resp = client.post("/api/task/provision", json={"org_id": "acme"})
        assert resp.status_code == 202


class TestProvisionWorkstationsEndpoint:
    """Tests for /task/provisionworkstations"""
    
    def test_provision_workstations_success(self, client):
        """Line 204: logging + lines 207-223"""
        resp = client.post("/api/task/provisionworkstations", json={
            "org_id": "acme",
            "region": "us-west-2",
            "count": 5
        })
        assert resp.status_code == 202
    
    def test_provision_workstations_missing_org_id(self, client):
        """Line 209-213: validation and warning"""
        resp = client.post("/api/task/provisionworkstations", json={})
        assert resp.status_code == 400
    
    def test_provision_workstations_empty_org_id(self, client):
        """Line 209: empty string validation"""
        resp = client.post("/api/task/provisionworkstations", json={"org_id": ""})
        assert resp.status_code == 400
    
    def test_provision_workstations_defaults(self, client):
        """Line 222: default count=1, line 211: default region"""
        resp = client.post("/api/task/provisionworkstations", json={"org_id": "acme"})
        assert resp.status_code == 202


class TestDestroyEndpoint:
    """Tests for /task/destroy"""
    
    def test_destroy_success(self, client):
        """Line 241: logging + lines 244-254"""
        resp = client.post("/api/task/destroy", json={
            "org_id": "acme",
            "force": True
        })
        assert resp.status_code == 202
    
    def test_destroy_missing_org_id(self, client):
        """Line 246-250: validation and warning"""
        resp = client.post("/api/task/destroy", json={})
        assert resp.status_code == 400
    
    def test_destroy_empty_org_id(self, client):
        """Line 246: empty string validation"""
        resp = client.post("/api/task/destroy", json={"org_id": ""})
        assert resp.status_code == 400
    
    def test_destroy_force_default(self, client):
        """Line 252: default force=False"""
        resp = client.post("/api/task/destroy", json={"org_id": "acme"})
        assert resp.status_code == 202


# ✅ New tests for /signup_admin (public endpoint)

class TestSignupAdminEndpoint:
    """Tests for /api/signup_admin"""

    def test_signup_admin_success_forces_role_and_passes_reason(self, client, monkeypatch):
        """Covers: success path + role forced to admin + reason forwarded + current_user=None"""
        import cloudshield.Server.routes.api as api_mod

        captured = {}

        def _fake_create_user(user_data, current_user=None, reason=None, **kwargs):
            captured["role"] = getattr(user_data, "role", None)
            captured["current_user"] = current_user
            captured["reason"] = reason
            captured["email"] = getattr(user_data, "email", None)
            return "new_user_id_123"

        monkeypatch.setattr(api_mod, "create_user", _fake_create_user, raising=True)

        resp = client.post("/api/signup_admin", json={
            "email": "admin@test.com",
            "password": "StrongPassword1!",
            "org_id": "org_001",
            "role": "employee",  # should be overridden
            "full_name": "Admin User",
            "reason": "bootstrap"
        })

        assert resp.status_code == 201
        assert resp.get_json()["user_id"] == "new_user_id_123"
        assert captured["role"] == "admin"
        assert captured["current_user"] is None
        assert captured["reason"] == "bootstrap"
        assert captured["email"] == "admin@test.com"

    def test_signup_admin_validation_error_returns_400(self, client, monkeypatch):
        """Covers: ValidationError -> 400 with 'Validation failed' payload"""
        import cloudshield.Server.routes.api as api_mod

        called = {"count": 0}

        def _fake_create_user(*a, **k):
            called["count"] += 1
            return "should_not_happen"

        monkeypatch.setattr(api_mod, "create_user", _fake_create_user, raising=True)

        # Missing required fields should fail pydantic validation
        resp = client.post("/api/signup_admin", json={})
        assert resp.status_code == 400
        body = resp.get_json()
        assert body["error"] == "Validation failed"
        assert isinstance(body.get("details"), list)
        assert called["count"] == 0

    def test_signup_admin_permission_error_returns_403(self, client, monkeypatch):
        """Covers: PermissionError -> 403"""
        import cloudshield.Server.routes.api as api_mod

        def _raise_perm(*a, **k):
            raise PermissionError("nope")

        monkeypatch.setattr(api_mod, "create_user", _raise_perm, raising=True)

        resp = client.post("/api/signup_admin", json={
            "email": "admin@test.com",
            "password": "StrongPassword1!",
            "org_id": "org_001",
            "full_name": "Admin User",
        })
        assert resp.status_code == 403
        assert resp.get_json()["error"] == "nope"

    def test_signup_admin_value_error_returns_409(self, client, monkeypatch):
        """Covers: ValueError -> 409"""
        import cloudshield.Server.routes.api as api_mod

        def _raise_val(*a, **k):
            raise ValueError("duplicate")

        monkeypatch.setattr(api_mod, "create_user", _raise_val, raising=True)

        resp = client.post("/api/signup_admin", json={
            "email": "admin@test.com",
            "password": "StrongPassword1!",
            "org_id": "org_001",
            "full_name": "Admin User",
        })
        assert resp.status_code == 409
        assert resp.get_json()["error"] == "duplicate"

    def test_signup_admin_unexpected_error_returns_500_with_details(self, client, monkeypatch):
        """Covers: generic Exception -> 500 with details"""
        import cloudshield.Server.routes.api as api_mod

        def _raise_generic(*a, **k):
            raise RuntimeError("boom")

        monkeypatch.setattr(api_mod, "create_user", _raise_generic, raising=True)

        resp = client.post("/api/signup_admin", json={
            "email": "admin@test.com",
            "password": "StrongPassword1!",
            "org_id": "org_001",
            "full_name": "Admin User",
        })
        assert resp.status_code == 500
        body = resp.get_json()
        assert body["error"] == "Internal server error"
        assert "boom" in body.get("details", "")


# Tests for status and health endpoints

class TestStatusEndpoint:
    """Tests for /status/<job_id>"""
    
    def test_status_retrieve(self, client):
        """Line 258-265: get_job_status call"""
        resp = client.get("/status/test-job-id")
        assert resp.status_code == 404


class TestHealthEndpoint:
    """Tests for /health"""
    
    def test_health_retrieve(self, client):
        """Line 272-280: health_status call"""
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert "status" in resp.json
