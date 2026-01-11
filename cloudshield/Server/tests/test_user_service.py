import unittest.mock
import sys
from datetime import datetime, timezone
from pymongo.errors import PyMongoError
import pytest
from bson import ObjectId


# Mock pymongo, rq, and provisioner at module level
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo_errors = unittest.mock.MagicMock()
mock_rq = unittest.mock.MagicMock()
mock_rq.get_current_job = unittest.mock.MagicMock(return_value=None)
mock_provisioner = unittest.mock.MagicMock()
mock_provisioner.get_target_dir = unittest.mock.MagicMock(return_value="/mock/path")


@pytest.fixture(autouse=True, scope="module")
def setup_module_mocks():
    """Set up module-level mocks with proper cleanup to prevent affecting other test files"""
    # Save originals
    original_pymongo = sys.modules.get('pymongo')
    original_pymongo_errors = sys.modules.get('pymongo.errors')
    original_rq = sys.modules.get('rq')
    original_provisioner = sys.modules.get('provisioner')
    original_tasks = sys.modules.get('tasks')
    original_tasks_dc = sys.modules.get('tasks.dc_management')
    original_tasks_task = sys.modules.get('tasks.task')
    
    # Install mocks
    sys.modules['pymongo'] = mock_pymongo
    sys.modules['pymongo.errors'] = mock_pymongo_errors
    sys.modules['rq'] = mock_rq
    sys.modules['provisioner'] = mock_provisioner
    
    # Mock tasks module to prevent circular import when services/__init__.py imports job_service
    mock_tasks = unittest.mock.MagicMock()
    sys.modules['tasks'] = mock_tasks
    sys.modules['tasks.dc_management'] = unittest.mock.MagicMock()
    sys.modules['tasks.task'] = unittest.mock.MagicMock()
    
    yield
    
    # Restore originals to prevent affecting other test files
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
    
    ## DELETE USER TESTS
    def test_delete_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test delete_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        user_id = "507f1f77bcf86cd799439011"

        # --- non-admin is rejected ---
        with pytest.raises(PermissionError, match="admin_only"):
            delete_user(user_id, employee_user)

        # --- invalid ObjectId format ---
        with pytest.raises(ValueError, match="User invalid_id not found"):
            delete_user("invalid_id", admin_user)

        # --- user not found in DB ---
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = None

        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            delete_user(user_id, admin_user)

    def test_delete_user_self_delete_forbidden(self, setup_mocks, admin_user):
        """Admin cannot delete themselves (self-delete guard)"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        # Use a valid ObjectId string for the admin's id for this test
        self_id = "507f1f77bcf86cd799439011"
        admin_user["id"] = self_id  # mutate the fixture dict for this test

        existing_user = {
            "_id": ObjectId(self_id),
            "email": "admin@example.com",
            "role": "employee",              # role doesn't matter for self-delete guard
            "org_id": admin_user["org_id"],
        }

        # Make DB return the "self" user
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        with pytest.raises(PermissionError, match="cannot_delete_self"):
            delete_user(self_id, admin_user)

    def test_delete_user_last_admin_forbidden(self, setup_mocks, admin_user):
        """Deleting the last admin in an org should be prevented"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        # Ensure target user is NOT the same as current admin (avoid self-delete path)
        target_id = "507f1f77bcf86cd799439011"
        if target_id == admin_user["id"]:
            # tweak last digit to stay a valid ObjectId-like string but different from admin id
            target_id = "507f1f77bcf86cd799439012"

        existing_user = {
            "_id": ObjectId(target_id),
            "email": "last-admin@example.com",
            "role": "admin",
            "org_id": admin_user["org_id"],
        }
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        # No other admins in this org
        mocks["users_admin"].count_documents.side_effect = None
        mocks["users_admin"].count_documents.return_value = 0

        with pytest.raises(ValueError, match="Cannot delete the last admin in this organization"):
            delete_user(target_id, admin_user)

    def test_delete_user_success(self, setup_mocks, admin_user):
        """Test successful delete_user operation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        # Use a target ID that is different from the current admin (avoid self-delete).
        user_id = "507f1f77bcf86cd799439011"
        if user_id == admin_user["id"]:
            user_id = "507f1f77bcf86cd799439012"

        existing_user = {
            "_id": ObjectId(user_id),
            "email": "john@example.com",
            # non-admin so we skip "last admin" guard by default
            "role": "employee",
            "org_id": admin_user["org_id"],
        }

        # Clear any previous side_effect and set return_value
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        # For non-admin user, count_documents should not be consulted, but keep it harmless
        mocks["users_admin"].count_documents.side_effect = None

        mock_result = unittest.mock.MagicMock()
        mock_result.acknowledged = True
        mock_result.deleted_count = 1
        mocks["users_admin"].delete_one.return_value = mock_result

        # Reset call counts and clear any side_effect on log_audit
        mocks["users_admin"].delete_one.reset_mock()
        mocks["log_audit"].reset_mock()
        mocks["log_audit"].side_effect = None

        result = delete_user(user_id, admin_user, "Test reason")

        assert result is True
        mocks["users_admin"].delete_one.assert_called_once()
        mocks["log_audit"].assert_called_once()


    def test_delete_user_audit_exception(self, setup_mocks, admin_user):
        """Test delete_user when audit logging fails but deletion succeeds"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        user_id = "507f1f77bcf86cd799439011"
        if user_id == admin_user["id"]:
            user_id = "507f1f77bcf86cd799439012"

        existing_user = {
            "_id": ObjectId(user_id),
            "email": "john@example.com",
            "role": "employee",
            "org_id": admin_user["org_id"],
        }

        # Clear any previous side_effect and set return_value
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        mock_result = unittest.mock.MagicMock()
        mock_result.acknowledged = True
        mock_result.deleted_count = 1
        mocks["users_admin"].delete_one.return_value = mock_result

        # Reset call counts and make audit logging fail
        mocks["users_admin"].delete_one.reset_mock()
        mocks["log_audit"].reset_mock()
        mocks["log_audit"].side_effect = Exception("Audit failed")

        # Should still succeed despite audit failure
        result = delete_user(user_id, admin_user, "Test reason")

        assert result is True
        mocks["users_admin"].delete_one.assert_called_once()
        mocks["log_audit"].assert_called_once()

    def test_delete_user_unacknowledged_delete(self, setup_mocks, admin_user):
        """Test delete_user when deletion is not acknowledged by MongoDB"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        user_id = "507f1f77bcf86cd799439011"
        if user_id == admin_user["id"]:
            user_id = "507f1f77bcf86cd799439012"

        existing_user = {
            "_id": ObjectId(user_id),
            "email": "john@example.com",
            "role": "employee",
            "org_id": admin_user["org_id"],
        }
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        # Test unacknowledged deletion
        mock_result = unittest.mock.MagicMock()
        mock_result.acknowledged = False
        mock_result.deleted_count = 0
        mocks["users_admin"].delete_one.return_value = mock_result

        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            delete_user(user_id, admin_user)

    def test_delete_user_db_error_on_fetch(self, setup_mocks, admin_user):
        """delete_user: DB error while fetching user should raise clean ValueError"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        user_id = "507f1f77bcf86cd799439011"
        # Make sure we pass admin check and reach the find_one call
        mocks["users_admin"].find_one.side_effect = PyMongoError("boom")

        with pytest.raises(ValueError, match="Database error while fetching user"):
            delete_user(user_id, admin_user)

    def test_delete_user_db_error_on_admin_quorum_check(self, setup_mocks, admin_user):
        """delete_user: DB error while checking remaining admins should raise clean ValueError"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        # Use a target ID different from the current admin to avoid self-delete guard
        target_id = "507f1f77bcf86cd799439011"
        if target_id == admin_user["id"]:
            target_id = "507f1f77bcf86cd799439012"

        existing_user = {
            "_id": ObjectId(target_id),
            "email": "last-admin@example.com",
            "role": "admin",  # triggers the quorum check
            "org_id": admin_user["org_id"],
        }

        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        # Force a DB error during admin quorum check
        mocks["users_admin"].count_documents.side_effect = PyMongoError("boom")

        with pytest.raises(ValueError, match="Database error while checking admin quorum"):
            delete_user(target_id, admin_user)
    
    def test_delete_user_db_error_on_delete(self, setup_mocks, admin_user):
        """delete_user: DB error during delete_one should raise clean ValueError"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        user_id = "507f1f77bcf86cd799439011"
        if user_id == admin_user["id"]:
            user_id = "507f1f77bcf86cd799439012"

        existing_user = {
            "_id": ObjectId(user_id),
            "email": "john@example.com",
            "role": "employee", # skip admin quorum branch
            "org_id": admin_user["org_id"],
        }

        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = existing_user

        # Force delete_one itself to fail
        mocks["users_admin"].delete_one.side_effect = PyMongoError("boom")

        with pytest.raises(ValueError, match="Database error while deleting user"):
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

    def test_remove_domain_user_from_db_success(self, setup_mocks):
        """Test successful removal of domain user from database"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import remove_domain_user_from_db
        
        # Mock find_one_and_delete to return deleted user
        deleted_user = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "org_id": "org_123",
            "email": "test@example.com",
            "role": "employee",
            "status": "active"
        }
        mocks['users_admin'].find_one_and_delete.return_value = deleted_user
        
        # Execute
        result = remove_domain_user_from_db(
            org_id="org_123",
            username="testuser",
            job_id="job-456"
        )
        
        # Assert
        assert result is True
        mocks['users_admin'].find_one_and_delete.assert_called_once_with({
            "org_id": "org_123",
            "username": "testuser"
        })

    def test_remove_domain_user_from_db_not_found(self, setup_mocks):
        """Test when domain user doesn't exist in database"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import remove_domain_user_from_db
        
        # Mock find_one_and_delete to return None (user not found)
        mocks['users_admin'].find_one_and_delete.return_value = None
        
        # Execute
        result = remove_domain_user_from_db(
            org_id="org_123",
            username="nonexistent"
        )
        
        # Assert
        assert result is False
        mocks['users_admin'].find_one_and_delete.assert_called_once_with({
            "org_id": "org_123",
            "username": "nonexistent"
        })

    def test_remove_domain_user_from_db_audit_exception(self, setup_mocks):
        """Test that audit logging exceptions don't block user deletion"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import remove_domain_user_from_db
        
        # Setup
        deleted_user = {
            "_id": ObjectId(),
            "username": "testuser",
            "email": "test@example.com",
            "role": "employee",
            "status": "active",
            "org_id": "org_123"
        }
        
        # Mock find_one_and_delete to return a user (successful deletion)
        mocks['users_admin'].find_one_and_delete.return_value = deleted_user
        
        # Mock log_audit to raise an exception
        mocks['log_audit'].side_effect = Exception("Audit system unavailable")
        
        # Execute - should still succeed despite audit failure
        result = remove_domain_user_from_db(
            org_id="org_123",
            username="testuser",
            job_id="job_456"
        )
        
        # Assert
        assert result is True  # Deletion succeeds even if audit fails
        mocks['users_admin'].find_one_and_delete.assert_called_once_with({
            "org_id": "org_123",
            "username": "testuser"
        })
        mocks['log_audit'].assert_called_once()  # Audit was attempted

    ## PUBLIC SIGNUP TESTS
    def test_create_user_public_signup_first_admin(self, setup_mocks, user_data):
        """Test public signup flow - first admin for organization"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user
        
        # Ensure role is admin for public signup
        user_data.role = "admin"
        
        # No existing users in org (first signup)
        mocks['users_admin'].count_documents.return_value = 0
        mocks['users_admin'].find_one.return_value = None
        mocks['get_workstation_count'].return_value = 5
        
        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mocks['users_admin'].insert_one.return_value = mock_result
        
        # Public signup - current_user is None
        result = create_user(user_data, current_user=None, reason="Public signup")
        
        assert result == "507f1f77bcf86cd799439011"
        mocks['users_admin'].insert_one.assert_called_once()
        mocks['log_audit'].assert_called_once()
        
        # Verify audit log has correct actor for public signup
        audit_call = mocks['log_audit'].call_args[1]
        assert audit_call['actor'].get('system') == 'public_signup'

    def test_create_user_public_signup_blocked_existing_users(self, setup_mocks, user_data):
        """Test public signup blocked when organization already has users"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user
        
        user_data.role = "admin"
        
        # Existing users in org
        mocks['users_admin'].count_documents.return_value = 1
        
        # Public signup should be blocked
        with pytest.raises(PermissionError, match="Public signup is disabled"):
            create_user(user_data, current_user=None)

    def test_create_user_public_signup_requires_admin_role(self, setup_mocks, user_data):
        """Test public signup must create admin role"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user
        
        # Try to create non-admin via public signup
        user_data.role = "employee"
        
        # No existing users (would pass first check)
        mocks['users_admin'].count_documents.return_value = 0
        
        # Should be rejected for non-admin role
        with pytest.raises(PermissionError, match="Public signup can only create an admin user"):
            create_user(user_data, current_user=None)

    def test_create_user_workstation_limit_edge_case(self, setup_mocks, admin_user, user_data):
        """Test user creation at exact workstation limit"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user
        
        # Existing users: 4, workstation count: 5, creating 1 more = exactly at limit
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].count_documents.return_value = 4
        mocks['get_workstation_count'].return_value = 5
        
        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mocks['users_admin'].insert_one.return_value = mock_result
        
        result = create_user(user_data, admin_user)
        
        assert result == "507f1f77bcf86cd799439011"
        mocks['users_admin'].insert_one.assert_called_once()

    def test_persist_domain_user_with_minimal_valid_inputs(self, setup_mocks):
        """Test persist_domain_user with minimal but valid edge case inputs to verify boundary conditions"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import persist_domain_user
        
        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mocks['users_admin'].insert_one.return_value = mock_result
        
        # Test with minimal valid data to verify no unexpected length requirements
        result = persist_domain_user("org", "usr", "Pass1!", "e@example.co")
        
        assert result == "507f1f77bcf86cd799439011"
        call_args = mocks['users_admin'].insert_one.call_args[0][0]
        assert call_args["org_id"] == "org"
        assert call_args["username"] == "usr"
        assert call_args["email"] == "e@example.co"
        assert call_args["password"].startswith("hashed::")
