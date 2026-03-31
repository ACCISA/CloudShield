"""Tests for the workstations repository module."""
import pytest
from unittest.mock import MagicMock, Mock, patch
from bson import ObjectId
import cloudshield.Server.repos.workstations_repo as ws_repo


@pytest.fixture
def mock_workstation_template():
    """Mock WorkstationTemplate class."""
    with patch("cloudshield.Server.repos.workstations_repo.WorkstationTemplate") as MockTemplate:
        mock_instance = MagicMock()
        mock_instance.model_dump.return_value = {
            "_id": ObjectId(),
            "name": "Test Template",
            "org_id": "org-1",
            "description": "Test",
            "software": ["software1"],
            "is_ready": True,
            "access_groups": ["group1"],
            "members": ["user1"]
        }
        MockTemplate.return_value = mock_instance
        yield MockTemplate


@pytest.fixture
def mock_workstation():
    """Mock Workstation class."""
    with patch("cloudshield.Server.repos.workstations_repo.Workstation") as MockWS:
        mock_instance = MagicMock()
        mock_instance.model_dump.return_value = {
            "_id": ObjectId(),
            "org_id": "org-1",
            "template_id": "template-1",
            "status": "INACTIVE"
        }
        MockWS.return_value = mock_instance
        yield MockWS


@pytest.fixture
def mock_workstation_status():
    """Mock WorkstationStatus enum."""
    with patch("cloudshield.Server.repos.workstations_repo.WorkstationStatus") as MockStatus:
        MockStatus.INACTIVE = "INACTIVE"
        MockStatus.ACTIVE = "ACTIVE"
        MockStatus.PROVISIONING = "PROVISIONING"
        yield MockStatus


@pytest.fixture
def mock_db():
    """Mock database with collections."""
    db = MagicMock()
    db.workstation_templates = MagicMock()
    db.workstations = MagicMock()
    db.access_groups = MagicMock()
    return db


# Tests for insert_workstation_template
def test_insert_workstation_template_success(mock_db, mock_workstation_template):
    """Test successful insertion of a workstation template."""
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId()
    mock_db.workstation_templates.insert_one.return_value = mock_insert_result

    result = ws_repo.insert_workstation_template(
        db=mock_db,
        org_id="org-1",
        name="Test Template",
        description="Test Description",
        software=["software1", "software2"],
        is_ready=True,
        access_groups=["group1", "group2"],
        members=["user1", "user2"]
    )

    # Verify the template model was created with correct parameters
    mock_workstation_template.assert_called_once_with(
        name="Test Template",
        org_id="org-1",
        description="Test Description",
        software=["software1", "software2"],
        is_ready=True,
        access_groups=["group1", "group2"],
        members=["user1", "user2"]
    )

    # Verify insert_one was called
    mock_db.workstation_templates.insert_one.assert_called_once()

    # Verify result is what was returned
    assert result == mock_insert_result


def test_insert_workstation_template_empty_software(mock_db, mock_workstation_template):
    """Test insertion with empty software list."""
    mock_insert_result = MagicMock()
    mock_db.workstation_templates.insert_one.return_value = mock_insert_result

    result = ws_repo.insert_workstation_template(
        db=mock_db,
        org_id="org-1",
        name="Test Template",
        description="Test",
        software=[],
        is_ready=False,
        access_groups=[],
        members=[]
    )

    # Verify insert_one was called
    mock_db.workstation_templates.insert_one.assert_called_once()
    assert result == mock_insert_result


# Tests for get_workstation_template
def test_get_workstation_template_success(mock_db):
    """Test successful retrieval of a workstation template."""
    template_id = "507f1f77bcf86cd799439011"
    mock_template = {
        "_id": ObjectId(template_id),
        "name": "Test Template",
        "org_id": "org-1"
    }
    mock_db.workstation_templates.find_one.return_value = mock_template

    result = ws_repo.get_workstation_template(
        db=mock_db,
        org_id="org-1",
        template_id=template_id
    )

    # Verify find_one was called with correct filter
    mock_db.workstation_templates.find_one.assert_called_once_with({
        "_id": ObjectId(template_id),
        "org_id": "org-1"
    })

    assert result == mock_template


def test_get_workstation_template_not_found(mock_db):
    """Test retrieval when template is not found."""
    mock_db.workstation_templates.find_one.return_value = None

    result = ws_repo.get_workstation_template(
        db=mock_db,
        org_id="org-1",
        template_id="507f1f77bcf86cd799439011"
    )

    assert result is None


def test_get_workstation_template_invalid_id(mock_db):
    """Test retrieval with invalid template ID."""
    mock_db.workstation_templates.find_one.side_effect = Exception("Invalid ID")

    result = ws_repo.get_workstation_template(
        db=mock_db,
        org_id="org-1",
        template_id="invalid-id"
    )

    assert result is None


def test_get_workstation_template_different_org(mock_db):
    """Test that template from different org is not returned."""
    template_id = "507f1f77bcf86cd799439011"
    mock_db.workstation_templates.find_one.return_value = None

    result = ws_repo.get_workstation_template(
        db=mock_db,
        org_id="org-1",
        template_id=template_id
    )

    # Verify the query includes org_id filter
    call_args = mock_db.workstation_templates.find_one.call_args
    assert call_args[0][0]["org_id"] == "org-1"
    assert result is None


# Tests for get_workstation
def test_get_workstation_success(mock_db):
    """Test successful retrieval of a workstation."""
    vm_id = "507f1f77bcf86cd799439012"
    mock_ws = {
        "_id": ObjectId(vm_id),
        "org_id": "org-1",
        "template_id": "template-1",
        "status": "ACTIVE"
    }
    mock_db.workstations.find_one.return_value = mock_ws

    result = ws_repo.get_workstation(
        db=mock_db,
        org_id="org-1",
        vm_id=vm_id
    )

    # Verify find_one was called with correct filter
    mock_db.workstations.find_one.assert_called_once_with({
        "_id": ObjectId(vm_id),
        "org_id": "org-1"
    })

    assert result == mock_ws


def test_get_workstation_not_found(mock_db):
    """Test retrieval when workstation is not found."""
    mock_db.workstations.find_one.return_value = None

    result = ws_repo.get_workstation(
        db=mock_db,
        org_id="org-1",
        vm_id="507f1f77bcf86cd799439012"
    )

    assert result is None


def test_get_workstation_invalid_id(mock_db):
    """Test retrieval with invalid workstation ID."""
    mock_db.workstations.find_one.side_effect = Exception("Invalid ID")

    result = ws_repo.get_workstation(
        db=mock_db,
        org_id="org-1",
        vm_id="invalid-id"
    )

    assert result is None


# Tests for insert_workstation
def test_insert_workstation_success(mock_db, mock_workstation, mock_workstation_status):
    """Test successful insertion of a workstation."""
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId()
    mock_db.workstations.insert_one.return_value = mock_insert_result

    result = ws_repo.insert_workstation(
        db=mock_db,
        org_id="org-1",
        template_id="template-1"
    )

    # Verify the workstation model was created
    mock_workstation.assert_called_once_with(
        org_id="org-1",
        template_id="template-1",
        status="INACTIVE"
    )

    # Verify insert_one was called
    mock_db.workstations.insert_one.assert_called_once()

    assert result == mock_insert_result


def test_insert_workstation_multiple(mock_db, mock_workstation, mock_workstation_status):
    """Test insertion of multiple workstations."""
    mock_insert_result1 = MagicMock()
    mock_insert_result1.inserted_id = ObjectId()
    mock_insert_result2 = MagicMock()
    mock_insert_result2.inserted_id = ObjectId()

    mock_db.workstations.insert_one.side_effect = [mock_insert_result1, mock_insert_result2]

    result1 = ws_repo.insert_workstation(
        db=mock_db,
        org_id="org-1",
        template_id="template-1"
    )

    result2 = ws_repo.insert_workstation(
        db=mock_db,
        org_id="org-1",
        template_id="template-2"
    )

    assert result1 == mock_insert_result1
    assert result2 == mock_insert_result2
    assert mock_db.workstations.insert_one.call_count == 2


# Tests for update_workstation_template
def test_update_workstation_template_single_field(mock_db):
    """Test updating a single field of a workstation template."""
    template_id = "template-1"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstation_templates.update_one.return_value = mock_result

    result = ws_repo.update_workstation_template(
        db=mock_db,
        template_id=template_id,
        is_ready=True
    )

    # Verify update_one was called with correct filter and update
    mock_db.workstation_templates.update_one.assert_called_once_with(
        {"_id": template_id},
        {"$set": {"is_ready": True}}
    )

    assert result == 1


def test_update_workstation_template_multiple_fields(mock_db):
    """Test updating multiple fields of a workstation template."""
    template_id = "template-1"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstation_templates.update_one.return_value = mock_result

    result = ws_repo.update_workstation_template(
        db=mock_db,
        template_id=template_id,
        is_ready=True,
        name="New Name",
        description="New Description"
    )

    # Verify all fields were included in the update
    call_args = mock_db.workstation_templates.update_one.call_args
    update_data = call_args[0][1]["$set"]
    assert update_data["is_ready"] is True
    assert update_data["name"] == "New Name"
    assert update_data["description"] == "New Description"

    assert result == 1


def test_update_workstation_template_none_values_excluded(mock_db):
    """Test that None values are excluded from updates."""
    template_id = "template-1"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstation_templates.update_one.return_value = mock_result

    result = ws_repo.update_workstation_template(
        db=mock_db,
        template_id=template_id,
        is_ready=True,
        name=None,
        description="New Description"
    )

    # Verify None values are excluded
    call_args = mock_db.workstation_templates.update_one.call_args
    update_data = call_args[0][1]["$set"]
    assert "name" not in update_data
    assert update_data["is_ready"] is True
    assert update_data["description"] == "New Description"

    assert result == 1


def test_update_workstation_template_not_found(mock_db):
    """Test updating a template that doesn't exist."""
    template_id = "template-1"
    mock_result = MagicMock()
    mock_result.modified_count = 0
    mock_db.workstation_templates.update_one.return_value = mock_result

    result = ws_repo.update_workstation_template(
        db=mock_db,
        template_id=template_id,
        is_ready=True
    )

    assert result == 0


# Tests for update_workstation
def test_update_workstation_single_field(mock_db):
    """Test updating a single field of a workstation."""
    ws_id = "ws-1"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.update_workstation(
        db=mock_db,
        workstation_id=ws_id,
        status="ACTIVE"
    )

    # Verify update_one was called with correct filter and update
    mock_db.workstations.update_one.assert_called_once_with(
        {"_id": ws_id},
        {"$set": {"status": "ACTIVE"}}
    )

    assert result == 1


def test_update_workstation_multiple_fields(mock_db):
    """Test updating multiple fields of a workstation."""
    ws_id = "ws-1"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.update_workstation(
        db=mock_db,
        workstation_id=ws_id,
        status="ACTIVE",
        mac="00:11:22:33:44:55",
        ipv4_address="192.168.1.100"
    )

    # Verify all fields were included in the update
    call_args = mock_db.workstations.update_one.call_args
    update_data = call_args[0][1]["$set"]
    assert update_data["status"] == "ACTIVE"
    assert update_data["mac"] == "00:11:22:33:44:55"
    assert update_data["ipv4_address"] == "192.168.1.100"

    assert result == 1


def test_update_workstation_none_values_excluded(mock_db):
    """Test that None values are excluded from workstation updates."""
    ws_id = "ws-1"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.update_workstation(
        db=mock_db,
        workstation_id=ws_id,
        status="ACTIVE",
        mac=None,
        ipv4_address="192.168.1.100"
    )

    # Verify None values are excluded
    call_args = mock_db.workstations.update_one.call_args
    update_data = call_args[0][1]["$set"]
    assert "mac" not in update_data
    assert update_data["status"] == "ACTIVE"
    assert update_data["ipv4_address"] == "192.168.1.100"

    assert result == 1


def test_update_workstation_not_found(mock_db):
    """Test updating a workstation that doesn't exist."""
    ws_id = "ws-1"
    mock_result = MagicMock()
    mock_result.modified_count = 0
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.update_workstation(
        db=mock_db,
        workstation_id=ws_id,
        status="ACTIVE"
    )

    assert result == 0


# Tests for get_workstations
def test_get_workstations_success(mock_db):
    """Test successful retrieval of all workstations for an org."""
    org_id = "org-1"
    template_id1 = ObjectId()
    template_id2 = ObjectId()

    mock_templates = [
        {
            "_id": template_id1,
            "name": "Template 1",
            "org_id": org_id
        },
        {
            "_id": template_id2,
            "name": "Template 2",
            "org_id": org_id
        }
    ]

    mock_db.workstation_templates.find.return_value = mock_templates

    result = ws_repo.get_workstations(mock_db, org_id)

    # Verify find was called with correct filter
    mock_db.workstation_templates.find.assert_called_once_with({"org_id": org_id})

    # Verify IDs were converted to strings
    assert result[0]["_id"] == str(template_id1)
    assert result[1]["_id"] == str(template_id2)
    assert len(result) == 2


def test_get_workstations_empty(mock_db):
    """Test retrieval when org has no workstations."""
    mock_db.workstation_templates.find.return_value = []

    result = ws_repo.get_workstations(mock_db, "org-1")

    assert result == []


def test_get_workstations_single(mock_db):
    """Test retrieval with only one workstation."""
    template_id = ObjectId()
    mock_templates = [
        {
            "_id": template_id,
            "name": "Template 1",
            "org_id": "org-1"
        }
    ]

    mock_db.workstation_templates.find.return_value = mock_templates

    result = ws_repo.get_workstations(mock_db, "org-1")

    assert len(result) == 1
    assert result[0]["_id"] == str(template_id)


def test_get_workstations_preserves_other_fields(mock_db):
    """Test that get_workstations preserves all fields except _id conversion."""
    template_id = ObjectId()
    mock_templates = [
        {
            "_id": template_id,
            "name": "Template 1",
            "org_id": "org-1",
            "description": "Test",
            "software": ["software1"]
        }
    ]

    mock_db.workstation_templates.find.return_value = mock_templates

    result = ws_repo.get_workstations(mock_db, "org-1")

    assert result[0]["_id"] == str(template_id)
    assert result[0]["name"] == "Template 1"
    assert result[0]["description"] == "Test"
    assert result[0]["software"] == ["software1"]


# Tests for get_available_workstations
def test_get_available_workstations_success(mock_db):
    """Test successful retrieval of available workstations for a user."""
    user_id = "user-1"
    group_id = ObjectId()

    # Mock the groups query
    mock_db.access_groups.find.return_value = [{"_id": group_id}]

    # Mock the templates query
    template_id = ObjectId()
    mock_db.workstation_tempaltes.find.return_value = [
        {"_id": template_id, "name": "Template 1"}
    ]

    # Mock the workstations query
    ws_id = ObjectId()
    mock_workstations = [
        {
            "_id": ws_id,
            "template_id": str(template_id),
            "status": "active"
        }
    ]
    mock_db.workstations.find.return_value = mock_workstations

    result = ws_repo.get_available_workstation(mock_db, user_id)

    # Verify the groups query
    mock_db.access_groups.find.assert_called_once_with(
        {"members": user_id}
    )

    assert len(result) == 1
    assert result[0]["status"] == "active"


def test_get_available_workstations_user_no_groups(mock_db):
    """Test when user is not in any groups."""
    user_id = "user-1"

    # Mock empty group results
    mock_db.access_groups.find.return_value = []

    # Since user_groups is empty, template query will find nothing
    mock_db.workstation_tempaltes.find.return_value = []

    # Workstations query will return empty
    mock_db.workstations.find.return_value = []

    result = ws_repo.get_available_workstation(mock_db, user_id)

    assert result == []


def test_get_available_workstations_no_templates(mock_db):
    """Test when user groups have no templates."""
    user_id = "user-1"
    group_id = ObjectId()

    mock_db.access_groups.find.return_value = [{"_id": group_id}]
    mock_db.workstation_tempaltes.find.return_value = []
    mock_db.workstations.find.return_value = []

    result = ws_repo.get_available_workstation(mock_db, user_id)

    assert result == []


def test_get_available_workstations_inactive_excluded(mock_db):
    """Test that inactive workstations are excluded."""
    user_id = "user-1"
    group_id = ObjectId()
    template_id = ObjectId()

    mock_db.access_groups.find.return_value = [{"_id": group_id}]
    mock_db.workstation_tempaltes.find.return_value = [{"_id": template_id}]

    # Return only ACTIVE workstations (INACTIVE are filtered by status query)
    mock_db.workstations.find.return_value = []

    result = ws_repo.get_available_workstation(mock_db, user_id)

    # Verify the workstations query includes status filter
    call_args = mock_db.workstations.find.call_args
    query = call_args[0][0]
    assert query["status"] == "active"


def test_get_available_workstations_multiple_groups(mock_db):
    """Test user with multiple groups."""
    user_id = "user-1"
    group_id1 = ObjectId()
    group_id2 = ObjectId()
    template_id1 = ObjectId()
    template_id2 = ObjectId()

    # Mock multiple groups - note: the function only gets groups where _id == 1
    # This is a potential bug in the implementation, but we test actual behavior
    mock_db.access_groups.find.return_value = [
        {"_id": group_id1},
        {"_id": group_id2}
    ]

    mock_db.workstation_tempaltes.find.return_value = [
        {"_id": template_id1},
        {"_id": template_id2}
    ]

    ws_id1 = ObjectId()
    ws_id2 = ObjectId()
    mock_workstations = [
        {"_id": ws_id1, "status": "ACTIVE"},
        {"_id": ws_id2, "status": "ACTIVE"}
    ]
    mock_db.workstations.find.return_value = mock_workstations

    result = ws_repo.get_available_workstation(mock_db, user_id)

    assert len(result) == 2


# ==================== Tests for uncovered functions ====================

# Tests for get_assigned_workstation
def test_get_assigned_workstation_returns_none(mock_db):
    """Test that get_assigned_workstation returns None (pass statement)."""
    result = ws_repo.get_assigned_workstation(db=mock_db, user_id="user-1")
    assert result is None


# Tests for release_assigned_workstation
def test_release_assigned_workstation_success(mock_db):
    """Test successful release of a workstation."""
    user_id = "user-123"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.release_assigned_workstation(db=mock_db, user_id=user_id)

    # Verify update_one was called with correct filter
    mock_db.workstations.update_one.assert_called_once()
    call_args = mock_db.workstations.update_one.call_args
    
    # Check the filter
    filter_doc = call_args[0][0]
    assert filter_doc == {"cur_user_id": user_id}
    
    # Check the update operation
    update_doc = call_args[0][1]
    assert update_doc["$set"]["cur_user_id"] is None
    assert update_doc["$set"]["status"] == "active"
    
    # Verify result
    assert result is True


def test_release_assigned_workstation_not_found(mock_db):
    """Test release when workstation is not found."""
    user_id = "user-456"
    mock_result = MagicMock()
    mock_result.modified_count = 0
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.release_assigned_workstation(db=mock_db, user_id=user_id)

    assert result is False


def test_release_assigned_workstation_clears_user_and_status(mock_db):
    """Test that release clears user and resets status."""
    user_id = "user-789"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    ws_repo.release_assigned_workstation(db=mock_db, user_id=user_id)

    # Verify the correct update fields
    call_args = mock_db.workstations.update_one.call_args
    update_doc = call_args[0][1]
    assert update_doc["$set"]["cur_user_id"] is None
    assert update_doc["$set"]["status"] == "active"


# Tests for set_assigned_workstation
def test_set_assigned_workstation_success(mock_db):
    """Test successful assignment of a workstation to a user."""
    user_id = "user-123"
    vm_id = "507f1f77bcf86cd799439012"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.set_assigned_workstation(db=mock_db, user_id=user_id, vm_id=vm_id)

    # Verify update_one was called with correct filter
    mock_db.workstations.update_one.assert_called_once()
    call_args = mock_db.workstations.update_one.call_args
    
    # Check the filter uses ObjectId
    filter_doc = call_args[0][0]
    assert filter_doc == {"_id": ObjectId(vm_id)}
    
    # Check the update operation
    update_doc = call_args[0][1]
    assert update_doc["$set"]["cur_user_id"] == user_id
    assert update_doc["$set"]["status"] == "used"
    
    # Verify result
    assert result is True


def test_set_assigned_workstation_not_found(mock_db):
    """Test assignment when workstation is not found."""
    user_id = "user-456"
    vm_id = "507f1f77bcf86cd799439013"
    mock_result = MagicMock()
    mock_result.modified_count = 0
    mock_db.workstations.update_one.return_value = mock_result

    result = ws_repo.set_assigned_workstation(db=mock_db, user_id=user_id, vm_id=vm_id)

    assert result is False


def test_set_assigned_workstation_sets_user_and_status(mock_db):
    """Test that assignment sets user and status correctly."""
    user_id = "user-789"
    vm_id = "507f1f77bcf86cd799439014"
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_db.workstations.update_one.return_value = mock_result

    ws_repo.set_assigned_workstation(db=mock_db, user_id=user_id, vm_id=vm_id)

    # Verify the correct update fields
    call_args = mock_db.workstations.update_one.call_args
    update_doc = call_args[0][1]
    assert update_doc["$set"]["cur_user_id"] == user_id
    assert update_doc["$set"]["status"] == "used"


def test_set_assigned_workstation_invalid_vm_id(mock_db):
    """Test assignment with invalid VM ID."""
    user_id = "user-123"
    vm_id = "invalid-id"
    mock_db.workstations.update_one.side_effect = Exception("Invalid ObjectId")

    with pytest.raises(Exception):
        ws_repo.set_assigned_workstation(db=mock_db, user_id=user_id, vm_id=vm_id)


# Tests for get_assigned_workstation_templates
def test_get_assigned_workstation_templates_empty(mock_db):
    """Test when no templates are assigned to user."""
    user_id = "user-123"
    mock_db.workstation_templates.find.return_value = []

    result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert result == []


def test_get_assigned_workstation_templates_user_in_members(mock_db):
    """Test templates where user is directly in members list."""
    user_id = "user-123"
    template_id = ObjectId()
    mock_template = {
        "_id": template_id,
        "name": "Template 1",
        "members": ["user-123", "user-456"],
        "access_groups": []
    }
    mock_db.workstation_templates.find.return_value = [mock_template]

    result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert len(result) == 1
    assert result[0]["_id"] == str(template_id)
    assert result[0]["members"] == ["user-123", "user-456"]


def test_get_assigned_workstation_templates_user_in_access_group(mock_db):
    """Test templates where user is in an access group."""
    user_id = "user-123"
    template_id = ObjectId()
    group_id = ObjectId()
    
    mock_template = {
        "_id": template_id,
        "name": "Template 1",
        "members": [],
        "access_groups": [str(group_id)]
    }
    mock_group = {
        "_id": group_id,
        "members": ["user-123", "user-456"]
    }
    
    mock_db.workstation_templates.find.return_value = [mock_template]
    
    with patch('cloudshield.Server.repos.workstations_repo.get_access_group_by_id') as mock_get_group:
        mock_get_group.return_value = mock_group
        
        result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert len(result) == 1
    assert result[0]["_id"] == str(template_id)


def test_get_assigned_workstation_templates_user_not_in_group(mock_db):
    """Test templates where user is not in any group."""
    user_id = "user-123"
    template_id = ObjectId()
    group_id = ObjectId()
    
    mock_template = {
        "_id": template_id,
        "name": "Template 1",
        "members": [],
        "access_groups": [str(group_id)]
    }
    mock_group = {
        "_id": group_id,
        "members": ["user-456", "user-789"]
    }
    
    mock_db.workstation_templates.find.return_value = [mock_template]
    
    with patch('cloudshield.Server.repos.workstations_repo.get_access_group_by_id') as mock_get_group:
        mock_get_group.return_value = mock_group
        
        result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert len(result) == 0


def test_get_assigned_workstation_templates_group_not_found(mock_db):
    """Test handling when access group is not found."""
    user_id = "user-123"
    template_id = ObjectId()
    group_id = ObjectId()
    
    mock_template = {
        "_id": template_id,
        "name": "Template 1",
        "members": [],
        "access_groups": [str(group_id)]
    }
    
    mock_db.workstation_templates.find.return_value = [mock_template]
    
    with patch('cloudshield.Server.repos.workstations_repo.get_access_group_by_id') as mock_get_group:
        mock_get_group.return_value = None
        
        result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert len(result) == 0


def test_get_assigned_workstation_templates_group_exception(mock_db):
    """Test handling when access group lookup raises exception."""
    user_id = "user-123"
    template_id = ObjectId()
    group_id = ObjectId()
    
    mock_template = {
        "_id": template_id,
        "name": "Template 1",
        "members": [],
        "access_groups": [str(group_id)]
    }
    
    mock_db.workstation_templates.find.return_value = [mock_template]
    
    with patch('cloudshield.Server.repos.workstations_repo.get_access_group_by_id') as mock_get_group:
        mock_get_group.side_effect = Exception("Database error")
        
        result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert len(result) == 0


def test_get_assigned_workstation_templates_multiple_templates_mixed(mock_db):
    """Test with mix of user in members, in group, and not assigned."""
    user_id = "user-123"
    template_id1 = ObjectId()
    template_id2 = ObjectId()
    template_id3 = ObjectId()
    group_id = ObjectId()
    
    mock_templates = [
        {
            "_id": template_id1,
            "name": "Template 1 - Direct Member",
            "members": ["user-123"],
            "access_groups": []
        },
        {
            "_id": template_id2,
            "name": "Template 2 - Via Group",
            "members": [],
            "access_groups": [str(group_id)]
        },
        {
            "_id": template_id3,
            "name": "Template 3 - Not Assigned",
            "members": [],
            "access_groups": []
        }
    ]
    
    mock_group = {
        "_id": group_id,
        "members": ["user-123"]
    }
    
    mock_db.workstation_templates.find.return_value = mock_templates
    
    with patch('cloudshield.Server.repos.workstations_repo.get_access_group_by_id') as mock_get_group:
        mock_get_group.return_value = mock_group
        
        result = ws_repo.get_assigned_workstation_templates(db=mock_db, user_id=user_id)

    assert len(result) == 2
    assert result[0]["_id"] == str(template_id1)
    assert result[1]["_id"] == str(template_id2)


# Tests for get_workstation_templates
def test_get_workstation_templates_success(mock_db):
    """Test successful retrieval of workstation templates."""
    org_id = "org-1"
    template_id1 = ObjectId()
    template_id2 = ObjectId()
    
    mock_templates = [
        {
            "_id": template_id1,
            "name": "Template 1",
            "org_id": org_id
        },
        {
            "_id": template_id2,
            "name": "Template 2",
            "org_id": org_id
        }
    ]
    mock_db.workstation_templates.find.return_value = mock_templates

    result = ws_repo.get_workstation_templates(db=mock_db, org_id=org_id)

    # Verify find was called with correct filter
    mock_db.workstation_templates.find.assert_called_once_with({"org_id": org_id})
    
    # Verify ObjectIds were converted to strings
    assert len(result) == 2
    assert result[0]["_id"] == str(template_id1)
    assert result[1]["_id"] == str(template_id2)


def test_get_workstation_templates_empty(mock_db):
    """Test when no templates exist for the org."""
    org_id = "org-1"
    mock_db.workstation_templates.find.return_value = []

    result = ws_repo.get_workstation_templates(db=mock_db, org_id=org_id)

    assert result == []
    mock_db.workstation_templates.find.assert_called_once_with({"org_id": org_id})


def test_get_workstation_templates_exception(mock_db):
    """Test handling when database query raises exception."""
    org_id = "org-1"
    mock_db.workstation_templates.find.side_effect = Exception("Database error")

    result = ws_repo.get_workstation_templates(db=mock_db, org_id=org_id)

    assert result == []


def test_get_workstation_templates_single(mock_db):
    """Test with single template."""
    org_id = "org-1"
    template_id = ObjectId()
    
    mock_template = {
        "_id": template_id,
        "name": "Template 1",
        "org_id": org_id,
        "description": "Test template"
    }
    mock_db.workstation_templates.find.return_value = [mock_template]

    result = ws_repo.get_workstation_templates(db=mock_db, org_id=org_id)

    assert len(result) == 1
    assert result[0]["_id"] == str(template_id)
    assert result[0]["name"] == "Template 1"
    assert result[0]["description"] == "Test template"


def test_get_workstation_templates_different_orgs(mock_db):
    """Test queries for different organizations."""
    org_id1 = "org-1"
    org_id2 = "org-2"
    template_id1 = ObjectId()
    template_id2 = ObjectId()
    
    mock_template1 = {
        "_id": template_id1,
        "name": "Template 1",
        "org_id": org_id1
    }
    mock_template2 = {
        "_id": template_id2,
        "name": "Template 2",
        "org_id": org_id2
    }
    
    # First call returns template1, second call returns template2
    mock_db.workstation_templates.find.side_effect = [[mock_template1], [mock_template2]]

    result1 = ws_repo.get_workstation_templates(db=mock_db, org_id=org_id1)
    result2 = ws_repo.get_workstation_templates(db=mock_db, org_id=org_id2)

    assert len(result1) == 1
    assert len(result2) == 1
    assert result1[0]["org_id"] == org_id1
    assert result2[0]["org_id"] == org_id2


# Tests for insert_workstation with custom status
def test_insert_workstation_with_custom_status(mock_db, mock_workstation, mock_workstation_status):
    """Test insertion with custom status parameter."""
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId()
    mock_db.workstations.insert_one.return_value = mock_insert_result

    result = ws_repo.insert_workstation(
        db=mock_db,
        org_id="org-1",
        template_id="template-1",
        status="ACTIVE"
    )

    # Verify the workstation model was created with custom status
    mock_workstation.assert_called_once_with(
        org_id="org-1",
        template_id="template-1",
        status="ACTIVE"
    )

    # Verify insert_one was called
    mock_db.workstations.insert_one.assert_called_once()
    assert result == mock_insert_result


def test_insert_workstation_status_none_uses_default(mock_db, mock_workstation, mock_workstation_status):
    """Test that status=None uses the default INACTIVE status."""
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId()
    mock_db.workstations.insert_one.return_value = mock_insert_result

    result = ws_repo.insert_workstation(
        db=mock_db,
        org_id="org-1",
        template_id="template-1",
        status=None
    )

    # Verify the workstation model was created with INACTIVE status
    mock_workstation.assert_called_once_with(
        org_id="org-1",
        template_id="template-1",
        status="INACTIVE"
    )

    assert result == mock_insert_result


def test_insert_workstation_status_provisioning(mock_db, mock_workstation, mock_workstation_status):
    """Test insertion with PROVISIONING status."""
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId()
    mock_db.workstations.insert_one.return_value = mock_insert_result

    result = ws_repo.insert_workstation(
        db=mock_db,
        org_id="org-1",
        template_id="template-1",
        status="PROVISIONING"
    )

    # Verify custom status was used
    call_args = mock_workstation.call_args
    assert call_args[1]["status"] == "PROVISIONING"
    
    assert result == mock_insert_result
