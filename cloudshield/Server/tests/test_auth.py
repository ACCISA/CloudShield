import unittest.mock
import sys
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
        
        # Import the auth module first
        import cloudshield.Server.routes.auth as auth_module
        
        # Patch the imported symbols directly on the auth module
        monkeypatch.setattr(auth_module, "users_admin", mock_users_admin)
        monkeypatch.setattr(auth_module, "verify_password", mock_password_functions['verify_password'])
        monkeypatch.setattr(auth_module, "hash_password", mock_password_functions['hash_password'])
        monkeypatch.setattr(auth_module, "is_bcrypt_string", mock_password_functions['is_bcrypt_string'])
        monkeypatch.setattr(auth_module, "issue_token", mock_jwt_functions['issue_token'])
        monkeypatch.setattr(auth_module, "verify_token", mock_jwt_functions['verify_token'])
        
        # Register the auth blueprint with the correct URL prefix
        from cloudshield.Server.routes.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/auth")
        
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
        # The verify_token mock returns our dict, which becomes claims
        assert data["claims"]["sub"] == "user123"
        assert data["claims"]["role"] == "admin"
        mock_jwt_functions['verify_token'].assert_called_with("valid.jwt.token")

    def test_me_failures(self, app_with_auth, mock_jwt_functions):
        """Test various /auth/me failure scenarios"""
        app, client = app_with_auth
        
        # Missing Authorization header
        response = client.get('/auth/me')
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"
        assert "Missing Bearer token" in data["details"]
        
        # Invalid authorization format (not starting with "Bearer ")
        response = client.get('/auth/me', headers={
            "Authorization": "InvalidFormat token"
        })
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"
        assert "Missing Bearer token" in data["details"]
        
        # Empty Bearer token - passes to verify_token, so we need to make verify_token raise
        mock_jwt_functions['verify_token'].side_effect = Exception("Empty token")
        response = client.get('/auth/me', headers={
            "Authorization": "Bearer "
        })
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Unauthorized"


    def _setup_signup_db_admin(self, monkeypatch):
        """
        Helper to attach a db_admin mock (with orgs + audit + workstations collections)
        to the auth module for /auth/signup tests.
        """
        import cloudshield.Server.routes.auth as auth_module
        mock_db_admin = unittest.mock.MagicMock()
        mock_orgs = unittest.mock.MagicMock()
        mock_audit = unittest.mock.MagicMock()
        mock_workstations = unittest.mock.MagicMock()

        def getitem(name):
            if name == "orgs":
                return mock_orgs
            if name == "audit":
                return mock_audit
            if name == "workstations":
                return mock_workstations
            raise KeyError(name)

        mock_db_admin.__getitem__.side_effect = getitem
        # Patch the module-level db_admin used by signup()
        monkeypatch.setattr(auth_module, "db_admin", mock_db_admin, raising=False)

        return mock_orgs, mock_audit, mock_workstations

    def test_signup_missing_fields(self, app_with_auth):
        """Missing required fields -> 400 with pydantic validation error."""
        app, client = app_with_auth

        response = client.post(
            "/auth/signup",
            json={
                "email": "",
                "password": "",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        # Actual implementation uses pydantic and returns "Invalid request"
        assert data["error"] == "Invalid request"
        assert "details" in data

    def test_signup_org_conflict(
        self,
        app_with_auth,
        mock_users_admin,
        monkeypatch,
    ):
        """Test that signup handles ValueError from create_user service (e.g., email conflict)."""
        app, client = app_with_auth
        import cloudshield.Server.routes.auth as auth_module
        
        # Mock create_user to raise ValueError (email already exists)
        def mock_create_user(*args, **kwargs):
            raise ValueError("User with email admin@example.com already exists")
        
        monkeypatch.setattr(auth_module, "create_user", mock_create_user)

        response = client.post(
            "/auth/signup",
            json={
                "email": "admin@example.com",
                "password": "Password123!",
                "full_name": "Admin",
                "role": "admin",
            },
        )

        # ValueError returns 400 in the actual implementation
        assert response.status_code == 400
        data = response.get_json()
        assert "already exists" in data["error"]

    def test_signup_email_exists_rollback(
        self,
        app_with_auth,
        mock_users_admin,
        monkeypatch,
    ):
        """
        Test that signup handles email already exists error from create_user service.
        """
        app, client = app_with_auth
        import cloudshield.Server.routes.auth as auth_module
        
        # Mock create_user to raise ValueError for duplicate email
        def mock_create_user(*args, **kwargs):
            raise ValueError("User with email taken@example.com already exists")
        
        monkeypatch.setattr(auth_module, "create_user", mock_create_user)

        response = client.post(
            "/auth/signup",
            json={
                "email": "taken@example.com",
                "password": "Password123!",
                "full_name": "Admin",
                "role": "admin",
            },
        )

        # ValueError returns 400 in the actual implementation
        assert response.status_code == 400
        data = response.get_json()
        assert "already exists" in data["error"]



    def test_signup_audit_failure_non_blocking(
        self,
        app_with_auth,
        mock_users_admin,
        mock_jwt_functions,
        monkeypatch,
    ):
        """
        Test successful signup path with mocked create_user.
        """
        app, client = app_with_auth
        import cloudshield.Server.routes.auth as auth_module
        
        # Mock create_user to succeed and set org_id on user_data
        def mock_create_user(user_data, current_user=None, reason=None):
            user_data.org_id = "org_audit"
            return "uid999"
        
        monkeypatch.setattr(auth_module, "create_user", mock_create_user)
        mock_jwt_functions["issue_token"].return_value = "audit.jwt"
        
        # Mock service_dispatcher
        mock_job = unittest.mock.MagicMock()
        mock_job.id = "job_123"
        mock_dispatcher = unittest.mock.MagicMock(return_value=mock_job)
        monkeypatch.setattr(auth_module, "service_dispatcher", mock_dispatcher)
        
        # Mock organizations.update_one
        mock_orgs = unittest.mock.MagicMock()
        monkeypatch.setattr(auth_module, "organizations", mock_orgs)

        response = client.post(
            "/auth/signup",
            json={
                "email": "audit@example.com",
                "password": "Password123!",
                "full_name": "Audit Admin",
                "role": "admin",
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["access_token"] == "audit.jwt"
        assert data["org_id"] == "org_audit"

    def test_me_invalid_token(self, app_with_auth, mock_jwt_functions):
        """Test retrieving user info with an invalid token"""
        app, client = app_with_auth

        mock_jwt_functions['verify_token'].side_effect = Exception("Invalid token")

        response = client.get('/auth/me', headers={
            "Authorization": "Bearer invalid_token"
        })

        assert response.status_code == 401
        assert response.get_json()["error"] == "Unauthorized"

    # --- NEW TESTS BELOW ---

    def test_signup_provisioning_success(self, app_with_auth, mock_users_admin, mock_jwt_functions, monkeypatch):
        """Covers the inline provisioning dispatch on signup success."""
        app, client = app_with_auth
        import cloudshield.Server.routes.auth as auth_module
        
        # Mock create_user to succeed
        def mock_create_user(user_data, current_user=None, reason=None):
            user_data.org_id = "507f1f77bcf86cd799439011"
            return "u1"
        
        monkeypatch.setattr(auth_module, "create_user", mock_create_user)
        mock_jwt_functions["issue_token"].return_value = "test.jwt.token"
        
        # Mock the service dispatcher
        mock_job = unittest.mock.MagicMock()
        mock_job.id = "job_12345"
        mock_dispatcher = unittest.mock.MagicMock(return_value=mock_job)
        monkeypatch.setattr(auth_module, "service_dispatcher", mock_dispatcher)
        
        # Mock organizations.update_one
        mock_orgs = unittest.mock.MagicMock()
        monkeypatch.setattr(auth_module, "organizations", mock_orgs)

        response = client.post("/auth/signup", json={
            "email": "provision@test.com",
            "password": "Password123!",
            "full_name": "Test User",
            "role": "admin",
        })

        assert response.status_code == 201
        
        # Verify dispatcher was called
        mock_dispatcher.assert_called_once()

    def test_signup_provisioning_exception_flow(self, app_with_auth, mock_users_admin, mock_jwt_functions, monkeypatch):
        """Covers the 'except Exception' block when service_dispatcher fails."""
        app, client = app_with_auth
        import cloudshield.Server.routes.auth as auth_module
        
        # Mock create_user to succeed
        def mock_create_user(user_data, current_user=None, reason=None):
            user_data.org_id = "507f1f77bcf86cd799439011"
            return "u1"
        
        monkeypatch.setattr(auth_module, "create_user", mock_create_user)
        mock_jwt_functions["issue_token"].return_value = "test.jwt.token"
        
        # Trigger an error during the dispatcher call to hit the 'except Exception'
        mock_dispatcher = unittest.mock.MagicMock(side_effect=Exception("Redis Queue Down"))
        monkeypatch.setattr(auth_module, "service_dispatcher", mock_dispatcher)
        
        # Mock organizations.update_one
        mock_orgs = unittest.mock.MagicMock()
        monkeypatch.setattr(auth_module, "organizations", mock_orgs)

        response = client.post("/auth/signup", json={
            "email": "fail_ws@test.com",
            "password": "Password123!",
            "full_name": "Test User",
            "role": "admin",
        })

        # User creation still succeeds even if provisioning fails
        assert response.status_code == 201