import pytest
import sys
import os
from pydantic import ValidationError, BaseModel

# Add the Server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.models.shares import FileShare


class TestFileShareModel:
    """Test the FileShare model validation and functionality"""
    
    def test_valid_file_share_creation(self):
        """Test creating a valid FileShare instance"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.name == "Documents"
        assert share.description == "Shared documents folder"
        assert share.owner == "john.doe@example.com"
        assert share.drive == "Z"
    
    def test_file_share_with_empty_name(self):
        """Test FileShare with empty name"""
        share_data = {
            "org_id": "org1",
            "name": "",
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        # Empty strings are allowed by pydantic BaseModel by default
        share = FileShare(**share_data)
        assert share.name == ""
    
    def test_file_share_with_empty_description(self):
        """Test FileShare with empty description"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.description == ""
    
    def test_file_share_with_empty_owner(self):
        """Test FileShare with empty owner"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "Shared documents folder",
            "owner": "",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.owner == ""
    
    def test_file_share_with_special_characters(self):
        """Test FileShare with special characters in fields"""
        share_data = {
            "org_id": "org1",
            "name": "Project-2024_Final!@#",
            "description": "Shared docs with special chars: !@#$%^&*()",
            "owner": "user+tag@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.name == "Project-2024_Final!@#"
        assert share.description == "Shared docs with special chars: !@#$%^&*()"
        assert share.owner == "user+tag@example.com"
    
    def test_file_share_with_unicode_characters(self):
        """Test FileShare with unicode characters"""
        share_data = {
            "org_id": "org1",
            "name": "文档共享",
            "description": "مشاركة المستندات",
            "owner": "用户@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.name == "文档共享"
        assert share.description == "مشاركة المستندات"
        assert share.owner == "用户@example.com"
    
    def test_file_share_with_long_strings(self):
        """Test FileShare with very long strings"""
        long_name = "A" * 1000
        long_description = "B" * 5000
        long_owner = "user" * 100 + "@example.com"
        
        share_data = {
            "org_id": "org1",
            "name": long_name,
            "description": long_description,
            "owner": long_owner,
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.name == long_name
        assert share.description == long_description
        assert share.owner == long_owner
    
    def test_file_share_with_whitespace(self):
        """Test FileShare with whitespace in fields"""
        share_data = {
            "org_id": "org1",
            "name": "  Documents  ",
            "description": "\n\tShared documents folder\n",
            "owner": "  john.doe@example.com  ",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        assert share.name == "  Documents  "
        assert share.description == "\n\tShared documents folder\n"
        assert share.owner == "  john.doe@example.com  "
    
    def test_file_share_missing_name(self):
        """Test FileShare without required 'name' field"""
        share_data = {
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "org_id": "org1",
            "groups": ["groupA"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            FileShare(**share_data)
        
        errors = exc_info.value.errors()
        assert len(errors) > 0
        assert any(error['loc'] == ('name',) for error in errors)
    
    def test_file_share_missing_description(self):
        """Test FileShare without required 'description' field"""
        share_data = {
            "name": "Documents",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "org_id": "org1",
            "groups": ["groupA"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            FileShare(**share_data)
        
        errors = exc_info.value.errors()
        assert len(errors) > 0
        assert any(error['loc'] == ('description',) for error in errors)
    
    def test_file_share_missing_owner(self):
        """Test FileShare without required 'owner' field"""
        share_data = {
            "name": "Documents",
            "description": "Shared documents folder",
            "drive": "Z",
            "org_id": "org1",
            "groups": ["groupA"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            FileShare(**share_data)
        
        errors = exc_info.value.errors()
        assert len(errors) > 0
        assert any(error['loc'] == ('owner',) for error in errors)
    
    def test_file_share_all_fields_missing(self):
        """Test FileShare with all required fields missing"""
        share_data = {}
        
        with pytest.raises(ValidationError) as exc_info:
            FileShare(**share_data)
        
        errors = exc_info.value.errors()
        assert len(errors) >= 5
        error_fields = {error['loc'][0] for error in errors}
        assert 'org_id' in error_fields
        assert 'name' in error_fields
        assert 'description' in error_fields
        assert 'owner' in error_fields
        assert 'drive' in error_fields
    
    def test_file_share_dict_conversion(self):
        """Test converting FileShare to dictionary"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"],
            "kind": None,
            "users": [],
            "current_size": 0,
            "max_size": None
        }
        
        share = FileShare(**share_data)
        share_dict = share.model_dump()

        assert share_dict == share_data
    
    def test_file_share_json_conversion(self):
        """Test converting FileShare to JSON string"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share = FileShare(**share_data)
        json_str = share.model_dump_json()
        
        assert isinstance(json_str, str)
        assert "Documents" in json_str
        assert "Shared documents folder" in json_str
        assert "john.doe@example.com" in json_str
    
    def test_file_share_from_json(self):
        """Test creating FileShare from JSON string"""
        json_str = '{"org_id": "org1", "name": "Documents", "description": "Shared documents folder", "owner": "john.doe@example.com", "drive": "Z", "groups": ["groupA"]}'
        
        share = FileShare.model_validate_json(json_str)
        assert share.name == "Documents"
        assert share.description == "Shared documents folder"
        assert share.owner == "john.doe@example.com"
    
    def test_file_share_invalid_json(self):
        """Test creating FileShare from invalid JSON string"""
        invalid_json = '{"name": "Documents"'
        
        with pytest.raises(Exception):
            FileShare.model_validate_json(invalid_json)
    
    def test_file_share_invalid_json_data(self):
        """Test creating FileShare from JSON with invalid data"""
        json_str = '{"org_id": "org1", "name": "Documents", "owner": "john.doe@example.com", "drive": "Z", "groups": ["groupA"]}'  # missing description
        
        with pytest.raises(ValidationError):
            FileShare.model_validate_json(json_str)
    
    def test_file_share_extra_fields(self):
        """Test FileShare with extra fields not in model"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"],
            "extra_field": "should be ignored",
            "another_extra": 123
        }
        
        # By default, pydantic ignores extra fields
        share = FileShare(**share_data)
        assert share.name == "Documents"
        assert not hasattr(share, "extra_field")
        assert not hasattr(share, "another_extra")
    
    def test_file_share_equality(self):
        """Test equality comparison between FileShare instances"""
        share_data = {
            "org_id": "org1",
            "name": "Documents",
            "description": "Shared documents folder",
            "owner": "john.doe@example.com",
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        share1 = FileShare(**share_data)
        share2 = FileShare(**share_data)
        
        assert share1 == share2
    
    def test_file_share_inequality(self):
        """Test inequality between different FileShare instances"""
        share1 = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        share2 = FileShare(
            org_id="org1",
            name="Projects",
            description="Shared projects folder",
            owner="jane.doe@example.com",
            drive="Y",
            groups=["groupB"]
        )
        
        assert share1 != share2
    
    def test_file_share_partial_inequality(self):
        """Test inequality with one field different"""
        share1 = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        share2 = FileShare(
            org_id="org1",
            name="Projects",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Y",
            groups=["groupA"]
        )
        
        assert share1 != share2
    
    def test_file_share_repr(self):
        """Test string representation of FileShare"""
        share = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        repr_str = repr(share)
        assert "FileShare" in repr_str
        assert "Documents" in repr_str
    
    def test_file_share_is_basemodel(self):
        """Test that FileShare is a BaseModel subclass"""
        assert issubclass(FileShare, BaseModel)
    
    def test_file_share_type_coercion_string(self):
        """Test that pydantic v2 does not coerce non-string types"""
        # Pydantic v2 is strict about type validation
        share_data = {
            "org_id": "org1",
            "name": 123,
            "description": 456.789,
            "owner": True,
            "drive": "Z",
            "groups": ["groupA"]
        }
        
        with pytest.raises(ValidationError):
            FileShare(**share_data)
    
    def test_file_share_numeric_name_and_owner(self):
        """Test that FileShare rejects numeric values for string fields"""
        with pytest.raises(ValidationError):
            FileShare(
                org_id="org1",
                name=99,
                description="Test description",
                owner=111,
                drive="Z",
                groups=["groupA"]
            )
    
    def test_file_share_none_field_coercion(self):
        """Test FileShare with None values"""
        # By default, pydantic requires non-None values
        with pytest.raises(ValidationError):
            FileShare(
                org_id="org1",
                name=None,
                description="Test",
                owner="user@example.com",
                drive="Z",
                groups=["groupA"]
            )
    
    def test_file_share_multiple_instances(self):
        """Test creating multiple FileShare instances independently"""
        share1 = FileShare(
            org_id="org1",
            name="Share1",
            description="Description1",
            owner="owner1@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        share2 = FileShare(
            org_id="org1",
            name="Share2",
            description="Description2",
            owner="owner2@example.com",
            drive="Y",
            groups=["groupB"]
        )
        
        share3 = FileShare(
            org_id="org1",
            name="Share3",
            description="Description3",
            owner="owner3@example.com",
            drive="X",
            groups=["groupC"]
        )
        
        assert share1.name == "Share1"
        assert share2.name == "Share2"
        assert share3.name == "Share3"
        assert share1 != share2
        assert share2 != share3
        assert share1 != share3
    
    def test_file_share_copy(self):
        """Test copying a FileShare instance"""
        original = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        copy = original.model_copy()
        
        assert copy == original
        assert copy is not original
        assert copy.name == original.name
        assert copy.description == original.description
        assert copy.owner == original.owner
    
    def test_file_share_copy_with_update(self):
        """Test copying and updating a FileShare instance"""
        original = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        updated = original.model_copy(update={"name": "Projects"})
        
        assert updated.name == "Projects"
        assert updated.description == original.description
        assert updated.owner == original.owner
        assert original.name == "Documents"
    
    def test_file_share_string_representation_contains_fields(self):
        """Test that string representation contains relevant information"""
        share = FileShare(
            org_id="org1",
            name="TestShare",
            description="TestDesc",
            owner="test@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        str_repr = str(share)
        # The exact format depends on pydantic, but key fields should be present
        assert "TestShare" in str_repr or "name" in str_repr.lower()
    
    def test_file_share_field_access(self):
        """Test accessing FileShare fields"""
        share = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        # Test dot notation access
        assert share.name == "Documents"
        assert share.description == "Shared documents folder"
        assert share.owner == "john.doe@example.com"
    
    def test_file_share_immutability_attempt(self):
        """Test that pydantic models are mutable by default"""
        share = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        # By default, pydantic models are mutable
        share.name = "NewName"
        assert share.name == "NewName"
    
    def test_file_share_with_list_type_coercion_fails(self):
        """Test that list values cannot be coerced to strings"""
        with pytest.raises(ValidationError):
            FileShare(
                org_id="org1",
                name=["list", "value"],
                description="Test",
                owner="test@example.com",
                drive="Z",
                groups=["groupA"]
            )
    
    def test_file_share_with_dict_type_coercion_fails(self):
        """Test that dict values cannot be coerced to strings"""
        with pytest.raises(ValidationError):
            FileShare(
                org_id="org1",
                name={"key": "value"},
                description="Test",
                owner="test@example.com",
                drive="Z",
                groups=["groupA"]
            )
    
    def test_file_share_json_with_newlines(self):
        """Test FileShare with newlines in description"""
        share = FileShare(
            org_id="org1",
            name="Documents",
            description="Line1\nLine2\nLine3",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        assert "Line1\nLine2\nLine3" == share.description
    
    def test_file_share_json_with_tabs(self):
        """Test FileShare with tabs in description"""
        share = FileShare(
            org_id="org1",
            name="Documents",
            description="Col1\tCol2\tCol3",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        assert "Col1\tCol2\tCol3" == share.description
    
    def test_file_share_boolean_type_coercion(self):
        """Test that FileShare rejects boolean values for string fields"""
        with pytest.raises(ValidationError):
            FileShare(
                org_id="org1",
                name=True,
                description="Test",
                owner=False,
                drive="Z",
                groups=["groupA"]
            )
    
    def test_file_share_float_type_coercion(self):
        """Test that FileShare rejects float values for string fields"""
        with pytest.raises(ValidationError):
            FileShare(
                org_id="org1",
                name=123.456,
                description="Test",
                owner=789.012,
                drive="Z",
                groups=["groupA"]
            )
    
    def test_file_share_round_trip_dict(self):
        """Test round-trip conversion through dict"""
        original = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        dict_repr = original.model_dump()
        restored = FileShare(**dict_repr)
        
        assert restored == original
    
    def test_file_share_round_trip_json(self):
        """Test round-trip conversion through JSON"""
        original = FileShare(
            org_id="org1",
            name="Documents",
            description="Shared documents folder",
            owner="john.doe@example.com",
            drive="Z",
            groups=["groupA"]
        )
        
        json_str = original.model_dump_json()
        restored = FileShare.model_validate_json(json_str)
        
        assert restored == original
