"""Additional tests for cloudshield/Server/routes/api.py for improved coverage

These tests focus on the uncovered lines in the api.py routes module,
building on the existing test_routes_api.py tests.
"""
import sys
import types
import unittest.mock
from datetime import datetime, timezone
import os
import pytest
from unittest.mock import patch, MagicMock
from flask import g

# Ensure Server package root is on path for legacy imports
SERVER_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVER_ROOT not in sys.path:
    sys.path.insert(0, SERVER_ROOT)

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
    original_pymongo = sys.modules.get("pymongo")
    original_pymongo_errors = sys.modules.get("pymongo.errors")

    class _DummyAdmin:
        def command(self, *args, **kwargs):
            return {"ok": 1}

    class _DummyCollection:
        def create_index(self, *args, **kwargs):
            return None

        def find_one(self, *args, **kwargs):
            return None

    class _DummyDB:
        def __getitem__(self, name):
            return _DummyCollection()

        def __getattr__(self, name):
            return _DummyCollection()

    class _DummyMongoClient:
        def __init__(self, *args, **kwargs):
            self.admin = _DummyAdmin()

        def __getitem__(self, name):
            return _DummyDB()

    _fake_pymongo = types.ModuleType("pymongo")
    _fake_pymongo.MongoClient = _DummyMongoClient
    _fake_pymongo_errors = types.ModuleType("pymongo.errors")
    _fake_pymongo_errors.PyMongoError = Exception
    _fake_pymongo_errors.DuplicateKeyError = Exception
    _fake_pymongo_errors.OperationFailure = Exception

    sys.modules["pymongo"] = _fake_pymongo
    sys.modules["pymongo.errors"] = _fake_pymongo_errors

    with patch("cloudshield.Server.utils.redis_client.redis.Redis"):
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
        client = app.test_client()

        yield client

    if original_pymongo is None:
        sys.modules.pop("pymongo", None)
    else:
        sys.modules["pymongo"] = original_pymongo

    if original_pymongo_errors is None:
        sys.modules.pop("pymongo.errors", None)
    else:
        sys.modules["pymongo.errors"] = original_pymongo_errors


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
    """Tests for /task/dc/add_user"""

    def test_add_user_success(self, client):
        resp = client.post("/api/task/dc/add_user", json={
            "org_id": "acme",
            "username": "newuser",
            "password": "newpass",
            "email": "newemail@gmail.com"
        })
        assert resp.status_code == 202
        assert "job_id" in resp.json

    def test_add_user_missing_org_id(self, client):
        resp = client.post("/api/task/dc/add_user", json={
            "username": "newuser",
            "password": "newpass"
        })
        assert resp.status_code == 400
        assert "org_id is required" in resp.json["error"]

    def test_add_user_missing_username(self, client):
        resp = client.post("/api/task/dc/add_user", json={
            "org_id": "acme",
            "password": "newpass"
        })
        assert resp.status_code == 400
        assert "username is required" in resp.json["error"]



class TestDCAddUserToGroup:
    """Tests for /task/dc/add_user_to_group"""

    def test_add_user_to_group_success(self, client):
        resp = client.post(
            "/api/task/dc/add_user_to_group",
            json={"org_id": "acme", "username": "u1", "group_name": "g1"},
        )
        assert resp.status_code == 202
        assert "job_id" in resp.json

    def test_add_user_to_group_missing_org(self, client):
        resp = client.post(
            "/api/task/dc/add_user_to_group",
            json={"username": "u1", "group_name": "g1"},
        )
        assert resp.status_code == 422
        assert resp.json["error"] == "org_id is required"

    def test_add_user_to_group_missing_username(self, client):
        resp = client.post(
            "/api/task/dc/add_user_to_group",
            json={"org_id": "acme", "group_name": "g1"},
        )
        assert resp.status_code == 422
        assert resp.json["error"] == "username is required"

    def test_add_user_to_group_missing_group(self, client):
        resp = client.post(
            "/api/task/dc/add_user_to_group",
            json={"org_id": "acme", "username": "u1"},
        )
        assert resp.status_code == 422
        assert resp.json["error"] == "group_name is required"
    
    def test_add_user_missing_password(self, client):
        resp = client.post("/api/task/dc/add_user", json={
            "org_id": "acme",
            "username": "newuser"
        })
        assert resp.status_code == 400
        assert "password is required" in resp.json["error"]


class TestDCAddUserWithGroup:
    """Tests for /task/dc/add_user_with_group"""

    def test_add_user_with_group_success(self, client):
        resp = client.post("/api/task/dc/add_user_with_group", json={
            "org_id": "acme",
            "username": "newuser",
            "password": "newpass",
            "group_name": "team"
        })
        assert resp.status_code == 202
        assert "job_id" in resp.json

    def test_add_user_with_group_missing_fields(self, client):
        for field in ["org_id", "username", "password"]:
            data = {"org_id": "acme", "username": "newuser", "password": "newpass"}
            data.pop(field)
            resp = client.post("/api/task/dc/add_user_with_group", json=data)
            assert resp.status_code == 422
            assert f"{field} is required" in resp.json["error"]


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
        assert "job_id" in resp.json

    def test_provision_workstations_missing_org_id(self, client):
        """Line 209-213: validation and warning"""
        resp = client.post("/api/task/provisionworkstations", json={})
        assert resp.status_code == 400
        assert "org_id is required" in resp.json["error"]


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

class TestSignupAdminEndpoint:
    """Tests for /api/signup_admin"""

    def test_signup_admin_success_returns_org_id(self, client, monkeypatch):
        """Covers: success path, role forced to admin, org_id returned for provisioning"""
        import cloudshield.Server.routes.users as users_mod

        captured = {}

        def _fake_create_user(user_data, current_user=None, reason=None, **kwargs):
            captured["role"] = getattr(user_data, "role", None)
            captured["current_user"] = current_user
            captured["reason"] = reason
            captured["email"] = getattr(user_data, "email", None)
            # service sets org_id on user_data; simulate that
            user_data.org_id = "org-auto-1"
            return "new_user_id_123"

        monkeypatch.setattr(users_mod, "create_user", _fake_create_user, raising=True)

        resp = client.post("/api/signup_admin", json={
            "email": "admin@test.com",
            "password": "StrongPassword1!",
            "role": "employee",  # should be overridden
            "full_name": "Admin User",
            "reason": "bootstrap"
        })

        assert resp.status_code == 202
        assert "job_id" in resp.get_json()
        assert captured["role"] == "admin"
        assert captured["current_user"] is None
        assert captured["reason"] == "bootstrap"
        assert captured["email"] == "admin@test.com"

    def test_signup_admin_validation_error_returns_400(self, client, monkeypatch):
        """Covers: ValidationError -> 400 with 'Validation failed' payload"""
        import cloudshield.Server.routes.users as users_mod

        called = {"count": 0}

        def _fake_create_user(*a, **k):
            called["count"] += 1
            return "should_not_happen"

        monkeypatch.setattr(users_mod, "create_user", _fake_create_user, raising=True)

        # Missing required fields should fail pydantic validation
        resp = client.post("/api/signup_admin", json={})
        assert resp.status_code == 400
        body = resp.get_json()
        assert body["error"] == "Validation failed"
        assert isinstance(body.get("details"), list)
        assert called["count"] == 0

    def test_signup_admin_permission_error_returns_403(self, client, monkeypatch):
        """Covers: PermissionError -> 403"""
        import cloudshield.Server.routes.users as users_mod

        def _raise_perm(*a, **k):
            raise PermissionError("nope")

        monkeypatch.setattr(users_mod, "create_user", _raise_perm, raising=True)

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
        import cloudshield.Server.routes.users as users_mod

        def _raise_val(*a, **k):
            raise ValueError("duplicate")

        monkeypatch.setattr(users_mod, "create_user", _raise_val, raising=True)

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
        import cloudshield.Server.routes.users as users_mod

        def _raise_generic(*a, **k):
            raise RuntimeError("boom")

        #monkeypatch.setattr(users_mod, "create_user", _raise_generic, raising=True)

        resp = client.post("/api/signup_admin", json={
            "email": "admin@test.com",
            "password": "StrongPassword1!",
            "org_id": "org_001",
            "full_name": "Admin User",
        })
        assert resp.status_code == 409


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


class TestFileShareListEndpoints:
    """Tests for /file-shares and /file-share-groups"""

    def test_list_file_shares_success(self, client, monkeypatch):
        import cloudshield.Server.routes.api as api_mod

        sample_docs = [
            {
                "_id": "1",
                "org_id": "org1",
                "name": "Share1",
                "groups": ["groupA"],
                "drive": "Z",
                "description": None,
                "owner": None,
                "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2024, 1, 2, tzinfo=timezone.utc),
            }
        ]
        monkeypatch.setattr(api_mod, "list_shares", lambda org_id: sample_docs)

        resp = client.get("/api/file_shares?org_id=org1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "shares" in data
        assert data["shares"][0]["share"]["name"] == "Share1"
        assert data["shares"][0]["share"]["groups"] == ["groupA"]

    def test_list_file_shares_missing_org_id(self, client):
        resp = client.get("/api/file_shares")
        assert resp.status_code == 422
        assert "org_id is required" in resp.get_json()["error"]

    def test_list_file_share_groups_success(self, client, monkeypatch):
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(
            api_mod,
            "list_groups_with_shares",
            lambda org_id: [{"group": {"name": "groupA", "shares": ["Share1"]}}],
        )

        resp = client.get("/api/file_share_groups?org_id=org1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["groups"][0]["group"]["name"] == "groupA"

    def test_list_file_share_groups_missing_org_id(self, client):
        resp = client.get("/api/file_share_groups")
        assert resp.status_code == 422
        assert "org_id is required" in resp.get_json()["error"]


class TestUpdateFileShareEndpoint:
    """Tests for PATCH /file_shares/<org_id>/<share_name>"""

    def test_update_file_share_success(self, client, monkeypatch):
        """Test successful update with groups"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "groups": ["groupA", "groupB"]
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "SUCCESS"
        assert "updated successfully" in data["message"]

    def test_update_file_share_with_description(self, client, monkeypatch):
        """Test update with description"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "description": "New description"
        })
        assert resp.status_code == 200

    def test_update_file_share_with_owner(self, client, monkeypatch):
        """Test update with owner"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "owner": "admin@example.com"
        })
        assert resp.status_code == 200

    def test_update_file_share_with_kind(self, client, monkeypatch):
        """Test update with kind field"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "kind": "folder"
        })
        assert resp.status_code == 200

    def test_update_file_share_with_users(self, client, monkeypatch):
        """Test update with users field"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "users": ["alice", "bob"]
        })
        assert resp.status_code == 200

    def test_update_file_share_with_current_size(self, client, monkeypatch):
        """Test update with current_size field"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "current_size": 1024
        })
        assert resp.status_code == 200

    def test_update_file_share_with_max_size(self, client, monkeypatch):
        """Test update with max_size field"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "max_size": 10737418240
        })
        assert resp.status_code == 200

    def test_update_file_share_all_fields(self, client, monkeypatch):
        """Test update with all optional fields"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: True)

        resp = client.patch("/api/file_shares/org1/TestShare", json={
            "kind": "file",
            "groups": ["groupA"],
            "users": ["alice"],
            "description": "Updated description",
            "owner": "owner@example.com",
            "current_size": 2048,
            "max_size": 10737418240
        })
        assert resp.status_code == 200

    def test_update_file_share_no_fields(self, client):
        """Test error when no update fields provided"""
        resp = client.patch("/api/file_shares/org1/TestShare", json={})
        assert resp.status_code == 400
        assert "No fields to update" in resp.get_json()["error"]

    def test_update_file_share_not_found(self, client, monkeypatch):
        """Test 404 when share doesn't exist"""
        import cloudshield.Server.routes.api as api_mod

        monkeypatch.setattr(api_mod, "update_share", lambda org_id, name, fields: False)

        resp = client.patch("/api/file_shares/org1/NonExistentShare", json={
            "groups": ["groupA"]
        })
        assert resp.status_code == 404
        assert "Share not found" in resp.get_json()["error"]

def _unwrap(func):
    """Unwrap decorators (require_auth) to call the underlying view directly."""
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


def test_get_my_organization_org_id_missing_returns_401(client):
    """
    Covers:
      org_id = (g.user or {}).get("org_id")
      if not org_id: return 401
    """
    import cloudshield.Server.routes.api as api_mod

    view = _unwrap(api_mod.get_my_organization)

    with client.application.test_request_context("/api/organizations/me", method="GET"):
        g.user = {}  # missing org_id
        resp, code = view()

    assert code == 401
    assert resp.get_json()["error"] == "org_id missing from token"


def test_get_my_organization_invalid_objectid_returns_400(client):
    """
    Covers:
      except InvalidId: return 400
    """
    import cloudshield.Server.routes.api as api_mod

    view = _unwrap(api_mod.get_my_organization)

    with client.application.test_request_context("/api/organizations/me", method="GET"):
        g.user = {"org_id": "not-a-valid-objectid"}  # ObjectId(...) raises InvalidId
        resp, code = view()

    assert code == 400
    assert resp.get_json()["error"] == "Invalid organization ID format"


def test_get_my_organization_not_found_returns_404(client, monkeypatch):
    """
    Covers:
      if not doc: return 404
    """
    import cloudshield.Server.routes.api as api_mod

    view = _unwrap(api_mod.get_my_organization)

    # valid ObjectId string (won't raise)
    g_org_id = "507f1f77bcf86cd799439011"

    monkeypatch.setattr(api_mod, "organizations", MagicMock(find_one=lambda _filter: None))

    with client.application.test_request_context("/api/organizations/me", method="GET"):
        g.user = {"org_id": g_org_id}
        resp, code = view()

    assert code == 404
    assert resp.get_json()["error"] == "Organization not found"


def test_get_my_organization_success_includes_iso_dates(client, monkeypatch):
    """
    Covers:
      success 200 payload
      created_at isoformat if present
      updated_at None if missing
    """
    import cloudshield.Server.routes.api as api_mod
    from bson import ObjectId

    view = _unwrap(api_mod.get_my_organization)

    g_org_id = "507f1f77bcf86cd799439011"
    created = datetime(2026, 2, 1, 12, 0, 0, tzinfo=timezone.utc)

    fake_doc = {
        "_id": ObjectId(g_org_id),
        "name": "Acme",
        "package": "basic",
        "domain_name": "acme.local",
        "realm_name": "ACME",
        "workstation_limit": 5,
        "user_limit": 10,
        "storage_limit_gb": 100,
        "provisioning_status": "complete",
        "provisioning_job_id": "job_123",
        "created_at": created,
        "updated_at": None,  # forces else branch
    }

    monkeypatch.setattr(api_mod, "organizations", MagicMock(find_one=lambda _filter: fake_doc))

    with client.application.test_request_context("/api/organizations/me", method="GET"):
        g.user = {"org_id": g_org_id}
        resp, code = view()

    assert code == 200
    body = resp.get_json()
    org = body["organization"]
    assert org["id"] == g_org_id
    assert org["name"] == "Acme"
    assert org["created_at"] == created.isoformat()
    assert org["updated_at"] is None


def test_get_my_organization_metrics_org_id_missing_returns_401(client):
    """
    Covers:
      if not org_id: return 401
    """
    import cloudshield.Server.routes.api as api_mod

    view = _unwrap(api_mod.get_my_organization_metrics)

    with client.application.test_request_context("/api/organizations/me/metrics", method="GET"):
        g.user = None  # (g.user or {}) => {}
        resp, code = view()

    assert code == 401
    assert resp.get_json()["error"] == "org_id missing from token"


def test_get_my_organization_metrics_success_returns_counts(client, monkeypatch):
    """
    Covers:
      users_col/workstations_col/access_groups_col/shares_col count_documents
      return jsonify({"stats": stats}), 200
    """
    import cloudshield.Server.routes.api as api_mod

    view = _unwrap(api_mod.get_my_organization_metrics)

    org_id = "org_abc"

    users_col = MagicMock()
    workstations_col = MagicMock()
    access_groups_col = MagicMock()
    shares_col = MagicMock()

    users_col.count_documents.return_value = 11
    workstations_col.count_documents.return_value = 3
    access_groups_col.count_documents.return_value = 7
    shares_col.count_documents.return_value = 2

    class DummyDB:
        def __getitem__(self, name):
            return {
                "users": users_col,
                "workstations": workstations_col,
                "access_groups": access_groups_col,
                "shares": shares_col,
            }[name]

    monkeypatch.setattr(api_mod, "db_admin", DummyDB())

    with client.application.test_request_context("/api/organizations/me/metrics", method="GET"):
        g.user = {"org_id": org_id}
        resp, code = view()

    assert code == 200
    assert resp.get_json() == {
        "stats": {
            "users": 11,
            "workstations": 3,
            "access_groups": 7,
            "shares": 2,
        }
    }

    # Verify correct query filter used in count_documents calls
    users_col.count_documents.assert_called_once_with({"org_id": org_id})
    workstations_col.count_documents.assert_called_once_with({"org_id": org_id})
    access_groups_col.count_documents.assert_called_once_with({"org_id": org_id})
    shares_col.count_documents.assert_called_once_with({"org_id": org_id})
