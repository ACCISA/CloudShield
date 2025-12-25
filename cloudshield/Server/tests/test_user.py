import pytest
import sys
import os
from pydantic import ValidationError

# Add the Server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.models.user import UserCreate, UserUpdate

class TestUserCreate:
    """Test the UserCreate model validation"""
    
    def test_valid_user_creation_and_email_normalization(self):
        """Test creating valid users and email normalization"""
        # Test normal valid user
        user_data = {
            "email": "john.doe@example.com",
            "password": "StrongPass123!",
            "role": "employee",
            "full_name": "John Doe",
            "org_id": "acme-corp",
            "file_shares":["aa"]
        }
        
        user = UserCreate(**user_data)
        assert user.email == "john.doe@example.com"
        assert user.password == "StrongPass123!"
        assert user.role == "employee"
        assert user.full_name == "John Doe"
        assert user.org_id == "acme-corp"
        
        # Test email normalization
        user_data_normalized = {
            "email": "  JOHN.DOE@EXAMPLE.COM  ",
            "password": "StrongPass123!",
            "role": "admin",
            "full_name": "John Doe",
            "org_id": "acme-corp",
            "file_shares":["aa"]
        }
        
        user = UserCreate(**user_data_normalized)
        assert user.email == "john.doe@example.com"
        print("Valid user creation and email normalization work")
    
    def test_password_validation(self):
        """Test comprehensive password validation including complexity and email checks"""
        base_data = {
            "email": "john@example.com",
            "role": "employee",
            "full_name": "John Doe",
            "org_id": "acme-corp",
            "file_shares":["aa"]
        }
        
        # Test various invalid passwords
        invalid_passwords = [
            ("Short1!", "too short"),
            ("nouppercase123!", "no uppercase"),
            ("NOLOWERCASE123!", "no lowercase"),
            ("NoDigitsHere!", "no digits"),
            ("NoSpecialChars123", "no special characters"),
            ("MyJohnPassword123!", "contains email username")
        ]
        
        for pwd, description in invalid_passwords:
            user_data = {**base_data, "password": pwd}
            
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(**user_data)
            
            error_msg = str(exc_info.value)
            if "john" in pwd.lower():
                assert "must not contain your email name" in error_msg
            else:
                assert "12+ chars" in error_msg or "upper, lower, digit, and symbol" in error_msg
        
        print("Password validation works comprehensively")
    
    def test_invalid_org_id_formats(self):
        """Test invalid org_id formats"""
        base_data = {
            "email": "john@example.com",
            "password": "StrongPass123!",
            "role": "employee",
            "full_name": "John Doe",
            "file_shares":["aa"]
        }
        
        invalid_org_ids = [
            "AB",  # Too short
            "ACME-CORP",  # Uppercase not allowed
            "acme corp",  # Spaces not allowed
            "",  # Empty
        ]
        
        for org_id in invalid_org_ids:
            user_data = {**base_data, "org_id": org_id}
            
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(**user_data)
            
            assert "org_id" in str(exc_info.value)
        
        print("Invalid org_id validation works")

class TestUserUpdate:
    """Test the UserUpdate model validation - adapting to existing behavior"""
    
    def test_basic_update_functionality(self):
        """Test empty updates and status validation"""
        # Test empty update (all fields optional)
        update = UserUpdate()
        assert update.email is None
        assert update.role is None
        assert update.status is None
        assert update.full_name is None
        
        # Test valid status values
        valid_statuses = ["active", "inactive"]
        for status in valid_statuses:
            update = UserUpdate(status=status)
            assert update.status == status
        
        # Test invalid status
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(status="pending")
        assert "status" in str(exc_info.value)
        
        print("Basic update functionality works")
    
    def test_full_name_validation(self):
        """Test full name validation including None, trimming, and length requirements"""
        # Test None value - should return None
        update = UserUpdate(full_name=None)
        assert update.full_name is None
        
        # Test valid names with trimming
        valid_cases = [
            ("Jo", "Jo"),
            ("John Doe", "John Doe"),
            ("  Alice  ", "Alice"),
            ("  XY  ", "XY")
        ]
        
        for input_name, expected in valid_cases:
            update = UserUpdate(full_name=input_name)
            assert update.full_name == expected
        
        # Test names that are too short after trimming
        invalid_names = ["", " ", "  ", "J", " X "]
        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdate(full_name=name)
            assert "at least 2 characters" in str(exc_info.value)
        
        print("Full name validation works correctly")
    
    def test_password_validation_comprehensive(self):
        """Test comprehensive password validation for updates"""
        # Test None password - should be allowed
        update = UserUpdate(password=None)
        assert update.password is None
        
        # Test valid passwords
        valid_passwords = [
            "StrongPass123!",
            "MySecure1@Password",
            "ComplexP@ssw0rd"
        ]
        
        for pwd in valid_passwords:
            update = UserUpdate(password=pwd)
            assert update.password == pwd
        
        # Test invalid passwords
        invalid_passwords = [
            "short",  # Too short
            "nouppercase123!",  # No uppercase
            "NOLOWERCASE123!",  # No lowercase
            "NoDigitsHere!!!!",  # No digits
            "NoSpecialChars123"  # No special chars
        ]
        
        for pwd in invalid_passwords:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdate(password=pwd)
            assert "8+ chars with uppercase, lowercase, digit, and special char" in str(exc_info.value)
        
        print("Password validation works comprehensively for updates")
    
    def test_password_email_validation(self):
        """Test password email validation in updates"""
        # Test email check when both email and password provided
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(email="john@example.com", password="MyJohnPassword123!")
        assert "must not contain your email name" in str(exc_info.value)
        
        # Test case insensitive email checks
        test_cases = [
            ("john@example.com", "MyJOHNPassword123!"),
            ("MARY@example.com", "marySecure123!"),
            ("alice@example.com", "AlIcEPassword123!")
        ]
        
        for email, password in test_cases:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdate(email=email, password=password)
            assert "must not contain your email name" in str(exc_info.value)
        
        # Test no email context - should be allowed
        update = UserUpdate(password="TestPassword123!")
        assert update.password == "TestPassword123!"
        
        # Test partial matches are allowed
        update = UserUpdate(email="john@example.com", password="JohannPassword123!")
        assert update.password == "JohannPassword123!"
        
        print("Password email validation works correctly")

if __name__ == "__main__":
    pytest.main([__file__])
