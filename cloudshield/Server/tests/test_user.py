import pytest
import sys
import os
from pydantic import ValidationError

# Add the Server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import UserCreate, UserUpdate

class TestUserCreate:
    """Test the UserCreate model validation"""
    
    def test_valid_user_creation(self):
        """Test creating a valid user"""
        user_data = {
            "email": "john.doe@example.com",
            "password": "StrongPass123!",
            "role": "employee",
            "full_name": "John Doe",
            "org_id": "acme-corp"
        }
        
        user = UserCreate(**user_data)
        assert user.email == "john.doe@example.com"
        assert user.password == "StrongPass123!"
        assert user.role == "employee"
        assert user.full_name == "John Doe"
        assert user.org_id == "acme-corp"
        print("Valid user creation works")
    
    def test_email_normalization(self):
        """Test that email is normalized to lowercase and trimmed"""
        user_data = {
            "email": "  JOHN.DOE@EXAMPLE.COM  ",
            "password": "StrongPass123!",
            "role": "admin",
            "full_name": "John Doe",
            "org_id": "acme-corp"
        }
        
        user = UserCreate(**user_data)
        assert user.email == "john.doe@example.com"
        print("Email normalization works")
    
    def test_weak_password_too_short(self):
        """Test password that's too short"""
        user_data = {
            "email": "john@example.com",
            "password": "Short1!",  # Only 7 chars
            "role": "employee",
            "full_name": "John Doe",
            "org_id": "acme-corp"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)
        
        assert "12+ chars" in str(exc_info.value)
        print("Short password validation works")
    
    def test_password_complexity_requirements(self):
        """Test that passwords must meet complexity requirements"""
        # Test various invalid passwords
        invalid_passwords = [
            "short",  # Too short
            "nouppercase123!",  # No uppercase
            "NOLOWERCASE123!",  # No lowercase  
            "NoDigitsHere!",  # No digits
            "NoSpecialChars123",  # No special characters
        ]
        
        for pwd in invalid_passwords:
            user_data = {
                "email": "john@example.com",
                "password": pwd,
                "role": "employee",
                "full_name": "John Doe",
                "org_id": "acme-corp"
            }
            
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(**user_data)
            
            assert "12+ chars" in str(exc_info.value) or "upper, lower, digit, and symbol" in str(exc_info.value)
        
        print("Password complexity validation works")
    
    def test_password_contains_email_username(self):
        """Test password that contains email username"""
        user_data = {
            "email": "john@example.com",
            "password": "MyJohnPassword123!",  # Contains "john"
            "role": "employee",
            "full_name": "John Doe", 
            "org_id": "acme-corp"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)
        
        assert "must not contain your email name" in str(exc_info.value)
        print("Password email check validation works")
    
    def test_invalid_org_id(self):
        """Test invalid org_id formats"""
        invalid_org_ids = [
            "AB",  # Too short
            "ACME-CORP",  # Uppercase not allowed
            "acme corp",  # Spaces not allowed
            "",  # Empty
        ]
        
        for org_id in invalid_org_ids:
            user_data = {
                "email": "john@example.com",
                "password": "StrongPass123!",
                "role": "employee",
                "full_name": "John Doe",
                "org_id": org_id
            }
            
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(**user_data)
            
            assert "org_id" in str(exc_info.value)
        
        print("Invalid org_id validation works")

class TestUserUpdate:
    """Test the UserUpdate model validation - adapting to existing behavior"""
    
    def test_empty_update(self):
        """Test creating empty update (all fields optional)"""
        update = UserUpdate()
        assert update.email is None
        assert update.role is None
        assert update.status is None
        assert update.full_name is None
        print("Empty update creation works")
    
    def test_valid_status_values(self):
        """Test valid status values"""
        valid_statuses = ["active", "inactive"]
        
        for status in valid_statuses:
            update_data = {"status": status}
            update = UserUpdate(**update_data)
            assert update.status == status
        
        print("Valid status values work")
    
    def test_invalid_status_update(self):
        """Test invalid status in update"""
        update_data = {
            "status": "pending"  # Not in allowed values
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(**update_data)
        
        assert "status" in str(exc_info.value)
        print("Invalid status validation in updates works")
    
    def test_nonempty_name_validator(self):
        """Test the nonempty_name validator method specifically"""
        # Test None value - should return None
        update = UserUpdate(full_name=None)
        assert update.full_name is None
        print("None full_name returns None")
        
        # Test valid names
        valid_names = ["Jo", "John Doe", "Mary Jane Smith", "  Alice  "]
        for name in valid_names:
            update = UserUpdate(full_name=name)
            # Should be trimmed
            expected = name.strip() if name else name
            assert update.full_name == expected
        print("Valid names work correctly")
        
        # Test names that are too short after trimming
        invalid_names = ["", " ", "  ", "J", " X "]
        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdate(full_name=name)
            
            assert "at least 2 characters" in str(exc_info.value)
        print("Short names are rejected")
        
        # Test trimming behavior
        update = UserUpdate(full_name="  John Doe  ")
        assert update.full_name == "John Doe"
        print("Name trimming works correctly")
        
        # Test edge case - exactly 2 characters
        update = UserUpdate(full_name="Ab")
        assert update.full_name == "Ab"
        
        update = UserUpdate(full_name="  XY  ")
        assert update.full_name == "XY"
        print("Minimum length names work correctly")

if __name__ == "__main__":
    pytest.main([__file__])
