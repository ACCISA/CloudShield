import unittest
import pytest
import os
import sys
from unittest.mock import patch, MagicMock
from flask import Flask, request, jsonify, g

# Set up environment for testing
os.environ['JWT_SECRET'] = 'test_secret_key_for_testing'
os.environ['JWT_ISSUER'] = 'test_cloudshield'
os.environ['JWT_AUDIENCE'] = 'test_app'

# Mock the jwt_utils module before importing guards
mock_jwt_utils = MagicMock()
sys.modules['security.jwt_utils'] = mock_jwt_utils

# Mock the audit module
mock_audit = MagicMock()
sys.modules['utils.audit'] = mock_audit

# Now import the guards module
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
        
        # Set up mock verify_token to return valid payload
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123",
            "role": "admin", 
            "org_id": "org456"
        }

    def test_require_auth_valid_token(self, app, client):
        """Test require_auth decorator with valid token"""
        @app.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({"message": "success", "user": g.user})

        headers = {"Authorization": "Bearer valid_token"}
        response = client.get('/protected', headers=headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["message"] == "success"
        assert data["user"]["id"] == "user123"
        assert data["user"]["role"] == "admin"
        assert data["user"]["org_id"] == "org456"

    def test_require_auth_missing_authorization_header(self, app, client):
        """Test require_auth fails without Authorization header"""
        @app.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({"message": "success"})

        response = client.get('/protected')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"

    def test_require_auth_invalid_bearer_format(self, app, client):
        """Test require_auth fails with invalid Bearer format"""
        @app.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({"message": "success"})

        invalid_headers = [
            {"Authorization": "InvalidFormat token"},
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "token_without_bearer"},
        ]

        for headers in invalid_headers:
            response = client.get('/protected', headers=headers)
            assert response.status_code == 401
            data = response.get_json()
            assert data["error"] == "Unauthorized"

    def test_require_auth_invalid_token(self, app, client):
        """Test require_auth fails with invalid token"""
        @app.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({"message": "success"})

        # Mock verify_token to raise exception
        mock_jwt_utils.verify_token.side_effect = Exception("Invalid token")

        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get('/protected', headers=headers)
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"

        # Reset for other tests
        mock_jwt_utils.verify_token.side_effect = None
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "admin", "org_id": "org456"
        }

    def test_require_role_admin_access(self, app, client):
        """Test require_role allows admin access"""
        @app.route('/admin-only')
        @require_auth
        @require_role("admin")
        def admin_route():
            return jsonify({"message": "admin access granted"})

        headers = {"Authorization": "Bearer token"}
        response = client.get('/admin-only', headers=headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["message"] == "admin access granted"

    def test_require_role_employee_denied_admin(self, app, client):
        """Test require_role denies employee access to admin endpoint"""
        @app.route('/admin-only')
        @require_auth
        @require_role("admin")
        def admin_route():
            return jsonify({"message": "admin access granted"})

        # Mock verify_token to return employee role
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "employee", "org_id": "org456"
        }

        headers = {"Authorization": "Bearer token"}
        response = client.get('/admin-only', headers=headers)
        
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"] == "Forbidden"

    def test_require_role_multiple_roles(self, app, client):
        """Test require_role with multiple allowed roles"""
        @app.route('/multi-role')
        @require_auth
        @require_role("admin", "manager")
        def multi_role_route():
            return jsonify({"message": "access granted"})

        # Test admin access
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "admin", "org_id": "org456"
        }
        headers = {"Authorization": "Bearer token"}
        response = client.get('/multi-role', headers=headers)
        assert response.status_code == 200

        # Test manager access
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "manager", "org_id": "org456"
        }
        response = client.get('/multi-role', headers=headers)
        assert response.status_code == 200

        # Test employee denied
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "employee", "org_id": "org456"
        }
        response = client.get('/multi-role', headers=headers)
        assert response.status_code == 403

    def test_enforce_same_org_from_json_body(self, app, client):
        """Test enforce_same_org with org_id from JSON body"""
        @app.route('/org-protected', methods=['POST'])
        @require_auth
        @enforce_same_org()
        def org_route():
            return jsonify({"message": "same org access granted"})

        # Reset mock to employee role
        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "employee", "org_id": "org123"
        }

        # Test same org access
        headers = {"Authorization": "Bearer token"}
        json_data = {"org_id": "org123", "data": "test"}
        response = client.post('/org-protected', headers=headers, json=json_data)
        assert response.status_code == 200

        # Test different org denied
        json_data_different_org = {"org_id": "different_org", "data": "test"}
        response = client.post('/org-protected', headers=headers, json=json_data_different_org)
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"] == "Forbidden (org)"

    def test_enforce_same_org_admin_bypass(self, app, client):
        """Test that admin users can bypass org restrictions"""
        @app.route('/org-protected', methods=['POST'])
        @require_auth
        @enforce_same_org()
        def org_route():
            return jsonify({"message": "admin bypass successful"})

        # Admin should be able to access different org
        mock_jwt_utils.verify_token.return_value = {
            "sub": "admin123", "role": "admin", "org_id": "org123"
        }
        
        headers = {"Authorization": "Bearer token"}
        json_data = {"org_id": "different_org", "data": "test"}
        
        response = client.post('/org-protected', headers=headers, json=json_data)
        assert response.status_code == 200
        data = response.get_json()
        assert data["message"] == "admin bypass successful"

    def test_enforce_same_org_no_target_org(self, app, client):
        """Test enforce_same_org when no target org is specified"""
        @app.route('/org-protected', methods=['POST'])
        @require_auth
        @enforce_same_org()
        def org_route():
            return jsonify({"message": "no org check needed"})

        mock_jwt_utils.verify_token.return_value = {
            "sub": "user123", "role": "employee", "org_id": "org123"
        }
        headers = {"Authorization": "Bearer token"}
        
        # No org_id in JSON - should pass
        response = client.post('/org-protected', headers=headers, json={"data": "test"})
        assert response.status_code == 200

        # Empty JSON - should pass
        response = client.post('/org-protected', headers=headers, json={})
        assert response.status_code == 200

    def test_g_user_populated_correctly(self, app, client):
        """Test that g.user is populated with correct user data"""
        @app.route('/check-user')
        @require_auth
        def check_user():
            return jsonify({
                "user_id": g.user["id"],
                "user_role": g.user["role"],
                "user_org": g.user["org_id"]
            })

        mock_jwt_utils.verify_token.return_value = {
            "sub": "user456", "role": "manager", "org_id": "org789"
        }
        
        headers = {"Authorization": "Bearer token"}
        response = client.get('/check-user', headers=headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["user_id"] == "user456"
        assert data["user_role"] == "manager"
        assert data["user_org"] == "org789"

    def test_decorator_preserves_function_metadata(self, app, client):
        """Test that decorators preserve original function metadata"""
        @app.route('/metadata-test')
        @require_auth
        @require_role("admin")
        def test_function():
            """Test function docstring"""
            return jsonify({"message": "test"})

        # Function should preserve its name and docstring
        assert test_function.__name__ == "test_function"
        assert "Test function docstring" in test_function.__doc__
