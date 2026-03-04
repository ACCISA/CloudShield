import pytest
import json
import sys
import unittest.mock
from bson import ObjectId

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

    def test_list_users_endpoint_success(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test GET /users endpoint returns list of users"""
        from cloudshield.Server.routes.users import list_users_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['list_users'].return_value = [
            {"id": "user1", "email": "user1@example.com"},
            {"id": "user2", "email": "user2@example.com"}
        ]
        
        app = Flask(__name__)
        with app.test_request_context():
            g.user = admin_user
            response, status_code = list_users_endpoint()
            
        assert status_code == 200
        assert len(response.json["items"]) == 2

    def test_list_users_endpoint_permission_denied(self, setup_routes_mocks, monkeypatch, employee_user):
        """Test GET /users endpoint denies non-admin access"""
        from cloudshield.Server.routes.users import list_users_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['list_users'].side_effect = PermissionError("admin_only")
        
        app = Flask(__name__)
        with app.test_request_context():
            g.user = employee_user
            response, status_code = list_users_endpoint()
            
        assert status_code == 403

    def test_get_user_endpoint_success(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test GET /users/<user_id> endpoint returns user data"""
        from cloudshield.Server.routes.users import get_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['get_user'].return_value = {
            "id": "user-123",
            "email": "user@example.com",
            "full_name": "Test User"
        }
        
        app = Flask(__name__)
        with app.test_request_context():
            g.user = admin_user
            response, status_code = get_user_endpoint("user-123")
            
        assert status_code == 200
        assert response.json["user"]["email"] == "user@example.com"

    def test_get_user_endpoint_not_found(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test GET /users/<user_id> endpoint returns 404 for missing user"""
        from cloudshield.Server.routes.users import get_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['get_user'].side_effect = ValueError("User not found")
        
        app = Flask(__name__)
        with app.test_request_context():
            g.user = admin_user
            response, status_code = get_user_endpoint("nonexistent")
            
        assert status_code == 404

    def test_update_user_endpoint_success(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test PATCH /users/<user_id> endpoint updates user"""
        from cloudshield.Server.routes.users import update_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['update_user'].return_value = True
        
        app = Flask(__name__)
        with app.test_request_context(
            json={"full_name": "Updated Name", "reason": "Testing"}
        ):
            g.user = admin_user
            response, status_code = update_user_endpoint("user-123")
            
        assert status_code == 200
        assert response.json["message"] == "User updated"

    def test_update_user_endpoint_permission_denied(self, setup_routes_mocks, monkeypatch, employee_user):
        """Test PATCH /users/<user_id> endpoint denies non-admin access"""
        from cloudshield.Server.routes.users import update_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['update_user'].side_effect = PermissionError("admin_only")
        
        app = Flask(__name__)
        with app.test_request_context(json={"full_name": "Updated"}):
            g.user = employee_user
            response, status_code = update_user_endpoint("user-123")
            
        assert status_code == 403

    def test_deactivate_user_endpoint_success(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test POST /users/<user_id>/deactivate endpoint deactivates user"""
        from cloudshield.Server.routes.users import deactivate_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['deactivate_user'].return_value = True
        
        app = Flask(__name__)
        with app.test_request_context(json={"reason": "Testing"}):
            g.user = admin_user
            response, status_code = deactivate_user_endpoint("user-123")
            
        assert status_code == 200
        assert response.json["message"] == "User deactivated"

    def test_delete_user_endpoint_success(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test DELETE /users/<user_id> endpoint deletes user"""
        from cloudshield.Server.routes.users import delete_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['delete_user'].return_value = True
        
        app = Flask(__name__)
        with app.test_request_context():
            g.user = admin_user
            response, status_code = delete_user_endpoint("user-123")
            
        assert status_code == 200
        assert response.json["message"] == "User deleted"

    def test_delete_user_endpoint_self_deletion_prevented(self, setup_routes_mocks, monkeypatch, admin_user):
        """Test DELETE /users/<user_id> prevents self-deletion"""
        from cloudshield.Server.routes.users import delete_user_endpoint
        from flask import Flask, g
        
        mocks = setup_routes_mocks
        mocks['delete_user'].side_effect = PermissionError("cannot_delete_self")
        
        app = Flask(__name__)
        with app.test_request_context():
            g.user = admin_user
            response, status_code = delete_user_endpoint(admin_user["id"])
            
        assert status_code == 403
