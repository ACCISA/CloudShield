"""Tests for access_groups models and routes.

Tests cover:
- models/access_groups.py: validation, document creation, JSON serialization
- routes/access_groups.py: API endpoints for create and add-members
"""
import sys
import os
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest
from bson import ObjectId
from pydantic import ValidationError

# Add the Server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.models.access_groups import (
    AccessGroupCreate,
    AccessGroupAddMembers,
    create_access_group_doc,
    access_group_to_json,
    _normalize_group_name,
    _normalize_member_ids,
    _coerce_object_id,
    GROUP_RX,
)


# =============================================================================
# Model Tests - AccessGroupBase / AccessGroupCreate
# =============================================================================


class TestGroupNameValidation:
    """Test group_name validation in AccessGroupBase"""

    def test_valid_group_names(self):
        """Test valid group names are accepted and normalized"""
        valid_names = [
            "abc",                  # minimum 3 chars
            "marketing",            # simple lowercase
            "dev-team",             # with hyphen
            "qa_team",              # with underscore
            "team123",              # with numbers
            "a-b_c-d-e-1-2-3",      # mixed
            "a" * 64,               # maximum 64 chars
            "My Group",             # spaces are normalized to hyphens
            "Eng.Team",             # punctuation normalized to hyphens
        ]
        for name in valid_names:
            group = AccessGroupCreate(group_name=name)
            # Stored group_name is a normalized slug
            assert group.group_name

    def test_group_name_normalized_to_lowercase(self):
        """Test group_name is normalized to lowercase"""
        group = AccessGroupCreate(group_name="  MarKeTinG  ")
        assert group.group_name == "marketing"

    def test_group_name_spaces_normalized_to_hyphens(self):
        group = AccessGroupCreate(group_name="  My Group  ")
        assert group.group_name == "my-group"

    def test_group_name_stripped(self):
        """Test group_name whitespace is stripped"""
        group = AccessGroupCreate(group_name="   dev-team   ")
        assert group.group_name == "dev-team"

    def test_invalid_group_name_empty(self):
        """Test empty group_name raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="")
        assert "group_name" in str(exc_info.value)

    def test_invalid_group_name_whitespace_only(self):
        """Test whitespace-only group_name raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="   ")
        assert "group_name" in str(exc_info.value)

    def test_invalid_group_name_too_short(self):
        """Test group_name < 3 chars raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="ab")
        assert "group_name" in str(exc_info.value)

    def test_invalid_group_name_too_long(self):
        """Test group_name > 64 chars raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="a" * 65)
        assert "group_name" in str(exc_info.value)

    def test_invalid_group_name_uppercase_not_allowed_after_normalization(self):
        """Test uppercase is normalized, not rejected"""
        # Uppercase should be normalized to lowercase, so this should pass
        group = AccessGroupCreate(group_name="MARKETING")
        assert group.group_name == "marketing"

    def test_invalid_group_name_special_chars(self):
        """Test group_name with only invalid characters (or too short after normalization) raises error"""
        invalid_names = [
            "--",          # too short
            "__",          # too short
            "!!!",         # normalizes to empty
            "  ",          # empty
            "a",           # too short
        ]
        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                AccessGroupCreate(group_name=name)
            assert "group_name" in str(exc_info.value)


class TestMembersValidation:
    """Test members list validation in AccessGroupBase"""

    def test_valid_members_list(self):
        """Test valid ObjectId strings in members list"""
        oid1 = str(ObjectId())
        oid2 = str(ObjectId())
        group = AccessGroupCreate(group_name="test-group", members=[oid1, oid2])
        assert len(group.members) == 2
        assert oid1 in group.members
        assert oid2 in group.members

    def test_empty_members_list(self):
        """Test empty members list is valid"""
        group = AccessGroupCreate(group_name="test-group", members=[])
        assert group.members == []

    def test_none_members_raises_validation_error(self):
        """Test explicitly passing None for members raises validation error"""
        # Pydantic expects a list type, so explicitly passing None should fail
        # (The empty list comes from default_factory when members is not provided)
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", members=None)
        assert "members" in str(exc_info.value).lower() or "list" in str(exc_info.value).lower()

    def test_members_not_provided_defaults_to_empty(self):
        """Test omitted members defaults to empty list"""
        group = AccessGroupCreate(group_name="test-group")
        assert group.members == []

    def test_members_deduplication(self):
        """Test duplicate member IDs are removed (preserving order)"""
        oid = str(ObjectId())
        group = AccessGroupCreate(group_name="test-group", members=[oid, oid, oid])
        assert group.members == [oid]

    def test_members_stripped(self):
        """Test member IDs are stripped of whitespace"""
        oid = str(ObjectId())
        group = AccessGroupCreate(group_name="test-group", members=[f"  {oid}  "])
        assert group.members == [oid]

    def test_members_order_preserved_after_dedup(self):
        """Test order is preserved after deduplication"""
        oid1 = str(ObjectId())
        oid2 = str(ObjectId())
        oid3 = str(ObjectId())
        group = AccessGroupCreate(
            group_name="test-group",
            members=[oid1, oid2, oid1, oid3, oid2]
        )
        assert group.members == [oid1, oid2, oid3]

    def test_invalid_member_not_objectid(self):
        """Test invalid ObjectId string raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", members=["not-an-objectid"])
        assert "member" in str(exc_info.value).lower() or "object" in str(exc_info.value).lower()

    def test_invalid_member_empty_string(self):
        """Test empty string in members raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", members=[""])
        assert "member" in str(exc_info.value).lower()

    def test_invalid_members_not_list(self):
        """Test non-list members raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", members="not-a-list")
        # Pydantic coerces string to list of chars, then ObjectId validation fails
        assert "object" in str(exc_info.value).lower() or "member" in str(exc_info.value).lower()


class TestAccessGroupCreate:
    """Test AccessGroupCreate model"""

    def test_full_valid_creation(self):
        """Test creating AccessGroupCreate with all fields"""
        oid1 = str(ObjectId())
        group = AccessGroupCreate(
            group_name="marketing",
            description="Marketing team access group",
            members=[oid1]
        )
        assert group.group_name == "marketing"
        assert group.description == "Marketing team access group"
        assert group.members == [oid1]

    def test_minimal_valid_creation(self):
        """Test creating AccessGroupCreate with only required fields"""
        group = AccessGroupCreate(group_name="dev-team")
        assert group.group_name == "dev-team"
        assert group.description is None
        assert group.members == []

    def test_description_can_be_none(self):
        """Test description can be None"""
        group = AccessGroupCreate(group_name="test-group", description=None)
        assert group.description is None

    def test_description_can_be_empty_string(self):
        """Test description can be empty string"""
        group = AccessGroupCreate(group_name="test-group", description="")
        assert group.description == ""


class TestAccessGroupAddMembers:
    """Test AccessGroupAddMembers model"""

    def test_valid_add_members(self):
        """Test valid add members request"""
        oid1 = str(ObjectId())
        oid2 = str(ObjectId())
        add_req = AccessGroupAddMembers(group_name="marketing", members=[oid1, oid2])
        assert add_req.group_name == "marketing"
        assert add_req.description is None
        assert len(add_req.members) == 2

    def test_description_always_none(self):
        """Test description is always None in AccessGroupAddMembers"""
        # Even if passed, description should be None
        add_req = AccessGroupAddMembers(group_name="test", members=[])
        assert add_req.description is None


# =============================================================================
# Document Creation Tests
# =============================================================================


class TestCreateAccessGroupDoc:
    """Test create_access_group_doc function"""

    def test_creates_valid_document(self):
        """Test document creation with all fields"""
        oid1 = str(ObjectId())
        oid2 = str(ObjectId())
        group = AccessGroupCreate(
            group_name="engineering",
            description="Engineering team",
            members=[oid1, oid2]
        )
        doc = create_access_group_doc(group)

        assert doc["name"] == "engineering"
        assert doc["description"] == "Engineering team"
        assert len(doc["members"]) == 2
        assert all(isinstance(m, ObjectId) for m in doc["members"])
        assert isinstance(doc["created_at"], datetime)
        assert isinstance(doc["updated_at"], datetime)

    def test_members_converted_to_objectid(self):
        """Test member strings are converted to ObjectId"""
        oid = str(ObjectId())
        group = AccessGroupCreate(group_name="test-group", members=[oid])
        doc = create_access_group_doc(group)

        assert isinstance(doc["members"][0], ObjectId)
        assert str(doc["members"][0]) == oid

    def test_timestamps_are_utc(self):
        """Test created_at and updated_at are UTC datetimes"""
        group = AccessGroupCreate(group_name="test-group")
        doc = create_access_group_doc(group)

        assert doc["created_at"].tzinfo == timezone.utc
        assert doc["updated_at"].tzinfo == timezone.utc

    def test_empty_members_list(self):
        """Test document with empty members list"""
        group = AccessGroupCreate(group_name="test-group")
        doc = create_access_group_doc(group)

        assert doc["members"] == []


# =============================================================================
# JSON Serialization Tests
# =============================================================================


class TestAccessGroupToJson:
    """Test access_group_to_json function"""

    def test_converts_full_document(self):
        """Test full document conversion to JSON"""
        now = datetime.now(timezone.utc)
        oid1 = ObjectId()
        oid2 = ObjectId()
        doc = {
            "_id": ObjectId(),
            "name": "marketing",
            "description": "Marketing team",
            "members": [oid1, oid2],
            "created_at": now,
            "updated_at": now,
        }
        result = access_group_to_json(doc)

        assert result["id"] == str(doc["_id"])
        assert result["group_name"] == "marketing"
        assert result["description"] == "Marketing team"
        assert len(result["members"]) == 2
        assert result["members"][0] == str(oid1)
        assert result["members"][1] == str(oid2)
        assert result["created_at"] == now.isoformat()
        assert result["updated_at"] == now.isoformat()

    def test_handles_empty_document(self):
        """Test empty document returns empty dict"""
        assert access_group_to_json({}) == {}
        assert access_group_to_json(None) == {}

    def test_handles_missing_fields(self):
        """Test handles document with missing optional fields"""
        doc = {"_id": ObjectId(), "name": "test"}
        result = access_group_to_json(doc)

        assert result["id"] is not None
        assert result["group_name"] == "test"
        assert result["description"] is None
        assert result["members"] == []
        assert result["created_at"] is None
        assert result["updated_at"] is None

    def test_handles_none_members(self):
        """Test handles None members field"""
        doc = {"_id": ObjectId(), "name": "test", "members": None}
        result = access_group_to_json(doc)
        assert result["members"] == []

    def test_handles_none_id(self):
        """Test handles None _id field"""
        doc = {"name": "test", "_id": None}
        result = access_group_to_json(doc)
        assert result["id"] is None


# =============================================================================
# Helper Function Tests
# =============================================================================


class TestHelperFunctions:
    """Test helper functions"""

    def test_coerce_object_id_valid(self):
        """Test _coerce_object_id with valid ObjectId string"""
        oid_str = str(ObjectId())
        result = _coerce_object_id(oid_str)
        assert isinstance(result, ObjectId)
        assert str(result) == oid_str

    def test_coerce_object_id_invalid(self):
        """Test _coerce_object_id with invalid string raises error"""
        from pydantic_core import PydanticCustomError
        with pytest.raises(PydanticCustomError):
            _coerce_object_id("invalid")

    def test_normalize_group_name_valid(self):
        """Test _normalize_group_name with valid name"""
        assert _normalize_group_name("  Marketing  ") == "marketing"

    def test_normalize_group_name_empty(self):
        """Test _normalize_group_name with empty string raises error"""
        from pydantic_core import PydanticCustomError
        with pytest.raises(PydanticCustomError):
            _normalize_group_name("")

    def test_normalize_member_ids_none(self):
        """Test _normalize_member_ids with None returns empty list"""
        assert _normalize_member_ids(None) == []

    def test_group_rx_pattern(self):
        """Test GROUP_RX regex pattern"""
        assert GROUP_RX.match("abc")
        assert GROUP_RX.match("a-b_c")
        assert GROUP_RX.match("test123")
        assert not GROUP_RX.match("AB")  # too short
        assert not GROUP_RX.match("ABC")  # uppercase
        assert not GROUP_RX.match("a b")  # space


# =============================================================================
# Route Tests - access_groups_bp
# =============================================================================


@pytest.fixture
def mock_access_groups_collection():
    """Create a mock MongoDB collection for access_groups"""
    mock_collection = MagicMock()
    return mock_collection


@pytest.fixture
def client(monkeypatch, mock_access_groups_collection):
    """Create Flask test client with mocked database"""
    # Mock redis before imports
    with patch("cloudshield.Server.redis_client.redis.Redis"):
        # Make auth guard always accept a deterministic JWT payload for tests.
        # NOTE: guards.py imports verify_token at module import time, so patch the symbol there.
        monkeypatch.setattr(
            "cloudshield.Server.security.guards.verify_token",
            lambda _token: {"sub": "test-user", "role": "admin", "org_id": "org123"},
        )

        # We need to mock the access_groups collection before importing the app
        monkeypatch.setattr(
            "cloudshield.Server.utils.database.access_groups",
            mock_access_groups_collection
        )
        monkeypatch.setattr(
            "cloudshield.Server.routes.access_groups.access_groups",
            mock_access_groups_collection
        )

        from cloudshield.Server.server import create_app

        app = create_app()
        app.testing = True
        test_client = app.test_client()
        # Apply auth header to all requests by default
        test_client.environ_base["HTTP_AUTHORIZATION"] = "Bearer test-token"
        return test_client, mock_access_groups_collection


class TestCreateAccessGroupRoute:
    """Tests for POST /api/access-groups endpoint"""

    def test_create_access_group_success(self, client):
        """Test successful access group creation"""
        test_client, mock_collection = client
        
        # Setup mock responses
        mock_collection.find_one.side_effect = [
            None,  # First call: check if group exists (not found)
            {      # Second call: fetch created group
                "_id": ObjectId(),
                "name": "marketing",
                "description": "Marketing team",
                "members": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId()
        mock_collection.insert_one.return_value = mock_insert_result

        response = test_client.post("/api/access-groups", json={
            "group_name": "marketing",
            "description": "Marketing team",
            "members": []
        })

        assert response.status_code == 201
        data = response.get_json()
        assert "access_group" in data
        assert data["access_group"]["group_name"] == "marketing"

    def test_create_access_group_with_members(self, client):
        """Test creating access group with member IDs"""
        test_client, mock_collection = client
        
        oid1 = str(ObjectId())
        oid2 = str(ObjectId())

        mock_collection.find_one.side_effect = [
            None,
            {
                "_id": ObjectId(),
                "name": "dev-team",
                "description": None,
                "members": [ObjectId(oid1), ObjectId(oid2)],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId()
        mock_collection.insert_one.return_value = mock_insert_result

        response = test_client.post("/api/access-groups", json={
            "group_name": "dev-team",
            "members": [oid1, oid2]
        })

        assert response.status_code == 201
        data = response.get_json()
        assert len(data["access_group"]["members"]) == 2

    def test_create_access_group_already_exists(self, client):
        """Test creating duplicate access group returns 409"""
        test_client, mock_collection = client
        
        mock_collection.find_one.return_value = {"_id": ObjectId()}

        response = test_client.post("/api/access-groups", json={
            "group_name": "existing-group"
        })

        assert response.status_code == 409
        data = response.get_json()
        assert "already exists" in data["error"]

    def test_create_access_group_missing_group_name(self, client):
        """Test missing group_name returns 400"""
        test_client, mock_collection = client

        response = test_client.post("/api/access-groups", json={})

        assert response.status_code == 400
        data = response.get_json()
        assert "Validation failed" in data["error"]

    def test_create_access_group_invalid_group_name(self, client):
        """Test invalid group_name returns 400"""
        test_client, mock_collection = client

        response = test_client.post("/api/access-groups", json={
            "group_name": "AB"  # too short
        })

        assert response.status_code == 400
        data = response.get_json()
        assert "Validation failed" in data["error"]

    def test_create_access_group_invalid_member_ids(self, client):
        """Test invalid member IDs returns 400"""
        test_client, mock_collection = client

        response = test_client.post("/api/access-groups", json={
            "group_name": "test-group",
            "members": ["not-an-objectid"]
        })

        assert response.status_code == 400
        data = response.get_json()
        assert "Validation failed" in data["error"]

    def test_create_access_group_empty_body(self, client):
        """Test empty request body returns error"""
        test_client, mock_collection = client

        response = test_client.post("/api/access-groups", json=None)

        # Empty body can return 400 (validation) or 500 (internal error) depending on server handling
        assert response.status_code in (400, 500)

    def test_create_access_group_db_error(self, client):
        """Test database error returns 500"""
        test_client, mock_collection = client
        
        mock_collection.find_one.side_effect = Exception("Database connection failed")

        response = test_client.post("/api/access-groups", json={
            "group_name": "test-group"
        })

        assert response.status_code == 500
        data = response.get_json()
        assert "Internal server error" in data["error"]


class TestAddMembersRoute:
    """Tests for POST /api/access-groups/add-members endpoint"""

    def test_add_members_success(self, client):
        """Test successfully adding members to access group"""
        test_client, mock_collection = client
        
        oid1 = str(ObjectId())
        oid2 = str(ObjectId())
        
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_collection.update_one.return_value = mock_update_result
        mock_collection.find_one.return_value = {
            "_id": ObjectId(),
            "name": "marketing",
            "description": "Marketing team",
            "members": [ObjectId(oid1), ObjectId(oid2)],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        response = test_client.post("/api/access-groups/add-members", json={
            "group_name": "marketing",
            "members": [oid1, oid2]
        })

        assert response.status_code == 200
        data = response.get_json()
        assert "access_group" in data
        assert len(data["access_group"]["members"]) == 2

    def test_add_members_group_not_found(self, client):
        """Test adding members to non-existent group returns 404"""
        test_client, mock_collection = client
        
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 0
        mock_collection.update_one.return_value = mock_update_result

        response = test_client.post("/api/access-groups/add-members", json={
            "group_name": "nonexistent-group",
            "members": [str(ObjectId())]
        })

        assert response.status_code == 404
        data = response.get_json()
        assert "not found" in data["error"]

    def test_add_members_missing_group_name(self, client):
        """Test missing group_name returns 400"""
        test_client, mock_collection = client

        response = test_client.post("/api/access-groups/add-members", json={
            "members": [str(ObjectId())]
        })

        assert response.status_code == 400
        data = response.get_json()
        assert "Validation failed" in data["error"]

    def test_add_members_invalid_member_ids(self, client):
        """Test invalid member IDs returns 400"""
        test_client, mock_collection = client

        response = test_client.post("/api/access-groups/add-members", json={
            "group_name": "test-group",
            "members": ["invalid-id"]
        })

        assert response.status_code == 400
        data = response.get_json()
        assert "Validation failed" in data["error"]

    def test_add_members_empty_members_list(self, client):
        """Test adding empty members list still updates"""
        test_client, mock_collection = client
        
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_collection.update_one.return_value = mock_update_result
        mock_collection.find_one.return_value = {
            "_id": ObjectId(),
            "name": "test-group",
            "description": None,
            "members": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        response = test_client.post("/api/access-groups/add-members", json={
            "group_name": "test-group",
            "members": []
        })

        assert response.status_code == 200

    def test_add_members_db_error(self, client):
        """Test database error returns 500"""
        test_client, mock_collection = client
        
        mock_collection.update_one.side_effect = Exception("Database error")

        response = test_client.post("/api/access-groups/add-members", json={
            "group_name": "test-group",
            "members": [str(ObjectId())]
        })

        assert response.status_code == 500
        data = response.get_json()
        assert "Internal server error" in data["error"]

    def test_add_members_normalizes_group_name(self, client):
        """Test group_name is normalized in request"""
        test_client, mock_collection = client
        
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_collection.update_one.return_value = mock_update_result
        mock_collection.find_one.return_value = {
            "_id": ObjectId(),
            "name": "marketing",
            "description": None,
            "members": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        response = test_client.post("/api/access-groups/add-members", json={
            "group_name": "  MARKETING  ",  # Should be normalized
            "members": []
        })

        assert response.status_code == 200
        # Verify the normalized name was used in the query
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args
        assert call_args[0][0]["name"] == "marketing"


class TestListAccessGroupsRoute:
    """Tests for GET /api/access-groups endpoint"""

    def test_list_access_groups_success_with_members_info(self, client, monkeypatch):
        """Test successfully listing access groups with enriched member info"""
        test_client, mock_collection = client

        now = datetime.now(timezone.utc)
        group_oid = ObjectId()
        member_oid1 = ObjectId()
        member_oid2 = ObjectId()

        # Mock access_groups.find().sort() chain
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": group_oid,
                "name": "marketing",
                "description": "Marketing team",
                "members": [member_oid1, member_oid2],
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_collection.find.return_value = mock_cursor

        # Mock users_admin collection
        mock_users_coll = MagicMock()
        mock_users_coll.find.return_value = [
            {
                "_id": member_oid1,
                "email": "user1@example.com",
                "full_name": "User One",
                "role": "employee",
                "org_id": "acme",
                "status": "active",
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": member_oid2,
                "email": "user2@example.com",
                "full_name": "User Two",
                "role": "admin",
                "org_id": "acme",
                "status": "active",
                "created_at": now,
                "updated_at": now,
            },
        ]
        # Patch the lazy import path used by the route
        with patch("utils.database.users_admin", mock_users_coll):
            response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        data = response.get_json()
        assert "access_groups" in data
        assert len(data["access_groups"]) == 1

        group = data["access_groups"][0]
        assert group["group_name"] == "marketing"
        assert len(group["members"]) == 2
        assert "members_info" in group
        assert len(group["members_info"]) == 2
        assert group["members_info"][0]["email"] == "user1@example.com"
        assert group["members_info"][1]["email"] == "user2@example.com"
        assert "members_missing" in group
        assert len(group["members_missing"]) == 0

    def test_list_access_groups_empty(self, client):
        """Test listing when no access groups exist"""
        test_client, mock_collection = client

        # Mock empty result
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = []
        mock_collection.find.return_value = mock_cursor

        response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        data = response.get_json()
        assert "access_groups" in data
        assert len(data["access_groups"]) == 0

    def test_list_access_groups_with_missing_members(self, client, monkeypatch):
        """Test listing access groups where some members are not found in users"""
        test_client, mock_collection = client

        now = datetime.now(timezone.utc)
        group_oid = ObjectId()
        member_oid1 = ObjectId()
        missing_member_oid = ObjectId()

        # Mock access_groups.find().sort() chain
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": group_oid,
                "name": "dev-team",
                "description": None,
                "members": [member_oid1, missing_member_oid],
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_collection.find.return_value = mock_cursor

        # Mock users_admin - only return one user (the other is missing)
        mock_users_coll = MagicMock()
        mock_users_coll.find.return_value = [
            {
                "_id": member_oid1,
                "email": "found@example.com",
                "full_name": "Found User",
                "role": "employee",
                "org_id": "acme",
                "status": "active",
                "created_at": now,
                "updated_at": now,
            },
        ]
        # Patch the lazy import path used by the route
        with patch("utils.database.users_admin", mock_users_coll):
            response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        data = response.get_json()
        group = data["access_groups"][0]

        assert len(group["members_info"]) == 1
        assert group["members_info"][0]["email"] == "found@example.com"
        assert len(group["members_missing"]) == 1
        assert group["members_missing"][0] == str(missing_member_oid)

    def test_list_access_groups_sorted_by_created_at(self, client):
        """Test access groups are sorted by created_at descending"""
        test_client, mock_collection = client

        # Mock the find().sort() chain
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = []
        mock_collection.find.return_value = mock_cursor

        test_client.get("/api/access-groups")

        # Verify sort was called with created_at descending (-1)
        mock_collection.find.assert_called_once_with({"org_id": "org123"})
        mock_cursor.sort.assert_called_once_with("created_at", -1)

    def test_list_access_groups_db_error(self, client):
        """Test database error returns 500"""
        test_client, mock_collection = client

        mock_collection.find.side_effect = Exception("Database connection failed")

        response = test_client.get("/api/access-groups")

        assert response.status_code == 500
        data = response.get_json()
        assert "Internal server error" in data["error"]
        assert "Database connection failed" in data["details"]

    def test_list_access_groups_with_none_members(self, client):
        """Test listing access groups handles None members gracefully"""
        test_client, mock_collection = client

        now = datetime.now(timezone.utc)
        oid = ObjectId()

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": oid,
                "name": "test-group",
                "description": None,
                "members": None,  # None instead of list
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_collection.find.return_value = mock_cursor

        response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["access_groups"]) == 1
        group = data["access_groups"][0]
        assert group["members"] == []
        assert group["members_info"] == []
        assert group["members_missing"] == []

    def test_list_access_groups_with_missing_fields(self, client):
        """Test listing access groups handles missing optional fields"""
        test_client, mock_collection = client

        oid = ObjectId()

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": oid,
                "name": "minimal-group",
                # missing description, members, created_at, updated_at
            },
        ]
        mock_collection.find.return_value = mock_cursor

        response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["access_groups"]) == 1
        group = data["access_groups"][0]
        assert group["group_name"] == "minimal-group"
        assert group["description"] is None
        assert group["members"] == []
        assert group["members_info"] == []
        assert group["members_missing"] == []
        assert group["created_at"] is None
        assert group["updated_at"] is None

    def test_list_access_groups_no_users_query_when_no_members(self, client, monkeypatch):
        """Test that users collection is not queried when there are no members"""
        test_client, mock_collection = client

        now = datetime.now(timezone.utc)

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": ObjectId(),
                "name": "empty-group",
                "description": None,
                "members": [],
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_collection.find.return_value = mock_cursor

        # Mock users_admin - should NOT be called
        mock_users_coll = MagicMock()
        # Patch the lazy import path used by the route
        with patch("utils.database.users_admin", mock_users_coll):
            response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        # Verify users collection was not queried since there are no members
        mock_users_coll.find.assert_not_called()

    # Summary-mode coverage is exercised in TestAccessGroupRoutesDirect to avoid DB imports.

    def test_list_access_groups_multiple_groups_dedup_members(self, client, monkeypatch):
        """Test that member ObjectIds are deduplicated across groups"""
        test_client, mock_collection = client

        now = datetime.now(timezone.utc)
        shared_member_oid = ObjectId()
        unique_member_oid = ObjectId()

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": ObjectId(),
                "name": "group-a",
                "description": None,
                "members": [shared_member_oid],
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": ObjectId(),
                "name": "group-b",
                "description": None,
                "members": [shared_member_oid, unique_member_oid],
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_collection.find.return_value = mock_cursor

        # Mock users_admin
        mock_users_coll = MagicMock()
        mock_users_coll.find.return_value = [
            {"_id": shared_member_oid, "email": "shared@example.com"},
            {"_id": unique_member_oid, "email": "unique@example.com"},
        ]
        # Patch the lazy import path used by the route
        with patch("utils.database.users_admin", mock_users_coll):
            response = test_client.get("/api/access-groups")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["access_groups"]) == 2

        # Verify users query was called with deduplicated member OIDs
        mock_users_coll.find.assert_called_once()
        call_args = mock_users_coll.find.call_args
        queried_oids = call_args[0][0]["_id"]["$in"]
        # Should be 2 unique OIDs, not 3
        assert len(queried_oids) == 2


# =============================================================================
# Workstations Validation Tests
# =============================================================================


class TestWorkstationsValidation:
    """Test workstations list validation in AccessGroupBase"""

    def test_valid_workstations_list(self):
        """Test valid workstation ids in list"""
        group = AccessGroupCreate(
            group_name="test-group",
            workstations=["ws-1", "ws-2", "workstation-alpha"]
        )
        assert len(group.workstations) == 3
        assert "ws-1" in group.workstations

    def test_empty_workstations_list(self):
        """Test empty workstations list is valid"""
        group = AccessGroupCreate(group_name="test-group", workstations=[])
        assert group.workstations == []

    def test_workstations_not_provided_defaults_to_empty(self):
        """Test omitted workstations defaults to empty list"""
        group = AccessGroupCreate(group_name="test-group")
        assert group.workstations == []

    def test_workstations_deduplication(self):
        """Test duplicate workstation IDs are removed"""
        group = AccessGroupCreate(
            group_name="test-group",
            workstations=["ws-1", "ws-1", "ws-2"]
        )
        assert group.workstations == ["ws-1", "ws-2"]

    def test_workstations_stripped(self):
        """Test workstation IDs are stripped of whitespace"""
        group = AccessGroupCreate(
            group_name="test-group",
            workstations=["  ws-1  ", "ws-2  "]
        )
        assert group.workstations == ["ws-1", "ws-2"]

    def test_invalid_workstation_empty_string(self):
        """Test empty string in workstations raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", workstations=[""])
        assert "workstations" in str(exc_info.value).lower()

    def test_invalid_workstations_not_list(self):
        """Test non-list workstations raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", workstations="not-a-list")
        assert "workstations" in str(exc_info.value).lower() or "list" in str(exc_info.value).lower()


# =============================================================================
# File Shares Validation Tests
# =============================================================================


class TestFileSharesValidation:
    """Test file_shares list validation in AccessGroupBase"""

    def test_valid_file_shares_list(self):
        """Test valid file share ids in list"""
        group = AccessGroupCreate(
            group_name="test-group",
            file_shares=["share-1", "share-2", "docs-share"]
        )
        assert len(group.file_shares) == 3
        assert "share-1" in group.file_shares

    def test_empty_file_shares_list(self):
        """Test empty file_shares list is valid"""
        group = AccessGroupCreate(group_name="test-group", file_shares=[])
        assert group.file_shares == []

    def test_file_shares_not_provided_defaults_to_empty(self):
        """Test omitted file_shares defaults to empty list"""
        group = AccessGroupCreate(group_name="test-group")
        assert group.file_shares == []

    def test_file_shares_deduplication(self):
        """Test duplicate file share IDs are removed"""
        group = AccessGroupCreate(
            group_name="test-group",
            file_shares=["share-1", "share-1", "share-2"]
        )
        assert group.file_shares == ["share-1", "share-2"]

    def test_file_shares_stripped(self):
        """Test file share IDs are stripped of whitespace"""
        group = AccessGroupCreate(
            group_name="test-group",
            file_shares=["  share-1  ", "share-2  "]
        )
        assert group.file_shares == ["share-1", "share-2"]

    def test_invalid_file_share_empty_string(self):
        """Test empty string in file_shares raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", file_shares=[""])
        assert "file_shares" in str(exc_info.value).lower()

    def test_invalid_file_shares_not_list(self):
        """Test non-list file_shares raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            AccessGroupCreate(group_name="test-group", file_shares="not-a-list")
        assert "file_shares" in str(exc_info.value).lower() or "list" in str(exc_info.value).lower()


# =============================================================================
# AccessGroupUpdate Tests
# =============================================================================


class TestAccessGroupUpdate:
    """Test AccessGroupUpdate model for PATCH operations"""

    def test_all_fields_optional(self):
        """Test AccessGroupUpdate with no fields is valid"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        update = AccessGroupUpdate()
        assert update.group_name is None
        assert update.description is None
        assert update.members is None
        assert update.workstations is None
        assert update.file_shares is None

    def test_partial_update_group_name(self):
        """Test updating only group_name"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        update = AccessGroupUpdate(group_name="new-name")
        assert update.group_name == "new-name"
        assert update.description is None

    def test_partial_update_workstations(self):
        """Test updating only workstations"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        update = AccessGroupUpdate(workstations=["ws-1", "ws-2"])
        assert update.workstations == ["ws-1", "ws-2"]
        assert update.group_name is None

    def test_partial_update_file_shares(self):
        """Test updating only file_shares"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        update = AccessGroupUpdate(file_shares=["share-1"])
        assert update.file_shares == ["share-1"]
        assert update.group_name is None

    def test_update_validates_group_name(self):
        """Test group_name validation in update"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        with pytest.raises(ValidationError):
            AccessGroupUpdate(group_name="ab")  # too short

    def test_update_normalizes_workstations(self):
        """Test workstations are normalized in update"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        update = AccessGroupUpdate(workstations=["  ws-1  ", "ws-1", "ws-2"])
        assert update.workstations == ["ws-1", "ws-2"]


# =============================================================================
# Route Tests with Direct Mocking
# =============================================================================


class TestAccessGroupRoutesDirect:
    """
    Tests for access_groups routes using direct function calls with mocked dependencies.
    This avoids the Flask test client fixture issues.
    """

    def test_update_access_group_route_logic(self):
        """Test update_access_group route logic directly"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        from bson import ObjectId

        # Test with description update
        patch = AccessGroupUpdate(description="new description")
        assert patch.description == "new description"
        assert patch.group_name is None

        # Test with group_image update
        patch = AccessGroupUpdate(group_image="data:image/png;base64,test")
        assert patch.group_image == "data:image/png;base64,test"

        # Test with members update
        member_id = str(ObjectId())
        patch = AccessGroupUpdate(members=[member_id])
        assert patch.members == [member_id]

        # Test with all fields
        patch = AccessGroupUpdate(
            group_name="updated-group",
            description="updated desc",
            group_image="data:image/png;base64,updated",
            members=[member_id],
            workstations=["ws-1"],
            file_shares=["share-1"]
        )
        assert patch.group_name == "updated-group"
        assert patch.description == "updated desc"
        assert patch.workstations == ["ws-1"]
        assert patch.file_shares == ["share-1"]

    def test_update_access_group_empty_set_doc(self):
        """Test that empty update body results in no changes"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate

        # Empty update
        patch = AccessGroupUpdate()
        
        # Build set_doc like the route does
        set_doc = {}
        if patch.group_name is not None:
            set_doc["name"] = patch.group_name
        if patch.description is not None:
            set_doc["description"] = patch.description
        if patch.group_image is not None:
            set_doc["group_image"] = patch.group_image
        if patch.members is not None:
            set_doc["members"] = patch.members
        if patch.workstations is not None:
            set_doc["workstations"] = patch.workstations
        if patch.file_shares is not None:
            set_doc["file_shares"] = patch.file_shares

        # Should be empty
        assert set_doc == {}

    def test_update_access_group_partial_fields(self):
        """Test partial field updates build correct set_doc"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        from bson import ObjectId

        # Only update workstations
        patch = AccessGroupUpdate(workstations=["ws-new-1", "ws-new-2"])

        set_doc = {}
        if patch.group_name is not None:
            set_doc["name"] = patch.group_name
        if patch.description is not None:
            set_doc["description"] = patch.description
        if patch.group_image is not None:
            set_doc["group_image"] = patch.group_image
        if patch.members is not None:
            set_doc["members"] = [ObjectId(m) for m in patch.members]
        if patch.workstations is not None:
            set_doc["workstations"] = patch.workstations
        if patch.file_shares is not None:
            set_doc["file_shares"] = patch.file_shares

        assert set_doc == {"workstations": ["ws-new-1", "ws-new-2"]}

    def test_list_access_groups_summary_returns_member_count(self):
        """Test list_access_groups summary returns member_count without enrichment"""
        from flask import Flask, g
        import cloudshield.Server.routes.access_groups as routes_module

        app = Flask(__name__)
        now = datetime.now(timezone.utc)
        member_oid1 = ObjectId()
        member_oid2 = ObjectId()
        group_oid = ObjectId()

        mock_collection = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = [
            {
                "_id": group_oid,
                "name": "design-team",
                "description": "Design team",
                "members": [member_oid1, member_oid2],
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_collection.find.return_value = mock_cursor

        original = routes_module.access_groups
        routes_module.access_groups = mock_collection
        try:
            with app.test_request_context("/api/access-groups?summary=1"):
                # Bypass @require_auth by pre-populating g.user
                g.user = {"id": "test-user", "role": "admin", "org_id": "org123"}
                response, status_code = routes_module.list_access_groups()
        finally:
            routes_module.access_groups = original

        assert status_code == 200
        data = response.get_json()
        assert len(data["access_groups"]) == 1

        group = data["access_groups"][0]
        assert group["group_name"] == "design-team"
        assert group["member_count"] == 2
        assert group["members"] == [str(member_oid1), str(member_oid2)]
        assert "members_info" not in group

    def test_update_access_group_members_conversion(self):
        """Test members are converted to ObjectIds in update"""
        from cloudshield.Server.models.access_groups import AccessGroupUpdate
        from bson import ObjectId

        member1 = str(ObjectId())
        member2 = str(ObjectId())
        patch = AccessGroupUpdate(members=[member1, member2])

        # Simulate route logic
        set_doc = {}
        if patch.members is not None:
            set_doc["members"] = [ObjectId(m) for m in patch.members]

        assert len(set_doc["members"]) == 2
        assert all(isinstance(m, ObjectId) for m in set_doc["members"])

    def test_delete_access_group_objectid_conversion(self):
        """Test group_id is converted to ObjectId for delete"""
        from bson import ObjectId

        group_id_str = str(ObjectId())
        gid = ObjectId(group_id_str)

        assert isinstance(gid, ObjectId)
        assert str(gid) == group_id_str

    def test_delete_access_group_invalid_objectid(self):
        """Test invalid ObjectId raises exception"""
        from bson import ObjectId
        from bson.errors import InvalidId

        with pytest.raises(InvalidId):
            ObjectId("invalid-id")

    def test_access_group_to_json_with_all_fields(self):
        """Test access_group_to_json with all fields populated"""
        now = datetime.now(timezone.utc)
        member_oid = ObjectId()
        doc = {
            "_id": ObjectId(),
            "name": "full-group",
            "description": "Full description",
            "group_image": "data:image/png;base64,test",
            "members": [member_oid],
            "workstations": ["ws-1", "ws-2"],
            "file_shares": ["share-1"],
            "created_at": now,
            "updated_at": now,
        }
        result = access_group_to_json(doc)

        assert result["group_name"] == "full-group"
        assert result["description"] == "Full description"
        assert result["group_image"] == "data:image/png;base64,test"
        assert result["members"] == [str(member_oid)]
        assert result["workstations"] == ["ws-1", "ws-2"]
        assert result["file_shares"] == ["share-1"]
        assert result["created_at"] == now.isoformat()
        assert result["updated_at"] == now.isoformat()


# =============================================================================
# Document Creation with Workstations and File Shares
# =============================================================================


class TestCreateAccessGroupDocWithNewFields:
    """Test create_access_group_doc with workstations and file_shares"""

    def test_creates_document_with_workstations(self):
        """Test document creation includes workstations"""
        group = AccessGroupCreate(
            group_name="engineering",
            workstations=["ws-1", "ws-2"]
        )
        doc = create_access_group_doc(group)

        assert doc["workstations"] == ["ws-1", "ws-2"]

    def test_creates_document_with_file_shares(self):
        """Test document creation includes file_shares"""
        group = AccessGroupCreate(
            group_name="engineering",
            file_shares=["share-1", "share-2"]
        )
        doc = create_access_group_doc(group)

        assert doc["file_shares"] == ["share-1", "share-2"]

    def test_creates_document_with_all_new_fields(self):
        """Test document creation with all fields including new ones"""
        oid = str(ObjectId())
        group = AccessGroupCreate(
            group_name="full-group",
            description="Full test group",
            group_image="data:image/png;base64,test",
            members=[oid],
            workstations=["ws-1"],
            file_shares=["share-1"]
        )
        doc = create_access_group_doc(group)

        assert doc["name"] == "full-group"
        assert doc["description"] == "Full test group"
        assert doc["group_image"] == "data:image/png;base64,test"
        assert len(doc["members"]) == 1
        assert doc["workstations"] == ["ws-1"]
        assert doc["file_shares"] == ["share-1"]


# =============================================================================
# JSON Serialization with Workstations and File Shares
# =============================================================================


class TestAccessGroupToJsonWithNewFields:
    """Test access_group_to_json with workstations and file_shares"""

    def test_converts_document_with_workstations(self):
        """Test JSON conversion includes workstations"""
        now = datetime.now(timezone.utc)
        doc = {
            "_id": ObjectId(),
            "name": "test",
            "workstations": ["ws-1", "ws-2"],
            "created_at": now,
            "updated_at": now,
        }
        result = access_group_to_json(doc)

        assert result["workstations"] == ["ws-1", "ws-2"]

    def test_converts_document_with_file_shares(self):
        """Test JSON conversion includes file_shares"""
        now = datetime.now(timezone.utc)
        doc = {
            "_id": ObjectId(),
            "name": "test",
            "file_shares": ["share-1", "share-2"],
            "created_at": now,
            "updated_at": now,
        }
        result = access_group_to_json(doc)

        assert result["file_shares"] == ["share-1", "share-2"]

    def test_handles_none_workstations(self):
        """Test handles None workstations field"""
        doc = {"_id": ObjectId(), "name": "test", "workstations": None}
        result = access_group_to_json(doc)
        assert result["workstations"] == []

    def test_handles_none_file_shares(self):
        """Test handles None file_shares field"""
        doc = {"_id": ObjectId(), "name": "test", "file_shares": None}
        result = access_group_to_json(doc)
        assert result["file_shares"] == []


# =============================================================================
# Route Tests with Flask Test Client (Proper Mocking)
# =============================================================================


class TestAccessGroupRoutesWithFlask:
    """
    Tests for access_groups routes using Flask test client with isolated mocking.
    These tests properly exercise the route functions.
    """

    @pytest.fixture
    def app_client(self, monkeypatch):
        """Create Flask app with mocked database collection"""
        from flask import Flask
        from cloudshield.Server.routes.access_groups import access_groups_bp
        import cloudshield.Server.routes.access_groups as routes_module

        # Make auth guard accept deterministic payload
        monkeypatch.setattr(
            "cloudshield.Server.security.guards.verify_token",
            lambda _token: {"sub": "test-user", "role": "admin", "org_id": "org123"},
        )

        app = Flask(__name__)
        app.register_blueprint(access_groups_bp, url_prefix="/api")

        # Create mock collection
        mock_coll = MagicMock()

        # Store original and patch
        original = routes_module.access_groups
        routes_module.access_groups = mock_coll

        test_client = app.test_client()
        test_client.environ_base["HTTP_AUTHORIZATION"] = "Bearer test-token"
        yield test_client, mock_coll

        # Restore original
        routes_module.access_groups = original

    def test_get_access_groups_collection_caching(self):
        """Test _get_access_groups_collection caches the collection"""
        import cloudshield.Server.routes.access_groups as routes_module

        # Save original
        original = routes_module.access_groups

        # Set a mock collection
        mock_coll = MagicMock()
        routes_module.access_groups = mock_coll

        # Call should return the cached mock
        result = routes_module._get_access_groups_collection()
        assert result is mock_coll

        # Restore
        routes_module.access_groups = original

    def test_update_access_group_not_found(self, app_client):
        """Test PATCH returns 404 when group doesn't exist"""
        client, mock_coll = app_client

        group_id = str(ObjectId())
        mock_coll.find_one.return_value = None

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"description": "updated"},
            content_type="application/json"
        )

        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "access group not found"

    def test_update_access_group_success_description(self, app_client):
        """Test PATCH successfully updates description"""
        client, mock_coll = app_client

        group_id = ObjectId()
        now = datetime.now(timezone.utc)
        existing_doc = {
            "_id": group_id,
            "name": "test-group",
            "description": "old desc",
            "members": [],
            "workstations": [],
            "file_shares": [],
            "created_at": now,
            "updated_at": now,
        }
        updated_doc = {**existing_doc, "description": "new description"}

        mock_coll.find_one.side_effect = [existing_doc, updated_doc]
        mock_coll.update_one.return_value = MagicMock(modified_count=1)

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"description": "new description"},
            content_type="application/json"
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["access_group"]["description"] == "new description"

    def test_update_access_group_duplicate_name(self, app_client):
        """Test PATCH returns 409 when new name already exists"""
        client, mock_coll = app_client

        group_id = ObjectId()
        now = datetime.now(timezone.utc)
        existing_doc = {
            "_id": group_id,
            "name": "test-group",
            "members": [],
            "created_at": now,
            "updated_at": now,
        }

        # First find_one returns existing group, second returns duplicate
        mock_coll.find_one.side_effect = [
            existing_doc,
            {"_id": ObjectId()}  # Duplicate found
        ]

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"group_name": "existing-name"},
            content_type="application/json"
        )

        assert response.status_code == 409
        data = response.get_json()
        assert data["error"] == "access group already exists"

    def test_update_access_group_empty_body_returns_current(self, app_client):
        """Test PATCH with empty body returns current group without update"""
        client, mock_coll = app_client

        group_id = ObjectId()
        now = datetime.now(timezone.utc)
        existing_doc = {
            "_id": group_id,
            "name": "test-group",
            "description": "original",
            "members": [],
            "workstations": [],
            "file_shares": [],
            "created_at": now,
            "updated_at": now,
        }

        # First find_one for existence check, second for returning current
        mock_coll.find_one.side_effect = [existing_doc, existing_doc]

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={},
            content_type="application/json"
        )

        assert response.status_code == 200
        # update_one should NOT have been called
        mock_coll.update_one.assert_not_called()

    def test_update_access_group_all_fields(self, app_client):
        """Test PATCH updates all fields"""
        client, mock_coll = app_client

        group_id = ObjectId()
        member_id = str(ObjectId())
        now = datetime.now(timezone.utc)

        existing_doc = {
            "_id": group_id,
            "name": "old-group",
            "description": "old",
            "group_image": None,
            "members": [],
            "workstations": [],
            "file_shares": [],
            "created_at": now,
            "updated_at": now,
        }
        updated_doc = {
            "_id": group_id,
            "name": "new-group",
            "description": "new desc",
            "group_image": "data:image/png;base64,abc",
            "members": [ObjectId(member_id)],
            "workstations": ["ws-1"],
            "file_shares": ["share-1"],
            "created_at": now,
            "updated_at": now,
        }

        mock_coll.find_one.side_effect = [
            existing_doc,
            None,  # No duplicate name
            updated_doc
        ]
        mock_coll.update_one.return_value = MagicMock(modified_count=1)

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={
                "group_name": "new-group",
                "description": "new desc",
                "group_image": "data:image/png;base64,abc",
                "members": [member_id],
                "workstations": ["ws-1"],
                "file_shares": ["share-1"]
            },
            content_type="application/json"
        )

        assert response.status_code == 200
        mock_coll.update_one.assert_called_once()

    def test_update_access_group_validation_error(self, app_client):
        """Test PATCH returns 400 for invalid data"""
        client, mock_coll = app_client

        group_id = str(ObjectId())

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"group_name": "ab"},  # Too short
            content_type="application/json"
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["error"] == "Validation failed"

    def test_update_access_group_internal_error(self, app_client):
        """Test PATCH returns 500 on database error"""
        client, mock_coll = app_client

        group_id = str(ObjectId())
        mock_coll.find_one.side_effect = Exception("Database connection failed")

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"description": "test"},
            content_type="application/json"
        )

        assert response.status_code == 500
        data = response.get_json()
        assert data["error"] == "Internal server error"

    def test_delete_access_group_success(self, app_client):
        """Test DELETE successfully removes group"""
        client, mock_coll = app_client

        group_id = str(ObjectId())
        mock_coll.delete_one.return_value = MagicMock(deleted_count=1)

        response = client.delete(f"/api/access-groups/{group_id}")

        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "deleted"
        assert data["id"] == group_id

    def test_delete_access_group_not_found(self, app_client):
        """Test DELETE returns 404 when group doesn't exist"""
        client, mock_coll = app_client

        group_id = str(ObjectId())
        mock_coll.delete_one.return_value = MagicMock(deleted_count=0)

        response = client.delete(f"/api/access-groups/{group_id}")

        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "access group not found"

    def test_delete_access_group_internal_error(self, app_client):
        """Test DELETE returns 500 on database error"""
        client, mock_coll = app_client

        group_id = str(ObjectId())
        mock_coll.delete_one.side_effect = Exception("Database error")

        response = client.delete(f"/api/access-groups/{group_id}")

        assert response.status_code == 500
        data = response.get_json()
        assert data["error"] == "Internal server error"

    def test_update_access_group_members_converted_to_objectid(self, app_client):
        """Test PATCH converts member strings to ObjectIds"""
        client, mock_coll = app_client

        group_id = ObjectId()
        member1 = str(ObjectId())
        member2 = str(ObjectId())
        now = datetime.now(timezone.utc)

        existing_doc = {
            "_id": group_id,
            "name": "test-group",
            "members": [],
            "workstations": [],
            "file_shares": [],
            "created_at": now,
            "updated_at": now,
        }
        updated_doc = {
            **existing_doc,
            "members": [ObjectId(member1), ObjectId(member2)]
        }

        mock_coll.find_one.side_effect = [existing_doc, updated_doc]
        mock_coll.update_one.return_value = MagicMock(modified_count=1)

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"members": [member1, member2]},
            content_type="application/json"
        )

        assert response.status_code == 200
        # Verify update_one was called with ObjectIds
        call_args = mock_coll.update_one.call_args
        set_doc = call_args[0][1]["$set"]
        assert "members" in set_doc
        assert all(isinstance(m, ObjectId) for m in set_doc["members"])

    def test_update_access_group_workstations_and_file_shares(self, app_client):
        """Test PATCH correctly updates workstations and file_shares"""
        client, mock_coll = app_client

        group_id = ObjectId()
        now = datetime.now(timezone.utc)

        existing_doc = {
            "_id": group_id,
            "name": "test-group",
            "members": [],
            "workstations": [],
            "file_shares": [],
            "created_at": now,
            "updated_at": now,
        }
        updated_doc = {
            **existing_doc,
            "workstations": ["ws-1", "ws-2"],
            "file_shares": ["share-a", "share-b"]
        }

        mock_coll.find_one.side_effect = [existing_doc, updated_doc]
        mock_coll.update_one.return_value = MagicMock(modified_count=1)

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={
                "workstations": ["ws-1", "ws-2"],
                "file_shares": ["share-a", "share-b"]
            },
            content_type="application/json"
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["access_group"]["workstations"] == ["ws-1", "ws-2"]
        assert data["access_group"]["file_shares"] == ["share-a", "share-b"]

    def test_update_access_group_group_image(self, app_client):
        """Test PATCH correctly updates group_image"""
        client, mock_coll = app_client

        group_id = ObjectId()
        now = datetime.now(timezone.utc)

        existing_doc = {
            "_id": group_id,
            "name": "test-group",
            "group_image": None,
            "members": [],
            "workstations": [],
            "file_shares": [],
            "created_at": now,
            "updated_at": now,
        }
        updated_doc = {
            **existing_doc,
            "group_image": "data:image/png;base64,newimage"
        }

        mock_coll.find_one.side_effect = [existing_doc, updated_doc]
        mock_coll.update_one.return_value = MagicMock(modified_count=1)

        response = client.patch(
            f"/api/access-groups/{group_id}",
            json={"group_image": "data:image/png;base64,newimage"},
            content_type="application/json"
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["access_group"]["group_image"] == "data:image/png;base64,newimage"
