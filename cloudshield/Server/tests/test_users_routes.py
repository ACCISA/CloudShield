import pytest
import sys
import unittest.mock
import io
import types
from flask import Flask, g
from pydantic import BaseModel, ValidationError

# Mock setup for routes testing
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo_errors = unittest.mock.MagicMock()
mock_pymongo_errors.PyMongoError = Exception
mock_rq = unittest.mock.MagicMock()
mock_rq.get_current_job = unittest.mock.MagicMock(return_value=None)
mock_provisioner = unittest.mock.MagicMock()
mock_provisioner.get_target_dir = unittest.mock.MagicMock(return_value="/mock/path")


@pytest.fixture(autouse=True, scope="module")
def setup_module_mocks():
    """Set up module-level mocks for routes testing"""
    original_pymongo = sys.modules.get('pymongo')
    original_pymongo_errors = sys.modules.get('pymongo.errors')
    original_rq = sys.modules.get('rq')
    original_provisioner = sys.modules.get('provisioner')
    original_tasks = sys.modules.get('tasks')
    original_tasks_dc = sys.modules.get('tasks.dc_management')
    original_tasks_task = sys.modules.get('tasks.task')
    
    sys.modules['pymongo'] = mock_pymongo
    sys.modules['pymongo.errors'] = mock_pymongo_errors
    sys.modules['rq'] = mock_rq
    sys.modules['provisioner'] = mock_provisioner
    
    mock_tasks = unittest.mock.MagicMock()
    sys.modules['tasks'] = mock_tasks
    sys.modules['tasks.dc_management'] = unittest.mock.MagicMock()
    sys.modules['tasks.task'] = unittest.mock.MagicMock()
    
    yield
    
    for name, original in [
        ('pymongo', original_pymongo),
        ('pymongo.errors', original_pymongo_errors),
        ('rq', original_rq),
        ('provisioner', original_provisioner),
        ('tasks', original_tasks),
        ('tasks.dc_management', original_tasks_dc),
        ('tasks.task', original_tasks_task),
    ]:
        if original is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = original


class TestUsersRoutes:
    """Tests for users routes endpoints"""

    @pytest.fixture(autouse=True)
    def setup_routes_mocks(self, monkeypatch):
        """Setup mocks for routes testing"""
        mock_create_user = unittest.mock.MagicMock()
        mock_update_user = unittest.mock.MagicMock()
        mock_deactivate_user = unittest.mock.MagicMock()
        mock_delete_user = unittest.mock.MagicMock()
        mock_list_users = unittest.mock.MagicMock()
        mock_get_user = unittest.mock.MagicMock()
        mock_service_dispatcher = unittest.mock.MagicMock()
        
        import cloudshield.Server.routes.users as users_module
        
        monkeypatch.setattr(users_module, "create_user", mock_create_user)
        monkeypatch.setattr(users_module, "update_user", mock_update_user)
        monkeypatch.setattr(users_module, "deactivate_user", mock_deactivate_user)
        monkeypatch.setattr(users_module, "delete_user", mock_delete_user)
        monkeypatch.setattr(users_module, "list_users", mock_list_users)
        monkeypatch.setattr(users_module, "get_user", mock_get_user)
        monkeypatch.setattr(users_module, "service_dispatcher", mock_service_dispatcher)
        
        return {
            'create_user': mock_create_user,
            'update_user': mock_update_user,
            'deactivate_user': mock_deactivate_user,
            'delete_user': mock_delete_user,
            'list_users': mock_list_users,
            'get_user': mock_get_user,
            'service_dispatcher': mock_service_dispatcher
        }

    @pytest.fixture
    def admin_user(self):
        """Create mock admin user"""
        return {
            "id": "507f1f77bcf86cd799439011",
            "email": "admin@example.com",
            "role": "admin",
            "org_id": "507f1f77bcf86cd799439012"
        }

    @pytest.fixture
    def employee_user(self):
        """Create mock employee user"""
        return {
            "id": "507f1f77bcf86cd799439013",
            "email": "employee@example.com",
            "role": "employee",
            "org_id": "507f1f77bcf86cd799439012"
        }

    def test_make_json_safe_primitives(self):
        """Test _make_json_safe with primitive types"""
        from cloudshield.Server.routes.users import _make_json_safe

        assert _make_json_safe("string") == "string"
        assert _make_json_safe(42) == 42
        assert _make_json_safe(3.14) == 3.14
        assert _make_json_safe(True) is True
        assert _make_json_safe(None) is None

    def test_make_json_safe_dict(self):
        """Test _make_json_safe with dictionaries"""
        from cloudshield.Server.routes.users import _make_json_safe

        data = {"key": "value", "nested": {"inner": "data"}}
        result = _make_json_safe(data)
        
        assert result["key"] == "value"
        assert result["nested"]["inner"] == "data"

    def test_make_json_safe_list(self):
        """Test _make_json_safe with lists"""
        from cloudshield.Server.routes.users import _make_json_safe

        data = [1, "string", {"nested": "dict"}]
        result = _make_json_safe(data)
        
        assert result[0] == 1
        assert result[1] == "string"
        assert result[2]["nested"] == "dict"

    def test_json_or_empty_with_valid_json(self, monkeypatch):
        """Test _json_or_empty with valid JSON in request"""
        from cloudshield.Server.routes.users import _json_or_empty
        
        mock_request = unittest.mock.MagicMock()
        mock_request.get_json.return_value = {"key": "value"}
        
        with unittest.mock.patch('cloudshield.Server.routes.users.request', mock_request):
            result = _json_or_empty()
            
        assert result == {"key": "value"}

    def test_json_or_empty_with_invalid_json(self, monkeypatch):
        """Test _json_or_empty with invalid JSON returns empty dict"""
        from cloudshield.Server.routes.users import _json_or_empty
        
        mock_request = unittest.mock.MagicMock()
        mock_request.get_json.return_value = None
        
        with unittest.mock.patch('cloudshield.Server.routes.users.request', mock_request):
            result = _json_or_empty()
            
        assert result == {}

    def test_extract_reason_from_json_body(self, monkeypatch):
        """Test _extract_reason extracts reason from JSON body"""
        from cloudshield.Server.routes.users import _extract_reason
        
        mock_request = unittest.mock.MagicMock()
        mock_request.get_json.return_value = {"reason": "Testing reason"}
        mock_request.args.get.return_value = None
        
        with unittest.mock.patch('cloudshield.Server.routes.users.request', mock_request):
            result = _extract_reason()
            
        assert result == "Testing reason"

    def test_extract_reason_from_query_params(self, monkeypatch):
        """Test _extract_reason extracts reason from query params"""
        from cloudshield.Server.routes.users import _extract_reason
        
        mock_request = unittest.mock.MagicMock()
        mock_request.get_json.return_value = None
        mock_request.args.get.return_value = "Query reason"
        
        with unittest.mock.patch('cloudshield.Server.routes.users.request', mock_request):
            result = _extract_reason()
            
        assert result == "Query reason"

    def test_extract_reason_body_takes_precedence(self, monkeypatch):
        """Test _extract_reason prefers body over query params"""
        from cloudshield.Server.routes.users import _extract_reason
        
        mock_request = unittest.mock.MagicMock()
        mock_request.get_json.return_value = {"reason": "Body reason"}
        mock_request.args.get.return_value = "Query reason"
        
        with unittest.mock.patch('cloudshield.Server.routes.users.request', mock_request):
            result = _extract_reason()
            
        assert result == "Body reason"

    def test_extract_reason_returns_none_when_empty(self, monkeypatch):
        """Test _extract_reason returns None when no reason provided"""
        from cloudshield.Server.routes.users import _extract_reason
        
        mock_request = unittest.mock.MagicMock()
        mock_request.get_json.return_value = {"reason": ""}
        mock_request.args.get.return_value = None
        
        with unittest.mock.patch('cloudshield.Server.routes.users.request', mock_request):
            result = _extract_reason()
            
        assert result is None

    def test_endpoints_exist(self, setup_routes_mocks):
        """Test that all endpoint functions exist and are callable"""
        from cloudshield.Server.routes.users import (
            list_users_endpoint,
            get_user_endpoint,
            update_user_endpoint,
            deactivate_user_endpoint,
            delete_user_endpoint
        )
        
        assert callable(list_users_endpoint)
        assert callable(get_user_endpoint)
        assert callable(update_user_endpoint)
        assert callable(deactivate_user_endpoint)
        assert callable(delete_user_endpoint)

    def test_blueprint_exists(self, setup_routes_mocks):
        """Test that users blueprint exists"""
        from cloudshield.Server.routes.users import users_bp
        
        assert users_bp is not None
        assert users_bp.name == 'users'

    def test_service_mocks_are_mocked(self, setup_routes_mocks):
        """Test that service functions are properly mocked"""
        mocks = setup_routes_mocks
        
        assert isinstance(mocks['list_users'], unittest.mock.MagicMock)
        assert isinstance(mocks['get_user'], unittest.mock.MagicMock)
        assert isinstance(mocks['update_user'], unittest.mock.MagicMock)
        assert isinstance(mocks['deactivate_user'], unittest.mock.MagicMock)
        assert isinstance(mocks['delete_user'], unittest.mock.MagicMock)

    def test_list_users_service_can_be_called(self, setup_routes_mocks):
        """Test that list_users service mock can be configured"""
        mocks = setup_routes_mocks
        mocks['list_users'].return_value = [
            {"id": "user1", "email": "user1@example.com"},
            {"id": "user2", "email": "user2@example.com"}
        ]
        
        result = mocks['list_users'](current_user={"role": "admin"})
        assert len(result) == 2
        assert result[0]["email"] == "user1@example.com"

    def test_get_user_service_can_be_called(self, setup_routes_mocks):
        """Test that get_user service mock can be configured"""
        mocks = setup_routes_mocks
        mocks['get_user'].return_value = {
            "id": "user-123",
            "email": "user@example.com",
            "full_name": "Test User"
        }
        
        result = mocks['get_user']("user-123", current_user={"role": "admin"})
        assert result["email"] == "user@example.com"

    def test_update_user_service_can_be_called(self, setup_routes_mocks):
        """Test that update_user service mock can be configured"""
        mocks = setup_routes_mocks
        mocks['update_user'].return_value = True
        
        result = mocks['update_user'](
            "user-123",
            {"full_name": "Updated"},
            current_user={"role": "admin"},
            reason="Testing"
        )
        assert result is True

    def test_deactivate_user_service_can_be_called(self, setup_routes_mocks):
        """Test that deactivate_user service mock can be configured"""
        mocks = setup_routes_mocks
        mocks['deactivate_user'].return_value = True
        
        result = mocks['deactivate_user'](
            "user-123",
            current_user={"role": "admin"},
            reason="Testing"
        )
        assert result is True

    def test_delete_user_service_can_be_called(self, setup_routes_mocks):
        """Test that delete_user service mock can be configured"""
        mocks = setup_routes_mocks
        mocks['delete_user'].return_value = True
        
        result = mocks['delete_user'](
            "user-123",
            current_user={"role": "admin"},
            reason="Testing"
        )
        assert result is True

    def test_delete_user_service_permission_error(self, setup_routes_mocks):
        """Test that delete_user service can raise PermissionError"""
        mocks = setup_routes_mocks
        mocks['delete_user'].side_effect = PermissionError("cannot_delete_self")
        
        with pytest.raises(PermissionError):
            mocks['delete_user'](
                "admin-id",
                current_user={"id": "admin-id", "role": "admin"},
                reason="Testing"
            )

    @staticmethod
    def _unwrap(func):
        inner = func
        while hasattr(inner, "__wrapped__"):
            inner = inner.__wrapped__
        return inner

    def test_make_json_safe_json_dumps_success_path(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        sentinel = object()
        monkeypatch.setattr(users_module.json, "dumps", lambda _v: "ok")

        assert users_module._make_json_safe(sentinel) is sentinel

    def test_create_user_endpoint_value_error_409(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(ValueError("dup")))

        app = Flask(__name__)
        with app.test_request_context("/users", method="POST", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = self._unwrap(users_module.create_user_endpoint)()

        assert status == 409
        assert response.get_json()["error"] == "dup"

    def test_get_user_endpoint_error_branches(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context("/users/u1", method="GET"):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}

            monkeypatch.setattr(users_module, "get_user", lambda *_a, **_k: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = self._unwrap(users_module.get_user_endpoint)("u1")
            assert status == 403
            assert response.get_json()["error"] == "forbidden"

            monkeypatch.setattr(users_module, "get_user", lambda *_a, **_k: (_ for _ in ()).throw(ValueError("missing")))
            response, status = self._unwrap(users_module.get_user_endpoint)("u1")
            assert status == 404
            assert response.get_json()["error"] == "missing"

            monkeypatch.setattr(users_module, "get_user", lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")))
            response, status = self._unwrap(users_module.get_user_endpoint)("u1")
            assert status == 500
            assert response.get_json()["error"] == "Internal server error"

    def test_delete_user_endpoint_dc_warning_branch(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        users_coll = unittest.mock.MagicMock()
        users_coll.find_one.return_value = {
            "email": "john@example.com",
            "org_id": "org1",
            "full_name": "John",
        }
        monkeypatch.setattr(users_module, "db_admin", {"users": users_coll})
        monkeypatch.setattr(users_module, "delete_user", lambda *_a, **_k: None)
        monkeypatch.setattr(
            users_module,
            "service_dispatcher",
            lambda **_kwargs: (_ for _ in ()).throw(Exception("dc-failed")),
        )

        app = Flask(__name__)
        with app.test_request_context("/users/507f1f77bcf86cd799439011", method="DELETE", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = self._unwrap(users_module.delete_user_endpoint)("507f1f77bcf86cd799439011")

        assert status == 200
        data = response.get_json()
        assert data["message"] == "User deleted"
        assert "dc_sync_warning" in data

    def test_signup_admin_endpoint_generic_exception_500(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(RuntimeError("boom")))

        app = Flask(__name__)
        with app.test_request_context("/signup_admin", method="POST", json={}):
            response, status = self._unwrap(users_module.signup_admin_endpoint)()

        assert status == 500
        data = response.get_json()
        assert data["error"] == "Internal server error"
        assert data["details"] == "boom"

    def test_import_users_csv_file_validation_errors(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        security_mod = types.SimpleNamespace(is_bcrypt_string=lambda _v: True)
        utils_mod = types.SimpleNamespace(users_admin=unittest.mock.MagicMock(), log_audit=lambda **_k: None)
        monkeypatch.setitem(sys.modules, "security", security_mod)
        monkeypatch.setitem(sys.modules, "security.passwords", types.SimpleNamespace(hash_password=lambda v: f"hashed::{v}"))
        monkeypatch.setitem(sys.modules, "utils", utils_mod)

        app = Flask(__name__)
        inner = self._unwrap(users_module.import_users_csv)

        with app.test_request_context("/users/import-csv", method="POST", data={}, content_type="multipart/form-data"):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner()
            assert status == 400
            assert response.get_json()["error"] == "No file provided"

        with app.test_request_context(
            "/users/import-csv",
            method="POST",
            data={"file": (io.BytesIO(b"x"), "")},
            content_type="multipart/form-data",
        ):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner()
            assert status == 400
            assert response.get_json()["error"] == "No file selected"

        with app.test_request_context(
            "/users/import-csv",
            method="POST",
            data={"file": (io.BytesIO(b"x"), "users.txt")},
            content_type="multipart/form-data",
        ):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner()
            assert status == 400
            assert response.get_json()["error"] == "File must be a CSV"

    def test_import_users_csv_missing_org_id(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        security_mod = types.SimpleNamespace(is_bcrypt_string=lambda _v: True)
        utils_mod = types.SimpleNamespace(users_admin=unittest.mock.MagicMock(), log_audit=lambda **_k: None)
        monkeypatch.setitem(sys.modules, "security", security_mod)
        monkeypatch.setitem(sys.modules, "security.passwords", types.SimpleNamespace(hash_password=lambda v: f"hashed::{v}"))
        monkeypatch.setitem(sys.modules, "utils", utils_mod)

        app = Flask(__name__)
        inner = self._unwrap(users_module.import_users_csv)
        csv_bytes = b"email,full_name,password_hash,role,workstations\nuser@example.com,User,$2b$12$hash,employee,WS1\n"

        with app.test_request_context(
            "/users/import-csv",
            method="POST",
            data={"file": (io.BytesIO(csv_bytes), "users.csv")},
            content_type="multipart/form-data",
        ):
            g.user = {"id": "admin", "role": "admin"}
            response, status = inner()

        assert status == 400
        assert response.get_json()["error"] == "Missing org_id for authenticated user"

    def test_import_users_csv_mixed_row_outcomes(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        class _UsersAdmin:
            def __init__(self):
                self.inserted = []

            def find_one(self, query):
                email = query.get("email")
                if email == "dup@example.com":
                    return {"_id": "already"}
                if email == "boom@example.com":
                    raise RuntimeError("row boom")
                return None

            def insert_one(self, doc):
                if doc.get("email") == "badvalue@example.com":
                    raise ValueError("bad value")
                self.inserted.append(doc)
                return types.SimpleNamespace(inserted_id="507f1f77bcf86cd799439011")

        class _M(BaseModel):
            x: int

        try:
            _M(x="bad")
        except ValidationError as e:
            validation_error = e

        def _is_bcrypt_string(v):
            if v == "raise-validation":
                raise validation_error
            return v.startswith("$2b$")

        users_admin = _UsersAdmin()
        log_audit = unittest.mock.MagicMock(side_effect=RuntimeError("audit fail"))
        security_mod = types.SimpleNamespace(is_bcrypt_string=_is_bcrypt_string)
        security_passwords_mod = types.SimpleNamespace(hash_password=lambda v: f"hashed::{v}")
        utils_mod = types.SimpleNamespace(users_admin=users_admin, log_audit=log_audit)
        monkeypatch.setitem(sys.modules, "security", security_mod)
        monkeypatch.setitem(sys.modules, "security.passwords", security_passwords_mod)
        monkeypatch.setitem(sys.modules, "utils", utils_mod)

        def _limit(org_id, additional_users=1):
            if org_id == "org1" and additional_users == 1 and _limit.current_email == "limit@example.com":
                raise ValueError("Organization user limit reached")

        _limit.current_email = ""
        monkeypatch.setattr(users_module, "enforce_org_user_limit", _limit)
        monkeypatch.setattr(users_module, "service_dispatcher", unittest.mock.MagicMock())

        csv_text = (
            "email,full_name,password_hash,role,workstations\n"
            ",NoEmail,$2b$12$hash,employee,WS1\n"
            "invalidemail,NoAt,$2b$12$hash,employee,WS1\n"
            "dup@example.com,Dup User,$2b$12$hash,employee,WS1\n"
            "limit@example.com,Limited,$2b$12$hash,employee,WS1\n"
            "badhash@example.com,Bad Hash,not-bcrypt,employee,WS1\n"
            "valid@example.com,Valid User,$2b$12$validhash,unknown,WS1;;WS2\n"
            "nows@example.com,No Workstations,$2b$12$okhash,employee,\n"
            "raiseval@example.com,Raise Val,raise-validation,employee,WS1\n"
            "badvalue@example.com,Bad Value,$2b$12$okhash,employee,WS1\n"
            "boom@example.com,Boom,$2b$12$okhash,employee,WS1\n"
        )

        app = Flask(__name__)
        inner = self._unwrap(users_module.import_users_csv)

        original_find_one = users_admin.find_one

        def _tracking_find_one(query):
            _limit.current_email = query.get("email", "")
            return original_find_one(query)

        users_admin.find_one = _tracking_find_one

        with app.test_request_context(
            "/users/import-csv",
            method="POST",
            data={"file": (io.BytesIO(csv_text.encode("utf-8")), "users.csv")},
            content_type="multipart/form-data",
        ):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner()

        assert status == 200
        payload = response.get_json()
        assert payload["created"] == 3
        assert payload["job_ids"] == []
        assert any("Missing required fields" in (e.get("error") or "") for e in payload["errors"])
        assert any("Invalid email format" in (e.get("error") or "") for e in payload["errors"])
        assert any("already exists" in (e.get("error") or "") for e in payload["errors"])
        assert any("Organization user limit reached" in (e.get("error") or "") for e in payload["errors"])
        assert not any("invalid password_hash" in (e.get("error") or "") for e in payload["errors"])
        assert any(isinstance(e.get("error"), list) for e in payload["errors"])
        assert any(e.get("error") == "bad value" for e in payload["errors"])
        assert any(e.get("error") == "row boom" for e in payload["errors"])

    def test_import_users_csv_outer_exception_500(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        security_mod = types.SimpleNamespace(is_bcrypt_string=lambda _v: True)
        utils_mod = types.SimpleNamespace(users_admin=unittest.mock.MagicMock(), log_audit=lambda **_k: None)
        monkeypatch.setitem(sys.modules, "security", security_mod)
        monkeypatch.setitem(sys.modules, "security.passwords", types.SimpleNamespace(hash_password=lambda v: f"hashed::{v}"))
        monkeypatch.setitem(sys.modules, "utils", utils_mod)

        app = Flask(__name__)
        inner = self._unwrap(users_module.import_users_csv)

        monkeypatch.setattr(users_module.csv, "DictReader", lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("file read failed")))

        with app.test_request_context(
            "/users/import-csv",
            method="POST",
            data={"file": (io.BytesIO(b"email,full_name,password_hash\n"), "users.csv")},
            content_type="multipart/form-data",
        ):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner()

        assert status == 500
        data = response.get_json()
        assert data["error"] == "Internal server error"
        assert "file read failed" in data["details"]

    def test_make_json_safe_type_error_path(self):
        import cloudshield.Server.routes.users as users_module

        class _X:
            pass

        value = _X()
        result = users_module._make_json_safe(value)
        assert isinstance(result, str)

    def test_handle_user_create_public_signup_and_admin_flow(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        calls = {"create": None, "dispatch": None, "body": None}

        class _DummyUserCreate:
            def __init__(self, **kwargs):
                calls["body"] = kwargs
                self.username = kwargs.get("username")
                self.full_name = kwargs.get("full_name", "Test User")
                self.email = kwargs.get("email", "signup@example.com")
                self.org_id = kwargs.get("org_id", "org1")
                self.password = kwargs.get("password", "Pass123!")

        monkeypatch.setattr(users_module, "UserCreate", _DummyUserCreate)
        monkeypatch.setattr(users_module, "_extract_reason", lambda: "because")
        monkeypatch.setattr(users_module, "create_user", lambda ud, current_user=None, reason=None: calls.__setitem__("create", (ud, current_user, reason)))
        monkeypatch.setattr(
            users_module,
            "service_dispatcher",
            lambda **kwargs: (calls.__setitem__("dispatch", kwargs) or types.SimpleNamespace(id="job-1")),
        )

        app = Flask(__name__)
        with app.test_request_context("/signup_admin", method="POST", json={"email": "signup@example.com", "password": "Pass123!", "org_id": "org1"}):
            response, status = users_module._handle_user_create(None)
            assert status == 202
            assert response.get_json()["job_id"] == "job-1"
            assert calls["body"]["role"] == "admin"

        with app.test_request_context("/users", method="POST", json={"email": "admin@example.com", "password": "Pass123!", "org_id": "org1", "username": "admin"}):
            response, status = users_module._handle_user_create({"id": "admin"})
            assert status == 202
            assert response.get_json()["job_id"] == "job-1"

        assert calls["create"][2] == "because"
        assert calls["dispatch"]["service_name"] == "dc_add_user"

    def test_list_users_endpoint_branches(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        inner = self._unwrap(users_module.list_users_endpoint)

        with app.test_request_context("/users", method="GET"):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "list_users", lambda current_user=None: [{"id": "1"}])
            response, status = inner()
            assert status == 200
            assert response.get_json()["items"] == [{"id": "1"}]

            monkeypatch.setattr(users_module, "list_users", lambda current_user=None: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = inner()
            assert status == 403

            monkeypatch.setattr(users_module, "list_users", lambda current_user=None: (_ for _ in ()).throw(RuntimeError("boom")))
            response, status = inner()
            assert status == 500

    def test_create_user_endpoint_success_and_error_branches(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        inner = self._unwrap(users_module.create_user_endpoint)

        with app.test_request_context("/users", method="POST", json={"org_id": "org1", "email": "john@example.com", "full_name": "John", "password": "Pass123!"}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}

            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (users_module.jsonify({"org_id": "org1"}), 201))
            monkeypatch.setattr(users_module, "service_dispatcher", lambda **_k: types.SimpleNamespace(id="dc-job"))
            response, status = inner()
            assert status == 201
            assert response.get_json()["dc_job_id"] == "dc-job"

            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = inner()
            assert status == 403

            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(ValueError("dup")))
            response, status = inner()
            assert status == 409

            class _M(BaseModel):
                x: int

            try:
                _M(x="bad")
            except ValidationError as e:
                validation_error = e
            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(validation_error))
            response, status = inner()
            assert status == 400

            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(RuntimeError("boom")))
            response, status = inner()
            assert status == 500

    def test_get_user_update_and_deactivate_success_paths(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context("/users/u1", method="GET"):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "get_user", lambda user_id, current_user=None: {"id": user_id})
            response, status = self._unwrap(users_module.get_user_endpoint)("u1")
            assert status == 200
            assert response.get_json()["user"]["id"] == "u1"

        with app.test_request_context("/users/u1", method="PATCH", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "UserUpdate", lambda **_k: {"ok": True})
            monkeypatch.setattr(users_module, "update_user", lambda *_a, **_k: None)
            response, status = self._unwrap(users_module.update_user_endpoint)("u1")
            assert status == 200

        with app.test_request_context("/users/u1/deactivate", method="POST", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "deactivate_user", lambda *_a, **_k: None)
            response, status = self._unwrap(users_module.deactivate_user_endpoint)("u1")
            assert status == 200

    def test_update_and_deactivate_error_branches(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)

        class _M(BaseModel):
            x: int

        try:
            _M(x="bad")
        except ValidationError as e:
            validation_error = e

        with app.test_request_context("/users/u1", method="PATCH", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "UserUpdate", lambda **_k: (_ for _ in ()).throw(validation_error))
            response, status = self._unwrap(users_module.update_user_endpoint)("u1")
            assert status == 400

            monkeypatch.setattr(users_module, "UserUpdate", lambda **_k: {"ok": True})
            monkeypatch.setattr(users_module, "update_user", lambda *_a, **_k: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = self._unwrap(users_module.update_user_endpoint)("u1")
            assert status == 403

            monkeypatch.setattr(users_module, "update_user", lambda *_a, **_k: (_ for _ in ()).throw(ValueError("missing")))
            response, status = self._unwrap(users_module.update_user_endpoint)("u1")
            assert status == 404

            monkeypatch.setattr(users_module, "update_user", lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")))
            response, status = self._unwrap(users_module.update_user_endpoint)("u1")
            assert status == 500

        with app.test_request_context("/users/u1/deactivate", method="POST", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "deactivate_user", lambda *_a, **_k: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = self._unwrap(users_module.deactivate_user_endpoint)("u1")
            assert status == 403

            monkeypatch.setattr(users_module, "deactivate_user", lambda *_a, **_k: (_ for _ in ()).throw(ValueError("missing")))
            response, status = self._unwrap(users_module.deactivate_user_endpoint)("u1")
            assert status == 404

            monkeypatch.setattr(users_module, "deactivate_user", lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")))
            response, status = self._unwrap(users_module.deactivate_user_endpoint)("u1")
            assert status == 500

    def test_delete_user_endpoint_remaining_branches(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        inner = self._unwrap(users_module.delete_user_endpoint)

        # DB lookup failure is swallowed; deletion still succeeds without DC dispatch.
        users_coll = unittest.mock.MagicMock()
        users_coll.find_one.side_effect = RuntimeError("db down")
        monkeypatch.setattr(users_module, "db_admin", {"users": users_coll})
        monkeypatch.setattr(users_module, "delete_user", lambda *_a, **_k: None)
        with app.test_request_context("/users/507f1f77bcf86cd799439011", method="DELETE", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner("507f1f77bcf86cd799439011")
            assert status == 200
            assert response.get_json()["message"] == "User deleted"

        # user_doc present but missing usable username -> skip dispatch.
        users_coll.find_one.side_effect = None
        users_coll.find_one.return_value = {"email": "", "org_id": "org1"}
        with app.test_request_context("/users/507f1f77bcf86cd799439011", method="DELETE", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner("507f1f77bcf86cd799439011")
            assert status == 200
            assert "dc_job_id" not in response.get_json()

        # Successful dispatch path.
        users_coll.find_one.return_value = {"email": "john@example.com", "org_id": "org1", "username": "john"}
        monkeypatch.setattr(users_module, "service_dispatcher", lambda **_k: types.SimpleNamespace(id="job-del"))
        with app.test_request_context("/users/507f1f77bcf86cd799439011", method="DELETE", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            response, status = inner("507f1f77bcf86cd799439011")
            assert status == 200
            assert response.get_json()["dc_job_id"] == "job-del"

        # Outer exception branches.
        with app.test_request_context("/users/507f1f77bcf86cd799439011", method="DELETE", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "delete_user", lambda *_a, **_k: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = inner("507f1f77bcf86cd799439011")
            assert status == 403

            monkeypatch.setattr(users_module, "delete_user", lambda *_a, **_k: (_ for _ in ()).throw(ValueError("missing")))
            response, status = inner("507f1f77bcf86cd799439011")
            assert status == 404

            monkeypatch.setattr(users_module, "delete_user", lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")))
            response, status = inner("507f1f77bcf86cd799439011")
            assert status == 500

    def test_signup_admin_endpoint_other_error_branches(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        inner = self._unwrap(users_module.signup_admin_endpoint)

        class _M(BaseModel):
            x: int

        try:
            _M(x="bad")
        except ValidationError as e:
            validation_error = e

        with app.test_request_context("/signup_admin", method="POST", json={}):
            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(validation_error))
            response, status = inner()
            assert status == 400

            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(PermissionError("forbidden")))
            response, status = inner()
            assert status == 403

            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (_ for _ in ()).throw(ValueError("dup")))
            response, status = inner()
            assert status == 409

    def test_get_current_user_endpoint(self):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context("/users/me", method="GET"):
            g.user = {"_id": "507f1f77bcf86cd799439011", "email": "u@example.com", "password": "hash"}
            response, status = self._unwrap(users_module.get_current_user_endpoint)()
            assert status == 200
            user = response.get_json()["user"]
            assert "password" not in user
            assert user["id"] == "507f1f77bcf86cd799439011"

    def test_create_user_endpoint_non_201_passthrough(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context("/users", method="POST", json={}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (users_module.jsonify({"ok": True}), 202))
            response, status = self._unwrap(users_module.create_user_endpoint)()

        assert status == 202
        assert response.get_json()["ok"] is True

    def test_create_user_endpoint_201_dispatch_skipped_when_missing_fields(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context("/users", method="POST", json={"email": "", "full_name": "", "password": ""}):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (users_module.jsonify({"org_id": ""}), 201))
            dispatch = unittest.mock.MagicMock()
            monkeypatch.setattr(users_module, "service_dispatcher", dispatch)
            response, status = self._unwrap(users_module.create_user_endpoint)()

        assert status == 201
        assert "dc_job_id" not in response.get_json()
        dispatch.assert_not_called()

    def test_create_user_endpoint_201_dispatch_exception_adds_warning(self, monkeypatch):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context(
            "/users",
            method="POST",
            json={"org_id": "org1", "email": "john@example.com", "full_name": "John Doe", "password": "Pass123!"},
        ):
            g.user = {"id": "admin", "role": "admin", "org_id": "org1"}
            monkeypatch.setattr(users_module, "_handle_user_create", lambda _u: (users_module.jsonify({"org_id": "org1"}), 201))
            monkeypatch.setattr(users_module, "service_dispatcher", lambda **_k: (_ for _ in ()).throw(RuntimeError("dc down")))
            response, status = self._unwrap(users_module.create_user_endpoint)()

        assert status == 201
        data = response.get_json()
        assert "dc_sync_warning" in data

    def test_handle_user_create_generates_password_when_none(self, monkeypatch):
        """Test that _generate_password() is called when user_data.password is None (line 170)."""
        import cloudshield.Server.routes.users as users_module

        generated = {"pwd": None}

        class _DummyUserCreate:
            def __init__(self, **kwargs):
                self.username = None
                self.full_name = "No Pwd"
                self.email = "nopwd@example.com"
                self.org_id = "org1"
                self.password = None  # No password provided

        def _fake_generate_password():
            generated["pwd"] = "auto-generated-pwd"
            return generated["pwd"]

        monkeypatch.setattr(users_module, "UserCreate", _DummyUserCreate)
        monkeypatch.setattr(users_module, "_generate_password", _fake_generate_password)
        monkeypatch.setattr(users_module, "_extract_reason", lambda: None)
        monkeypatch.setattr(users_module, "create_user", lambda ud, current_user=None, reason=None: None)
        monkeypatch.setattr(
            users_module,
            "service_dispatcher",
            lambda **kwargs: types.SimpleNamespace(id="job-pwd"),
        )

        app = Flask(__name__)
        with app.test_request_context("/users", method="POST", json={"email": "nopwd@example.com", "full_name": "No Pwd"}):
            response, status = users_module._handle_user_create({"id": "admin"})

        assert status == 202
        # _generate_password() must have been called
        assert generated["pwd"] == "auto-generated-pwd"

    def test_get_current_user_endpoint_when_id_already_present(self):
        import cloudshield.Server.routes.users as users_module

        app = Flask(__name__)
        with app.test_request_context("/users/me", method="GET"):
            g.user = {"id": "abc", "email": "u@example.com", "password": "hash"}
            response, status = self._unwrap(users_module.get_current_user_endpoint)()

        assert status == 200
        user = response.get_json()["user"]
        assert user["id"] == "abc"
        assert "password" not in user

