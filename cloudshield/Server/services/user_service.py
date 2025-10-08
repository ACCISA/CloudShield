# services/user_service.py
from bson import ObjectId
from datetime import datetime
from utils.database import users_collection
from models.user import UserCreate, UserUpdate
from security.passwords import hash_password  # NEW

def _must_admin(current_user):
    if not current_user or current_user.get("role") != "admin":
        raise PermissionError("admin_only")

def create_user(user_data: UserCreate, current_user: dict):
    _must_admin(current_user)  # admins only

    if users_collection.find_one({"email": user_data.email}):
        raise ValueError(f"User with email {user_data.email} already exists")

    user_doc = {
        "email": user_data.email,
        "password": hash_password(user_data.password),   # HASH IT
        "org_id": user_data.org_id,
        "role": user_data.role,  # "admin" | "employee" (validated by your model)
        "full_name": user_data.full_name,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)
    return str(result.inserted_id)

def update_user(user_id: str, update_data: UserUpdate, current_user: dict):
    _must_admin(current_user)  # admins only

    update_fields = {k: v for k, v in update_data.dict(exclude_unset=True).items()}
    if not update_fields:
        raise ValueError("No fields to update")

    if "email" in update_fields:
        existing = users_collection.find_one({
            "email": update_fields["email"],
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing:
            raise ValueError(f"Email {update_fields['email']} already in use")

    if "password" in update_fields:                     # HASH ON UPDATE
        update_fields["password"] = hash_password(update_fields["password"])

    res = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    if res.matched_count == 0:
        raise ValueError(f"User {user_id} not found")
    return True

def deactivate_user(user_id: str, current_user: dict):
    _must_admin(current_user)  # admins only
    res = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "inactive"}}
    )
    if res.matched_count == 0:
        raise ValueError(f"User {user_id} not found")
    return True

def delete_user(user_id: str, current_user: dict):
    _must_admin(current_user)  # admins only
    res = users_collection.delete_one({"_id": ObjectId(user_id)})
    if res.deleted_count == 0:
        raise ValueError(f"User {user_id} not found")
    return True
