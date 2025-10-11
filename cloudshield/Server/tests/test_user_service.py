import unittest.mock
import sys
import pytest
from datetime import datetime
from bson import ObjectId

mock_users_admin = unittest.mock.MagicMock()
mock_users_public = unittest.mock.MagicMock()
mock_log_audit = unittest.mock.MagicMock()
mock_hash_password = unittest.mock.MagicMock()
# Mock the modules before importing the service
sys.modules['cloudshield.Server.utils.database'] = unittest.mock.MagicMock()
sys.modules['cloudshield.Server.utils.database'].users_admin = mock_users_admin
sys.modules['cloudshield.Server.utils.database'].users_public = mock_users_public
sys.modules['cloudshield.Server.utils.audit'] = unittest.mock.MagicMock()
sys.modules['cloudshield.Server.utils.audit'].log_audit = mock_log_audit
sys.modules['cloudshield.Server.security.passwords'] = unittest.mock.MagicMock()
sys.modules['cloudshield.Server.security.passwords'].hash_password = mock_hash_password
sys.modules['utils.database'] = sys.modules['cloudshield.Server.utils.database']
sys.modules['utils.audit'] = sys.modules['cloudshield.Server.utils.audit']
sys.modules['security.passwords'] = sys.modules['cloudshield.Server.security.passwords']

import types
models_user_module = types.ModuleType('models.user')
sys.modules['models.user'] = models_user_module

from unittest.mock import MagicMock, patch

from cloudshield.Server.models.user import UserCreate, UserUpdate


models_user_module.UserCreate = UserCreate
models_user_module.UserUpdate = UserUpdate

# Now import the service functions (after mocking their dependencies)
from cloudshield.Server.services.user_service import (
    create_user, update_user, deactivate_user, delete_user, _must_admin
)


class TestUserService:
    """Test the user_service.py module"""

    def setup_method(self):
        """Reset mocks before each test"""
        mock_users_admin.reset_mock()
        mock_users_public.reset_mock()
        mock_log_audit.reset_mock()
        mock_hash_password.reset_mock()
        
        # Clear any side_effect that might be left over
        mock_users_admin.find_one.side_effect = None
        mock_users_admin.insert_one.side_effect = None
        mock_users_admin.update_one.side_effect = None
        mock_users_admin.delete_one.side_effect = None

    def test_must_admin_with_admin_user(self):
        """Test _must_admin allows admin users"""
        admin_user = {"role": "admin", "id": "123", "org_id": "org1"}
        
        _must_admin(admin_user)

    def test_must_admin_with_non_admin_user(self):
        """Test _must_admin blocks non-admin users"""
        employee_user = {"role": "employee", "id": "123", "org_id": "org1"}
        
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin(employee_user)

    def test_must_admin_with_none_user(self):
        """Test _must_admin blocks None user"""
        with pytest.raises(PermissionError, match="admin_only"):
            _must_admin(None)

    def test_create_user_success(self):
        """Test successful user creation"""
        # Setup
        user_data = UserCreate(
            email="test@example.com",
            password="ValidPassword123!", 
            org_id="valid_org_id",  
            role="employee",
            full_name="Test User"
        )
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        reason = "New employee onboarding"
        
        mock_users_admin.find_one.return_value = None 
        mock_users_admin.insert_one.return_value = MagicMock(inserted_id=ObjectId())
        mock_hash_password.return_value = "hashed_password"
        
        # Execute
        result = create_user(user_data, current_user, reason)
        
        # Verify
        assert isinstance(result, str)  
        mock_users_admin.find_one.assert_called_once_with({"email": "test@example.com"})
        mock_users_admin.insert_one.assert_called_once()
        mock_hash_password.assert_called_once_with("ValidPassword123!")
        mock_log_audit.assert_called_once()
        
        # Verify audit log call
        audit_call = mock_log_audit.call_args
        assert audit_call[1]["action"] == "create"
        assert audit_call[1]["resource"] == "users"
        assert audit_call[1]["reason"] == reason

    def test_create_user_duplicate_email(self):
        """Test user creation fails with duplicate email"""
        user_data = UserCreate(
            email="existing@example.com",
            password="ValidPassword123!",
            org_id="valid_org_id",
            role="employee",
            full_name="Test User"
        )
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        # Mock existing user
        mock_users_admin.find_one.return_value = {"email": "existing@example.com"}
        
        with pytest.raises(ValueError, match="User with email existing@example.com already exists"):
            create_user(user_data, current_user)

    def test_create_user_non_admin_denied(self):
        """Test user creation denied for non-admin"""
        user_data = UserCreate(
            email="test@example.com",
            password="ValidPassword123!",
            org_id="valid_org_id",
            role="employee",
            full_name="Test User"
        )
        employee_user = {"id": "emp1", "role": "employee", "org_id": "org1"}
        
        with pytest.raises(PermissionError, match="admin_only"):
            create_user(user_data, employee_user)

    def test_update_user_success(self):
        """Test successful user update"""
        user_id = str(ObjectId())
        update_data = UserUpdate(full_name="Updated Name", role="admin")
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        reason = "Promotion to admin"
        
        before_user = {
            "_id": ObjectId(user_id),
            "email": "test@example.com",
            "role": "employee",
            "full_name": "Old Name",
            "org_id": "valid_org_id",
            "status": "active"
        }
        after_user = before_user.copy()
        after_user.update({"role": "admin", "full_name": "Updated Name"})
        
        # Reset mock and set up proper side effects
        mock_users_admin.reset_mock()
        mock_users_admin.find_one.side_effect = [before_user, after_user]
        mock_users_admin.update_one.return_value = None
        
        # Execute
        result = update_user(user_id, update_data, current_user, reason)
        
        # Verify
        assert result is True
        assert mock_users_admin.find_one.call_count == 2  
        mock_users_admin.update_one.assert_called_once()
        mock_log_audit.assert_called_once()

    def test_update_user_not_found(self):
        """Test user update fails when user not found"""
        user_id = str(ObjectId())
        update_data = UserUpdate(full_name="Updated Name")
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        # Reset mock and set return value (not side_effect)
        mock_users_admin.reset_mock()
        mock_users_admin.find_one.return_value = None
        
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            update_user(user_id, update_data, current_user)

    def test_update_user_no_fields(self):
        """Test user update fails with no fields to update"""
        user_id = str(ObjectId())
        update_data = UserUpdate()  
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        before_user = {"_id": ObjectId(user_id), "email": "test@example.com"}
        mock_users_admin.reset_mock()
        mock_users_admin.find_one.return_value = before_user
        
        with pytest.raises(ValueError, match="No fields to update"):
            update_user(user_id, update_data, current_user)

    def test_update_user_with_password(self):
        """Test user update with password hashing"""
        user_id = str(ObjectId())
        update_data = UserUpdate(password="ValidNewPassword123!")
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        before_user = {
            "_id": ObjectId(user_id),
            "email": "user@example.com",  
            "role": "employee"
        }
        after_user = before_user.copy()
        
        mock_users_admin.reset_mock()
        mock_hash_password.reset_mock()
        mock_users_admin.find_one.side_effect = [before_user, after_user]
        mock_hash_password.return_value = "hashed_new_password"
        
        update_user(user_id, update_data, current_user)
        
        mock_hash_password.assert_called_once_with("ValidNewPassword123!")
        
        update_call = mock_users_admin.update_one.call_args
        assert "password" in update_call[0][1]["$set"]
        assert update_call[0][1]["$set"]["password"] == "hashed_new_password"

    def test_deactivate_user_success(self):
        """Test successful user deactivation"""
        user_id = str(ObjectId())
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        reason = "Policy violation"
        
        before_user = {
            "_id": ObjectId(user_id),
            "email": "test@example.com",
            "status": "active"
        }
        after_user = before_user.copy()
        after_user["status"] = "inactive"
        
        mock_users_admin.find_one.side_effect = [before_user, after_user]
        
        result = deactivate_user(user_id, current_user, reason)
        
        assert result is True
        mock_users_admin.update_one.assert_called_once()
        mock_log_audit.assert_called_once()

        audit_call = mock_log_audit.call_args
        assert audit_call[1]["action"] == "deactivate"
        assert audit_call[1]["before"]["status"] == "active"
        assert audit_call[1]["after"]["status"] == "inactive"

    def test_deactivate_user_not_found(self):
        """Test user deactivation fails when user not found"""
        user_id = str(ObjectId())
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        mock_users_admin.reset_mock()
        mock_users_admin.find_one.return_value = None
        
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            deactivate_user(user_id, current_user)

    def test_delete_user_success(self):
        """Test successful user deletion"""
        user_id = str(ObjectId())
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        reason = "Account closure requested"
        
        before_user = {
            "_id": ObjectId(user_id),
            "email": "test@example.com",
            "role": "employee",
            "status": "active",
            "org_id": "valid_org_id"
        }
        mock_users_admin.reset_mock()
        mock_log_audit.reset_mock()
        mock_users_admin.find_one.return_value = before_user
        mock_users_admin.delete_one.return_value = None
        
        result = delete_user(user_id, current_user, reason)
        
        assert result is True
        mock_users_admin.delete_one.assert_called_once_with({"_id": ObjectId(user_id)})
        mock_log_audit.assert_called_once()
        
        # Verify audit log
        audit_call = mock_log_audit.call_args
        assert audit_call[1]["action"] == "delete"
        assert audit_call[1]["after"] is None  

    def test_delete_user_not_found(self):
        """Test user deletion fails when user not found"""
        user_id = str(ObjectId())
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        mock_users_admin.reset_mock()
        mock_users_admin.find_one.return_value = None
        
        with pytest.raises(ValueError, match=f"User {user_id} not found"):
            delete_user(user_id, current_user)

    def test_all_operations_require_admin(self):
        """Test that all operations require admin role"""
        user_id = str(ObjectId())
        employee_user = {"id": "emp1", "role": "employee", "org_id": "org1"}
        
        user_data = UserCreate(
            email="test@example.com",
            password="ValidPassword123!",
            org_id="valid_org_id",
            role="employee",
            full_name="Test User"
        )
        update_data = UserUpdate(full_name="Updated Name")

        # All operations should fail for non-admin users
        with pytest.raises(PermissionError):
            create_user(user_data, employee_user)
            
        with pytest.raises(PermissionError):
            update_user(user_id, update_data, employee_user)
            
        with pytest.raises(PermissionError):
            deactivate_user(user_id, employee_user)
            
        with pytest.raises(PermissionError):
            delete_user(user_id, employee_user)

    def test_audit_logging_called_for_all_operations(self):
        """Test that audit logging is called for all successful operations"""
        user_id = str(ObjectId())
        current_user = {"id": "admin1", "role": "admin", "org_id": "org1"}
        
        mock_user = {
            "_id": ObjectId(user_id),
            "email": "test@example.com",
            "role": "employee",
            "status": "active",
            "org_id": "valid_org_id"
        }
        
        # Test create_user audit
        mock_users_admin.reset_mock()
        mock_log_audit.reset_mock()
        user_data = UserCreate(
            email="new@example.com",
            password="ValidPassword123!",
            org_id="valid_org_id",
            role="employee",
            full_name="New User"
        )
        mock_users_admin.find_one.return_value = None
        mock_users_admin.insert_one.return_value = MagicMock(inserted_id=ObjectId())
        
        create_user(user_data, current_user, "test reason")
        assert mock_log_audit.call_count == 1

        mock_users_admin.reset_mock()
        mock_log_audit.reset_mock()
        mock_users_admin.find_one.side_effect = [mock_user, mock_user]
        update_data = UserUpdate(full_name="Updated")
        
        update_user(user_id, update_data, current_user, "test reason")
        assert mock_log_audit.call_count == 1
        
        mock_users_admin.reset_mock()
        mock_log_audit.reset_mock()
        mock_users_admin.find_one.side_effect = [mock_user, mock_user]
        
        deactivate_user(user_id, current_user, "test reason")
        assert mock_log_audit.call_count == 1
        
        mock_users_admin.reset_mock()
        mock_log_audit.reset_mock()
        mock_users_admin.find_one.side_effect = None  
        mock_users_admin.find_one.return_value = mock_user
        
        delete_user(user_id, current_user, "test reason")
        assert mock_log_audit.call_count == 1
