"""Tests for users routes endpoints."""
import pytest
import sys
import unittest.mock

# Mock setup for routes testing
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo_errors = unittest.mock.MagicMock()
mock_pymongo_errors.PyMongoError = Exception
mock_rq = unittest.mock.MagicMock()
mock_rq.get_current_job = unittest.mock.MagicMock(return_value=None)
mock_provisioner = unittest.mock.MagicMock()
mock_provisioner.get_target_dir = unittest.mock.MagicMock(return_value="/mock/path")

sys.modules['pymongo'] = mock_pymongo
sys.modules['pymongo.errors'] = mock_pymongo_errors
sys.modules['rq'] = mock_rq
sys.modules['provisioner'] = mock_provisioner

mock_tasks = unittest.mock.MagicMock()
sys.modules['tasks'] = mock_tasks
sys.modules['tasks.dc_management'] = unittest.mock.MagicMock()
sys.modules['tasks.task'] = unittest.mock.MagicMock()


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

    def test_users_module_imports_successfully(self):
        """Test users routes module can be imported"""
        import cloudshield.Server.routes.users as users_module
        assert users_module is not None

    def test_helper_functions_exist(self):
        """Test that helper functions exist in users routes"""
        from cloudshield.Server.routes.users import _make_json_safe, _json_or_empty, _extract_reason
        
        assert callable(_make_json_safe)
        assert callable(_json_or_empty)
        assert callable(_extract_reason)

    def test_make_json_safe_with_simple_types(self):
        """Test _make_json_safe handles simple types correctly"""
        from cloudshield.Server.routes.users import _make_json_safe
        
        assert _make_json_safe("string") == "string"
        assert _make_json_safe(42) == 42
        assert _make_json_safe(3.14) == 3.14
        assert _make_json_safe(True) is True
        assert _make_json_safe(None) is None

    def test_make_json_safe_with_dict(self):
        """Test _make_json_safe handles dictionaries correctly"""
        from cloudshield.Server.routes.users import _make_json_safe
        
        input_dict = {"key": "value", "nested": {"inner": 42}}
        result = _make_json_safe(input_dict)
        
        assert result == {"key": "value", "nested": {"inner": 42}}
        assert isinstance(result, dict)

    def test_make_json_safe_with_list(self):
        """Test _make_json_safe handles lists correctly"""
        from cloudshield.Server.routes.users import _make_json_safe
        
        input_list = [1, "two", 3.0, None]
        result = _make_json_safe(input_list)
        
        assert result == [1, "two", 3.0, None]
        assert isinstance(result, list)

    def test_endpoint_functions_exist(self, setup_routes_mocks):
        """Test that all required endpoint functions exist"""
        from cloudshield.Server.routes import users
        
        # Verify all endpoint functions are present
        assert hasattr(users, 'list_users_endpoint')
        assert hasattr(users, 'get_user_endpoint')
        assert hasattr(users, 'update_user_endpoint')
        assert hasattr(users, 'deactivate_user_endpoint')
        assert hasattr(users, 'delete_user_endpoint')
        assert hasattr(users, 'create_user_endpoint')
        assert hasattr(users, 'users_bp')

    def test_blueprint_registered(self, setup_routes_mocks):
        """Test that users blueprint is properly defined"""
        from cloudshield.Server.routes.users import users_bp
        
        assert users_bp is not None
        assert users_bp.name == 'users'

    def test_service_functions_mocked(self, setup_routes_mocks):
        """Test that service functions are properly mocked"""
        from cloudshield.Server.routes.users import (
            create_user,
            update_user,
            delete_user,
            list_users,
            get_user,
            deactivate_user
        )
        
        # Verify they're mocked
        assert isinstance(create_user, unittest.mock.MagicMock)
        assert isinstance(update_user, unittest.mock.MagicMock)
        assert isinstance(delete_user, unittest.mock.MagicMock)
        assert isinstance(list_users, unittest.mock.MagicMock)
        assert isinstance(get_user, unittest.mock.MagicMock)
        assert isinstance(deactivate_user, unittest.mock.MagicMock)
