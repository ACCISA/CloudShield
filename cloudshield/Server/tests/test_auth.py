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


    def _setup_signup_db_admin(self, monkeypatch):
        """
        Helper to attach a db_admin mock (with orgs + audit collections)
        to the auth module for /auth/signup tests.
        """
        import cloudshield.Server.routes.auth as auth_module
        mock_db_admin = unittest.mock.MagicMock()
        mock_orgs = unittest.mock.MagicMock()
        mock_audit = unittest.mock.MagicMock()

        def getitem(name):
            if name == "orgs":
                return mock_orgs
            if name == "audit":
                return mock_audit
            raise KeyError(name)

        mock_db_admin.__getitem__.side_effect = getitem
        # Patch the module-level db_admin used by signup()
        monkeypatch.setattr(auth_module, "db_admin", mock_db_admin, raising=False)

        return mock_orgs, mock_audit

    def test_signup_missing_fields(self, app_with_auth):
        """Missing required fields -> 400 + details list."""
        app, client = app_with_auth

        response = client.post(
            "/auth/signup",
            json={
                "email": "",
                "password": "",
                "company_name": "",
                "org_id": "",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["error"] == "Missing fields"

        # all required keys should be mentioned
        for field in ("email", "password", "company_name", "org_id"):
            assert field in data["details"]

    def test_signup_org_conflict(
        self,
        app_with_auth,
        mock_users_admin,
        monkeypatch,
    ):
        """Existing org_id OR company_name -> 409 Organization already exists."""
        app, client = app_with_auth
        mock_orgs, mock_audit = self._setup_signup_db_admin(monkeypatch)

        # Org already exists
        mock_orgs.find_one.return_value = {"org_id": "org_001"}

        response = client.post(
            "/auth/signup",
            json={
                "email": "admin@example.com",
                "password": "Password123!",
                "full_name": "Admin",
                "company_name": "ExistingCo",
                "org_id": "org_001",
                "package_type": "free",
            },
        )

        assert response.status_code == 409
        data = response.get_json()
        assert data["error"] == "Organization already exists"

        mock_users_admin.insert_one.assert_not_called()
        mock_audit.insert_one.assert_not_called()

    def test_signup_email_exists_rollback(
        self,
        app_with_auth,
        mock_users_admin,
        monkeypatch,
    ):
        """
        If users_admin.insert_one raises DuplicateKeyError,
        org is rolled back and 409 Email already exists is returned.
        """
        app, client = app_with_auth

        import unittest.mock
        import cloudshield.Server.routes.auth as auth_module

        fake_orgs = unittest.mock.MagicMock()
        fake_audit = unittest.mock.MagicMock()

        class FakeDB:
            def __getitem__(self, name):
                if name == "orgs":
                    return fake_orgs
                if name == "audit":
                    return fake_audit
                return unittest.mock.MagicMock()

        # Patch the symbols actually used by signup()
        monkeypatch.setattr(auth_module, "db_admin", FakeDB(), raising=False)
        monkeypatch.setattr(auth_module, "audit", fake_audit, raising=False)

        # No existing org
        fake_orgs.find_one.return_value = None

        # Patch DuplicateKeyError in the auth module to a local class
        class FakeDuplicateKeyError(Exception):
            pass

        monkeypatch.setattr(
            auth_module,
            "DuplicateKeyError",
            FakeDuplicateKeyError,
            raising=False,
        )

        # Make insert_one raise that exact error so the `except DuplicateKeyError` branch runs
        mock_users_admin.insert_one.side_effect = FakeDuplicateKeyError(
            "duplicate email"
        )

        response = client.post(
            "/auth/signup",
            json={
                "email": "taken@example.com",
                "password": "Password123!",
                "full_name": "Admin",
                "company_name": "RollbackCo",
                "org_id": "org_rollback",
                "package_type": "free",
            },
        )

        assert response.status_code == 409
        fake_orgs.delete_one.assert_called_once_with({"org_id": "org_rollback"})



    def test_signup_audit_failure_non_blocking(
        self,
        app_with_auth,
        mock_users_admin,
        mock_jwt_functions,
        monkeypatch,
    ):
        """
        If audit.insert_one fails, signup still succeeds (best-effort audit).
        """
        app, client = app_with_auth
        mock_orgs, mock_audit = self._setup_signup_db_admin(monkeypatch)

        mock_orgs.find_one.return_value = None

        insert_result = unittest.mock.MagicMock()
        insert_result.inserted_id = "uid999"
        mock_users_admin.insert_one.return_value = insert_result

        mock_jwt_functions["issue_token"].return_value = "audit.jwt"

        # Make audit.insert_one blow up
        mock_audit.insert_one.side_effect = Exception("audit down")

        response = client.post(
            "/auth/signup",
            json={
                "email": "audit@example.com",
                "password": "Password123!",
                "full_name": "Audit Admin",
                "company_name": "AuditCo",
                "org_id": "org_audit",
                "package_type": "free",
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["access_token"] == "audit.jwt"
        assert data["org"]["org_id"] == "org_audit"

    def test_me_invalid_token(self, app_with_auth, mock_jwt_functions):
        """Test retrieving user info with an invalid token"""
        app, client = app_with_auth

        mock_jwt_functions['verify_token'].side_effect = Exception("Invalid token")

        response = client.get('/auth/me', headers={
            "Authorization": "Bearer invalid_token"
        })

        assert response.status_code == 401
        assert response.get_json()["error"] == "Unauthorized"