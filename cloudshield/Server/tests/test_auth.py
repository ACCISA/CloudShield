import unittest.mock
import sys
import types
import pytest
from flask import Flask

mock_mongo_client = unittest.mock.MagicMock()
mock_mongo_client.return_value.admin.command.return_value = None

mock_errors = unittest.mock.MagicMock()
mock_errors.PyMongoError = Exception
mock_errors.DuplicateKeyError = Exception
mock_errors.OperationFailure = Exception

mock_pymongo = unittest.mock.MagicMock()
mock_pymongo.MongoClient = mock_mongo_client
mock_pymongo.errors = mock_errors

sys.modules['pymongo'] = mock_pymongo
sys.modules['pymongo.errors'] = mock_errors


class TestAuth:
    """Comprehensive test suite for authentication routes"""

    @pytest.fixture
    def mock_users_admin(self):
        """Mock the users_admin collection"""
        return unittest.mock.MagicMock()

    @pytest.fixture
    def mock_password_functions(self):
        """Mock password-related functions"""
        verify_mock = unittest.mock.MagicMock()
        hash_mock = unittest.mock.MagicMock()
        is_bcrypt_mock = unittest.mock.MagicMock()
        
        return {
            'verify_password': verify_mock,
            'hash_password': hash_mock, 
            'is_bcrypt_string': is_bcrypt_mock
        }

    @pytest.fixture
    def mock_jwt_functions(self):
        """Mock JWT-related functions"""
        issue_mock = unittest.mock.MagicMock()
        verify_mock = unittest.mock.MagicMock()
        
        return {
            'issue_token': issue_mock,
            'verify_token': verify_mock
        }

    @pytest.fixture
    def app_with_auth(self, mock_users_admin, mock_password_functions, mock_jwt_functions, monkeypatch):
        """Create Flask app with mocked auth blueprint"""
        app = Flask(__name__)
        
        # Mock the database module
        mock_db_module = types.ModuleType("utils.database")
        mock_db_module.users_admin = mock_users_admin
        monkeypatch.setitem(sys.modules, "cloudshield.Server.utils.database", mock_db_module)
        
        # Mock the security modules
        mock_passwords_module = types.ModuleType("security.passwords")
        for name, mock_func in mock_password_functions.items():
            setattr(mock_passwords_module, name, mock_func)
        monkeypatch.setitem(sys.modules, "cloudshield.Server.security.passwords", mock_passwords_module)
        
        mock_jwt_module = types.ModuleType("security.jwt_utils")
        for name, mock_func in mock_jwt_functions.items():
            setattr(mock_jwt_module, name, mock_func)
        monkeypatch.setitem(sys.modules, "cloudshield.Server.security.jwt_utils", mock_jwt_module)
        
        # Clear any cached imports
        modules_to_clear = [name for name in sys.modules.keys() if 'cloudshield.Server.routes.auth' in name]
        for module_name in modules_to_clear:
            monkeypatch.delitem(sys.modules, module_name, raising=False)
        
        # Import and register the auth blueprint
        from cloudshield.Server.routes.auth import auth_bp
        app.register_blueprint(auth_bp)
        
        with app.test_client() as client:
            yield app, client

    def test_login_success_and_features(self, app_with_auth, mock_users_admin, mock_password_functions, mock_jwt_functions):
        """Test successful login scenarios including email normalization and legacy password upgrade"""
        app, client = app_with_auth
        
        # Normal successful login
        mock_users_admin.find_one.return_value = {
            "_id": "user123",
            "email": "john@example.com",
            "password": "$2b$12$hashedpassword",
            "role": "admin",
            "org_id": "org_001"
        }
        mock_password_functions['verify_password'].return_value = True
        mock_password_functions['is_bcrypt_string'].return_value = True
        mock_jwt_functions['issue_token'].return_value = "jwt.token.here"
        
        response = client.post('/auth/login', json={
            "email": "john@example.com",
            "password": "SecretPassword123!"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["access_token"] == "jwt.token.here"
        assert data["token_type"] == "Bearer"
        assert data["expires_in"] == 3600
        
        mock_users_admin.reset_mock()
        response = client.post('/auth/login', json={
            "email": "  JOHN@EXAMPLE.COM  ", 
            "password": "SecretPassword123!"
        })
        
        assert response.status_code == 200
        mock_users_admin.find_one.assert_called_with(
            {"email": "john@example.com", "status": "active"},
            {"email": 1, "password": 1, "role": 1, "org_id": 1}
        )
        
        #Legacy plaintext password upgrade
        mock_users_admin.reset_mock()
        mock_users_admin.find_one.return_value = {
            "_id": "user123",
            "email": "john@example.com",
            "password": "plaintext_password",
            "role": "admin", 
            "org_id": "org_001"
        }
        mock_password_functions['is_bcrypt_string'].return_value = False  
        mock_password_functions['hash_password'].return_value = "$2b$12$newhash"
        
        response = client.post('/auth/login', json={
            "email": "john@example.com",
            "password": "plaintext_password"
        })
        
        assert response.status_code == 200
        mock_password_functions['hash_password'].assert_called_with("plaintext_password")
        mock_users_admin.update_one.assert_called_with(
            {"_id": "user123"},
            {"$set": {"password": "$2b$12$newhash"}}
        )

    def test_login_failures(self, app_with_auth, mock_users_admin, mock_password_functions):
        """Test various login failure scenarios"""
        app, client = app_with_auth
        
        # User not found
        mock_users_admin.find_one.return_value = None
        response = client.post('/auth/login', json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid credentials"
        
        # Wrong password
        mock_users_admin.find_one.return_value = {
            "_id": "user123",
            "email": "john@example.com", 
            "password": "$2b$12$hashedpassword",
            "role": "admin",
            "org_id": "org_001"
        }
        mock_password_functions['verify_password'].return_value = False
        
        response = client.post('/auth/login', json={
            "email": "john@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid credentials"
        
        # Empty credentials
        mock_users_admin.find_one.return_value = None
        response = client.post('/auth/login', json={
            "email": "",
            "password": ""
        })
        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid credentials"
        
        # Missing request body (Flask handles this)
        response = client.post('/auth/login')
        assert response.status_code == 400
        
        # Inactive user (query filters by status="active")
        response = client.post('/auth/login', json={
            "email": "inactive@example.com", 
            "password": "password123"
        })
        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid credentials"

    def test_me_success(self, app_with_auth, mock_jwt_functions):
        """Test successful /auth/me requests with valid tokens"""
        app, client = app_with_auth
        
        # Valid Bearer token
        mock_jwt_functions['verify_token'].return_value = {
            "sub": "user123",
            "role": "admin", 
            "org_id": "org_001",
            "iat": 1234567890,
            "exp": 1234571490
        }
        
        response = client.get('/auth/me', headers={
            "Authorization": "Bearer valid.jwt.token"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert "claims" in data
        assert data["claims"]["sub"] == "user123"
        assert data["claims"]["role"] == "admin"
        mock_jwt_functions['verify_token'].assert_called_with("valid.jwt.token")
        
        # Token with whitespace (should be trimmed)
        mock_jwt_functions['verify_token'].reset_mock()
        response = client.get('/auth/me', headers={
            "Authorization": "Bearer   token.with.spaces   "
        })
        
        assert response.status_code == 200
        mock_jwt_functions['verify_token'].assert_called_with("token.with.spaces")

    def test_me_failures(self, app_with_auth, mock_jwt_functions):
        """Test various /auth/me failure scenarios"""
        app, client = app_with_auth
        
        # Missing Authorization header
        response = client.get('/auth/me')
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"
        assert "Missing Bearer token" in data["details"]
        
        # Invalid authorization format
        response = client.get('/auth/me', headers={
            "Authorization": "InvalidFormat token"
        })
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"
        assert "Missing Bearer token" in data["details"]
        
        # Empty Bearer token
        response = client.get('/auth/me', headers={
            "Authorization": "Bearer "
        })
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"
        
        # Invalid token (various JWT errors)
        test_cases = [
            ("Invalid token signature", "invalid.jwt.token"),
            ("Token has expired", "expired.jwt.token"),
            ("Invalid token format", "malformed-token")
        ]
        
        for error_message, token in test_cases:
            mock_jwt_functions['verify_token'].side_effect = Exception(error_message)
            response = client.get('/auth/me', headers={
                "Authorization": f"Bearer {token}"
            })
            assert response.status_code == 401
            data = response.get_json()
            assert data["error"] == "Unauthorized"
            assert error_message in data["details"]
