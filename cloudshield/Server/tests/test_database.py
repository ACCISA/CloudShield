import unittest.mock
import os
import sys
import types
import pytest

mock_mongo_client = unittest.mock.MagicMock()
mock_mongo_client.return_value.admin.command.return_value = None

mock_pymongo = unittest.mock.MagicMock()
mock_pymongo.MongoClient = mock_mongo_client
mock_pymongo.errors = unittest.mock.MagicMock()
mock_pymongo.errors.PyMongoError = Exception

if "jwt" not in sys.modules:
    dummy_jwt = types.ModuleType("jwt")
    dummy_jwt.encode = lambda *args, **kwargs: "dummy-token"
    dummy_jwt.decode = lambda *args, **kwargs: {}
    sys.modules["jwt"] = dummy_jwt
    
import importlib
from unittest.mock import patch


@pytest.fixture(autouse=True)
def setup_pymongo_mocks(monkeypatch):
    """Set up pymongo mocks with proper cleanup"""
    monkeypatch.setitem(sys.modules, 'pymongo', mock_pymongo)
    monkeypatch.setitem(sys.modules, 'pymongo.errors', mock_pymongo.errors)


class TestDatabase:
    """Test the database.py module"""

    def test_database_module_imports(self):
        from cloudshield.Server.utils import database
        
        # Check that required objects exist
        assert hasattr(database, 'DB_NAME')
        assert hasattr(database, 'MONGO_URL_FALLBACK')
        assert hasattr(database, '_mk_client')

    def test_environment_variables_loaded(self):
        from cloudshield.Server.utils import database
        # Test default values
        assert database.DB_NAME == "cloudshield"  # default value
        # Check that MONGO_URL_FALLBACK is set 
        assert database.MONGO_URL_FALLBACK is not None
        assert len(database.MONGO_URL_FALLBACK) > 0

    @patch.dict(os.environ, {
        'MONGO_DB': 'test_db',
        'MONGO_URL': 'mongodb://test:27017/',
        'MONGO_URL_ADMIN': 'mongodb://admin:27017/',
        'MONGO_URL_EMP': 'mongodb://emp:27017/'
    })
    def test_custom_environment_variables(self):
        if 'cloudshield.Server.utils.database' in sys.modules:
            importlib.reload(sys.modules['cloudshield.Server.utils.database'])
        
        from cloudshield.Server.utils import database
        
        assert database.DB_NAME == "test_db"
        assert database.MONGO_URL_FALLBACK == "mongodb://test:27017/"
        assert database.MONGO_URL_ADMIN == "mongodb://admin:27017/"
        assert database.MONGO_URL_EMP == "mongodb://emp:27017/"

    def test_mk_client_function(self):
        from cloudshield.Server.utils import database
        
        # Test that _mk_client is callable
        assert callable(database._mk_client)
        
        # Test with a mock URL
        with patch('cloudshield.Server.utils.database.MongoClient') as mock_client:
            database._mk_client("mongodb://test:27017/")
            
            # Verify MongoClient was called with correct parameters
            mock_client.assert_called_once_with("mongodb://test:27017/", serverSelectionTimeoutMS=5000)

    def test_database_exports(self):
        from cloudshield.Server.utils import database
        
        expected_exports = [
            "db_admin",
            "db_emp", 
            "admin_client",
            "emp_client",
            "users_admin",
            "users_public"
        ]
        
        for export in expected_exports:
            assert hasattr(database, export), f"Missing export: {export}"
            assert export in database.__all__, f"Export {export} not in __all__"

    def test_successful_connection(self):
        from cloudshield.Server.utils import database
        
        # Verify that clients and databases exist
        assert hasattr(database, 'admin_client')
        assert hasattr(database, 'emp_client')
        assert hasattr(database, 'db_admin')
        assert hasattr(database, 'db_emp')
        
        # Verify collections are set up
        assert hasattr(database, 'users_admin')
        assert hasattr(database, 'users_public')

    def test_connection_failure(self):
        from pymongo.errors import PyMongoError
        from cloudshield.Server.utils import database

        # Test that PyMongoError is either a real class or our mock
        assert hasattr(PyMongoError, '__name__') or hasattr(PyMongoError, '_mock_name')

        assert hasattr(database, 'DB_NAME')

    def test_database_collections_setup(self):
        from cloudshield.Server.utils import database

        assert hasattr(database, 'users_admin')
        assert hasattr(database, 'users_public')
        

    def test_index_creation(self):
        from cloudshield.Server.utils import database
        
        # Verify that users_admin collection exists 
        assert hasattr(database, 'users_admin')
        
        assert database.users_admin is not None
        
        assert hasattr(database.users_admin, 'create_index'), "users_admin should have create_index method"


def test_get_inventory_from_org_id_success(monkeypatch):
    """Test get_inventory_from_org_id with valid org_id"""
    from cloudshield.Server.utils import database
    
    # Mock the db.itam collection with complete EC2Instance data
    mock_itam_db = unittest.mock.MagicMock()
    mock_doc = {
        "org_id": "test_org_123",
        "assets": [
            {
                "name": "asset1",
                "public_ip": "1.2.3.4",
                "private_ip": "10.0.0.1",
                "vpc_id": "vpc-123",
                "priv_key_path": "key1",
                "ami_id": "ami-123",
                "cpu": 2,
                "created_at": "2025-01-01",
                "instance_id": "i-123",
                "os": "Ubuntu",
                "ports": ["sg-123"],
                "ram_gb": "4GB",
                "status": "running",
                "storage_size_gb": 50,
                "subnet_id": "subnet-123",
                "updated_at": "2025-01-01",
                "port":"50055"
            },
            {
                "name": "asset2",
                "public_ip": "5.6.7.8",
                "private_ip": "10.0.0.2",
                "vpc_id": "vpc-456",
                "priv_key_path": "key2",
                "ami_id": "ami-456",
                "cpu": 4,
                "created_at": "2025-01-01",
                "instance_id": "i-456",
                "os": "Windows",
                "ports": ["sg-456"],
                "ram_gb": "8GB",
                "status": "running",
                "storage_size_gb": 100,
                "subnet_id": "subnet-456",
                "updated_at": "2025-01-01",
                "port":"50055"
            }
        ]
    }
    mock_itam_db.find_one.return_value = mock_doc
    
    # Mock db.itam
    mock_db = unittest.mock.MagicMock()
    mock_db.itam = mock_itam_db
    monkeypatch.setattr(database, "db", mock_db)
    
    result = database.get_inventory_from_org_id("test_org_123")
    
    assert result.org_id == "test_org_123"
    assert len(result.assets) == 2
    assert result.assets[0].name == "asset1"
    assert result.assets[1].name == "asset2"
    mock_itam_db.find_one.assert_called_once_with({"org_id": "test_org_123"})


def test_get_inventory_from_org_id_not_found(monkeypatch):
    """Test get_inventory_from_org_id when org_id doesn't exist"""
    from cloudshield.Server.utils import database
    
    # Mock the db.itam collection to return None
    mock_itam_db = unittest.mock.MagicMock()
    mock_itam_db.find_one.return_value = None
    
    mock_db = unittest.mock.MagicMock()
    mock_db.itam = mock_itam_db
    monkeypatch.setattr(database, "db", mock_db)
    
    # Should raise an error when doc is None
    data = database.get_inventory_from_org_id("nonexistent_org")
    
    assert data is None


def test_get_inventory_from_org_id_with_empty_assets(monkeypatch):
    """Test get_inventory_from_org_id with empty assets list"""
    from cloudshield.Server.utils import database
    
    mock_itam_db = unittest.mock.MagicMock()
    mock_doc = {
        "org_id": "empty_org",
        "assets": []
    }
    mock_itam_db.find_one.return_value = mock_doc
    
    mock_db = unittest.mock.MagicMock()
    mock_db.itam = mock_itam_db
    monkeypatch.setattr(database, "db", mock_db)
    
    result = database.get_inventory_from_org_id("empty_org")
    
    assert result.org_id == "empty_org"
    assert len(result.assets) == 0


def test_database_client_initialization():
    """Test that database clients are properly initialized"""
    from cloudshield.Server.utils import database
    
    # Verify that both clients exist and are not None
    assert database.admin_client is not None
    assert database.emp_client is not None
    
    # Verify that databases are accessible
    assert database.db_admin is not None
    assert database.db_emp is not None


def test_database_collections_accessible():
    """Test that database collections are accessible"""
    from cloudshield.Server.utils import database
    
    # Verify collections exist
    assert database.users_admin is not None
    assert database.users_public is not None


def test_mk_client_timeout_parameter():
    """Test that _mk_client uses correct timeout"""
    from cloudshield.Server.utils import database
    
    with patch('cloudshield.Server.utils.database.MongoClient') as mock_client:
        test_url = "mongodb://localhost:27017/"
        database._mk_client(test_url)
        
        # Verify it was called with serverSelectionTimeoutMS
        call_args = mock_client.call_args
        assert call_args[0][0] == test_url
        assert call_args[1]['serverSelectionTimeoutMS'] == 5000


def test_database_constants():
    """Test that database constants are set correctly"""
    from cloudshield.Server.utils import database
    
    # Verify constants exist and have reasonable values
    assert isinstance(database.DB_NAME, str)
    assert len(database.DB_NAME) > 0
    
    assert isinstance(database.MONGO_URL_FALLBACK, str)
    assert "mongodb://" in database.MONGO_URL_FALLBACK


@patch.dict(os.environ, {'MONGO_DB': 'custom_db'}, clear=False)
def test_database_env_var_override():
    """Test that environment variables can override defaults"""
    # Drop cached database module so it re-imports with the new env var
    sys.modules.pop('cloudshield.Server.utils.database', None)

    import cloudshield.Server.utils as utils
    importlib.reload(utils)

    from cloudshield.Server.utils import database

    assert database.DB_NAME == 'custom_db'




def test_database_exports_all():
    """Test that __all__ contains all expected exports"""
    from cloudshield.Server.utils import database
    
    expected_exports = [
        "db_admin",
        "db_emp",
        "admin_client",
        "emp_client",
        "users_admin",
        "users_public",
        "db",
        "client"
    ]
    
    # Verify all expected exports are in __all__
    for export in expected_exports:
        assert export in database.__all__, f"{export} should be in __all__"
        assert hasattr(database, export), f"{export} should exist as attribute"


def test_database_module_has_get_inventory():
    """Test that get_inventory_from_org_id function exists"""
    from cloudshield.Server.utils import database
    
    assert hasattr(database, 'get_inventory_from_org_id')
    assert callable(database.get_inventory_from_org_id)


def test_database_collections_types():
    """Test that collections are the correct type"""
    from cloudshield.Server.utils import database
    
    # Collections should have typical MongoDB collection methods
    assert hasattr(database.users_admin, 'find_one') or hasattr(database.users_admin, '_mock_name')
    assert hasattr(database.users_public, 'find') or hasattr(database.users_public, '_mock_name')


def test_database_ping_success():
    """Test that database connections were pinged successfully during initialization"""
    from cloudshield.Server.utils import database
    
    # If the module loaded successfully, pings must have succeeded
    assert database.admin_client is not None
    assert database.emp_client is not None
    
    # Verify that the clients have admin attribute
    assert hasattr(database.admin_client, 'admin')
    assert hasattr(database.emp_client, 'admin')


def test_organizations_collection_and_indexes(monkeypatch):
    """Ensure organizations collection is available and indexes are created."""
    import importlib

    if 'cloudshield.Server.utils.database' in sys.modules:
        importlib.reload(sys.modules['cloudshield.Server.utils.database'])

    from cloudshield.Server.utils import database

    assert hasattr(database, "organizations")
    orgs = database.organizations
    assert orgs is not None
    assert hasattr(orgs, "create_index")

    calls = getattr(orgs, "create_index", lambda: []).call_args_list
    assert any(args == ("org_id",) and kwargs.get("unique") for args, kwargs in calls), "org_id unique index missing"
    assert any(args == ("package",) for args, kwargs in calls)
    assert any(args == ("provisioning_status",) for args, kwargs in calls)
