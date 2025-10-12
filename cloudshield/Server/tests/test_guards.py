import pytest
import os
import sys
from unittest.mock import MagicMock
from flask import Flask, jsonify, g

# Set up environment
os.environ['JWT_SECRET'] = 'test_secret_key_for_testing'
os.environ['JWT_ISSUER'] = 'test_cloudshield'
os.environ['JWT_AUDIENCE'] = 'test_app'

mock_jwt_utils = MagicMock()
sys.modules['cloudshield.Server.security.jwt_utils'] = mock_jwt_utils

# Mock the audit module  
mock_audit = MagicMock()
sys.modules['utils.audit'] = mock_audit

from cloudshield.Server.security.guards import require_auth, require_role, enforce_same_org


class TestGuards:
    """Test suite for authentication and authorization guards"""

    @pytest.fixture
    def app(self):
        """Create a test Flask app"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create a test client"""
        return app.test_client()

    def setup_method(self):
        """Set up test environment"""
        # Reset mocks
        mock_jwt_utils.reset_mock()
        mock_audit.reset_mock()
        
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123",
            "role": "admin", 
            "org_id": "org456"
        }

    def test_authentication_guard(self, app, client):
        """Test require_auth decorator for various authentication scenarios"""
        @app.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({"message": "success", "user": g.user})

        # Test valid token
        headers = {"Authorization": "Bearer valid_token"}
        response = client.get('/protected', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["user"]["id"] == "user123"
        assert data["user"]["role"] == "admin"
        assert data["user"]["org_id"] == "org456"

        # Test missing authorization header
        response = client.get('/protected')
        assert response.status_code == 401
        assert response.get_json()["error"] == "Unauthorized"

        # Test invalid bearer formats
        invalid_headers = [
            {"Authorization": "InvalidFormat token"},
            {"Authorization": "Bearer"},
            {"Authorization": "token_without_bearer"},
        ]
        for headers in invalid_headers:
            response = client.get('/protected', headers=headers)
            assert response.status_code == 401
            assert response.get_json()["error"] == "Unauthorized"

        # Test invalid token
        mock_jwt_utils.verify_token.side_effect = Exception("Invalid token")
        response = client.get('/protected', headers={"Authorization": "Bearer invalid_token"})
        assert response.status_code == 401
        assert response.get_json()["error"] == "Unauthorized"
        
        # Reset mock for other tests
        mock_jwt_utils.verify_token.side_effect = None
        mock_jwt_utils.verify_token.return_value = {"sub": "user123", "role": "admin", "org_id": "org456"}

    def test_role_based_authorization(self, app, client):
        """Test require_role decorator for role-based access control"""
        @app.route('/admin-only')
        @require_auth
        @require_role("admin")
        def admin_route():
            return jsonify({"message": "admin access granted"})
            
        @app.route('/multi-role')
        @require_auth
        @require_role("admin", "manager")
        def multi_role_route():
            return jsonify({"message": "access granted"})

        headers = {"Authorization": "Bearer token"}
        
        # Test admin access to admin-only endpoint
        mock_jwt_utils.verify_token.return_value = {"sub": "user123", "role": "admin", "org_id": "org456"}
        response = client.get('/admin-only', headers=headers)
        assert response.status_code == 200
        assert response.get_json()["message"] == "admin access granted"
        
        # Test admin access to multi-role endpoint
        response = client.get('/multi-role', headers=headers)
        assert response.status_code == 200

        # Test manager access to multi-role endpoint
        mock_jwt_utils.verify_token.return_value = {"sub": "user123", "role": "manager", "org_id": "org456"}
        response = client.get('/multi-role', headers=headers)
        assert response.status_code == 200

        # Test employee denied access
        mock_jwt_utils.verify_token.return_value = {"sub": "user123", "role": "employee", "org_id": "org456"}
        response = client.get('/admin-only', headers=headers)
        assert response.status_code == 403
        assert response.get_json()["error"] == "Forbidden"
        
        response = client.get('/multi-role', headers=headers)
        assert response.status_code == 403

    def test_organization_enforcement(self, app, client):
        """Test enforce_same_org decorator for organization-based access control"""
        @app.route('/org-protected', methods=['POST'])
        @require_auth
        @enforce_same_org()
        def org_route():
            return jsonify({"message": "org access granted"})

        headers = {"Authorization": "Bearer token"}

        # Test employee same org access
        mock_jwt_utils.verify_token.return_value = {"sub": "user123", "role": "employee", "org_id": "org123"}
        response = client.post('/org-protected', headers=headers, json={"org_id": "org123", "data": "test"})
        assert response.status_code == 200

        # Test employee different org denied
        response = client.post('/org-protected', headers=headers, json={"org_id": "different_org", "data": "test"})
        assert response.status_code == 403
        assert response.get_json()["error"] == "Forbidden (org)"

        # Test admin can bypass org restrictions
        mock_jwt_utils.verify_token.return_value = {"sub": "admin123", "role": "admin", "org_id": "org123"}
        response = client.post('/org-protected', headers=headers, json={"org_id": "different_org", "data": "test"})
        assert response.status_code == 200

        # Test no target org specified (should pass)
        mock_jwt_utils.verify_token.return_value = {"sub": "user123", "role": "employee", "org_id": "org123"}
        response = client.post('/org-protected', headers=headers, json={"data": "test"})
        assert response.status_code == 200
        
        response = client.post('/org-protected', headers=headers, json={})
        assert response.status_code == 200

    def test_decorator_utilities_and_metadata(self, app, client):
        """Test decorator utilities: g.user population and metadata preservation"""
        @app.route('/check-user')
        @require_auth
        def check_user():
            return jsonify({
                "user_id": g.user["id"],
                "user_role": g.user["role"],
                "user_org": g.user["org_id"]
            })

        @app.route('/metadata-test')
        @require_auth
        @require_role("admin")
        def test_function():
            """Test function docstring"""
            return jsonify({"message": "test"})

    
        mock_jwt_utils.verify_token.return_value = {"sub": "user456", "role": "manager", "org_id": "org789"}
        headers = {"Authorization": "Bearer token"}
        response = client.get('/check-user', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["user_id"] == "user456"
        assert data["user_role"] == "manager"
        assert data["user_org"] == "org789"

        # Test metadata preservation
        assert test_function.__name__ == "test_function"
        assert "Test function docstring" in test_function.__doc__
