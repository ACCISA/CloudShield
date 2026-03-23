"""Tests for the access groups repository module."""
import pytest
from unittest.mock import MagicMock, patch
from bson import ObjectId
import cloudshield.Server.repos.access_groups_repo as ag_repo


@pytest.fixture
def mock_db():
    """Mock database object."""
    return MagicMock()


@pytest.fixture
def mock_access_groups():
    """Mock access_groups collection."""
    with patch("cloudshield.Server.repos.access_groups_repo.access_groups") as mock_collection:
        yield mock_collection


# Tests for get_access_group_by_id
def test_get_access_group_by_id_success(mock_db, mock_access_groups):
    """Test successful retrieval of an access group by ID."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_group = {
        "_id": oid,
        "name": "Developers",
        "description": "Developer group",
        "members": ["user1", "user2"]
    }
    mock_access_groups.find_one.return_value = mock_group

    result = ag_repo.get_access_group_by_id(mock_db, group_id)

    # Verify find_one was called with correct ObjectId
    mock_access_groups.find_one.assert_called_once_with({"_id": oid})

    # Verify _id was converted to string
    assert result["_id"] == str(oid)
    assert result["name"] == "Developers"
    assert result["members"] == ["user1", "user2"]


def test_get_access_group_by_id_not_found(mock_db, mock_access_groups):
    """Test retrieval when access group is not found."""
    group_id = "507f1f77bcf86cd799439011"
    mock_access_groups.find_one.return_value = None

    result = ag_repo.get_access_group_by_id(mock_db, group_id)

    assert result is None


def test_get_access_group_by_id_invalid_format(mock_db, mock_access_groups):
    """Test retrieval with invalid group ID format."""
    group_id = "invalid-id"

    result = ag_repo.get_access_group_by_id(mock_db, group_id)

    # Should return None without calling find_one
    assert result is None
    mock_access_groups.find_one.assert_not_called()


def test_get_access_group_by_id_empty_string(mock_db, mock_access_groups):
    """Test retrieval with empty string ID."""
    result = ag_repo.get_access_group_by_id(mock_db, "")

    assert result is None
    mock_access_groups.find_one.assert_not_called()


def test_get_access_group_by_id_preserves_all_fields(mock_db, mock_access_groups):
    """Test that all fields are preserved in the returned dict."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_group = {
        "_id": oid,
        "name": "Group Name",
        "description": "Description",
        "members": ["user1", "user2", "user3"],
        "org_id": "org-1",
        "created_at": "2026-03-01",
        "updated_at": "2026-03-20"
    }
    mock_access_groups.find_one.return_value = mock_group

    result = ag_repo.get_access_group_by_id(mock_db, group_id)

    # All fields should be preserved except _id conversion
    assert result["_id"] == str(oid)
    assert result["name"] == "Group Name"
    assert result["description"] == "Description"
    assert result["members"] == ["user1", "user2", "user3"]
    assert result["org_id"] == "org-1"
    assert result["created_at"] == "2026-03-01"
    assert result["updated_at"] == "2026-03-20"


def test_get_access_group_by_id_empty_members(mock_db, mock_access_groups):
    """Test retrieval of group with empty members list."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_group = {
        "_id": oid,
        "name": "Empty Group",
        "members": []
    }
    mock_access_groups.find_one.return_value = mock_group

    result = ag_repo.get_access_group_by_id(mock_db, group_id)

    assert result["members"] == []


def test_get_access_group_by_id_no_members_field(mock_db, mock_access_groups):
    """Test retrieval of group without members field."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_group = {
        "_id": oid,
        "name": "Group Without Members"
    }
    mock_access_groups.find_one.return_value = mock_group

    result = ag_repo.get_access_group_by_id(mock_db, group_id)

    assert result["name"] == "Group Without Members"
    assert "members" not in result


# Tests for get_members_amount_by_id
def test_get_members_amount_by_id_is_stub(mock_db):
    """Test that get_members_amount_by_id is a stub returning None."""
    result = ag_repo.get_members_amount_by_id(mock_db, "group-id")
    assert result is None


# Tests for get_unique_members_by_ids
def test_get_unique_members_by_ids_single_group(mock_db, mock_access_groups):
    """Test getting unique members from a single group."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_groups = [
        {
            "_id": oid,
            "name": "Group 1",
            "members": ["user1", "user2", "user3"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id])

    # Verify find was called with correct ObjectIds
    mock_access_groups.find.assert_called_once_with({"_id": {"$in": [oid]}})

    # Verify all members are returned as strings
    assert len(result) == 3
    assert "user1" in result
    assert "user2" in result
    assert "user3" in result


def test_get_unique_members_by_ids_multiple_groups(mock_db, mock_access_groups):
    """Test getting unique members from multiple groups."""
    group_id1 = "507f1f77bcf86cd799439011"
    group_id2 = "507f1f77bcf86cd799439012"
    oid1 = ObjectId(group_id1)
    oid2 = ObjectId(group_id2)
    
    mock_groups = [
        {
            "_id": oid1,
            "members": ["user1", "user2"]
        },
        {
            "_id": oid2,
            "members": ["user2", "user3"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id1, group_id2])

    # Verify find was called with both ObjectIds
    call_args = mock_access_groups.find.call_args
    assert oid1 in call_args[0][0]["_id"]["$in"]
    assert oid2 in call_args[0][0]["_id"]["$in"]

    # Verify unique members are returned (user2 should appear only once)
    assert len(result) == 3
    assert "user1" in result
    assert "user2" in result
    assert "user3" in result


def test_get_unique_members_by_ids_no_duplicates(mock_db, mock_access_groups):
    """Test that duplicate members across groups are deduplicated."""
    group_id1 = "507f1f77bcf86cd799439011"
    group_id2 = "507f1f77bcf86cd799439012"
    oid1 = ObjectId(group_id1)
    oid2 = ObjectId(group_id2)
    
    mock_groups = [
        {
            "_id": oid1,
            "members": ["user1", "user2", "user3"]
        },
        {
            "_id": oid2,
            "members": ["user2", "user3", "user4"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id1, group_id2])

    # Verify all unique members
    assert set(result) == {"user1", "user2", "user3", "user4"}
    assert len(result) == 4


def test_get_unique_members_by_ids_empty_groups(mock_db, mock_access_groups):
    """Test with empty members lists."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_groups = [
        {
            "_id": oid,
            "members": []
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id])

    assert result == []


def test_get_unique_members_by_ids_no_members_field(mock_db, mock_access_groups):
    """Test with groups that have no members field."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_groups = [
        {
            "_id": oid,
            "name": "Group Without Members"
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id])

    assert result == []


def test_get_unique_members_by_ids_mixed_groups(mock_db, mock_access_groups):
    """Test with some groups having members and some not."""
    group_id1 = "507f1f77bcf86cd799439011"
    group_id2 = "507f1f77bcf86cd799439012"
    oid1 = ObjectId(group_id1)
    oid2 = ObjectId(group_id2)
    
    mock_groups = [
        {
            "_id": oid1,
            "members": ["user1", "user2"]
        },
        {
            "_id": oid2
            # No members field
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id1, group_id2])

    # Should only have members from the first group
    assert set(result) == {"user1", "user2"}


def test_get_unique_members_by_ids_no_groups(mock_db, mock_access_groups):
    """Test with empty group list."""
    mock_access_groups.find.return_value = []

    result = ag_repo.get_unique_members_by_ids(mock_db, [])

    # Should call find with empty array
    call_args = mock_access_groups.find.call_args
    assert call_args[0][0]["_id"]["$in"] == []

    assert result == []


def test_get_unique_members_by_ids_already_object_ids(mock_db, mock_access_groups):
    """Test when group_ids are already ObjectId instances."""
    oid1 = ObjectId()
    oid2 = ObjectId()
    
    mock_groups = [
        {
            "_id": oid1,
            "members": ["user1"]
        },
        {
            "_id": oid2,
            "members": ["user2"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [oid1, oid2])

    # Verify find was called with the ObjectIds
    call_args = mock_access_groups.find.call_args
    assert oid1 in call_args[0][0]["_id"]["$in"]
    assert oid2 in call_args[0][0]["_id"]["$in"]

    assert set(result) == {"user1", "user2"}


def test_get_unique_members_by_ids_mixed_string_and_oid(mock_db, mock_access_groups):
    """Test with mixed string and ObjectId group IDs."""
    oid1 = ObjectId()
    oid2 = ObjectId()
    
    mock_groups = [
        {
            "_id": oid1,
            "members": ["user1"]
        },
        {
            "_id": oid2,
            "members": ["user2"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [str(oid1), oid2])

    # Verify find was called with the ObjectIds
    call_args = mock_access_groups.find.call_args
    assert oid1 in call_args[0][0]["_id"]["$in"]
    assert oid2 in call_args[0][0]["_id"]["$in"]

    assert set(result) == {"user1", "user2"}


def test_get_unique_members_by_ids_many_groups(mock_db, mock_access_groups):
    """Test with many groups."""
    group_ids = [str(ObjectId()) for _ in range(10)]
    oids = [ObjectId(gid) for gid in group_ids]
    
    mock_groups = [
        {
            "_id": oids[i],
            "members": [f"user{i}", f"user{i+1}"]
        }
        for i in range(10)
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, group_ids)

    # Should have many unique members
    assert len(result) > 0
    # Verify find was called with all ObjectIds
    call_args = mock_access_groups.find.call_args
    assert len(call_args[0][0]["_id"]["$in"]) == 10


def test_get_unique_members_by_ids_single_group_multiple_calls(mock_db, mock_access_groups):
    """Test that function works correctly on multiple calls."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    mock_groups = [
        {
            "_id": oid,
            "members": ["user1", "user2"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result1 = ag_repo.get_unique_members_by_ids(mock_db, [group_id])
    result2 = ag_repo.get_unique_members_by_ids(mock_db, [group_id])

    # Both calls should return the same result
    assert set(result1) == set(result2) == {"user1", "user2"}
    assert mock_access_groups.find.call_count == 2


def test_get_unique_members_by_ids_very_large_member_list(mock_db, mock_access_groups):
    """Test with a large member list in a group."""
    group_id = "507f1f77bcf86cd799439011"
    oid = ObjectId(group_id)
    
    # Create a large member list
    large_member_list = [f"user{i}" for i in range(1000)]
    
    mock_groups = [
        {
            "_id": oid,
            "members": large_member_list
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [group_id])

    assert len(result) == 1000
    assert all(f"user{i}" in result for i in range(1000))


def test_get_unique_members_by_ids_overlap_in_three_groups(mock_db, mock_access_groups):
    """Test deduplication with overlapping members across three groups."""
    oid1 = ObjectId()
    oid2 = ObjectId()
    oid3 = ObjectId()
    
    mock_groups = [
        {
            "_id": oid1,
            "members": ["user1", "user2", "user3"]
        },
        {
            "_id": oid2,
            "members": ["user2", "user3", "user4"]
        },
        {
            "_id": oid3,
            "members": ["user3", "user4", "user5"]
        }
    ]
    mock_access_groups.find.return_value = mock_groups

    result = ag_repo.get_unique_members_by_ids(mock_db, [oid1, oid2, oid3])

    # Verify deduplication
    assert set(result) == {"user1", "user2", "user3", "user4", "user5"}
    assert len(result) == 5
