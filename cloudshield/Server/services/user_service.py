"""User management service layer with audit logging."""
from bson import ObjectId
from datetime import datetime, timezone
from utils import users_admin, users_public, log_audit
from models import UserCreate, UserUpdate
from security import hash_password
from utils.terraform import get_workstation_count

def _must_admin(current_user: dict | None) -> None:
    """
    Ensure current user has admin role.

    Args:
        current_user (dict): The decoded JWT user object (typically from 'g.user').

    Raises:
        PermissionError: If the user is not authenticated or does not have the "admin" role.

    Purpose:
        - This internal helper is called at the start of every user-modification service
          to enforce server-side authorization, even if a client bypasses API role guards.
        - Acts as a safeguard against privilege escalation.
    """
    if not current_user or current_user.get("role") != "admin":
        raise PermissionError("admin_only")

def persist_domain_user(org_id: str, username: str, password: str, email: str) -> str:
    """Persist a domain user to the database and return the user ID."""
    user_doc = {
        "org_id": org_id,
        "email": email,
        "username": username,
        "password": hash_password(password),
        "role": "employee",
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    res = users_admin.insert_one(user_doc)
    return str(res.inserted_id)


def create_user(user_data: UserCreate, current_user: dict, reason: str | None = None) -> str:
    """
    Create a new user account with audit logging.
    
    Args:
        user_data: Validated user creation data (email, password, role, org_id)
        current_user: Admin user performing the creation
        reason: Optional justification for audit trail
        
    Returns:
        str: MongoDB ObjectId of created user
        
    Raises:
        PermissionError: If current_user is not admin
        ValueError: If email already exists in database
    """
    _must_admin(current_user)

    if users_admin.find_one({"email": user_data.email}):
        raise ValueError(f"User with email {user_data.email} already exists")
    existing_db_count = users_admin.count_documents({"org_id": user_data.org_id})
    existing_workstation_count = get_workstation_count(user_data.org_id)
    if existing_db_count + 1 > existing_workstation_count:
        raise ValueError("User limit reached for this organization")

    user_doc = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "org_id": user_data.org_id,
        "role": user_data.role,
        "full_name": user_data.full_name,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
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


def update_user(user_id: str, update_data: UserUpdate, current_user: dict, reason: str | None = None) -> bool:
    """
    Update user fields with audit logging.

    Args:
        user_id (str): The target user's MongoDB ObjectId string.
        update_data (UserUpdate): Validated Pydantic model containing fields to update.
        current_user (dict): The admin performing the update.
        reason (str | None): Optional reason for the change, logged for auditing.

    Raises:
        PermissionError: If the requester is not an admin.
        ValueError:
            - If the user does not exist.
            - If no fields were provided to update.

    Returns:
        bool: True on successful update.

    Process:
        1. Enforces admin-only access.
        2. Fetches the "before" snapshot for auditing (excluding password).
        3. Applies validated field updates, hashing passwords if applicable.
        4. Updates the 'updated_at' timestamp.
        5. Writes audit log comparing "before" and "after" states.

    Security:
        - Password updates are re-hashed.
        - Prevents empty updates (requires at least one changed field).
    """
    _must_admin(current_user)

    before = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    updates = update_data.dict(exclude_unset=True)
    if not updates:
        raise ValueError("No fields to update")
    if "password" in updates:
        updates["password"] = hash_password(updates["password"])
    updates["updated_at"] = datetime.now(timezone.utc)

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


def deactivate_user(user_id: str, current_user: dict, reason: str | None = None) -> bool:
    """
    Set user status to inactive with audit logging.

    Args:
        user_id (str): The target user's MongoDB ObjectId string.
        current_user (dict): The admin performing the deactivation.
        reason (str | None): Optional reason, stored in the audit log.

    Raises:
        PermissionError: If the requester is not an admin.
        ValueError: If the specified user cannot be found.

    Returns:
        bool: True if the operation succeeded.

    Process:
        1. Verifies admin privileges.
        2. Loads the current user document for audit comparison.
        3. Sets the 'status' field to "inactive" and updates 'updated_at'.
        4. Logs a "deactivate" audit entry with before/after status states.

    Notes:
        - Deactivated users should be prevented from authenticating.
        - This operation is reversible (can be reactivated via update).
    """
    _must_admin(current_user)
    before = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    users_admin.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc)}})
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


def delete_user(user_id: str, current_user: dict, reason: str | None = None) -> bool:
    """
    Permanently delete user from database with audit logging.

    Args:
        user_id (str): The target user's MongoDB ObjectId string.
        current_user (dict): The admin performing the deletion.
        reason (str | None): Optional justification for deletion (used in audit log).

    Raises:
        PermissionError: If the requester is not an admin.
        ValueError: If the user does not exist or deletion fails.

    Returns:
        bool: True on successful deletion.

    Process:
        1. Confirms admin permissions.
        2. Fetches and stores the "before" snapshot for audit.
        3. Deletes the record using 'delete_one'.
        4. Validates the deletion acknowledgment.
        5. Logs a "delete" audit event, recording actor, target, and 'reason'.

    Safety:
        - Always performs a pre-delete lookup to preserve audit data.
        - Catches and ignores audit log failures so they don't block deletion.
        - If the ObjectId is malformed, raises a ValueError early.
    """
    _must_admin(current_user)

    try:
        _id = ObjectId(user_id)
    except Exception:
        raise ValueError(f"User {user_id} not found")  # invalid id format

    before = users_admin.find_one({"_id": _id}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    res = users_admin.delete_one({"_id": _id})
    if not res.acknowledged or res.deleted_count != 1:
        # nothing was deleted; treat as not found/race condition
        raise ValueError(f"User {user_id} not found")

    # Best-effort audit; never let it throw
    try:
        log_audit(
            action="delete",
            actor={"id": current_user.get("id"), "role": current_user.get("role"), "org_id": current_user.get("org_id")},
            resource="users",
            target={"id": str(before["_id"]), "email": before.get("email")},
            reason=reason,
            before={"role": before.get("role"), "status": before.get("status"), "org_id": before.get("org_id")},
            after=None
        )
    except Exception:
        # Audit logging must never block deletion; swallow and continue.
        pass

    return True


def list_users(current_user: dict) -> list[dict]:
    """
    List all users in the organization.

    Args:
        current_user (dict): The user performing the request.

    Returns:
        list[dict]: List of user documents (excluding passwords).
    """
    # For now, allow any authenticated user to list users, or restrict to admin?
    # The frontend EmployeesPage seems to be for management, so likely admin-only or similar.
    # The other functions enforce _must_admin. Let's enforce it here too for consistency with the "admin-only mutations" comment in users.py,
    # although listing might be allowed for others. The frontend routes say "Employees" manage organization users.
    # Let's stick to admin for now as per the pattern, or at least authenticated.
    # The plan didn't specify, but "EmployeesPage" implies management.
    # Let's check users.py imports again. It uses require_role("admin") for mutations.
    # I'll enforce admin for now to be safe, or just return all if they are admin.
    
    # Actually, let's look at the other functions. They all call _must_admin.
    # I will add _must_admin(current_user) to be safe.
    _must_admin(current_user)

    users = list(users_admin.find({}, {"password": 0}))
    for user in users:
        user["_id"] = str(user["_id"])
        if "created_at" in user:
            user["created_at"] = user["created_at"].isoformat()
        if "updated_at" in user:
            user["updated_at"] = user["updated_at"].isoformat()
            
    return users
