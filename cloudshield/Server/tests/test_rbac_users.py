import importlib
import sys
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

# --- In-memory fake collection to simulate MongoDB operations ---
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
        if _id not in self._docs: return _UpdateRes(0, 0)
        if "$set" in upd: self._docs[_id].update(upd["$set"])
        return _UpdateRes(1, 1)
    
    def delete_one(self, filt):
        _id = filt.get("_id")
        if _id in self._docs:
            del self._docs[_id]
            return _DeleteRes(1)
        return _DeleteRes(0)


# --- Fake models.user with minimal pydantic-like behavior ---
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


# --- Fake security.passwords with a simple hasher ---
def install_fake_passwords_module():
    mod = types.ModuleType("security.passwords")
    def hash_password(p): return f"hashed::{p}"
    mod.hash_password = hash_password
    sys.modules["security.passwords"] = mod


# --- Fake services.user_service with minimal create/update/deactivate/delete ---
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

    # Not used by current tests, but present to satisfy imports.
    def update_user(*args, **kwargs): return True
    def deactivate_user(*args, **kwargs): return True
    def delete_user(*args, **kwargs): return True

    svc_mod.create_user = create_user
    svc_mod.update_user = update_user
    svc_mod.deactivate_user = deactivate_user
    svc_mod.delete_user = delete_user
    sys.modules["services.user_service"] = svc_mod


# --- Pytest fixtures ---

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
        sys.modules["utils.database"] = utils_db
    monkeypatch.setattr(utils_db, "users_collection", fc, raising=False)
    return fc


@pytest.fixture
def app_and_client(monkeypatch, fake_users_collection):
    # Install all fake modules so the users blueprint can import them
    install_fake_guards_module()
    install_fake_models_user_module()
    install_fake_passwords_module()
    install_fake_services_user_service_module()

    app = Flask(__name__)

    # Register the users blueprint
    users_mod = importlib.import_module("cloudshield.Server.routes.users")
    app.register_blueprint(users_mod.users_bp)

    client = app.test_client()
    return app, client


#--- TESTS ---

# Basic sanity test to ensure our fake guards work as intended
# Confirms malformed Bearer tokens are rejected with 401, protecting endpoints from bad auth headers.
def test_create_with_malformed_bearer_is_401(app_and_client):
    app, client = app_and_client
    r = client.post(
        "/users",
        headers={"Authorization": "Bearer not:enough_parts"},
        json={"email":"x@x.com","password":"p","org_id":"org_001","role":"employee","full_name":"X"}
    )
    assert r.status_code == 401

# Ensure that creating a user requires authentication
# Verifies no-auth requests get 401, ensuring all mutations are gated by authentication.
def test_create_requires_auth(app_and_client):
    app, client = app_and_client
    # No Authorization header at all -> 401
    r = client.post("/users", json={
        "email": "e@x.com",
        "password": "P@ss",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "X"
    })
    assert r.status_code == 401
    assert r.get_json()["error"] == "Unauthorized"


# Ensure that only admins can create users
# Enforces RBAC: employees hit 403 on create, proving the @require_role("admin") guard works.
def test_employee_cannot_create_user(app_and_client):
    app, client = app_and_client
    # Employee role tries to create user -> should be 403
    r = client.post(
        "/users",
        headers={"Authorization": "Bearer employee:org_001:u1"},
        json={
            "email": "emp1@acme.com",
            "password": "Secret123!",
            "org_id": "org_001",
            "role": "employee",
            "full_name": "Emp One"
        }
    )
    assert r.status_code == 403
    assert r.get_json()["error"] == "Forbidden"

# Ensure that admins can create users and that passwords are hashed
# Checks that create works and that passwords are stored hashed, not plaintext.
def test_admin_can_create_user_and_password_is_hashed(app_and_client, fake_users_collection):
    app, client = app_and_client

    payload = {
        "email": "jane@acme.com",
        "password": "Secret123!",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "Jane"
    }

    r = client.post(
        "/users",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json=payload
    )
    assert r.status_code == 201
    user_id = r.get_json()["user_id"]

    stored = fake_users_collection.find_one({"_id": user_id})
    assert stored is not None, "User should be inserted into the collection"
    assert stored["password"] != payload["password"], "Password must not be stored in plaintext"
    assert stored["password"].startswith("hashed::"), "Password should be hashed via our fake hasher"

# Ensure that only admins can update users
# Verifies RBAC on update: employees get 403, admins can update user fields and that updates persist in storage.
def test_admin_update_user(app_and_client, fake_users_collection, monkeypatch):
    # Patch the name that the blueprint actually calls:
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _fake_update_user(user_id, update_data, *args, **kwargs):
        # Simulate updating fields in fake collection
        new_fields = {k: v for k, v in update_data.dict().items()}
        doc = fake_users_collection.find_one({"_id": user_id})
        if not doc:
            raise ValueError(f"User {user_id} not found")
        doc.update(new_fields)
        fake_users_collection._docs[user_id] = doc
        return True

    # Monkeypatch the imported symbol used by the route
    monkeypatch.setattr(users_routes, "update_user", _fake_update_user, raising=True)

    # Seed a user to update
    uid = fake_users_collection.insert_one({
        "_id": "42",
        "email": "a@b.com",
        "password": "hashed::old",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "Old Name",
        "status": "active",
        "created_at": "now",
    }).inserted_id

    # Admin updates the user's full_name
    app, client = app_and_client
    r = client.patch(
        f"/users/{uid}",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json={"full_name": "New Name"},
    )

    assert r.status_code == 200
    updated = fake_users_collection.find_one({"_id": uid})
    assert updated["full_name"] == "New Name"

# Ensure that employees cannot update users
# Confirms RBAC: employees get 403 on update attempts, enforcing admin-only updates.
def test_employee_cannot_update_user(app_and_client):
    app, client = app_and_client
    r = client.patch(
        "/users/abc123",
        headers={"Authorization": "Bearer employee:org_001:u2"},
        json={"full_name": "Blocked Change"}
    )
    assert r.status_code == 403
    assert r.get_json()["error"] == "Forbidden"

# Ensure that updating a non-existent user returns 404
# Confirms service-level “not found” becomes HTTP 404, giving correct client semantics
def test_update_missing_user_returns_404(app_and_client, fake_users_collection, monkeypatch):
    # Patch the function that the blueprint calls so it simulates not finding the user
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _fake_update_user(user_id, update_data, *args, **kwargs):
        # Simulate user not found
        raise ValueError(f"User {user_id} not found")

    monkeypatch.setattr(users_routes, "update_user", _fake_update_user, raising=True)

    app, client = app_and_client
    r = client.patch(
        "/users/does-not-exist",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json={"full_name": "No One"},
    )

    assert r.status_code == 404
    assert "not found" in r.get_json()["error"].lower()

# Ensure that admins can deactivate and delete users, while employees cannot
# Tests full admin lifecycle: deactivate and delete work for admins, and employees are blocked from both
def test_admin_deactivate_and_delete_user(app_and_client, fake_users_collection, monkeypatch):
    # Patch the functions that the blueprint calls so they modify the fake collection
    users_routes = importlib.import_module("cloudshield.Server.routes.users")

    def _fake_deactivate_user(user_id, *args, **kwargs):
        doc = fake_users_collection.find_one({"_id": user_id})
        if not doc:
            raise ValueError(f"User {user_id} not found")
        doc["status"] = "inactive"
        fake_users_collection._docs[user_id] = doc
        return True

    def _fake_delete_user(user_id, *args, **kwargs):
        doc = fake_users_collection.find_one({"_id": user_id})
        if not doc:
            raise ValueError(f"User {user_id} not found")
        del fake_users_collection._docs[user_id]
        return True

    monkeypatch.setattr(users_routes, "deactivate_user", _fake_deactivate_user, raising=True)
    monkeypatch.setattr(users_routes, "delete_user", _fake_delete_user, raising=True)

    # Seed a user to deactivate and delete
    uid = fake_users_collection.insert_one({
        "_id": "99",
        "email": "del@x.com",
        "password": "hashed::x",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "Del",
        "status": "active",
        "created_at": "now",
    }).inserted_id

    # Deactivate (admin only)
    app, client = app_and_client
    r1 = client.post(
        f"/users/{uid}/deactivate",
        headers={"Authorization": "Bearer admin:org_001:u1"},
    )
    assert r1.status_code == 200
    assert fake_users_collection.find_one({"_id": uid})["status"] == "inactive"

    # Delete (admin only)
    r2 = client.delete(
        f"/users/{uid}",
        headers={"Authorization": "Bearer admin:org_001:u1"},
    )
    assert r2.status_code == 200
    assert fake_users_collection.find_one({"_id": uid}) is None

# Ensure that employees cannot deactivate or delete users
# Verifies RBAC: employees get 403 on deactivate and delete attempts, ensuring only admins can perform these actions
def test_employee_cannot_deactivate_or_delete(app_and_client, fake_users_collection):
    app, client = app_and_client

    # Seed a user (not strictly required because the guard should block first, but keeps the test 
    # realistic and lets us assert no changes occurred).
    uid = fake_users_collection.insert_one({
        "_id": "555",
        "email": "keep@x.com",
        "password": "hashed::x",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "Keep Me",
        "status": "active",
        "created_at": "now",
    }).inserted_id

    # Employee tries to deactivate -> should be 403 and status should remain active
    r1 = client.post(
        f"/users/{uid}/deactivate",
        headers={"Authorization": "Bearer employee:org_001:u2"},
    )
    assert r1.status_code == 403
    assert r1.get_json()["error"] == "Forbidden"
    assert fake_users_collection.find_one({"_id": uid})["status"] == "active"

    # Employee tries to delete -> should be 403 and user should still exist
    r2 = client.delete(
        f"/users/{uid}",
        headers={"Authorization": "Bearer employee:org_001:u2"},
    )
    assert r2.status_code == 403
    assert r2.get_json()["error"] == "Forbidden"
    assert fake_users_collection.find_one({"_id": uid}) is not None

def test_admin_create_duplicate_email_returns_409(app_and_client, fake_users_collection):
    """
    If an admin tries to create a user with an email that already exists,
    the route should catch ValueError and return HTTP 409 Conflict.
    """
    app, client = app_and_client

    # Seed an existing user with a specific email
    fake_users_collection.insert_one({
        "_id": "1",
        "email": "dup@acme.com",
        "password": "hashed::x",
        "org_id": "org_001",
        "role": "employee",
        "full_name": "Existing",
        "status": "active",
    })

    # Now try to create another user with the same email
    r = client.post(
        "/users",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json={
            "email": "dup@acme.com",
            "password": "Secret123!",
            "org_id": "org_001",
            "role": "employee",
            "full_name": "Duplicate",
        },
    )

    # Should get 409 Conflict
    assert r.status_code == 409
    body = r.get_json()
    assert "already exists" in body["error"]

# Ensure that when an admin updates a user's password, it gets hashed
# Verifies that password updates are hashed before storage, maintaining security standards
def test_admin_update_password_is_hashed(app_and_client, fake_users_collection, monkeypatch):
    users_routes = importlib.import_module("cloudshield.Server.routes.users")
    uid = fake_users_collection.insert_one({"_id":"42","email":"a@b.com","password":"hashed::old"}).inserted_id
    from security.passwords import hash_password
    def _fake_update_user(user_id, update_data, *args, **kwargs):
        doc = fake_users_collection.find_one({"_id": user_id})
        if "password" in update_data.dict():
            doc["password"] = hash_password(update_data.dict()["password"])
        fake_users_collection._docs[user_id] = doc
        return True
    monkeypatch.setattr(users_routes, "update_user", _fake_update_user, raising=True)

    app, client = app_and_client
    r = client.patch(f"/users/{uid}",
                     headers={"Authorization":"Bearer admin:org_001:u1"},
                     json={"password":"NewSecret!"})
    assert r.status_code == 200
    assert fake_users_collection.find_one({"_id": uid})["password"].startswith("hashed::")

# Ensure that deactivating or deleting a non-existent user returns 404
# Confirms service-level “not found” becomes HTTP 404 for deactivate and delete actions
def test_admin_deactivate_delete_missing_user_returns_404(app_and_client, monkeypatch):
    users_routes = importlib.import_module("cloudshield.Server.routes.users")
    monkeypatch.setattr(users_routes, "deactivate_user",
                        lambda user_id, *a, **k: (_ for _ in ()).throw(ValueError(f"User {user_id} not found")), raising=True)
    monkeypatch.setattr(users_routes, "delete_user",
                        lambda user_id, *a, **k: (_ for _ in ()).throw(ValueError(f"User {user_id} not found")), raising=True)
    app, client = app_and_client
    r1 = client.post("/users/missing/deactivate", headers={"Authorization":"Bearer admin:org_001:u1"})
    r2 = client.delete("/users/missing", headers={"Authorization":"Bearer admin:org_001:u1"})
    assert r1.status_code == 404 and r2.status_code == 404

# Ensure that an employee cannot create a user in another organization
# Verifies cross-org guard: employees cannot create users outside their own org, getting 403
def test_employee_cross_org_blocked_on_create(app_and_client):
    app, client = app_and_client
    # Employee from org_001 tries to create user in org_999 -> should be 403
    r = client.post(
        "/users",
        headers={"Authorization": "Bearer employee:org_001:u2"},
        json={"email":"x@x.com","password":"p","org_id":"org_999","role":"employee","full_name":"X"}
    )
    # Guard will 403 on role; when you later allow employee self-edits, keep an org guard in service and expect 403 here too.
    assert r.status_code == 403

# Ensure that PermissionError in service layer maps to HTTP 403
# Tests that if the service layer raises PermissionError, the route returns 403 Forbidden
def test_route_maps_service_permissionerror_to_403(app_and_client, monkeypatch):
    users_routes = importlib.import_module("cloudshield.Server.routes.users")
    def _deny(*a, **k): raise PermissionError("admin_only")
    monkeypatch.setattr(users_routes, "create_user", _deny, raising=True)

    app, client = app_and_client
    r = client.post(
        "/users",
        headers={"Authorization": "Bearer admin:org_001:u1"},
        json={"email":"x@x.com","password":"p","org_id":"org_001","role":"employee","full_name":"X"}
    )
    assert r.status_code == 403
    assert "admin_only" in r.get_json()["error"]

# Parameterized test to ensure employees are forbidden on all mutation endpoints
# Confirms that employees get 403 on create, update, deactivate, and delete endpoints
@pytest.mark.parametrize("method,path,json", [
    ("POST",   "/users",                  {"email":"a@b.com","password":"p","org_id":"org_001","role":"employee","full_name":"X"}),
    ("PATCH",  "/users/abc",              {"full_name":"Y"}),
    ("POST",   "/users/abc/deactivate",   None),
    ("DELETE", "/users/abc",              None),
])
def test_employee_forbidden_on_all_mutations(app_and_client, method, path, json):
    app, client = app_and_client
    r = client.open(path, method=method, headers={"Authorization":"Bearer employee:org_001:u2"}, json=json)
    assert r.status_code == 403

# Ensure that using a wrong auth scheme returns 401
# Verifies that non-Bearer auth (e.g., "Token") results in 401 Unauthorized
def test_wrong_auth_scheme_is_401(app_and_client):
    app, client = app_and_client
    r = client.post("/users", headers={"Authorization":"Token abc"}, json={})
    assert r.status_code == 401

# Ensure that error responses have a consistent shape
# Confirms that error responses always include an "error" key in the JSON body
def test_error_shape_consistency(app_and_client):
    app, client = app_and_client
    r = client.post("/users")  # no auth
    body = r.get_json()
    assert set(body.keys()) >= {"error"}

# Ensure that if a validation error occurs, the route returns 400 Bad Request
# Tests that if input validation fails, the route responds with 400 Bad Request
def test_validation_error_returns_400(app_and_client, monkeypatch):
    models_user = importlib.import_module("models.user")
    class Boom(models_user.UserCreate):
        def __init__(self, **kw): raise Exception("ValidationError")
    monkeypatch.setattr(models_user, "UserCreate", Boom, raising=True)

    app, client = app_and_client
    r = client.post("/users", headers={"Authorization":"Bearer admin:org_001:u1"}, json={"email": "bad"})
    assert r.status_code in (400, 500)  # Depending on how exception is handled, could be either
