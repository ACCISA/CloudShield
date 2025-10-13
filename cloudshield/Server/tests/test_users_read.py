import unittest.mock
import sys
import pytest
from flask import Flask, g
from bson import ObjectId
from unittest.mock import MagicMock

mock_pymongo = unittest.mock.MagicMock()
sys.modules['pymongo'] = mock_pymongo
sys.modules['pymongo.errors'] = unittest.mock.MagicMock()


class TestUsersRead:
    """Comprehensive test suite for users_read routes functionality"""

    @pytest.fixture
    def setup_mocks(self, monkeypatch):
        """Setup mocks for database and security components"""
        
        users_admin_mock = MagicMock()
        users_public_mock = MagicMock()
        
        database_mock = MagicMock()
        database_mock.users_admin = users_admin_mock
        database_mock.users_public = users_public_mock
        
        monkeypatch.setitem(sys.modules, "cloudshield.Server.utils.database", database_mock)
        
        guards_mock = MagicMock()
        
        def require_auth_decorator(f):
            def wrapper(*args, **kwargs):
                return f(*args, **kwargs)
            return wrapper
        
        guards_mock.require_auth = require_auth_decorator
        monkeypatch.setitem(sys.modules, "cloudshield.Server.security.guards", guards_mock)
        
        monkeypatch.setattr("cloudshield.Server.routes.users_read.users_admin", users_admin_mock)
        monkeypatch.setattr("cloudshield.Server.routes.users_read.users_public", users_public_mock)
        
        return {
            'users_admin': users_admin_mock,
            'users_public': users_public_mock,
            'guards': guards_mock
        }

    @pytest.fixture
    def app(self):
        """Create Flask test app"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def admin_user(self):
        """Sample admin user data"""
        return {
            "id": "admin123",
            "org_id": "org_001", 
            "role": "admin"
        }

    @pytest.fixture
    def employee_user(self):
        """Sample employee user data"""
        return {
            "id": "emp123",
            "org_id": "org_001",
            "role": "employee"
        }

    def test_list_users_admin_with_search_and_pagination(self, setup_mocks, app, admin_user):
        """Test list_users endpoint as admin with search and pagination"""
        mocks = setup_mocks

        sample_users = [
            {"_id": ObjectId("507f1f77bcf86cd799439011"), "email": "john@example.com", "full_name": "John Doe"}
        ]
        
        mocks['users_admin'].count_documents.return_value = 1
        mock_cursor = MagicMock()
        mocks['users_admin'].find.return_value = mock_cursor
        mock_cursor.skip.return_value = mock_cursor
        mock_cursor.limit.return_value = sample_users

        with app.test_request_context('/?search=john&limit=20&offset=0'):
            g.user = admin_user

            from cloudshield.Server.routes.users_read import list_users
            response, status_code = list_users()

            # Verify response structure
            assert status_code == 200
            data = response.get_json()
            assert data['total'] == 1
            assert data['limit'] == 20
            assert data['offset'] == 0
            assert len(data['items']) == 1
            assert data['items'][0]['email'] == 'john@example.com'
            assert data['items'][0]['_id'] == '507f1f77bcf86cd799439011'

            # Verify search filter was applied
            call_args = mocks['users_admin'].count_documents.call_args[0][0]
            assert '$or' in call_args
            assert any('john' in str(criteria) for criteria in call_args['$or'])

    def test_list_users_employee_org_filter(self, setup_mocks, app, employee_user):
        """Test list_users endpoint as employee with org filtering"""
        mocks = setup_mocks

        sample_users = [
            {"_id": ObjectId("507f1f77bcf86cd799439011"), "email": "colleague@example.com", "full_name": "Colleague"}
        ]
        
        mocks['users_public'].count_documents.return_value = 1
        mock_cursor = MagicMock()
        mocks['users_public'].find.return_value = mock_cursor
        mock_cursor.skip.return_value = mock_cursor
        mock_cursor.limit.return_value = sample_users

        with app.test_request_context('/?limit=20&offset=0'):
            g.user = employee_user

            from cloudshield.Server.routes.users_read import list_users
            response, status_code = list_users()

            # Verify response
            assert status_code == 200
            data = response.get_json()
            assert data['total'] == 1

            # Verify public collection was used and org filter applied
            mocks['users_public'].count_documents.assert_called_once()
            call_args = mocks['users_public'].count_documents.call_args[0][0]
            assert call_args.get('org_id') == employee_user['org_id']

    def test_list_users_pagination_boundary_conditions(self, setup_mocks, app, admin_user):
        """Test list_users pagination boundary conditions"""
        mocks = setup_mocks
        mocks['users_admin'].count_documents.return_value = 200
        mock_cursor = MagicMock()
        mocks['users_admin'].find.return_value = mock_cursor
        mock_cursor.skip.return_value = mock_cursor
        mock_cursor.limit.return_value = []

        # Test max limit (should cap at 100) and negative offset (should be 0)
        with app.test_request_context('/?limit=150&offset=-5'):
            g.user = admin_user
            from cloudshield.Server.routes.users_read import list_users
            response, status_code = list_users()

            data = response.get_json()
            assert data['limit'] == 100 # Should be capped at 100
            assert data['offset'] == 0   # Should be minimum 0

    def test_get_user_admin_success(self, setup_mocks, app, admin_user):
        """Test get_user endpoint as admin successfully"""
        mocks = setup_mocks

        user_id = "507f1f77bcf86cd799439011"
        sample_user = {
            "_id": ObjectId(user_id),
            "email": "user@example.com",
            "full_name": "Test User",
            "role": "employee"
        }
        mocks['users_admin'].find_one.return_value = sample_user

        with app.test_request_context(f'/users/{user_id}'):
            g.user = admin_user

            from cloudshield.Server.routes.users_read import get_user
            response, status_code = get_user(user_id)

            # Verify response and admin collection used
            assert status_code == 200
            data = response.get_json()
            assert data['email'] == 'user@example.com'
            assert data['_id'] == user_id
            
            call_args = mocks['users_admin'].find_one.call_args
            assert call_args[0][1] == {"password": 0} 

    def test_get_user_employee_same_org_success(self, setup_mocks, app, employee_user):
        """Test get_user endpoint as employee accessing same org user"""
        mocks = setup_mocks

        user_id = "507f1f77bcf86cd799439011"
        sample_user = {
            "_id": ObjectId(user_id),
            "email": "colleague@example.com",
            "full_name": "Colleague"
        }
        mocks['users_public'].find_one.return_value = sample_user

        with app.test_request_context(f'/users/{user_id}'):
            g.user = employee_user

            from cloudshield.Server.routes.users_read import get_user
            response, status_code = get_user(user_id)

            # Verify response and public collection used with org filter
            assert status_code == 200
            data = response.get_json()
            assert data['email'] == 'colleague@example.com'

            call_args = mocks['users_public'].find_one.call_args
            assert call_args[0][0]['org_id'] == employee_user['org_id']
            assert call_args[0][1] is None 

    def test_get_user_error_conditions(self, setup_mocks, app, admin_user, employee_user):
        """Test get_user error conditions: invalid ObjectId and not found"""
        mocks = setup_mocks

        # Test invalid ObjectId
        with app.test_request_context('/users/invalid_id'):
            g.user = admin_user
            from cloudshield.Server.routes.users_read import get_user
            response, status_code = get_user("invalid_id")
            assert status_code == 404
            assert response.get_json()['error'] == 'Not found'

        # Test user not found (admin)
        user_id = "507f1f77bcf86cd799439011"
        mocks['users_admin'].find_one.return_value = None
        with app.test_request_context(f'/users/{user_id}'):
            g.user = admin_user
            response, status_code = get_user(user_id)
            assert status_code == 404
            assert response.get_json()['error'] == 'Not found'

        # Test employee accessing different org user (not found)
        mocks['users_public'].find_one.return_value = None
        with app.test_request_context(f'/users/{user_id}'):
            g.user = employee_user
            response, status_code = get_user(user_id)
            assert status_code == 404
            assert response.get_json()['error'] == 'Not found'

