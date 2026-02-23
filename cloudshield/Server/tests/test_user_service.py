import unittest.mock
import sys
from datetime import datetime, timezone
from pymongo.errors import PyMongoError
import pytest
from bson import ObjectId


# Mock pymongo, rq, and provisioner at module level
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo_errors = unittest.mock.MagicMock()
mock_pymongo_errors.PyMongoError = Exception
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

    # Dummy ObjectIds for testing
    TEST_ORG_ID = "507f1f77bcf86cd799439012"
    TEST_USER_ID = "507f1f77bcf86cd799439011"

    @pytest.fixture
    def admin_user(self):
        """Mock admin user with valid ObjectId string"""
        return {
            "id": self.TEST_USER_ID,
            "role": "admin",
            "org_id": self.TEST_ORG_ID
        }

    @pytest.fixture
    def employee_user(self):
        """Mock employee user with valid ObjectId string"""
        return {
            "id": "507f1f77bcf86cd799439099",
            "role": "employee",
            "org_id": self.TEST_ORG_ID
        }

    @pytest.fixture
    def user_data(self):
        """Mock user creation data matching the updated Pydantic model"""
        mock_data = unittest.mock.MagicMock()
        mock_data.email = "john@example.com"
        mock_data.password = "password123"
        mock_data.org_id = self.TEST_ORG_ID
        mock_data.role = "employee"
        mock_data.full_name = "John Doe"
        mock_data.company_name = None 
        mock_data.package_type = "basic"
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
        mock_result.inserted_id = ObjectId(self.TEST_USER_ID)
        mocks['users_admin'].insert_one.return_value = mock_result
        
        result = create_user(user_data, admin_user, "Test reason")
        
        assert result == self.TEST_USER_ID
        mocks['users_admin'].insert_one.assert_called_once()
        mocks['log_audit'].assert_called_once()
        mocks['hash_password'].assert_called_once_with("password123")

    def test_create_user_with_profile_image(self, setup_mocks, admin_user, user_data):
        """Test create_user includes profile_image in the inserted document."""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user

        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
        user_data.profile_image = test_image
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].count_documents.return_value = 0
        mocks['get_workstation_count'].return_value = 5

        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId(self.TEST_USER_ID)
        mocks['users_admin'].insert_one.return_value = mock_result

        result = create_user(user_data, admin_user)

        assert result == self.TEST_USER_ID
        mocks['users_admin'].insert_one.assert_called_once()
        inserted_doc = mocks['users_admin'].insert_one.call_args[0][0]
        assert "profile_image" in inserted_doc
        assert inserted_doc["profile_image"] == test_image

    # ✅ New tests for public-signup permission rules in create_user()

    def test_create_user_public_signup_denied_when_role_not_admin(self, setup_mocks, user_data, monkeypatch):
        """
        Covers:
          - current_user is None (public signup)
          - role != admin -> PermissionError("Public signup can only create an admin user.")
        """
        mocks = setup_mocks
        import cloudshield.Server.services.user_service as user_service_module
        from cloudshield.Server.services.user_service import create_user

        # Mock organizations collection for org creation
        mock_orgs = unittest.mock.MagicMock()
        mock_insert_result = unittest.mock.MagicMock()
        mock_insert_result.inserted_id = ObjectId()
        mock_orgs.insert_one.return_value = mock_insert_result
        monkeypatch.setattr(user_service_module, "organizations", mock_orgs)

        user_data.role = "employee"  # should be rejected

        with pytest.raises(PermissionError, match="Public signup can only create an admin user."):
            create_user(user_data, current_user=None, reason="bootstrap")

        mocks["users_admin"].find_one.assert_not_called()
        mocks["users_admin"].insert_one.assert_not_called()

    def test_create_user_public_signup_email_already_exists(self, setup_mocks, user_data, monkeypatch):
        """
        Covers:
          - current_user is None (public signup)
          - role is admin (passes role check)
          - email already exists -> ValueError
        """
        mocks = setup_mocks
        import cloudshield.Server.services.user_service as user_service_module
        from cloudshield.Server.services.user_service import create_user

        # Mock organizations collection for org creation
        mock_orgs = unittest.mock.MagicMock()
        mock_insert_result = unittest.mock.MagicMock()
        mock_insert_result.inserted_id = ObjectId()
        mock_orgs.insert_one.return_value = mock_insert_result
        monkeypatch.setattr(user_service_module, "organizations", mock_orgs)

        # Make email check return existing user
        mocks["users_admin"].find_one.return_value = {"_id": "existing_user"}
        user_data.role = "admin"

        with pytest.raises(ValueError, match="already exists"):
            create_user(user_data, current_user=None, reason="bootstrap")

        mocks["users_admin"].insert_one.assert_not_called()

    def test_create_user_public_signup_creates_org_and_sets_org_id(self, setup_mocks, user_data, monkeypatch):
        """
        Covers:
            - current_user is None (public signup)
            - org auto-created with Mongo ObjectId
            - package_type and company_name flow through to org creation
            - org_id is set back on user_data for caller use
        """
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user

        # Patch organizations to control lookups/inserts
        fake_orgs = unittest.mock.MagicMock()
        fake_orgs.find_one.return_value = None
        inserted = {}

        def _fake_insert_one(doc):
            inserted.update(doc)
            m = unittest.mock.MagicMock()
            m.inserted_id = ObjectId(self.TEST_ORG_ID) # Mongo generates this
            return m

        fake_orgs.insert_one.side_effect = _fake_insert_one
        monkeypatch.setattr("cloudshield.Server.services.user_service.organizations", fake_orgs, raising=True)

        # Public signup conditions
        mocks["users_admin"].count_documents.return_value = 0
        user_data.role = "admin"
        user_data.org_id = None
        user_data.company_name = "Acme Corp" # Updated field name
        user_data.package_type = "pro"       # Updated field name

        # Pass uniqueness + limit checks
        mocks["users_admin"].find_one.return_value = None
        mocks["get_workstation_count"].return_value = 5

        mock_result = unittest.mock.MagicMock()
        mock_result.inserted_id = ObjectId(self.TEST_USER_ID)
        mocks["users_admin"].insert_one.return_value = mock_result

        mocks["users_admin"].insert_one.reset_mock()
        mocks["log_audit"].reset_mock()

        new_id = create_user(user_data, current_user=None, reason="bootstrap")

        assert new_id == self.TEST_USER_ID
        mocks["users_admin"].insert_one.assert_called_once()
        mocks["log_audit"].assert_called_once()

        # org_id should be generated and set back on user_data
        assert user_data.org_id == self.TEST_ORG_ID

        # Org insert was called with package-derived limits applied via create_organization_doc
        # NOTE: the model sets "package" inside the doc using "package_type"
        assert inserted.get("package") == "pro"

        # Optional: ensure the inserted doc keeps the role admin (service-layer hardening)
        inserted_doc = mocks["users_admin"].insert_one.call_args[0][0]
        assert inserted_doc["role"] == "admin"
        assert inserted_doc["org_id"] == self.TEST_ORG_ID

    def test_create_user_public_signup_enqueues_welcome_email(self, setup_mocks, user_data, monkeypatch):
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user

        fake_orgs = unittest.mock.MagicMock()
        mock_insert_result = unittest.mock.MagicMock()
        mock_insert_result.inserted_id = ObjectId(self.TEST_ORG_ID)
        fake_orgs.insert_one.return_value = mock_insert_result
        monkeypatch.setattr("cloudshield.Server.services.user_service.organizations", fake_orgs, raising=True)

        import services.job_service as job_service_module
        mock_job_enqueue = unittest.mock.MagicMock()
        monkeypatch.setattr(job_service_module, "enqueue_org_welcome_email", mock_job_enqueue, raising=True)

        mocks["users_admin"].find_one.return_value = None
        mocks["users_admin"].count_documents.return_value = 0
        mocks["get_workstation_count"].return_value = 5
        mock_user_result = unittest.mock.MagicMock()
        mock_user_result.inserted_id = ObjectId(self.TEST_USER_ID)
        mocks["users_admin"].insert_one.return_value = mock_user_result

        user_data.role = "admin"
        create_user(user_data, current_user=None, reason="bootstrap")

        mock_job_enqueue.assert_called_once_with(self.TEST_ORG_ID, self.TEST_USER_ID)

    def test_create_user_admin_employee_enqueues_invite(self, setup_mocks, admin_user, user_data, monkeypatch):
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import create_user

        fake_orgs = unittest.mock.MagicMock()
        fake_orgs.find_one.return_value = {}
        monkeypatch.setattr("cloudshield.Server.services.user_service.organizations", fake_orgs, raising=True)

        import services.job_service as job_service_module
        mock_job_enqueue = unittest.mock.MagicMock()
        monkeypatch.setattr(job_service_module, "enqueue_employee_invite_email", mock_job_enqueue, raising=True)

        mocks["users_admin"].find_one.return_value = None
        mocks["users_admin"].count_documents.return_value = 0
        mocks["get_workstation_count"].return_value = 5
        mock_user_result = unittest.mock.MagicMock()
        mock_user_result.inserted_id = ObjectId(self.TEST_USER_ID)
        mocks["users_admin"].insert_one.return_value = mock_user_result

        user_data.role = "employee"
        create_user(user_data, current_user=admin_user, reason="invite")

        mock_job_enqueue.assert_called_once_with(self.TEST_USER_ID)

    ## UPDATE USER TESTS

    def test_update_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test update_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import update_user
        
        # Test non-admin permission denied
        update_data = unittest.mock.MagicMock()
        with pytest.raises(PermissionError, match="admin_only"):
            update_user(self.TEST_USER_ID, update_data, employee_user)
        
        # Test user not found - clear any previous side_effect
        mocks['users_admin'].find_one.side_effect = None
        mocks['users_admin'].find_one.return_value = None
        with pytest.raises(ValueError, match=f"User {self.TEST_USER_ID} not found"):
            update_user(self.TEST_USER_ID, update_data, admin_user)
        
        # Test no fields to update - clear side_effect and set return_value
        existing_user = {"_id": ObjectId(self.TEST_USER_ID), "email": "john@example.com"}
        mocks['users_admin'].find_one.side_effect = None
        mocks['users_admin'].find_one.return_value = existing_user
        update_data.dict = unittest.mock.MagicMock(return_value={})
        with pytest.raises(ValueError, match="No fields to update"):
            update_user(self.TEST_USER_ID, update_data, admin_user)

    def test_update_user_success(self, setup_mocks, admin_user):
        """Test successful update_user operation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import update_user
        
        update_data = unittest.mock.MagicMock()
        update_data.dict.return_value = {"password": "newpass", "full_name": "Jane Doe"}
        
        existing_user = {"_id": ObjectId(self.TEST_USER_ID), "email": "john@example.com"}
        updated_user = {"_id": ObjectId(self.TEST_USER_ID), "email": "john@example.com", "full_name": "Jane Doe"}
        
        # Clear any previous return_value and set side_effect for multiple calls
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].find_one.side_effect = [existing_user, updated_user]
        
        # Reset call counts for assertions
        mocks['users_admin'].update_one.reset_mock()
        mocks['log_audit'].reset_mock()
        mocks['hash_password'].reset_mock()
        
        result = update_user(self.TEST_USER_ID, update_data, admin_user, "Test reason")
        
        assert result is True
        mocks['users_admin'].update_one.assert_called_once()
        mocks['log_audit'].assert_called_once()
        mocks['hash_password'].assert_called_once_with("newpass")

    ## DEACTIVATE USER TESTS

    def test_deactivate_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test deactivate_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import deactivate_user
        
        # Test non-admin permission denied
        with pytest.raises(PermissionError, match="admin_only"):
            deactivate_user(self.TEST_USER_ID, employee_user)
        
        # Test user not found
        mocks['users_admin'].find_one.return_value = None
        with pytest.raises(ValueError, match=f"User {self.TEST_USER_ID} not found"):
            deactivate_user(self.TEST_USER_ID, admin_user)

    def test_deactivate_user_success(self, setup_mocks, admin_user):
        """Test successful deactivate_user operation"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import deactivate_user
        
        before_user = {"_id": ObjectId(self.TEST_USER_ID), "email": "john@example.com", "status": "active"}
        after_user = {"_id": ObjectId(self.TEST_USER_ID), "email": "john@example.com", "status": "inactive"}
        
        # Clear any previous return_value and set side_effect
        mocks['users_admin'].find_one.return_value = None
        mocks['users_admin'].find_one.side_effect = [before_user, after_user]
        
        # Reset call counts for assertions
        mocks['users_admin'].update_one.reset_mock()
        mocks['log_audit'].reset_mock()
        
        result = deactivate_user(self.TEST_USER_ID, admin_user, "Test reason")
        
        assert result is True
        mocks['users_admin'].update_one.assert_called_once()
        mocks['log_audit'].assert_called_once()
    
    ## DELETE USER TESTS
    def test_delete_user_validation_and_errors(self, setup_mocks, admin_user, employee_user):
        """Test delete_user permission checks and validation errors"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        # --- non-admin is rejected ---
        with pytest.raises(PermissionError, match="admin_only"):
            delete_user(self.TEST_USER_ID, employee_user)

        # --- invalid ObjectId format ---
        with pytest.raises(ValueError, match="User invalid_id not found"):
            delete_user("invalid_id", admin_user)

        # --- user not found in DB ---
        mocks["users_admin"].find_one.side_effect = None
        mocks["users_admin"].find_one.return_value = None

        with pytest.raises(ValueError, match=f"User {self.TEST_USER_ID} not found"):
            delete_user(self.TEST_USER_ID, admin_user)

    def test_delete_user_self_delete_forbidden(self, setup_mocks, admin_user):
        """Admin cannot delete themselves (self-delete guard)"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        # Use the exact ID of the admin running the delete
        self_id = admin_user["id"] 

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
        target_id = "507f1f77bcf86cd799439088"

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

        # Use a target ID that is different from the current admin
        user_id = "507f1f77bcf86cd799439088"

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

        user_id = "507f1f77bcf86cd799439088"

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

        user_id = "507f1f77bcf86cd799439088"

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

        # Make sure we pass admin check and reach the find_one call
        mocks["users_admin"].find_one.side_effect = PyMongoError("boom")

        with pytest.raises(ValueError, match="Database error while fetching user"):
            delete_user(self.TEST_USER_ID, admin_user)

    def test_delete_user_db_error_on_admin_quorum_check(self, setup_mocks, admin_user):
        """delete_user: DB error while checking remaining admins should raise clean ValueError"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import delete_user

        target_id = "507f1f77bcf86cd799439088"

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

        user_id = "507f1f77bcf86cd799439088"

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
        mock_result.inserted_id = ObjectId(self.TEST_USER_ID)
        mocks['users_admin'].insert_one.return_value = mock_result
        
        # Execute
        result = persist_domain_user(self.TEST_ORG_ID, "domain_user", "SecurePass123!", "temp@email")
        
        # Assert
        assert result == self.TEST_USER_ID
        
        # Check insert_one was called
        mocks['users_admin'].insert_one.assert_called_once()
        call_args = mocks['users_admin'].insert_one.call_args[0][0]
        
        # Verify document structure
        assert call_args["org_id"] == self.TEST_ORG_ID
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

        update_data = unittest.mock.MagicMock()
        update_data.dict.return_value = {"full_name": "No Password"}

        existing_user = {"_id": ObjectId(self.TEST_USER_ID), "email": "john@example.com", "full_name": "Old"}
        updated_user = existing_user | {"full_name": "No Password"}

        mocks['users_admin'].find_one.side_effect = [existing_user, updated_user]
        mocks['hash_password'].reset_mock()

        result = update_user(self.TEST_USER_ID, update_data, admin_user)

        assert result is True
        mocks['hash_password'].assert_not_called()
        mocks['users_admin'].update_one.assert_called_once()

    def test_update_user_with_profile_image(self, setup_mocks, admin_user):
        """Ensure update_user includes profile_image in the update."""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import update_user

        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
        update_data = unittest.mock.MagicMock()
        update_data.dict.return_value = {"profile_image": test_image}

        existing_user = {
            "_id": ObjectId(self.TEST_USER_ID),
            "email": "john@example.com",
            "profile_image": None,
        }
        updated_user = existing_user | {"profile_image": test_image}

        mocks['users_admin'].find_one.side_effect = [existing_user, updated_user]

        result = update_user(self.TEST_USER_ID, update_data, admin_user)

        assert result is True
        mocks['users_admin'].update_one.assert_called_once()
        call_args = mocks['users_admin'].update_one.call_args
        update_doc = call_args[0][1]["$set"]
        assert "profile_image" in update_doc
        assert update_doc["profile_image"] == test_image

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
            "_id": ObjectId(self.TEST_USER_ID),
            "email": "john@example.com",
            "created_at": created,
            "updated_at": updated,
        }

        mocks['users_admin'].find.return_value = [doc]

        users = list_users(admin_user)

        assert users[0]["_id"] == self.TEST_USER_ID
        assert users[0]["created_at"] == created.isoformat()
        assert users[0]["updated_at"] == updated.isoformat()

    def test_remove_domain_user_from_db_success(self, setup_mocks):
        """Test successful removal of domain user from database"""
        mocks = setup_mocks
        from cloudshield.Server.services.user_service import remove_domain_user_from_db
        
        # Mock find_one_and_delete to return deleted user
        deleted_user = {
            "_id": ObjectId(self.TEST_USER_ID),
            "username": "testuser",
            "org_id": self.TEST_ORG_ID,
            "email": "test@example.com",
            "role": "employee",
            "status": "active"
        }
        mocks['users_admin'].find_one_and_delete.return_value = deleted_user
        
        # Execute
        result = remove_domain_user_from_db(
            org_id=self.TEST_ORG_ID,
            username="testuser",
            job_id="job-456"
        )
        
        # Assert
        assert result is True
        mocks['users_admin'].find_one_and_delete.assert_called_once_with({
            "org_id": self.TEST_ORG_ID,
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
            org_id=self.TEST_ORG_ID,
            username="nonexistent"
        )
        
        # Assert
        assert result is False
        mocks['users_admin'].find_one_and_delete.assert_called_once_with({
            "org_id": self.TEST_ORG_ID,
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
            "org_id": self.TEST_ORG_ID
        }
        
        # Mock find_one_and_delete to return a user (successful deletion)
        mocks['users_admin'].find_one_and_delete.return_value = deleted_user
        
        # Mock log_audit to raise an exception
        mocks['log_audit'].side_effect = Exception("Audit system unavailable")
        
        # Execute - should still succeed despite audit failure
        result = remove_domain_user_from_db(
            org_id=self.TEST_ORG_ID,
            username="testuser",
            job_id="job_456"
        )
        
        # Assert
        assert result is True  # Deletion succeeds even if audit fails
        mocks['users_admin'].find_one_and_delete.assert_called_once_with({
            "org_id": self.TEST_ORG_ID,
            "username": "testuser"
        })
        mocks['log_audit'].assert_called_once()  # Audit was attempted
