from bson import ObjectId
from datetime import datetime
from utils.database import users_admin, users_public
from utils.audit import log_audit
from models.user import UserCreate, UserUpdate
from security.passwords import hash_password

def _must_admin(current_user):
    if not current_user or current_user.get("role") != "admin":
        raise PermissionError("admin_only")

def create_user(user_data: UserCreate, current_user: dict, reason: str | None = None):
    _must_admin(current_user)

    if users_admin.find_one({"email": user_data.email}):
        raise ValueError(f"User with email {user_data.email} already exists")

    user_doc = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "org_id": user_data.org_id,
        "role": user_data.role,
        "full_name": user_data.full_name,
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    res = users_admin.insert_one(user_doc)

    log_audit(
        action="create",
        actor={"id": current_user["id"], "role": current_user["role"], "org_id": current_user["org_id"]},
        resource="users",
        target={"id": str(res.inserted_id), "email": user_data.email},
        reason=reason,
        before=None,
        after={"role": user_data.role, "status": "active", "org_id": user_data.org_id}
    )
    return str(res.inserted_id)

def update_user(user_id: str, update_data: UserUpdate, current_user: dict, reason: str | None = None):
    _must_admin(current_user)

    before = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    updates = {k: v for k, v in update_data.dict(exclude_unset=True).items()}
    if not updates:
        raise ValueError("No fields to update")
    if "password" in updates:
        updates["password"] = hash_password(updates["password"])
    updates["updated_at"] = datetime.utcnow()

    users_admin.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    after = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})

    log_audit(
        action="update",
        actor={"id": current_user["id"], "role": current_user["role"], "org_id": current_user["org_id"]},
        resource="users",
        target={"id": str(before["_id"]), "email": before["email"]},
        reason=reason,
        before={k: before.get(k) for k in ["role","status","org_id","full_name","email"]},
        after={k: after.get(k) for k in ["role","status","org_id","full_name","email"]}
    )
    return True

def deactivate_user(user_id: str, current_user: dict, reason: str | None = None):
    _must_admin(current_user)
    before = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    users_admin.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}})
    after = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})

    log_audit(
        action="deactivate",
        actor={"id": current_user["id"], "role": current_user["role"], "org_id": current_user["org_id"]},
        resource="users",
        target={"id": str(before["_id"]), "email": before["email"]},
        reason=reason,
        before={"status": before.get("status")},
        after={"status": after.get("status")}
    )
    return True

def delete_user(user_id: str, current_user: dict, reason: str | None = None):
    _must_admin(current_user)
    before = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    users_admin.delete_one({"_id": ObjectId(user_id)})

    log_audit(
        action="delete",
        actor={"id": current_user["id"], "role": current_user["role"], "org_id": current_user["org_id"]},
        resource="users",
        target={"id": str(before["_id"]), "email": before["email"]},
        reason=reason,
        before={"role": before.get("role"), "status": before.get("status"), "org_id": before.get("org_id")},
        after=None
    )
    return True