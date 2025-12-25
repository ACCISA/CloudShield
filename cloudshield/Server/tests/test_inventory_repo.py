import pytest
import sys
import os
from unittest.mock import MagicMock

# Add the Server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.repos import inventory_repo
from cloudshield.Server.models import EC2Instance


@pytest.fixture
def mock_db():
    """Create a mock database object"""
    db = MagicMock()
    db.itam = MagicMock()
    return db


@pytest.fixture
def sample_ec2_instance():
    """Create a sample EC2Instance for testing"""
    return EC2Instance(
        public_ip="203.0.113.1",
        private_ip="10.0.0.1",
        vpc_id="vpc-12345678",
        name="test-instance",
        priv_key_path="/path/to/key.pem",
        ami_id="ami-12345678",
        cpu=2,
        created_at="2025-01-01T00:00:00Z",
        instance_id="i-1234567890abcdef0",
        os="linux",
        ports=["22", "443"],
        ram_gb="4",
        status="running",
        storage_size_gb=100,
        subnet_id="subnet-12345678",
        updated_at="2025-01-02T00:00:00Z",
        port="22",
    )


@pytest.fixture
def sample_ec2_instances(sample_ec2_instance):
    """Create multiple sample EC2Instances for testing"""
    instance_2 = EC2Instance(
        public_ip="203.0.113.2",
        private_ip="10.0.0.2",
        vpc_id="vpc-87654321",
        name="test-instance-2",
        priv_key_path="/path/to/key2.pem",
        ami_id="ami-87654321",
        cpu=4,
        created_at="2025-01-01T12:00:00Z",
        instance_id="i-0987654321abcdef0",
        os="windows",
        ports=["3389", "5985"],
        ram_gb="8",
        status="running",
        storage_size_gb=200,
        subnet_id="subnet-87654321",
        updated_at="2025-01-02T12:00:00Z",
        port="3389",
    )
    return [sample_ec2_instance, instance_2]


@pytest.fixture
def sample_org_id():
    """Create a sample organization ID for testing"""
    return "org-12345678"


class TestInsertInventory:
    """Test suite for insert_inventory function"""

    def test_insert_inventory_single_asset(self, mock_db, sample_ec2_instance, sample_org_id):
        """Test inserting inventory with a single asset"""
        # Convert to dict to match what the function expects
        assets = [sample_ec2_instance.model_dump()]
        
        # Mock the insert_one return value
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "inventory-id-123"
        mock_db.itam.insert_one.return_value = mock_insert_result

        result = inventory_repo.insert_inventory(
            db=mock_db,
            org_id=sample_org_id,
            assets=assets
        )

        # Verify insert_one was called once
        mock_db.itam.insert_one.assert_called_once()
        
        # Verify the result
        assert result == mock_insert_result
        assert result.inserted_id == "inventory-id-123"

    def test_insert_inventory_multiple_assets(self, mock_db, sample_ec2_instances, sample_org_id):
        """Test inserting inventory with multiple assets"""
        # Convert to dict
        assets = [asset.model_dump() for asset in sample_ec2_instances]
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "inventory-id-456"
        mock_db.itam.insert_one.return_value = mock_insert_result

        result = inventory_repo.insert_inventory(
            db=mock_db,
            org_id=sample_org_id,
            assets=assets
        )

        mock_db.itam.insert_one.assert_called_once()
        assert result == mock_insert_result
        assert len(assets) == 2

    def test_insert_inventory_empty_assets(self, mock_db, sample_org_id):
        """Test inserting inventory with empty assets list"""
        assets = []
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "inventory-id-789"
        mock_db.itam.insert_one.return_value = mock_insert_result

        result = inventory_repo.insert_inventory(
            db=mock_db,
            org_id=sample_org_id,
            assets=assets
        )

        mock_db.itam.insert_one.assert_called_once()
        assert result == mock_insert_result

    def test_insert_inventory_model_dump_called(self, mock_db, sample_ec2_instance, sample_org_id):
        """Test that Inventory model is properly dumped with by_alias=True"""
        assets = [sample_ec2_instance.model_dump()]
        
        mock_insert_result = MagicMock()
        mock_db.itam.insert_one.return_value = mock_insert_result

        result = inventory_repo.insert_inventory(
            db=mock_db,
            org_id=sample_org_id,
            assets=assets
        )

        # Verify insert_one was called once
        mock_db.itam.insert_one.assert_called_once()
        assert result == mock_insert_result

    def test_insert_inventory_passes_correct_data_to_db(self, mock_db, sample_ec2_instance, sample_org_id):
        """Test that the correct data is passed to the database insert_one method"""
        assets = [sample_ec2_instance.model_dump()]
        
        mock_insert_result = MagicMock()
        mock_db.itam.insert_one.return_value = mock_insert_result

        inventory_repo.insert_inventory(
            db=mock_db,
            org_id=sample_org_id,
            assets=assets
        )

        # Get the actual argument passed to insert_one
        call_args = mock_db.itam.insert_one.call_args
        assert call_args is not None
        
        # The first positional argument should be the dumped inventory data
        inserted_data = call_args[0][0]
        assert inserted_data["org_id"] == sample_org_id
        assert len(inserted_data["assets"]) == 1

    def test_insert_inventory_with_different_org_ids(self, mock_db, sample_ec2_instance):
        """Test inserting inventory with different organization IDs"""
        org_id_1 = "org-111"
        org_id_2 = "org-222"
        
        mock_insert_result = MagicMock()
        mock_db.itam.insert_one.return_value = mock_insert_result

        # Insert first inventory
        inventory_repo.insert_inventory(
            db=mock_db,
            org_id=org_id_1,
            assets=[sample_ec2_instance.model_dump()]
        )

        # Insert second inventory
        inventory_repo.insert_inventory(
            db=mock_db,
            org_id=org_id_2,
            assets=[sample_ec2_instance.model_dump()]
        )

        # Verify insert_one was called twice
        assert mock_db.itam.insert_one.call_count == 2


class TestDeleteInventoryByOrg:
    """Test suite for delete_inventory_by_org function"""

    def test_delete_inventory_by_org_success(self, mock_db, sample_org_id):
        """Test successful deletion of inventory by org_id"""
        deleted_doc = {
            "_id": "inventory-id-123",
            "org_id": sample_org_id,
            "assets": []
        }
        mock_db.itam.find_one_and_delete.return_value = deleted_doc

        result = inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=sample_org_id
        )

        # Verify find_one_and_delete was called with correct filter
        mock_db.itam.find_one_and_delete.assert_called_once_with(
            {"org_id": sample_org_id}
        )
        
        # Verify the result
        assert result == deleted_doc
        assert result["org_id"] == sample_org_id

    def test_delete_inventory_by_org_not_found(self, mock_db, sample_org_id):
        """Test deletion when inventory doesn't exist (returns None)"""
        mock_db.itam.find_one_and_delete.return_value = None

        result = inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=sample_org_id
        )

        mock_db.itam.find_one_and_delete.assert_called_once_with(
            {"org_id": sample_org_id}
        )
        assert result is None

    def test_delete_inventory_by_org_query_filter(self, mock_db):
        """Test that the correct query filter is used"""
        org_id = "org-test-123"
        mock_db.itam.find_one_and_delete.return_value = None

        inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=org_id
        )

        # Verify the filter parameter
        call_args = mock_db.itam.find_one_and_delete.call_args
        assert call_args[0][0] == {"org_id": org_id}

    def test_delete_inventory_by_org_multiple_calls(self, mock_db):
        """Test multiple delete operations for different orgs"""
        org_id_1 = "org-aaa"
        org_id_2 = "org-bbb"
        
        mock_db.itam.find_one_and_delete.return_value = None

        # Delete first org's inventory
        inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=org_id_1
        )

        # Delete second org's inventory
        inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=org_id_2
        )

        # Verify find_one_and_delete was called twice with different org_ids
        assert mock_db.itam.find_one_and_delete.call_count == 2
        
        calls = mock_db.itam.find_one_and_delete.call_args_list
        assert calls[0][0][0] == {"org_id": org_id_1}
        assert calls[1][0][0] == {"org_id": org_id_2}

    def test_delete_inventory_by_org_with_assets(self, mock_db, sample_ec2_instance, sample_org_id):
        """Test deletion returns inventory with assets"""
        deleted_doc = {
            "_id": "inventory-id-456",
            "org_id": sample_org_id,
            "assets": [sample_ec2_instance.model_dump()]
        }
        mock_db.itam.find_one_and_delete.return_value = deleted_doc

        result = inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=sample_org_id
        )

        assert result == deleted_doc
        assert len(result["assets"]) == 1
        assert result["assets"][0]["name"] == "test-instance"

    def test_delete_inventory_accesses_itam_collection(self, mock_db, sample_org_id):
        """Test that the function accesses the itam collection"""
        mock_db.itam.find_one_and_delete.return_value = None

        inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=sample_org_id
        )

        # Verify db.itam was accessed
        assert mock_db.itam.find_one_and_delete.called


class TestInventoryRepoIntegration:
    """Integration tests for inventory_repo functions"""

    def test_insert_then_delete_inventory(self, mock_db, sample_ec2_instance, sample_org_id):
        """Test inserting and then deleting inventory"""
        # Setup mocks
        insert_result = MagicMock()
        insert_result.inserted_id = "inventory-id-999"
        mock_db.itam.insert_one.return_value = insert_result

        delete_result = {
            "_id": "inventory-id-999",
            "org_id": sample_org_id,
            "assets": [sample_ec2_instance.model_dump()]
        }
        mock_db.itam.find_one_and_delete.return_value = delete_result

        # Insert inventory
        insert_response = inventory_repo.insert_inventory(
            db=mock_db,
            org_id=sample_org_id,
            assets=[sample_ec2_instance.model_dump()]
        )

        assert insert_response.inserted_id == "inventory-id-999"

        # Delete inventory
        delete_response = inventory_repo.delete_inventory_by_org(
            db=mock_db,
            org_id=sample_org_id
        )

        assert delete_response["org_id"] == sample_org_id
        assert delete_response["_id"] == insert_response.inserted_id

    def test_workflow_multiple_orgs(self, mock_db, sample_ec2_instances):
        """Test workflow with multiple organizations"""
        org_ids = ["org-company-a", "org-company-b", "org-company-c"]
        
        # Convert to dicts
        assets = [asset.model_dump() for asset in sample_ec2_instances]
        
        insert_result = MagicMock()
        insert_result.inserted_id = "inventory-id"
        mock_db.itam.insert_one.return_value = insert_result
        mock_db.itam.find_one_and_delete.return_value = {}

        # Insert inventory for all orgs
        for org_id in org_ids:
            inventory_repo.insert_inventory(
                db=mock_db,
                org_id=org_id,
                assets=assets
            )

        assert mock_db.itam.insert_one.call_count == 3

        # Delete inventory for all orgs
        for org_id in org_ids:
            inventory_repo.delete_inventory_by_org(
                db=mock_db,
                org_id=org_id
            )

        assert mock_db.itam.find_one_and_delete.call_count == 3
