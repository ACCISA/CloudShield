import unittest.mock

mock_mongo_client = unittest.mock.MagicMock()
mock_mongo_client.return_value.admin.command.return_value = None

mock_errors = unittest.mock.MagicMock()
mock_errors.PyMongoError = Exception
mock_errors.DuplicateKeyError = Exception
mock_errors.OperationFailure = Exception

mock_pymongo = unittest.mock.MagicMock()
mock_pymongo.MongoClient = mock_mongo_client
mock_pymongo.errors = mock_errors

import sys

import importlib
import types
import pathlib
from flask import Flask, jsonify, g, request
import pytest


def _repo_root():
    return pathlib.Path(__file__).parents[3]


# Minimal fake guards so decorators work without real JWT
def install_fake_guards_module():
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
            g.user = {"role": role, "org_id": org_id, "id": user_id}
            return fn(*args, **kwargs)
        return wrapper

    def require_role(*roles):
        from functools import wraps
        def deco(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if g.get("user") is None or g.user.get("role") not in roles:
                    return jsonify({"error": "Forbidden"}), 403
                return fn(*args, **kwargs)
            return wrapper
        return deco

    mod.require_auth = require_auth
    mod.require_role = require_role
    sys.modules["security.guards"] = mod

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


def install_fake_models_user_module():
    models_pkg = sys.modules.get("models") or types.ModuleType("models")
    sys.modules["models"] = models_pkg

    user_mod = types.ModuleType("models.user")

    class _Base:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self, **kwargs):
            # Simulate pydantic .dict(exclude_unset=True)
            return {k: v for k, v in self.__dict__.items()}

    class UserCreate(_Base): ...
    class UserUpdate(_Base): ...

    user_mod.UserCreate = UserCreate
    user_mod.UserUpdate = UserUpdate
    sys.modules["models.user"] = user_mod


def install_fake_passwords_module():
    mod = types.ModuleType("security.passwords")
    def hash_password(p): return f"hashed::{p}"
    mod.hash_password = hash_password
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


@pytest.fixture(autouse=True)
def setup_pymongo_mocks(monkeypatch):
    """Set up pymongo mocks with proper cleanup"""
    monkeypatch.setitem(sys.modules, 'pymongo', mock_pymongo)
    monkeypatch.setitem(sys.modules, 'pymongo.errors', mock_errors)


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
    install_fake_models_user_module()
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
    assert r.status_code == 403
    assert r.get_json()["error"] == "Forbidden"

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
        new_fields = {k: v for k, v in update_data.dict().items()}
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
    assert r.status_code == 403
    
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
    assert fake_users_collection.find_one({"_id": uid1}) is None

    # Test employee cannot deactivate or delete
    r3 = client.post(f"/users/{uid2}/deactivate", headers={"Authorization": "Bearer employee:org_001:u2"})
    assert r3.status_code == 403
    assert fake_users_collection.find_one({"_id": uid2})["status"] == "active"
    
    r4 = client.delete(f"/users/{uid2}", headers={"Authorization": "Bearer employee:org_001:u2"})
    assert r4.status_code == 403
    assert fake_users_collection.find_one({"_id": uid2}) is not None
    
    # Test missing user returns 404
    r5 = client.post("/users/missing/deactivate", headers={"Authorization": "Bearer admin:org_001:u1"})
    r6 = client.delete("/users/missing", headers={"Authorization": "Bearer admin:org_001:u1"})
    assert r5.status_code == 404 and r6.status_code == 404

def test_password_handling_and_error_scenarios(app_and_client, fake_users_collection, monkeypatch):
    """Test password hashing in updates and various error scenarios"""
    app, client = app_and_client
    users_routes = importlib.import_module("cloudshield.Server.routes.users")
    
    # Test password hashing in updates
    uid = fake_users_collection.insert_one({"_id": "42", "email": "test@test.com", "password": "hashed::old"}).inserted_id
    from security.passwords import hash_password
    
    def _fake_update_user(user_id, update_data, *args, **kwargs):
        doc = fake_users_collection.find_one({"_id": user_id})
        if "password" in update_data.dict():
            doc["password"] = hash_password(update_data.dict()["password"])
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
    assert "admin_only" in r.get_json()["error"]
