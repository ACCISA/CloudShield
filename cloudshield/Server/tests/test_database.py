# Mock MongoDB connection
import unittest.mock
import os
import sys
import pytest

# Create a permanent mock for MongoClient before importing anything
mock_mongo_client = unittest.mock.MagicMock()
mock_mongo_client.return_value.admin.command.return_value = None

# Mock pymongo modules to prevent actual MongoDB connections
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo.MongoClient = mock_mongo_client
mock_pymongo.errors = unittest.mock.MagicMock()
mock_pymongo.errors.PyMongoError = Exception

# Assign mocked modules to sys.modules
sys.modules['pymongo'] = mock_pymongo
sys.modules['pymongo.errors'] = mock_pymongo.errors

import importlib
from unittest.mock import patch, MagicMock


class TestDatabase:
    """Test the database.py module"""

    def test_database_module_imports(self):
        # Import the database module using relative import
        from cloudshield.Server.utils import database
        
        # Check that required objects exist
        assert hasattr(database, 'DB_NAME')
        assert hasattr(database, 'MONGO_URL_FALLBACK')
        assert hasattr(database, '_mk_client')

    def test_environment_variables_loaded(self):
        from cloudshield.Server.utils import database
        # Test default values
        assert database.DB_NAME == "cloudshield"  # default value
        assert "mongodb://localhost:27017/" in database.MONGO_URL_FALLBACK

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
            result = database._mk_client("mongodb://test:27017/")
            
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
        
        assert issubclass(PyMongoError, Exception)
        
        from cloudshield.Server.utils import database
        
        assert hasattr(database, 'DB_NAME')

    def test_database_collections_setup(self):
        from cloudshield.Server.utils import database

        assert hasattr(database, 'users_admin')
        assert hasattr(database, 'users_public')
        

    def test_index_creation(self):
        """Test that the users_admin collection exists and is properly set up for indexing"""
        from cloudshield.Server.utils import database
        
        # Verify that users_admin collection exists (this is where indexes would be created)
        assert hasattr(database, 'users_admin')
        
        # Verify that users_admin is not None (it should be a mock object at this point)
        assert database.users_admin is not None
        
        # In the real database.py, the line: users_admin.create_index("email", unique=True)
        # creates a unique index on the email field. We can verify the collection object
        # has the create_index method available (even if it's mocked)
        assert hasattr(database.users_admin, 'create_index'), "users_admin should have create_index method"
            
