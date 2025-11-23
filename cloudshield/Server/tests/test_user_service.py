import unittest.mock
import sys
from datetime import datetime, timezone

import pytest
from bson import ObjectId


# Mock pymongo first
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo_errors = unittest.mock.MagicMock()


@pytest.fixture(autouse=True)
def setup_pymongo_mocks(monkeypatch):
    """Set up pymongo mocks with proper cleanup"""
    monkeypatch.setitem(sys.modules, 'pymongo', mock_pymongo)
    monkeypatch.setitem(sys.modules, 'pymongo.errors', mock_pymongo_errors)


class TestUserService:
    """Tests for user service functionality"""

    @pytest.fixture(autouse=True)
    def setup_mocks(self, monkeypatch):
        """Setup all mocks for user service testing"""
        
        # Create mock objects  
        mock_users_admin = unittest.mock.MagicMock()
        mock_log_audit = unittest.mock.MagicMock()
        mock_hash_password = unittest.mock.MagicMock()
        mock_hash_password.side_effect = lambda pwd: f"hashed::{pwd}"
        mock_get_workstation_count = unittest.mock.MagicMock()
        mock_get_workstation_count.return_value = 5

        # Import the service module to get access to its globals
        # Need to import after mocking dependencies
        import cloudshield.Server.services.user_service as user_service_module
        
        # Patch the imported variables directly in the service module
        monkeypatch.setattr(user_service_module, "users_admin", mock_users_admin)
        monkeypatch.setattr(user_service_module, "log_audit", mock_log_audit)
        monkeypatch.setattr(user_service_module, "hash_password", mock_hash_password)
        monkeypatch.setattr(user_service_module, "get_workstation_count", mock_get_workstation_count)

        return {
            'users_admin': mock_users_admin,
            'log_audit': mock_log_audit,
            'hash_password': mock_hash_password,
            "get_workstation_count": mock_get_workstation_count
        }

    @pytest.fixture
    def admin_user(self):
        """Mock admin user"""
        return {
            "id": "admin123",
            "role": "admin",
            "org_id": "org_001"
        }

    @pytest.fixture
    def employee_user(self):
        """Mock employee user"""
        return {
            "id": "emp123",
            "role": "employee",
            "org_id": "org_001"
        }

    @pytest.fixture
    def user_data(self):
        """Mock user creation data"""
        mock_data = unittest.mock.MagicMock()
        mock_data.email = "john@example.com"
        mock_data.password = "password123"
        mock_data.org_id = "org_001"
        mock_data.role = "employee"
        mock_data.full_name = "John Doe"
        return mock_data

    ## CREATE USER TESTS

    def test_create_user_comprehensive(self, setup_mocks, admin_user, employee_user, user_data):
        """Test create_user with permission checks, duplicate email, workstation count and successful creation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user
        
        # Test non-admin permission denied
        with pytest.raises(PermissionError, match="admin_only"):
            create_user(user_data, employee_user)
        
        # Test duplicate email
        mocks['users_admin'].find_one.return_value = {"_id": ObjectId(), "email": "john@example.com"}
        with pytest.raises(ValueError, match="User with email john@example.com already exists"):
            create_user(user_data, admin_user)
        # Test workstation count exceeded
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].count_documents.return_value = 4
        mocks['get_workstation_count'].return_value = 0
        with pytest.raises(ValueError, match="User limit reached for this organization"):
            create_user(user_data, admin_user)
        # Test successful creation
        mocks['get_workstation_count'].return_value = 5
        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mocks['users_admin'].insert_one.return_value = mock_result
        
        result = create_user(user_data, admin_user, "Test reason")
        
        assert result == "507f1f77bcf86cd799439011"
        mocks['users_admin'].insert_one.assert_called_once()
        mocks['log_audit'].assert_called_once()
        mocks['hash_password'].assert_called_once_with("password123")

    ## UPDATE USER TESTS

    def test_update_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test update_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import update_user
        
        user_id = "507f1f77bcf86cd799439011"
        
        # Test non-admin permission denied
        update_data = unittest.mock.MagicMock()
        with pytest.raises(PermissionError, match="admin_only"):
            update_user(user_id, update_data, employee_user)
        
        # Test user not found - clear any previous side_effect
        mocks['users_admin'].find_one.side_effect = None
        mocks['users_admin'].find_one.return_value = None
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            update_user(user_id, update_data, admin_user)
        
        # Test no fields to update - clear side_effect and set return_value
        existing_user = {"_id": ObjectId(user_id), "email": "john@example.com"}
        mocks['users_admin'].find_one.side_effect = None
        mocks['users_admin'].find_one.return_value = existing_user
        update_data.dict = unittest.mock.MagicMock(return_value={})
        with pytest.raises(ValueError, match="No fields to update"):
            update_user(user_id, update_data, admin_user)

    def test_update_user_success(self, setup_mocks, admin_user):
        """Test successful update_user operation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import update_user
        
        user_id = "507f1f77bcf86cd799439011"
        update_data = unittest.mock.MagicMock()
        update_data.dict.return_value = {"password": "newpass", "full_name": "Jane Doe"}
        
        existing_user = {"_id": ObjectId(user_id), "email": "john@example.com"}
        updated_user = {"_id": ObjectId(user_id), "email": "john@example.com", "full_name": "Jane Doe"}
        
        # Clear any previous return_value and set side_effect for multiple calls
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].find_one.side_effect = [existing_user, updated_user]
        
        # Reset call counts for assertions
        mocks['users_admin'].update_one.reset_mock()
        mocks['log_audit'].reset_mock()
        mocks['hash_password'].reset_mock()
        
        result = update_user(user_id, update_data, admin_user, "Test reason")
        
        assert result is True
        mocks['users_admin'].update_one.assert_called_once()
        mocks['log_audit'].assert_called_once()
        mocks['hash_password'].assert_called_once_with("newpass")

    ## DEACTIVATE USER TESTS

    def test_deactivate_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test deactivate_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import deactivate_user
        
        user_id = "507f1f77bcf86cd799439011"
        
        # Test non-admin permission denied
        with pytest.raises(PermissionError, match="admin_only"):
            deactivate_user(user_id, employee_user)
        
        # Test user not found
        mocks['users_admin'].find_one.return_value = None
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            deactivate_user(user_id, admin_user)

    def test_deactivate_user_success(self, setup_mocks, admin_user):
        """Test successful deactivate_user operation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import deactivate_user
        
        user_id = "507f1f77bcf86cd799439011"
        before_user = {"_id": ObjectId(user_id), "email": "john@example.com", "status": "active"}
        after_user = {"_id": ObjectId(user_id), "email": "john@example.com", "status": "inactive"}
        
        # Clear any previous return_value and set side_effect
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].find_one.side_effect = [before_user, after_user]
        
        # Reset call counts for assertions
        mocks['users_admin'].update_one.reset_mock()
        mocks['log_audit'].reset_mock()
        
        result = deactivate_user(user_id, admin_user, "Test reason")
        
        assert result is True
        mocks['users_admin'].update_one.assert_called_once()
        mocks['log_audit'].assert_called_once()

    def test_delete_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test delete_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user
        
        user_id = "507f1f77bcf86cd799439011"
        
        # Test non-admin permission denied
        with pytest.raises(PermissionError, match="admin_only"):
            delete_user(user_id, employee_user)
        
        # Test invalid ObjectId
        with pytest.raises(ValueError, match="User invalid_id not found"):
            delete_user("invalid_id", admin_user)
        
        # Test user not found
        mocks['users_admin'].find_one.return_value = None
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            delete_user(user_id, admin_user)

    def test_delete_user_success(self, setup_mocks, admin_user):
        """Test successful delete_user operation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user
        
        user_id = "507f1f77bcf86cd799439011"
        existing_user = {"_id": ObjectId(user_id), "email": "john@example.com"}
        
        # Clear any previous side_effect and set return_value
        mocks['users_admin'].find_one.side_effect = None
        mocks['users_admin'].find_one.return_value = existing_user
        
        mock_result = unittest.mock.MagicMock()
        mock_result.acknowledged = True
        mock_result.deleted_count = 1
        mocks['users_admin'].delete_one.return_value = mock_result
        
        # Reset call counts and clear any side_effect on log_audit
        mocks['users_admin'].delete_one.reset_mock()
        mocks['log_audit'].reset_mock()
        mocks['log_audit'].side_effect = None
        
        result = delete_user(user_id, admin_user, "Test reason")
        
        assert result is True
        mocks['users_admin'].delete_one.assert_called_once()
        mocks['log_audit'].assert_called_once()

    def test_delete_user_audit_exception(self, setup_mocks, admin_user):
        """Test delete_user when audit logging fails but deletion succeeds"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user
        
        user_id = "507f1f77bcf86cd799439011"
        existing_user = {"_id": ObjectId(user_id), "email": "john@example.com"}
        
        # Clear any previous side_effect and set return_value
        mocks['users_admin'].find_one.side_effect = None
        mocks['users_admin'].find_one.return_value = existing_user
        
        mock_result = unittest.mock.MagicMock()
        mock_result.acknowledged = True
        mock_result.deleted_count = 1
        mocks['users_admin'].delete_one.return_value = mock_result
        
        # Reset call counts and make audit logging fail
        mocks['users_admin'].delete_one.reset_mock()
        mocks['log_audit'].reset_mock()
        mocks['log_audit'].side_effect = Exception("Audit failed")
        
        # Should still succeed despite audit failure
        result = delete_user(user_id, admin_user, "Test reason")
        
        assert result is True
        mocks['users_admin'].delete_one.assert_called_once()
        mocks['log_audit'].assert_called_once()

    def test_delete_user_unacknowledged_delete(self, setup_mocks, admin_user):
        """Test delete_user when deletion is not acknowledged"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user
        
        user_id = "507f1f77bcf86cd799439011"
        existing_user = {"_id": ObjectId(user_id), "email": "john@example.com"}
        mocks['users_admin'].find_one.return_value = existing_user
        
        # Test unacknowledged deletion
        mock_result = unittest.mock.MagicMock()
        mock_result.acknowledged = False
        mock_result.deleted_count = 0
        mocks['users_admin'].delete_one.return_value = mock_result
        
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            delete_user(user_id, admin_user)

    def test_must_admin_comprehensive(self, setup_mocks, admin_user, employee_user):
        """Test _must_admin function with various user types and edge cases"""
        setup_mocks
        from cloudshield.Server.services.user_service import _must_admin
        
        # Test admin user passes
        _must_admin(admin_user)  # Should not raise
        
        # Test non-admin user fails
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin(employee_user)
        
        # Test None user fails
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin(None)
        
        # Test edge cases
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin({"id": "test", "role": None})
        
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin({"id": "test", "role": ""})
        
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin({"id": "test"})

    def test_persist_domain_user(self, setup_mocks):
        """Test persist_domain_user creates domain user correctly"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import persist_domain_user
        
        # Mock insert result
        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mocks['users_admin'].insert_one.return_value = mock_result
        
        # Execute
        result = persist_domain_user("org_123", "domain_user", "SecurePass123!", "temp@email")
        
        # Assert
        assert result == "507f1f77bcf86cd799439011"
        
        # Check insert_one was called
        mocks['users_admin'].insert_one.assert_called_once()
        call_args = mocks['users_admin'].insert_one.call_args[0][0]
        
        # Verify document structure
        assert call_args["org_id"] == "org_123"
        assert call_args["username"] == "domain_user"
        assert call_args["password"] == "hashed::SecurePass123!"  # mocked hash
        assert call_args["role"] == "employee"
        assert call_args["status"] == "active"
        assert "created_at" in call_args
        assert "updated_at" in call_args
        
        # Verify password was hashed
        mocks['hash_password'].assert_called_once_with("SecurePass123!")  

    def test_update_user_without_password(self, setup_mocks, admin_user):
        """Ensure update_user skips hashing when password field absent."""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import update_user

        user_id = "507f1f77bcf86cd799439011"
        update_data = unittest.mock.MagicMock()
        update_data.dict.return_value = {"full_name": "No Password"}

        existing_user = {"_id": ObjectId(user_id), "email": "john@example.com", "full_name": "Old"}
        updated_user = existing_user | {"full_name": "No Password"}

        mocks['users_admin'].find_one.side_effect = [existing_user, updated_user]
        mocks['hash_password'].reset_mock()

        result = update_user(user_id, update_data, admin_user)

        assert result is True
        mocks['hash_password'].assert_not_called()
        mocks['users_admin'].update_one.assert_called_once()

    def test_list_users_requires_admin(self, setup_mocks, employee_user):
        """list_users should enforce admin guard."""
        setup_mocks
        from cloudshield.Server.services.user_service import list_users

        with pytest.raises(PermissionError, match="admin_only"):
            list_users(employee_user)

    def test_list_users_formats_dates(self, setup_mocks, admin_user):
        """list_users returns stringified ids and iso timestamps."""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import list_users

        created = datetime(2025, 1, 1, tzinfo=timezone.utc)
        updated = datetime(2025, 1, 2, tzinfo=timezone.utc)
        doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "email": "john@example.com",
            "created_at": created,
            "updated_at": updated,
        }

        mocks['users_admin'].find.return_value = [doc]

        users = list_users(admin_user)

        assert users[0]["_id"] == "507f1f77bcf86cd799439011"
        assert users[0]["created_at"] == created.isoformat()
        assert users[0]["updated_at"] == updated.isoformat()
