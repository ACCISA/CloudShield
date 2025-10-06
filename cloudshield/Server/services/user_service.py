from bson import ObjectId
from datetime import datetime
from utils.database import users_collection
from models.user import UserCreate, UserUpdate

def create_user(user_data: UserCreate):
    if users_collection.find_one({"email": user_data.email}):
        raise ValueError(f"User with email {user_data.email} already exists")
    
    user_doc = {
        "email": user_data.email,
        "password": user_data.password,
        "org_id": user_data.org_id,
        "role": user_data.role,
        "full_name": user_data.full_name,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    result = users_collection.insert_one(user_doc)
    return str(result.inserted_id)

def update_user(user_id: str, update_data: UserUpdate):
    # Only update provided fields
    update_fields = {field: value for field, value in update_data.dict(exclude_unset=True).items()}
    
    if not update_fields:
        raise ValueError("No fields to update")
    
    if "email" in update_fields:
        existing = users_collection.find_one({
            "email": update_fields["email"],
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing:
            raise ValueError(f"Email {update_fields['email']} already in use")
    
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise ValueError(f"User {user_id} not found")
    
    return True

def deactivate_user(user_id: str):
    # Soft deletion by setting status to inactive
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "inactive"}}
    )
    
    if result.matched_count == 0:
        raise ValueError(f"User {user_id} not found")
    
    return True

def delete_user(user_id: str):
    # Permanent deletion
    result = users_collection.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise ValueError(f"User {user_id} not found")
    
    return True