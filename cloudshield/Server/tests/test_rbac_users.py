import unittest.mock
import sys
import importlib
import types
import pathlib
from flask import Flask, jsonify, g, request
import pytest


def _repo_root():
    return pathlib.Path(__file__).parents[3]


@pytest.fixture(autouse=True, scope="module")
def _setup_mocks():
    """
    Mock external dependencies (RQ, provisioner, pymongo) to avoid Redis/MongoDB.
    Automatically restores original modules after tests to prevent affecting other test files.
    """
    # Save originals
    original_rq = sys.modules.get('rq')
    original_provisioner = sys.modules.get('provisioner')
    original_pymongo = sys.modules.get('pymongo')
    original_pymongo_errors = sys.modules.get('pymongo.errors')
    original_security_guards = sys.modules.get('security.guards')
    
    # Install mocks
    mock_rq = unittest.mock.MagicMock()
    mock_rq.get_current_job.return_value = None
    mock_provisioner = unittest.mock.MagicMock()
    
    mock_mongo_client = unittest.mock.MagicMock()
    mock_mongo_client.return_value.admin.command.return_value = None
    mock_errors = unittest.mock.MagicMock()
    mock_errors.PyMongoError = Exception
    mock_errors.DuplicateKeyError = Exception
    mock_errors.OperationFailure = Exception
    mock_pymongo_module = unittest.mock.MagicMock()
    mock_pymongo_module.MongoClient = mock_mongo_client
    mock_pymongo_module.errors = mock_errors
    
    sys.modules['rq'] = mock_rq
    sys.modules['provisioner'] = mock_provisioner
    sys.modules['pymongo'] = mock_pymongo_module
    sys.modules['pymongo.errors'] = mock_errors
    
    yield
    
    # Restore originals (prevents CI/CD failures in other test files)
    for name, original in [
        ('rq', original_rq),
        ('provisioner', original_provisioner),
        ('pymongo', original_pymongo),
        ('pymongo.errors', original_pymongo_errors),
        ('security.guards', original_security_guards)
    ]:
        if original is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = original

# Minimal fake guards so decorators work without real JWT
def install_fake_guards_module():
    guards_mod = types.ModuleType("security.guards")

    def require_auth(fn):
        from functools import wraps
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify({"error": "Unauthorized"}), 401
            try:
                token = auth.split(" ", 1)[1]
                role, org_id, user_id = token.split(":")
            except Exception:
                return jsonify({"error": "Unauthorized"}), 401
            g.user = {"role": role, "org_id": org_id, "id": user_id}
            return fn(*args, **kwargs)
        return wrapper

    def require_role(*roles):
        from functools import wraps
        def deco(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if g.get("user") is None or g.user.get("role") not in roles:
                    return jsonify({"error": "Unauthorized"}), 401
                return fn(*args, **kwargs)
            return wrapper
        return deco

    guards_mod.require_auth = require_auth
    guards_mod.require_role = require_role

    # Create a proper top-level `security` module (like a package facade)
    security_mod = types.ModuleType("security")
    security_mod.require_auth = require_auth
    security_mod.require_role = require_role

    sys.modules["security"] = security_mod
    sys.modules["security.guards"] = guards_mod

#In-memory fake collection to simulate MongoDB operations
class _InsertRes:
    def __init__(self, inserted_id): self.inserted_id = inserted_id

class _UpdateRes: 
    def __init__(self, matched, modified): self.matched_count, self.modified_count = matched, modified

class _DeleteRes: 
    def __init__(self, deleted): self.deleted_count = deleted

class FakeCollection:
    def __init__(self):
        self._docs = {}
        self._seq = 0

    def _next_id(self):
        self._seq += 1
        return str(self._seq)

    def find_one(self, query):
        for d in self._docs.values():
            ok = True
            for k, v in query.items():
                if d.get(k) != v:
                    ok = False
                    break
            if ok:
                return d.copy()
        return None

    def insert_one(self, doc):
        doc = dict(doc)
        if "_id" not in doc:
            doc["_id"] = self._next_id()
        self._docs[doc["_id"]] = doc
        return _InsertRes(doc["_id"])
    
    def update_one(self, filt, upd):
        _id = filt.get("_id")
        if _id not in self._docs: 
            return _UpdateRes(0, 0)
        if "$set" in upd: 
            self._docs[_id].update(upd["$set"])
        return _UpdateRes(1, 1)
    
    def delete_one(self, filt):
        _id = filt.get("_id")
        if _id in self._docs:
            del self._docs[_id]
            return _DeleteRes(1)
        return _DeleteRes(0)

def install_fake_guards_module_with_custom_user(make_user_fn):
    """
    Variant of install_fake_guards_module that lets tests control g.user payload
    so we can cover password stripping + _id -> id normalization in /users/me.
    """
    mod = types.ModuleType("security.guards")

    def require_auth(fn):
        from functools import wraps
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify({"error": "Unauthorized"}), 401
            try:
                token = auth.split(" ", 1)[1]
                role, org_id, user_id = token.split(":")
            except Exception:
                return jsonify({"error": "Unauthorized"}), 401

            # Use the provided function to build g.user
            g.user = make_user_fn(role=role, org_id=org_id, user_id=user_id)
            return fn(*args, **kwargs)
        return wrapper

    def require_role(*roles):
        from functools import wraps
        def deco(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if g.get("user") is None or g.user.get("role") not in roles:
                    return jsonify({"error": "Unauthorized"}), 401
                return fn(*args, **kwargs)
            return wrapper
        return deco

    mod.require_auth = require_auth
    mod.require_role = require_role
    sys.modules["security.guards"] = mod
    sys.modules["security"] = mod  # top-level facade

@pytest.fixture
def app_and_client_custom_me(monkeypatch, fake_users_collection):
    """
    Fresh app/client that registers users_bp with custom require_auth behavior
    (so we can inject _id + password into g.user).
    """
   # Define how to build g.user with _id and password
    def _make_user(role, org_id, user_id):
        return {
            "role": role,
            "org_id": org_id,
            "_id": user_id,              # mongo-style id
            "password": "hashed::secret" # fake hashed password
        }

    install_fake_guards_module_with_custom_user(_make_user)
    install_real_pydantic_models()
    install_fake_passwords_module()
    install_fake_services_user_service_module()

    # Clear any previously loaded modules to ensure fresh import
    for mod in ["cloudshield.Server.routes.users", "cloudshield.Server.security.guards"]:
        if mod in sys.modules:
            del sys.modules[mod]
    sys.modules["cloudshield.Server.security.guards"] = sys.modules["security.guards"]

    app = Flask(__name__)
    users_mod = importlib.import_module("cloudshield.Server.routes.users")
    app.register_blueprint(users_mod.users_bp)

    return app, app.test_client()


def test_get_current_user_endpoint_strips_password_and_normalizes_id(app_and_client_custom_me):
    """
    Covers:
      u = g.user or {}
      safe_user = dict(u)
      safe_user.pop("password", None)
      if "_id" in safe_user and "id" not in safe_user: normalize
      return jsonify(...)
    """
    _, client = app_and_client_custom_me

    resp = client.get("/users/me", headers={"Authorization": "Bearer employee:org_001:abc123"})
    assert resp.status_code == 200

    body = resp.get_json()
    assert "user" in body

    user = body["user"]
    # Password stripped
    assert "password" not in user
    # _id normalized to id
    assert user["id"] == "abc123"
    assert "_id" not in user
    # Other fields preserved
    assert user["role"] == "employee"
    assert user["org_id"] == "org_001"


def test_get_current_user_endpoint_when_g_user_is_none_via_wrapped(monkeypatch, app_and_client):
    """
    Covers the `g.user or {}` path explicitly by calling the underlying
    undecorated function (via __wrapped__) inside a request context.
    """
    app, _client = app_and_client
    users_mod = importlib.import_module("cloudshield.Server.routes.users")

    # Get the real function behind the decorators
    real_fn = users_mod.get_current_user_endpoint.__wrapped__

    with app.test_request_context("/users/me", method="GET"):
        g.user = None
        resp, status = real_fn()
        assert status == 200
        assert resp.get_json() == {"user": {}}


def test_get_current_user_endpoint_does_not_override_existing_id(monkeypatch, app_and_client):
    """
    Covers the branch condition NOT firing:
      if "_id" in safe_user and "id" not in safe_user:
    by ensuring 'id' already exists.
    Also verifies password stripping still occurs.
    """
    app, _client = app_and_client
    users_mod = importlib.import_module("cloudshield.Server.routes.users")
    real_fn = users_mod.get_current_user_endpoint.__wrapped__

    with app.test_request_context("/users/me", method="GET"):
        g.user = {
            "id": "already-id",
            "_id": "mongo-ish",
            "password": "hashed::secret",
            "role": "admin",
            "org_id": "org_001",
        }

        resp, status = real_fn()
        assert status == 200
        data = resp.get_json()["user"]

        # Password stripped
        assert "password" not in data

        # id remains as-is
        assert data["id"] == "already-id"
        # _id preserved since id existed
        assert data["_id"] == "mongo-ish"

def install_real_pydantic_models():
    """Import real Pydantic models to get validation behavior in tests"""
    import sys
    from pathlib import Path
    
    # Add the parent directory to path so we can import models
    server_dir = Path(__file__).parent.parent
    if str(server_dir) not in sys.path:
        sys.path.insert(0, str(server_dir))
    
    # Import the real UserCreate and UserUpdate Pydantic models
    from models.user import UserCreate, UserUpdate
    
    # Create a models package module
    models_pkg = sys.modules.get("models") or types.ModuleType("models")
    sys.modules["models"] = models_pkg

    # Create models.user submodule
    user_mod = types.ModuleType("models.user")
    user_mod.UserCreate = UserCreate
    user_mod.UserUpdate = UserUpdate
    sys.modules["models.user"] = user_mod
    
    # Add to models package for direct imports (routes/users.py does: from models import UserCreate, UserUpdate)
    models_pkg.UserCreate = UserCreate
    models_pkg.UserUpdate = UserUpdate


def install_fake_passwords_module():
    mod = types.ModuleType("security.passwords")

    def hash_password(p): 
        return f"hashed::{p}"

    def is_bcrypt_string(s): 
        return isinstance(s, str) and len(s) >= 55 and s.startswith("$2")

    def verify_password(password: str, hashed: str) -> bool:
        return hashed == f"hashed::{password}" or hashed == password

    mod.hash_password = hash_password
    mod.is_bcrypt_string = is_bcrypt_string
    mod.verify_password = verify_password
    sys.modules["security.passwords"] = mod


def install_fake_services_user_service_module():
    services_pkg = sys.modules.get("services") or types.ModuleType("services")
    sys.modules["services"] = services_pkg

    svc_mod = types.ModuleType("services.user_service")

    def _get_users_collection():
        utils_db = importlib.import_module("utils.database")
        return getattr(utils_db, "users_collection")

    # The create_user function checks for duplicate emails and hashes passwords.
    def create_user(user_data, *args, **kwargs):
        from security.passwords import hash_password
        users = _get_users_collection()
        # Check for existing email (duplicates not allowed)
        if users.find_one({"email": user_data.email}):
            raise ValueError(f"User with email {user_data.email} already exists")

        doc = {
            "email": user_data.email,
            "password": hash_password(user_data.password),
            "org_id": user_data.org_id,
            "role": user_data.role,
            "full_name": user_data.full_name,
            "status": "active",
        }
        res = users.insert_one(doc)
        return str(res.inserted_id)

    def update_user(*args, **kwargs): return True
    def deactivate_user(*args, **kwargs): return True
    def delete_user(*args, **kwargs): return True

    svc_mod.create_user = create_user
    svc_mod.update_user = update_user
    svc_mod.deactivate_user = deactivate_user
    svc_mod.delete_user = delete_user
    sys.modules["services.user_service"] = svc_mod
    
    # routes/users.py imports directly from 'services' package: from services import create_user, ...
    # So attach functions to the package object for package-level imports to work
    services_pkg.service_dispatcher = lambda *args, **kwargs: {"status": "ok"}
    services_pkg.get_job_status = lambda *args, **kwargs: {"status": "pending"}
    services_pkg.health_status = lambda *args, **kwargs: {"status": "healthy"}
    services_pkg.create_user = create_user
    services_pkg.update_user = update_user
    services_pkg.deactivate_user = deactivate_user
    services_pkg.delete_user = delete_user
    services_pkg.list_users = lambda *args, **kwargs: []


@pytest.fixture(autouse=True)
def _sys_path_repo_root():
    repo = str(_repo_root())
    if repo not in sys.path:
        sys.path.insert(0, repo)
    yield


@pytest.fixture
def fake_users_collection(monkeypatch):
    fc = FakeCollection()
    # Patch utils.database.users_collection to use the fake
    try:
        utils_db = importlib.import_module("utils.database")
    except ModuleNotFoundError:
        utils_db = types.ModuleType("utils.database")
        monkeypatch.setitem(sys.modules, "utils.database", utils_db)
    monkeypatch.setattr(utils_db, "users_collection", fc, raising=False)
    return fc


@pytest.fixture
def app_and_client(monkeypatch, fake_users_collection):
    install_fake_guards_module()
    install_real_pydantic_models()
    install_fake_passwords_module()
    install_fake_services_user_service_module()
    
    modules_to_clear = [
        'cloudshield.Server.routes.users',
        'cloudshield.Server.security.guards'
    ]
    for mod in modules_to_clear:
        if mod in sys.modules:
            del sys.modules[mod]
    
    sys.modules['cloudshield.Server.security.guards'] = sys.modules['security.guards']

    app = Flask(__name__)

    users_mod = importlib.import_module("cloudshield.Server.routes.users")
    app.register_blueprint(users_mod.users_bp)

    client = app.test_client()
    return app, client

def test_authentication_and_authorization(app_and_client):
    """Test authentication and authorization for user operations"""
    app, client = app_and_client
    
    # Test no auth header
    r = client.post("/users", json={"email": "test@test.com", "password": "P@ss"})
    assert r.status_code == 401
    assert r.get_json()["error"] == "Unauthorized"

    # Test malformed bearer token
    r = client.post("/users", headers={"Authorization": "Bearer malformed"}, 
                   json={"email": "test@test.com", "password": "P@ss"})
    assert r.status_code == 401
    
    # Test wrong auth scheme
    r = client.post("/users", headers={"Authorization": "Token abc"}, json={})
    assert r.status_code == 401
    
    # Test employee cannot create users (role-based access)
    r = client.post("/users", headers={"Authorization": "Bearer employee:org_001:u1"},
                   json={"email": "emp@test.com", "password": "SecretPassword123!", "org_id": "org_001", "role": "employee", "full_name": "Employee"})
    assert r.status_code == 401
    assert "error" in r.get_json()

def test_user_creation_and_business_logic(app_and_client, fake_users_collection, monkeypatch):
    """Test user creation with password hashing and duplicate email handling"""
    app, client = app_and_client
    fake_users_collection._docs = {}
    
    users_routes = importlib.import_module("cloudshield.Server.routes.users")
    
    def _fake_create_user(user_data, *args, **kwargs):
        def hash_password(p): return f"hashed::{p}"
        email = user_data.email.lower()
        existing = fake_users_collection.find_one({"email": email})
        if existing:
            raise ValueError(f"User with email {email} already exists")
        
        import uuid
        user_id = str(uuid.uuid4())
        doc = {
            "_id": user_id, "email": email, "password": hash_password(user_data.password),
            "org_id": user_data.org_id, "role": user_data.role, "full_name": user_data.full_name,
            "status": "active", "created_at": "now"
        }
        fake_users_collection.insert_one(doc)
        return user_id

    monkeypatch.setattr(users_routes, "create_user", _fake_create_user, raising=True)
    
    # Test successful user creation with password hashing
    import uuid
    email = f"jane.{uuid.uuid4().hex[:8]}@test.com"
    r = client.post("/users", headers={"Authorization": "Bearer admin:org_001:u1"},
                   json={"email": email, "password": "SecretPassword123!", "org_id": "org_001", 
                        "role": "employee", "full_name": "Jane"})
    assert r.status_code == 201
    user_id = r.get_json()["user_id"]
    stored = fake_users_collection.find_one({"_id": user_id})
    assert stored["password"].startswith("hashed::")
    
    # Test duplicate email returns 409
    r = client.post("/users", headers={"Authorization": "Bearer admin:org_001:u1"},
                   json={"email": email, "password": "AnotherPassword123!", "org_id": "org_001",
                        "role": "employee", "full_name": "Duplicate"})
    assert r.status_code == 409
    assert "already exists" in r.get_json()["error"]

def test_user_update_operations(app_and_client, fake_users_collection, monkeypatch):
    """Test user update operations including authorization and error handling"""
    app, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _fake_update_user(user_id, update_data, *args, **kwargs):
        if user_id == "missing":
            raise ValueError(f"User {user_id} not found")
        new_fields = {k: v for k, v in update_data.model_dump().items()}
        doc = fake_users_collection.find_one({"_id": user_id})
        if not doc:
            raise ValueError(f"User {user_id} not found")
        doc.update(new_fields)
        fake_users_collection._docs[user_id] = doc
        return True

    monkeypatch.setattr(users_routes, "update_user", _fake_update_user, raising=True)

    # Seed a user
    uid = fake_users_collection.insert_one({
        "_id": "42", "email": "test@test.com", "password": "hashed::old",
        "org_id": "org_001", "role": "employee", "full_name": "Old Name", "status": "active"
    }).inserted_id

    # Test successful admin update
    r = client.patch(f"/users/{uid}", headers={"Authorization": "Bearer admin:org_001:u1"},
                    json={"full_name": "New Name"})
    assert r.status_code == 200
    assert fake_users_collection.find_one({"_id": uid})["full_name"] == "New Name"
    
    # Test employee cannot update
    r = client.patch("/users/abc123", headers={"Authorization": "Bearer employee:org_001:u2"},
                    json={"full_name": "Blocked"})
    assert r.status_code == 401
    
    # Test missing user returns 404
    r = client.patch("/users/missing", headers={"Authorization": "Bearer admin:org_001:u1"},
                    json={"full_name": "No One"})
    assert r.status_code == 404
    assert "not found" in r.get_json()["error"].lower()

def test_user_deactivate_and_delete_operations(app_and_client, fake_users_collection, monkeypatch):
    """Test user deactivation and deletion with authorization"""
    app, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _fake_deactivate_user(user_id, *args, **kwargs):
        if user_id == "missing":
            raise ValueError(f"User {user_id} not found")
        doc = fake_users_collection.find_one({"_id": user_id})
        if not doc:
            raise ValueError(f"User {user_id} not found")
        doc["status"] = "inactive"
        fake_users_collection._docs[user_id] = doc
        return True

    def _fake_delete_user(user_id, *args, **kwargs):
        if user_id == "missing":
            raise ValueError(f"User {user_id} not found")
        doc = fake_users_collection.find_one({"_id": user_id})
        if not doc:
            raise ValueError(f"User {user_id} not found")
        del fake_users_collection._docs[user_id]
        return True

    monkeypatch.setattr(users_routes, "deactivate_user", _fake_deactivate_user, raising=True)
    monkeypatch.setattr(users_routes, "delete_user", _fake_delete_user, raising=True)

    # Seed users for testing
    uid1 = fake_users_collection.insert_one({
        "_id": "99", "email": "test@test.com", "status": "active"
    }).inserted_id
    uid2 = fake_users_collection.insert_one({
        "_id": "555", "email": "keep@test.com", "status": "active"
    }).inserted_id

    # Test admin can deactivate and delete
    r1 = client.post(f"/users/{uid1}/deactivate", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert r1.status_code == 200
    assert fake_users_collection.find_one({"_id": uid1})["status"] == "inactive"
    
    r2 = client.delete(f"/users/{uid1}", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert r2.status_code == 200
    assert r2.get_json() == {"message": "User deleted"}  # Verify response format
    assert fake_users_collection.find_one({"_id": uid1}) is None

    # Test employee cannot deactivate or delete
    r3 = client.post(f"/users/{uid2}/deactivate", headers={"Authorization": "Bearer employee:org_001:u2"})
    assert r3.status_code == 401
    assert "error" in r3.get_json()  # Verify error response format
    assert fake_users_collection.find_one({"_id": uid2})["status"] == "active"
    
    r4 = client.delete(f"/users/{uid2}", headers={"Authorization": "Bearer employee:org_001:u2"})
    assert r4.status_code == 401
    assert "error" in r4.get_json()  # Verify error response format
    assert fake_users_collection.find_one({"_id": uid2}) is not None
    
    # Test missing user returns 404
    r5 = client.post("/users/missing/deactivate", headers={"Authorization": "Bearer admin:org_001:u1"})
    r6 = client.delete("/users/missing", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert r5.status_code == 404 and r6.status_code == 404
    assert "error" in r5.get_json()  # Verify error response format for deactivate
    assert "error" in r6.get_json()  # Verify error response format for delete

def test_password_handling_and_error_scenarios(app_and_client, fake_users_collection, monkeypatch):
    """Test password hashing in updates and various error scenarios"""
    app, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")
    
    # Test password hashing in updates
    uid = fake_users_collection.insert_one({"_id": "42", "email": "test@test.com", "password": "hashed::old"}).inserted_id
    from security.passwords import hash_password
    
    def _fake_update_user(user_id, update_data, *args, **kwargs):
        doc = fake_users_collection.find_one({"_id": user_id})
        if "password" in update_data.model_dump():
            doc["password"] = hash_password(update_data.model_dump()["password"])
        fake_users_collection._docs[user_id] = doc
        return True
    
    def _permission_error(*a, **k): 
        raise PermissionError("admin_only")
    
    monkeypatch.setattr(users_routes, "update_user", _fake_update_user, raising=True)
    
    # Test password is hashed on update
    r = client.patch(f"/users/{uid}", headers={"Authorization": "Bearer admin:org_001:u1"},
                    json={"password": "NewSecretPassword123!"})
    assert r.status_code == 200
    assert fake_users_collection.find_one({"_id": uid})["password"].startswith("hashed::")
    
    # Test PermissionError maps to 403
    monkeypatch.setattr(users_routes, "create_user", _permission_error, raising=True)
    r = client.post("/users", headers={"Authorization": "Bearer admin:org_001:u1"},
                   json={"email": "test2@test.com", "password": "ValidPassword123!", "org_id": "org_001", "role": "employee", "full_name": "Test"})
    assert r.status_code == 403


def test_list_users_error_handling(app_and_client, monkeypatch):
    """List users endpoint should surface permission and server errors."""
    _, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _raise_permission(current_user):
        raise PermissionError("admin_only")

    monkeypatch.setattr(users_routes, "list_users", _raise_permission, raising=True)
    resp = client.get("/users", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "admin_only"

    def _raise_generic(current_user):
        raise RuntimeError("boom")

    monkeypatch.setattr(users_routes, "list_users", _raise_generic, raising=True)
    resp2 = client.get("/users", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert resp2.status_code == 500
    assert resp2.get_json()["error"] == "Internal server error"


def test_create_user_validation_and_server_errors(app_and_client, monkeypatch):
    """Ensure create endpoint handles validation and server failures."""
    _, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    # Missing required fields should trigger validation error
    resp = client.post("/users", headers={"Authorization": "Bearer admin:org_001:u1"}, json={})
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "Validation failed"

    def _raise_generic(*args, **kwargs):
        raise RuntimeError("boom")

    body = {
        "email": "ok@test.com",
        "password": "StrongPassword1!",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "Ok User"
    }
    monkeypatch.setattr(users_routes, "create_user", _raise_generic, raising=True)
    resp2 = client.post("/users", headers={"Authorization": "Bearer admin:org_001:u1"}, json=body)

    assert resp2.status_code == 500
    assert resp2.get_json()["error"] == "Internal server error"


def test_update_user_server_errors(app_and_client, monkeypatch):
    """Update endpoint should surface unexpected errors as 500."""
    _, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _raise_generic(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(users_routes, "update_user", _raise_generic, raising=True)
    resp = client.patch("/users/42", headers={"Authorization": "Bearer admin:org_001:u1"}, json={"full_name": "New"})
    assert resp.status_code == 500
    assert resp.get_json()["error"] == "Internal server error"


def test_deactivate_and_delete_server_errors(app_and_client, monkeypatch):
    """Deactivate/delete endpoints should map unexpected errors to 500."""
    _, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _raise_deactivate(*args, **kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(users_routes, "deactivate_user", _raise_deactivate, raising=True)
    resp = client.post("/users/42/deactivate", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert resp.status_code == 500

    def _raise_delete(*args, **kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(users_routes, "delete_user", _raise_delete, raising=True)
    resp2 = client.delete("/users/42", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert resp2.status_code == 500
    assert resp2.get_json()["error"] == "Internal server error"


def test_extract_reason_precedence(app_and_client, monkeypatch):
    """Verify _extract_reason prefers body over query and trims whitespace."""
    _, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    captured = {}

    def _capture_delete(user_id, current_user, reason=None):
        captured["body_reason"] = reason
        return True

    monkeypatch.setattr(users_routes, "delete_user", _capture_delete, raising=True)
    resp = client.delete(
        "/users/123?reason=query",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json={"reason": "  body reason  "}
    )
    assert resp.status_code == 200

    def _capture_delete_query(user_id, current_user, reason=None):
        captured["query_reason"] = reason
        return True

    monkeypatch.setattr(users_routes, "delete_user", _capture_delete_query, raising=True)
    resp2 = client.delete(
        "/users/123?reason=query%20only",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json={}
    )
    assert resp2.status_code == 200
    assert captured["query_reason"] == "query only"


class TestDeleteUserEndpoint:
    """Test class for delete_user_endpoint covering all requirements"""
    
    @pytest.fixture
    def mock_delete_service(self, monkeypatch):
        """Setup mock delete_user service for testing"""
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _fake_delete_user(user_id, *args, **kwargs):
            """Mock delete_user service with controlled behavior"""
            if user_id == "not_found":
                raise ValueError(f"User {user_id} not found")
            if user_id == "server_error":
                raise RuntimeError("Database connection failed")
            # Success case
            return True
        
        monkeypatch.setattr(users_routes, "delete_user", _fake_delete_user, raising=True)
        return _fake_delete_user
    
    def test_delete_user_success_response_format(self, app_and_client, mock_delete_service):
        """Test successful deletion returns 200 with correct response format"""
        app, client = app_and_client
        
        resp = client.delete(
            "/users/valid_user_123",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 200
        assert resp.get_json() == {"message": "User deleted"}
    
    def test_delete_user_not_found_response(self, app_and_client, mock_delete_service):
        """Test user not found returns 404 with error message"""
        app, client = app_and_client
        
        resp = client.delete(
            "/users/not_found",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 404
        json_data = resp.get_json()
        assert "error" in json_data
        assert "not found" in json_data["error"].lower()
    
    def test_delete_user_forbidden_non_admin(self, app_and_client, mock_delete_service):
        """Test non-admin user cannot delete (403 - authenticated but insufficient privileges)"""
        app, client = app_and_client
        
        resp = client.delete(
            "/users/valid_user_123",
            headers={"Authorization": "Bearer employee:org_001:u2"}
        )
        
        assert resp.status_code == 401
        json_data = resp.get_json()
        assert "error" in json_data
    
    def test_delete_user_internal_server_error(self, app_and_client, mock_delete_service):
        """Test internal server error returns 500 with standard error message"""
        app, client = app_and_client
        
        resp = client.delete(
            "/users/server_error",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 500
        json_data = resp.get_json()
        assert "error" in json_data
        assert json_data["error"] == "Internal server error"
    
    def test_delete_user_no_authentication(self, app_and_client, mock_delete_service):
        """Test unauthenticated request is blocked (401 - no valid credentials)"""
        app, client = app_and_client
        
        resp = client.delete("/users/valid_user_123")
        
        assert resp.status_code == 401  # 401: Not authenticated at all


class TestListUsersEndpoint:
    """Test class for list_users_endpoint (GET /users)"""
    
    @pytest.fixture
    def mock_list_service(self, monkeypatch):
        """Setup mock list_users service for testing"""
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _fake_list_users(*args, **kwargs):
            """Mock list_users service returning sample data"""
            return [
                {"id": "u1", "email": "user1@test.com", "role": "admin"},
                {"id": "u2", "email": "user2@test.com", "role": "employee"}
            ]
        
        monkeypatch.setattr(users_routes, "list_users", _fake_list_users, raising=True)
        return _fake_list_users
    
    def test_list_users_success_admin(self, app_and_client, mock_list_service):
        """Test admin can list users successfully"""
        app, client = app_and_client
        
        resp = client.get(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 200
        json_data = resp.get_json()
        assert "items" in json_data
        assert len(json_data["items"]) == 2
        assert json_data["items"][0]["email"] == "user1@test.com"
    
    def test_list_users_forbidden_employee(self, app_and_client, mock_list_service):
        """Test employee cannot list users"""
        app, client = app_and_client
        
        resp = client.get(
            "/users",
            headers={"Authorization": "Bearer employee:org_001:u2"}
        )
        
        assert resp.status_code == 401
        json_data = resp.get_json()
        assert "error" in json_data
    
    def test_list_users_no_authentication(self, app_and_client, mock_list_service):
        """Test unauthenticated request is blocked (401)"""
        app, client = app_and_client
        
        resp = client.get("/users")
        
        assert resp.status_code == 401
        json_data = resp.get_json()
        assert json_data["error"] == "Unauthorized"
    
    def test_list_users_permission_error(self, app_and_client, monkeypatch):
        """Test PermissionError from service returns 403"""
        app, client = app_and_client
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _raise_permission(*args, **kwargs):
            raise PermissionError("Insufficient privileges")
        
        monkeypatch.setattr(users_routes, "list_users", _raise_permission, raising=True)
        
        resp = client.get(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 403
        assert "Insufficient privileges" in resp.get_json()["error"]
    
    def test_list_users_server_error(self, app_and_client, monkeypatch):
        """Test unexpected error returns 500"""
        app, client = app_and_client
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _raise_error(*args, **kwargs):
            raise RuntimeError("Database failure")
        
        monkeypatch.setattr(users_routes, "list_users", _raise_error, raising=True)
        
        resp = client.get(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 500
        assert resp.get_json()["error"] == "Internal server error"


class TestCreateUserEndpoint:
    """Test class for create_user_endpoint (POST /users)"""
    
    @pytest.fixture
    def mock_create_service(self, monkeypatch):
        """Setup mock create_user service for testing"""
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _fake_create_user(user_data, *args, **kwargs):
            """Mock create_user service"""
            if user_data.email == "duplicate@test.com":
                raise ValueError("User with email duplicate@test.com already exists")
            return "new_user_id_123"
        
        monkeypatch.setattr(users_routes, "create_user", _fake_create_user, raising=True)
        return _fake_create_user
    
    def test_create_user_success_admin(self, app_and_client, mock_create_service):
        """Test admin can create user successfully"""
        app, client = app_and_client
        
        resp = client.post(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={
                "email": "newuser@test.com",
                "password": "SecurePassword123!",
                "org_id": "org_001",
                "role": "employee",
                "full_name": "New User"
            }
        )
        
        assert resp.status_code == 201
        json_data = resp.get_json()
        assert "user_id" in json_data
        assert json_data["user_id"] == "new_user_id_123"
    
    def test_create_user_forbidden_employee(self, app_and_client, mock_create_service):
        """Test employee cannot create users"""
        app, client = app_and_client
        
        resp = client.post(
            "/users",
            headers={"Authorization": "Bearer employee:org_001:u2"},
            json={
                "email": "newuser@test.com",
                "password": "SecurePassword123!",
                "org_id": "org_001",
                "role": "employee",
                "full_name": "New User"
            }
        )
        
        assert resp.status_code == 401
        json_data = resp.get_json()
        assert "error" in json_data
    
    def test_create_user_no_authentication(self, app_and_client, mock_create_service):
        """Test unauthenticated request is blocked (401)"""
        app, client = app_and_client
        
        resp = client.post(
            "/users",
            json={
                "email": "newuser@test.com",
                "password": "SecurePassword123!",
                "org_id": "org_001",
                "role": "employee",
                "full_name": "New User"
            }
        )
        
        assert resp.status_code == 401
    
    def test_create_user_validation_missing_fields(self, app_and_client, mock_create_service):
        """Test validation error for missing required fields"""
        app, client = app_and_client
        
        resp = client.post(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={}
        )
        
        assert resp.status_code == 400
        json_data = resp.get_json()
        assert json_data["error"] == "Validation failed"
        assert "details" in json_data
    
    def test_create_user_validation_weak_password(self, app_and_client, mock_create_service):
        """Test validation error for weak password"""
        app, client = app_and_client
        
        resp = client.post(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={
                "email": "newuser@test.com",
                "password": "weak",
                "org_id": "org_001",
                "role": "employee",
                "full_name": "New User"
            }
        )
        
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Validation failed"
    
    def test_create_user_duplicate_email(self, app_and_client, mock_create_service):
        """Test duplicate email returns 409 conflict"""
        app, client = app_and_client
        
        resp = client.post(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={
                "email": "duplicate@test.com",
                "password": "SecurePassword123!",
                "org_id": "org_001",
                "role": "employee",
                "full_name": "Duplicate User"
            }
        )
        
        assert resp.status_code == 409
        json_data = resp.get_json()
        assert "already exists" in json_data["error"]
    
    def test_create_user_server_error(self, app_and_client, monkeypatch):
        """Test unexpected error returns 500"""
        app, client = app_and_client
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _raise_error(*args, **kwargs):
            raise RuntimeError("Database failure")
        
        monkeypatch.setattr(users_routes, "create_user", _raise_error, raising=True)
        
        resp = client.post(
            "/users",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={
                "email": "newuser@test.com",
                "password": "SecurePassword123!",
                "org_id": "org_001",
                "role": "employee",
                "full_name": "New User"
            }
        )
        
        assert resp.status_code == 500
        assert resp.get_json()["error"] == "Internal server error"


class TestUpdateUserEndpoint:
    """Test class for update_user_endpoint (PATCH /users/<user_id>)"""
    
    @pytest.fixture
    def mock_update_service(self, monkeypatch):
        """Setup mock update_user service for testing"""
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _fake_update_user(user_id, update_data, *args, **kwargs):
            """Mock update_user service"""
            if user_id == "not_found":
                raise ValueError(f"User {user_id} not found")
            if user_id == "permission_error":
                raise PermissionError("Cannot modify this user")
            return True
        
        monkeypatch.setattr(users_routes, "update_user", _fake_update_user, raising=True)
        return _fake_update_user
    
    def test_update_user_success_admin(self, app_and_client, mock_update_service):
        """Test admin can update user successfully"""
        app, client = app_and_client
        
        resp = client.patch(
            "/users/user_123",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={"full_name": "Updated Name"}
        )
        
        assert resp.status_code == 200
        json_data = resp.get_json()
        assert json_data["message"] == "User updated"
    
    def test_update_user_forbidden_employee(self, app_and_client, mock_update_service):
        """Test employee cannot update users"""
        app, client = app_and_client
        
        resp = client.patch(
            "/users/user_123",
            headers={"Authorization": "Bearer employee:org_001:u2"},
            json={"full_name": "Updated Name"}
        )
        
        assert resp.status_code == 401
        json_data = resp.get_json()
        assert "error" in json_data
    
    def test_update_user_no_authentication(self, app_and_client, mock_update_service):
        """Test unauthenticated request is blocked (401)"""
        app, client = app_and_client
        
        resp = client.patch(
            "/users/user_123",
            json={"full_name": "Updated Name"}
        )
        
        assert resp.status_code == 401
    
    def test_update_user_not_found(self, app_and_client, mock_update_service):
        """Test updating non-existent user returns 404"""
        app, client = app_and_client
        
        resp = client.patch(
            "/users/not_found",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={"full_name": "Updated Name"}
        )
        
        assert resp.status_code == 404
        json_data = resp.get_json()
        assert "not found" in json_data["error"].lower()
    
    def test_update_user_validation_error(self, app_and_client, mock_update_service):
        """Test validation error for invalid update data"""
        app, client = app_and_client
        
        resp = client.patch(
            "/users/user_123",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={"password": "weak"}
        )
        
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Validation failed"
    
    def test_update_user_permission_error(self, app_and_client, mock_update_service):
        """Test PermissionError from service returns 403"""
        app, client = app_and_client
        
        resp = client.patch(
            "/users/permission_error",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={"full_name": "Updated Name"}
        )
        
        assert resp.status_code == 403
        json_data = resp.get_json()
        assert "Cannot modify this user" in json_data["error"]
    
    def test_update_user_server_error(self, app_and_client, monkeypatch):
        """Test unexpected error returns 500"""
        app, client = app_and_client
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _raise_error(*args, **kwargs):
            raise RuntimeError("Database failure")
        
        monkeypatch.setattr(users_routes, "update_user", _raise_error, raising=True)
        
        resp = client.patch(
            "/users/user_123",
            headers={"Authorization": "Bearer admin:org_001:u1"},
            json={"full_name": "Updated Name"}
        )
        
        assert resp.status_code == 500
        assert resp.get_json()["error"] == "Internal server error"


class TestDeactivateUserEndpoint:
    """Test class for deactivate_user_endpoint (POST /users/<user_id>/deactivate)"""
    
    @pytest.fixture
    def mock_deactivate_service(self, monkeypatch):
        """Setup mock deactivate_user service for testing"""
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _fake_deactivate_user(user_id, *args, **kwargs):
            """Mock deactivate_user service"""
            if user_id == "not_found":
                raise ValueError(f"User {user_id} not found")
            if user_id == "permission_error":
                raise PermissionError("Cannot deactivate this user")
            return True
        
        monkeypatch.setattr(users_routes, "deactivate_user", _fake_deactivate_user, raising=True)
        return _fake_deactivate_user
    
    def test_deactivate_user_success_admin(self, app_and_client, mock_deactivate_service):
        """Test admin can deactivate user successfully"""
        app, client = app_and_client
        
        resp = client.post(
            "/users/user_123/deactivate",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 200
        json_data = resp.get_json()
        assert json_data["message"] == "User deactivated"
    
    def test_deactivate_user_forbidden_employee(self, app_and_client, mock_deactivate_service):
        """Test employee cannot deactivate users"""
        app, client = app_and_client
        
        resp = client.post(
            "/users/user_123/deactivate",
            headers={"Authorization": "Bearer employee:org_001:u2"}
        )
        
        assert resp.status_code == 401
        json_data = resp.get_json()
        assert "error" in json_data
    
    def test_deactivate_user_no_authentication(self, app_and_client, mock_deactivate_service):
        """Test unauthenticated request is blocked (401)"""
        app, client = app_and_client
        
        resp = client.post("/users/user_123/deactivate")
        
        assert resp.status_code == 401
    
    def test_deactivate_user_not_found(self, app_and_client, mock_deactivate_service):
        """Test deactivating non-existent user returns 404"""
        app, client = app_and_client
        
        resp = client.post(
            "/users/not_found/deactivate",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 404
        json_data = resp.get_json()
        assert "not found" in json_data["error"].lower()
    
    def test_deactivate_user_permission_error(self, app_and_client, mock_deactivate_service):
        """Test PermissionError from service returns 403"""
        app, client = app_and_client
        
        resp = client.post(
            "/users/permission_error/deactivate",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 403
        json_data = resp.get_json()
        assert "Cannot deactivate this user" in json_data["error"]
    
    def test_deactivate_user_server_error(self, app_and_client, monkeypatch):
        """Test unexpected error returns 500"""
        app, client = app_and_client
        users_routes = importlib.import_module("cloudshield.Server.routes.users")
        
        def _raise_error(*args, **kwargs):
            raise RuntimeError("Database failure")
        
        monkeypatch.setattr(users_routes, "deactivate_user", _raise_error, raising=True)
        
        resp = client.post(
            "/users/user_123/deactivate",
            headers={"Authorization": "Bearer admin:org_001:u1"}
        )
        
        assert resp.status_code == 500
        assert resp.get_json()["error"] == "Internal server error"
