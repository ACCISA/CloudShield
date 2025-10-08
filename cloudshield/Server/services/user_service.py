from bson import ObjectId
from datetime import datetime
from pymongo.errors import OperationFailure
from utils.database import users_admin, users_public
from models.user import UserCreate, UserUpdate
from security.passwords import hash_password

def _must_admin(current_user):
    if not current_user or current_user.get("role") != "admin":
        raise PermissionError("admin_only")

def _read_handle(current_user):
    """Admins read from base collection; employees read from the read-only view."""
    if current_user and current_user.get("role") == "admin":
        return users_admin
    return users_public  # read-only view; excludes sensitive fields by design

# ------------ WRITE OPERATIONS (admin only) ------------
def create_user(user_data: UserCreate, current_user: dict):
    _must_admin(current_user)  # admins only

    if users_admin.find_one({"email": user_data.email}):
        raise ValueError(f"User with email {user_data.email} already exists")

    user_doc = {
        "email": user_data.email,
        "password": hash_password(user_data.password),   # store hash
        "org_id": user_data.org_id,
        "role": user_data.role,  # "admin" | "employee" 
        "full_name": user_data.full_name,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    try:
        result = users_admin.insert_one(user_doc)
    except OperationFailure as e:
        # This can happen if the org_id doesn't exist in a tenant-scoped setup
        raise
    return str(result.inserted_id)

def update_user(user_id: str, update_data: UserUpdate, current_user: dict):
    _must_admin(current_user)  # admins only

    update_fields = {k: v for k, v in update_data.dict(exclude_unset=True).items()}
    if not update_fields:
        raise ValueError("No fields to update")

    if "email" in update_fields:
        existing = users_admin.find_one({
            "email": update_fields["email"],
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing:
            raise ValueError(f"Email {update_fields['email']} already in use")

    if "password" in update_fields:
        update_fields["password"] = hash_password(update_fields["password"])

    res = users_admin.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    if res.matched_count == 0:
        raise ValueError(f"User {user_id} not found")
    return True

def deactivate_user(user_id: str, current_user: dict):
    _must_admin(current_user)
    res = users_admin.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "inactive"}}
    )
    if res.matched_count == 0:
        raise ValueError(f"User {user_id} not found")
    return True

def delete_user(user_id: str, current_user: dict):
    _must_admin(current_user)
    res = users_admin.delete_one({"_id": ObjectId(user_id)})
    if res.deleted_count == 0:
        raise ValueError(f"User {user_id} not found")
    return True

# ------------ READ OPERATIONS (role-routed) ------------
def get_user(user_id: str, current_user: dict):
    coll = _read_handle(current_user)
    q = {"_id": ObjectId(user_id)}
    # Non-admins can only read users within their org
    if not current_user or current_user.get("role") != "admin":
        q["org_id"] = current_user["org_id"]
    # Exclude password hash from results
    return coll.find_one(q, {"password": 0})

def list_users(current_user: dict, org_id: str | None = None, status: str | None = None, limit: int = 50, skip: int = 0):
    coll = _read_handle(current_user)
    q = {}
    if current_user.get("role") != "admin":
        q["org_id"] = current_user["org_id"]
    elif org_id:
        q["org_id"] = org_id
    if status:
        q["status"] = status
    cursor = coll.find(q, {"password": 0}).skip(skip).limit(limit)
    return [ {**doc, "_id": str(doc["_id"])} for doc in cursor ]
