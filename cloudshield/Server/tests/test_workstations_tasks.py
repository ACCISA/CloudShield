"""Tests for the workstations task module."""
import sys
import types
import pytest
from unittest.mock import MagicMock, Mock, patch, call
from bson import ObjectId
import cloudshield.Server.tasks.workstations as workstations_module
from cloudshield.Server.models import WorkstationStatus


class FakeJob:
    """Fake RQ job for testing."""
    def __init__(self, job_id="test-job-123"):
        self.id = job_id
        self.meta = {}

    def save_meta(self):
        pass


@pytest.fixture
def mock_dependencies(monkeypatch):
    """Mock all external dependencies."""
    # Mock get_current_job
    fake_job = FakeJob()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.get_current_job",
        lambda: fake_job
    )

    # Mock logger
    mock_logger = MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.get_logger",
        lambda *args, **kwargs: mock_logger
    )

    # Mock update_job
    mock_update_job = MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.update_job",
        mock_update_job
    )

    # Mock databases
    mock_db = MagicMock()
    mock_organizations = MagicMock()
    monkeypatch.setattr("cloudshield.Server.tasks.workstations.db", mock_db)
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.organizations", mock_organizations
    )

    # Mock utilities
    def mock_org_filter(org_id):
        return {"_id": org_id}

    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.org_filter",
        mock_org_filter
    )

    # Mock repos
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.insert_workstation_template",
        MagicMock()
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.insert_workstation",
        MagicMock()
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.update_workstation",
        MagicMock()
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.update_workstation_template",
        MagicMock()
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.get_workstation_template",
        MagicMock()
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.get_unique_members_by_ids",
        MagicMock()
    )

    # Mock provisioner
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.provision_default_workstation",
        MagicMock()
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.provision_workstation_vm",
        MagicMock()
    )

    # Mock service_dispatcher
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.service_dispatcher",
        MagicMock()
    )

    # Mock get_server_nodes
    monkeypatch.setattr(
        "cloudshield.Server.tasks.workstations.get_server_nodes",
        MagicMock()
    )

    return {
        "job": fake_job,
        "logger": mock_logger,
        "update_job": mock_update_job,
        "db": mock_db,
        "organizations": mock_organizations,
    }


def test_start_workstations_success(mock_dependencies):
    """Test start_workstations successfully creates jobs for each member."""
    # Create a list with 3 items to properly test len() and iteration
    mock_unique_members = ["user-1", "user-2", "user-3"]
    workstations_module.get_unique_members_by_ids.return_value = mock_unique_members

    logger = MagicMock()
    org_id = "org-1"
    template_id = "template-1"
    access_groups = ["group1", "group2"]
    members=[]

    workstations_module.start_workstations(org_id, template_id, access_groups, members,logger)

    # Verify we got unique members
    workstations_module.get_unique_members_by_ids.assert_called_once_with(
        workstations_module.db, access_groups
    )

    # Verify logger was called
    logger.info.assert_called()

    # Verify service_dispatcher was called 3 times (once per member)
    assert workstations_module.service_dispatcher.call_count == 3
    workstations_module.service_dispatcher.assert_called_with(
        service_name="ws_start", org_id=org_id, template_id=template_id
    )


def test_start_workstations_no_members(mock_dependencies):
    """Test start_workstations with no members."""
    workstations_module.get_unique_members_by_ids.return_value = []

    logger = MagicMock()
    org_id = "org-1"
    template_id = "template-1"
    access_groups = []

    workstations_module.start_workstations(org_id, template_id, access_groups, [],logger)

    # Verify service_dispatcher was not called when there are no members
    workstations_module.service_dispatcher.assert_not_called()


def test_enqueue_workstation_ready_email_skips_missing_requester_id():
    logger = MagicMock()

    workstations_module._enqueue_workstation_ready_email(None, "WS-One", logger)

    logger.warning.assert_called_once_with(
        "Skipping workstation ready email: missing requesting_user_id"
    )


def test_enqueue_workstation_ready_email_calls_job_service(monkeypatch):
    logger = MagicMock()
    recorded = {}
    fake_job_service = types.ModuleType("services.job_service")

    def fake_enqueue(user_id, workstation_name):
        recorded["args"] = (user_id, workstation_name)

    fake_job_service.enqueue_workstation_ready_email = fake_enqueue
    monkeypatch.setitem(sys.modules, "services.job_service", fake_job_service)

    workstations_module._enqueue_workstation_ready_email("user-1", "WS-One", logger)

    assert recorded["args"] == ("user-1", "WS-One")
    logger.error.assert_not_called()


def test_enqueue_workstation_ready_email_logs_enqueue_error(monkeypatch):
    logger = MagicMock()
    fake_job_service = types.ModuleType("services.job_service")

    def fake_enqueue(user_id, workstation_name):
        raise RuntimeError("queue down")

    fake_job_service.enqueue_workstation_ready_email = fake_enqueue
    monkeypatch.setitem(sys.modules, "services.job_service", fake_job_service)

    workstations_module._enqueue_workstation_ready_email("user-1", "WS-One", logger)

    logger.error.assert_called_once()


def test_ws_create_default_org_not_found(mock_dependencies):
    """Test ws_create_default when organization is not found."""
    workstations_module.organizations.find_one.return_value = None

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=[],
        access_groups=[],
        members=[]
    )

    # Verify result is None when org is not found
    assert result is None

    # Verify error was logged
    mock_dependencies["logger"].error.assert_called()

    # Verify update_job was called with error message
    mock_dependencies["update_job"].assert_called()


def test_ws_create_default_template_insert_fails(mock_dependencies):
    """Test ws_create_default when template insertion fails."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Template insertion returns None
    workstations_module.insert_workstation_template.return_value = None

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=[],
        access_groups=[],
        members=[]
    )

    assert result is None
    mock_dependencies["logger"].error.assert_called()
    mock_dependencies["update_job"].assert_called()


def test_ws_create_default_get_nodes_fails(mock_dependencies):
    """Test ws_create_default when getting server nodes fails."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId()
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns None
    workstations_module.get_server_nodes.return_value = None

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=[],
        access_groups=[],
        members=[]
    )

    assert result is None
    mock_dependencies["logger"].error.assert_called()
    workstations_module.get_server_nodes.assert_called_once_with("org-1")


def test_ws_create_default_domain_controller_not_found(mock_dependencies):
    """Test ws_create_default when DOMAIN_CONTROLLER node is not found."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId()
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns dict without DOMAIN_CONTROLLER
    workstations_module.get_server_nodes.return_value = {
        "OTHER_NODE": MagicMock()
    }

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=[],
        access_groups=[],
        members=[]
    )

    assert result is None
    mock_dependencies["logger"].error.assert_called()


def test_ws_create_default_provision_fails(mock_dependencies):
    """Test ws_create_default when provisioning fails."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId()
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns DOMAIN_CONTROLLER
    mock_node = MagicMock()
    mock_node.ip = "192.168.1.1"
    workstations_module.get_server_nodes.return_value = {
        "DOMAIN_CONTROLLER": mock_node
    }

    # provision_default_workstation returns False
    workstations_module.provision_default_workstation.return_value = False

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=["software1"],
        access_groups=["group1"],
        members=[]
    )

    assert result is None
    mock_dependencies["logger"].error.assert_called()


def test_ws_create_default_success(mock_dependencies):
    """Test ws_create_default successfully creates a workstation template."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId("507f1f77bcf86cd799439011")
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns DOMAIN_CONTROLLER
    mock_node = MagicMock()
    mock_node.ip = "192.168.1.1"
    workstations_module.get_server_nodes.return_value = {
        "DOMAIN_CONTROLLER": mock_node
    }

    # provision_default_workstation returns True
    workstations_module.provision_default_workstation.return_value = True

    # Mock unique members for start_workstations
    workstations_module.get_unique_members_by_ids.return_value = ["member1", "member2"]

    access_groups = ["group1"]
    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=["software1"],
        access_groups=access_groups,
        members=[]
    )

    # Verify result
    assert result is not None
    assert "template_id" in result.get("result", {})
    assert result["result"]["template_id"] == "507f1f77bcf86cd799439011"

    # Verify template was inserted
    workstations_module.insert_workstation_template.assert_called_once()

    # Verify provisioning was called
    workstations_module.provision_default_workstation.assert_called_once()

    # Verify template was marked as ready
    workstations_module.update_workstation_template.assert_called()

    # Verify start_workstations was called
    workstations_module.service_dispatcher.assert_called()


def test_ws_start_template_not_found(mock_dependencies):
    """Test ws_start when template is not found."""
    workstations_module.get_workstation_template.return_value = None

    result = workstations_module.ws_start(org_id="org-1", template_id="template-1")

    assert result is None
    mock_dependencies["logger"].error.assert_called()
    mock_dependencies["update_job"].assert_called_with(
        mock_dependencies["job"], "template not found"
    )


def test_ws_start_image_not_ready(mock_dependencies):
    """Test ws_start when image is not ready."""
    mock_template = {
        "_id": "template-1",
        "is_ready": False
    }
    workstations_module.get_workstation_template.return_value = mock_template

    result = workstations_module.ws_start(org_id="org-1", template_id="template-1")

    assert result is None
    mock_dependencies["logger"].warning.assert_called()
    mock_dependencies["update_job"].assert_called_with(
        mock_dependencies["job"], "image not ready"
    )


def test_ws_start_workstation_creation_fails(mock_dependencies):
    """Test ws_start when workstation creation fails."""
    mock_template = {
        "_id": "template-1",
        "is_ready": True
    }
    workstations_module.get_workstation_template.return_value = mock_template

    # Mock workstation insertion
    mock_ws = MagicMock()
    mock_ws.inserted_id = ObjectId()
    workstations_module.insert_workstation.return_value = mock_ws

    # provision_workstation_vm returns failure
    workstations_module.provision_workstation_vm.return_value = {
        "status": False
    }

    result = workstations_module.ws_start(org_id="org-1", template_id="template-1")

    assert result is None
    mock_dependencies["logger"].error.assert_called()
    mock_dependencies["update_job"].assert_called_with(
        mock_dependencies["job"], "failed"
    )


def test_ws_start_success(mock_dependencies):
    """Test ws_start successfully provisions a workstation."""
    mock_template = {
        "_id": "template-1",
        "is_ready": True
    }
    workstations_module.get_workstation_template.return_value = mock_template

    # Mock workstation insertion
    ws_id = ObjectId("507f1f77bcf86cd799439012")
    mock_ws = MagicMock()
    mock_ws.inserted_id = ws_id
    workstations_module.insert_workstation.return_value = mock_ws

    # provision_workstation_vm returns success
    workstations_module.provision_workstation_vm.return_value = {
        "status": True,
        "mac": "00:11:22:33:44:55",
        "ipv4_address": "192.168.1.100"
    }

    result = workstations_module.ws_start(org_id="org-1", template_id="template-1")

    # Verify the workstation was updated with provisioning data
    workstations_module.update_workstation.assert_called_once()
    call_args = workstations_module.update_workstation.call_args

    assert call_args[1]["mac"] == "00:11:22:33:44:55"
    assert call_args[1]["ipv4_address"] == "192.168.1.100"
    assert call_args[1]["status"] == WorkstationStatus.ACTIVE


def test_ws_start_provision_returns_no_mac(mock_dependencies):
    """Test ws_start when provisioning returns data without mac."""
    mock_template = {
        "_id": "template-1",
        "is_ready": True
    }
    workstations_module.get_workstation_template.return_value = mock_template

    # Mock workstation insertion
    ws_id = ObjectId("507f1f77bcf86cd799439012")
    mock_ws = MagicMock()
    mock_ws.inserted_id = ws_id
    workstations_module.insert_workstation.return_value = mock_ws

    # provision_workstation_vm returns success without mac
    workstations_module.provision_workstation_vm.return_value = {
        "status": True,
        "ipv4_address": "192.168.1.100"
    }

    result = workstations_module.ws_start(org_id="org-1", template_id="template-1")

    # Verify update_workstation was called with empty mac
    workstations_module.update_workstation.assert_called_once()
    call_args = workstations_module.update_workstation.call_args
    assert call_args[1]["mac"] == ""


def test_ws_create_custom():
    """Test ws_create_custom is a stub."""
    result = workstations_module.ws_create_custom()
    assert result is None


def test_ws_provision_update_is_stub():
    """Test ws_provision_update is a stub function."""
    result = workstations_module.ws_provision_update("workstation-1", "ACTIVE")
    assert result is None


def test_start_workstations_with_larger_member_count(mock_dependencies):
    """Test start_workstations with multiple members."""
    # Create a mock list-like object with specific length
    mock_members_list = [f"user-{i}" for i in range(5)]
    workstations_module.get_unique_members_by_ids.return_value = mock_members_list

    logger = MagicMock()
    org_id = "org-1"
    template_id = "template-1"
    access_groups = ["group1", "group2", "group3"]

    workstations_module.start_workstations(org_id, template_id, access_groups,[], logger)

    # Verify service_dispatcher was called 5 times
    assert workstations_module.service_dispatcher.call_count == 5
    logger.info.assert_called_with("Starting 5")


def test_ws_create_default_with_no_access_groups(mock_dependencies):
    """Test ws_create_default with empty access groups."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId("507f1f77bcf86cd799439011")
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns DOMAIN_CONTROLLER
    mock_node = MagicMock()
    mock_node.ip = "192.168.1.1"
    workstations_module.get_server_nodes.return_value = {
        "DOMAIN_CONTROLLER": mock_node
    }

    # provision_default_workstation returns True
    workstations_module.provision_default_workstation.return_value = True

    # Mock unique members for start_workstations
    workstations_module.get_unique_members_by_ids.return_value = []

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=[],
        access_groups=[],
        members=[]
    )

    assert result is not None
    assert "template_id" in result.get("result", {})

    # Verify start_workstations was still called (even with no members)
    workstations_module.service_dispatcher.assert_not_called()


def test_ws_create_default_sets_org_id_and_samba_ip(mock_dependencies):
    """Test ws_create_default sets org_id and samba_ip in org_doc."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId("507f1f77bcf86cd799439011")
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns DOMAIN_CONTROLLER
    mock_node = MagicMock()
    mock_node.ip = "10.0.0.5"
    workstations_module.get_server_nodes.return_value = {
        "DOMAIN_CONTROLLER": mock_node
    }

    # provision_default_workstation returns True
    workstations_module.provision_default_workstation.return_value = True

    # Mock unique members for start_workstations
    workstations_module.get_unique_members_by_ids.return_value = []

    software = ["software1", "software2"]
    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=software,
        access_groups=[],
        members=[]
    )

    # Verify org_doc was modified with id and samba_ip
    assert org_doc["id"] == "org-1"
    assert org_doc["samba_ip"] == "10.0.0.5"

    # Verify provision was called with modified org_doc
    call_kwargs = workstations_module.provision_default_workstation.call_args[1]
    assert call_kwargs["org_data"]["id"] == "org-1"
    assert call_kwargs["org_data"]["samba_ip"] == "10.0.0.5"
    assert call_kwargs["software"] == software


def test_ws_start_with_none_job(mock_dependencies):
    """Test ws_start handles None job gracefully."""
    # Override get_current_job to return None
    workstations_module.get_current_job = lambda: None

    mock_logger = MagicMock()
    workstations_module.get_logger = lambda *args, **kwargs: mock_logger

    mock_template = {
        "_id": "template-1",
        "is_ready": True
    }
    workstations_module.get_workstation_template.return_value = mock_template

    # Mock workstation insertion
    ws_id = ObjectId("507f1f77bcf86cd799439012")
    mock_ws = MagicMock()
    mock_ws.inserted_id = ws_id
    workstations_module.insert_workstation.return_value = mock_ws

    # provision_workstation_vm returns success
    workstations_module.provision_workstation_vm.return_value = {
        "status": True,
        "mac": "00:11:22:33:44:55",
        "ipv4_address": "192.168.1.100"
    }

    result = workstations_module.ws_start(org_id="org-1", template_id="template-1")

    # Should still work and complete successfully
    workstations_module.update_workstation.assert_called_once()


def test_ws_create_default_with_none_job(mock_dependencies):
    """Test ws_create_default handles None job gracefully."""
    # Override get_current_job to return None
    workstations_module.get_current_job = lambda: None

    mock_logger = MagicMock()
    workstations_module.get_logger = lambda *args, **kwargs: mock_logger

    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId("507f1f77bcf86cd799439011")
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns DOMAIN_CONTROLLER
    mock_node = MagicMock()
    mock_node.ip = "192.168.1.1"
    workstations_module.get_server_nodes.return_value = {
        "DOMAIN_CONTROLLER": mock_node
    }

    # provision_default_workstation returns True
    workstations_module.provision_default_workstation.return_value = True

    # Mock unique members for start_workstations
    workstations_module.get_unique_members_by_ids.return_value = []

    result = workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=["software1"],
        access_groups=[],
        members=[]
    )

    assert result is not None
    assert "template_id" in result.get("result", {})


def test_ws_start_logs_successful_completion(mock_dependencies):
    """Test ws_start logs successful workstation creation."""
    mock_template = {
        "_id": "template-1",
        "is_ready": True
    }
    workstations_module.get_workstation_template.return_value = mock_template

    # Mock workstation insertion
    ws_id = ObjectId("507f1f77bcf86cd799439012")
    mock_ws = MagicMock()
    mock_ws.inserted_id = ws_id
    workstations_module.insert_workstation.return_value = mock_ws

    # provision_workstation_vm returns success
    workstations_module.provision_workstation_vm.return_value = {
        "status": True,
        "mac": "00:11:22:33:44:55",
        "ipv4_address": "192.168.1.100"
    }

    workstations_module.ws_start(org_id="org-1", template_id="template-1")

    # Verify success log message
    mock_dependencies["logger"].info.assert_called()
    success_logs = [
        call[0][0] for call in mock_dependencies["logger"].info.call_args_list
    ]
    assert any("Successfully started workstation vm" in log for log in success_logs)


def test_ws_create_default_marks_template_ready(mock_dependencies):
    """Test ws_create_default marks template as ready."""
    org_doc = {"_id": "org-1", "name": "Test Org"}
    workstations_module.organizations.find_one.return_value = org_doc

    # Mock successful template insertion
    template_id = "507f1f77bcf86cd799439011"
    mock_template = MagicMock()
    mock_template.inserted_id = ObjectId(template_id)
    workstations_module.insert_workstation_template.return_value = mock_template

    # get_server_nodes returns DOMAIN_CONTROLLER
    mock_node = MagicMock()
    mock_node.ip = "192.168.1.1"
    workstations_module.get_server_nodes.return_value = {
        "DOMAIN_CONTROLLER": mock_node
    }

    # provision_default_workstation returns True
    workstations_module.provision_default_workstation.return_value = True

    # Mock unique members for start_workstations
    workstations_module.get_unique_members_by_ids.return_value = []

    workstations_module.ws_create_default(
        org_id="org-1",
        name="Test WS",
        description="Test",
        software=[],
        access_groups=[],
        members=[]
    )

    # Verify update_workstation_template was called with is_ready=True
    workstations_module.update_workstation_template.assert_called_with(
        workstations_module.db, template_id=template_id, is_ready=True
    )
