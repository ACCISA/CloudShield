"""User management service layer with audit logging."""
import secrets
import string
from bson import ObjectId
from typing import Optional
from datetime import datetime, timezone
from utils import users_admin, log_audit, organizations, derive_username
from utils.terraform import get_workstation_count
from models import UserCreate, UserUpdate, OrganizationCreate, create_organization_doc
from security import hash_password
from pymongo.errors import PyMongoError, DuplicateKeyError
from bson.errors import InvalidId


def _coerce_int(val) -> int | None:
    """Convert numeric values to int; ignore non-numeric (e.g., mocks)."""
    if isinstance(val, bool):
        return None
    if isinstance(val, (int, float)):
        return int(val)
    return None


def _create_org_for_signup(org_name: Optional[str], package: str, domain_name, realm_name, dc_admin_password) -> tuple[str, dict]:
    """Create an organization and return its auto-generated MongoDB ObjectId string."""
    org_model = OrganizationCreate(
            name=org_name, 
            package=package, 
            domain_name=domain_name,
            realm_name=realm_name,
            dc_admin_password=dc_admin_password)

    org_doc = create_organization_doc(org_model)
    
    # MongoDB automatically generates and injects the '_id' field
    res = organizations.insert_one(org_doc)
    
    # Return the stringified ObjectId to be used as the org_id for users
    return str(res.inserted_id), org_doc


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
    existing_user = users_admin.find_one(
        {"org_id": org_id, "email": email},
        {"_id": 1},
    )
    if isinstance(existing_user, dict) and existing_user.get("_id") is not None:
        return str(existing_user["_id"])

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
    try:
        res = users_admin.insert_one(user_doc)
        return str(res.inserted_id)
    except DuplicateKeyError:
        # Idempotency guard: user may already have been created by /api/users.
        existing_user = users_admin.find_one(
            {"org_id": org_id, "email": email},
            {"_id": 1},
        )
        if isinstance(existing_user, dict) and existing_user.get("_id") is not None:
            return str(existing_user["_id"])
        raise


def remove_domain_user_from_db(org_id: str, username: str, job_id: str | None = None) -> bool:
    """
    Remove domain user from database with audit logging
    """
    deleted_user = users_admin.find_one_and_delete(
        {"org_id": org_id, "username": username}
    )
    
    if not deleted_user:
        return False
    
    try:
        log_audit(
            action="dc_remove_user",
            actor={"id": "system", "role": "system", "org_id": org_id},
            resource="users",
            target={
                "id": str(deleted_user["_id"]),
                "username": username,
                "email": deleted_user.get("email")
            },
            reason="Domain controller user removal",
            before={
                "role": deleted_user.get("role"),
                "status": deleted_user.get("status"),
                "org_id": deleted_user.get("org_id"),
                "username": username
            },
            after=None,
            meta={"job_id": job_id} if job_id else {}
        )
    except Exception:
        # Audit logging must never block deletion
        pass
    
    return True


def create_user(user_data: UserCreate, current_user: Optional[dict], reason: str | None = None) -> str:
    """
    Create a new admin user account with audit logging.

    - Admin flow (dashboard): current_user is a dict and must be admin.
    - Public signup flow: current_user is None.
    
    Args:
        user_data: Validated user creation data (email, password, role, org_id)
        current_user: Admin user performing the creation, or None for public signup
        reason: Optional justification for audit trail

    Returns:
        str: MongoDB ObjectId of created user

    Raises:
        PermissionError: If public signup is not allowed or current_user is not admin
        ValueError: If email already exists or org user limit is exceeded

    Side Effects:
        - Enqueues an invite email when an admin creates an employee.
        - Public-signup welcome email is sent after successful provisioning.
    """

    # Determine package for this signup
    package = (user_data.package_type or "basic").strip() if isinstance(getattr(user_data, "package_type", None), str) else "basic"
    org_name = getattr(user_data, "company_name", None) or getattr(user_data, "full_name", None)
    # Build a valid AD domain name: lowercase, hyphens instead of spaces/underscores,
    # append .local, and derive the Kerberos realm (uppercase FQDN).
    import re
    _slug = re.sub(r'[^a-z0-9]+', '-', org_name.lower()).strip('-')[:15]  # NetBIOS ≤15 chars
    domain_name = f"{_slug}.local"          # e.g. "cloudshield-test.local"
    realm_name  = domain_name.upper()        # e.g. "CLOUDSHIELD-TEST.LOCAL"
    
    def gen_password():
        friendly_punctuation = "!@#%^&()-_=+[]{};:,.<>?"
        alphabet = string.ascii_letters + string.digits + friendly_punctuation
        password = ''.join(secrets.choice(alphabet) for _ in range(16))
        return password


    dc_admin_password = gen_password()

    # -----------------------------
    # Auth / permission rules + org provisioning
    # -----------------------------
    if current_user is not None:
        # Dashboard/admin creation: enforce admin and require explicit org_id
        _must_admin(current_user)
        if not user_data.org_id:
            raise ValueError("org_id is required when creating users as an admin")
        
        org_id = user_data.org_id
        # Look up by ObjectId
        try:
            org_doc = organizations.find_one({"_id": ObjectId(org_id)}, {"user_limit": 1}) or {}
        except InvalidId:
            raise ValueError("Invalid organization ID format")
    else:
        # Public signup: create org using Mongo ObjectId
        org_id, org_doc = _create_org_for_signup(org_name, package, domain_name, realm_name, dc_admin_password)

        # Optional hardening: force role admin on public signup
        if getattr(user_data, "role", None) != "admin":
            raise PermissionError("Public signup can only create an admin user.")

    # -----------------------------
    # Uniqueness / limits
    # -----------------------------
    if users_admin.find_one({"org_id": org_id, "email": user_data.email}):
        raise ValueError(f"User with email {user_data.email} already exists")

    # Enforce user limit based on organization package
    existing_db_count = users_admin.count_documents({"org_id": org_id})
    user_limit = _coerce_int(org_doc.get("user_limit"))
    if user_limit is None:
        user_limit = _coerce_int(get_workstation_count(org_id))
    if user_limit is not None and existing_db_count + 1 > user_limit:
        raise ValueError("User limit reached for this organization")

    # -----------------------------
    # Insert user
    # -----------------------------
    requested_username = getattr(user_data, "username", None)
    username = requested_username.strip() if isinstance(requested_username, str) else ""
    username = username or derive_username(user_data.full_name)

    user_doc = {
        "email": user_data.email,
        "username": username,
        "password": hash_password(user_data.password),
        "org_id": org_id, # This is now the 24-char ObjectId string
        "role": user_data.role,
        "full_name": user_data.full_name,
        "status": "active",
        "profile_image": user_data.profile_image,  # Base64 data URL for profile picture
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    res = users_admin.insert_one(user_doc)
    user_id = str(res.inserted_id)

    # -----------------------------
    # Audit logging
    # -----------------------------
    if current_user is not None:
        actor = {
            "id": current_user["id"],
            "role": current_user["role"],
            "org_id": current_user["org_id"],
        }
    else:
        actor = {
            "system": "public_signup",
            "role": "admin",
            "org_id": org_id,
        }

    log_audit(
        action="create",
        actor=actor,
        resource="users",
        target={"id": user_id, "email": user_data.email},
        reason=reason,
        before=None,
        after={"role": user_data.role, "status": "active", "org_id": org_id},
    )

    # Expose the resolved org_id on the user_data object for callers
    try:
        user_data.org_id = org_id 
    except Exception:
        pass

    # -----------------------------
    # Async email notifications
    # -----------------------------
    try:
        from services.job_service import enqueue_employee_invite_email

        if current_user is not None and user_data.role == "employee":
            enqueue_employee_invite_email(user_id)
    except Exception:
        # Keep email dispatch failures from impacting user creation.
        pass

    return user_id


def update_user(user_id: str, update_data: UserUpdate, current_user: dict, reason: str | None = None) -> bool:
    """Update user fields with audit logging.
    Update user fields with audit logging.

    Args:
        user_id (str): The target user's MongoDB ObjectId string.
        update_data (UserUpdate): Validated Pydantic model containing fields to update.
        current_user (dict): The admin performing the update, or the user updating themselves.
        reason (str | None): Optional reason for the change, logged for auditing.

    Raises:
        PermissionError: If the requester is not an admin (and not editing themselves).
        ValueError:
            - If the user does not exist.
            - If no fields were provided to update.

    Returns:
        bool: True on successful update.

    Process:
        1. Enforces admin-only access (unless user is editing their own profile).
        2. Fetches the "before" snapshot for auditing (excluding password).
        3. Applies validated field updates, hashing passwords if applicable.
        4. Updates the 'updated_at' timestamp.
        5. Writes audit log comparing "before" and "after" states.

    Security:
        - Password updates are re-hashed.
        - Prevents empty updates (requires at least one changed field).
    """
    
    # Safely extract the ID regardless of how the JWT/g.user formats it
    current_user_id = str(current_user.get("id") or current_user.get("_id") or current_user.get("sub"))
    is_self = current_user_id == str(user_id)
    
    # Enforce admin ONLY if they are trying to edit someone else
    if not is_self:
        _must_admin(current_user)

    before = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not before:
        raise ValueError(f"User {user_id} not found")

    # Get all fields from update_data, excluding None values (unset defaults)
    updates = {}
    data_dict = update_data.dict()
    for key, value in data_dict.items():
        if value is not None:
            updates[key] = value
    
    if not updates:
        raise ValueError("No fields to update")
    if "password" in updates:
        updates["password"] = hash_password(updates["password"])
    updates["updated_at"] = datetime.now(timezone.utc)

    users_admin.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    after = users_admin.find_one({"_id": ObjectId(user_id)}, {"password": 0})

    log_audit(
        action="update",
        actor={"id": current_user_id, "role": current_user.get("role"), "org_id": current_user.get("org_id")},
        resource="users",
        target={"id": str(before["_id"]), "email": before["email"]},
        reason=reason,
        before={k: before.get(k) for k in ["role","status","org_id","full_name","email","profile_image","notification_preferences"]},
        after={k: after.get(k) for k in ["role","status","org_id","full_name","email","profile_image","notification_preferences"]}
    )
    return True

def deactivate_user(user_id: str, current_user: dict, reason: str | None = None) -> bool:
    """Set user status to inactive with audit logging.
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
    """Permanently delete user from database with audit logging.
    Steps:
        1. Ensure the caller is an admin.
        2. Validate ObjectId and load BEFORE snapshot (secret-safe).
        3. Block:
            - Self-deletion
            - Deletion of the last admin in an organization
        4. Perform deletion and validate acknowledgment.
        5. Write a best-effort audit log including:
            - actor (admin performing deletion)
            - target (deleted user)
            - full before snapshot (email, name, role, org, timestamps)
            - reason (optional)

    Raises:
        PermissionError: Not admin or forbidden deletion (self-delete).
        ValueError: Invalid id, missing user, DB failures, or last-admin protection.

    Returns:
        bool: True when deletion is successful."""
    _must_admin(current_user)

    try:
        oid = ObjectId(user_id)
    except (InvalidId, Exception):
        raise ValueError(f"User {user_id} not found")

    try:
        before = users_admin.find_one({"_id": oid}, {"password": 0})
    except PyMongoError as e:
        raise ValueError("Database error while fetching user") from e
    
    if not before:
        raise ValueError(f"User {user_id} not found")

    # Prevent self-delete
    if str(oid) == str(current_user.get("id")):
        raise PermissionError("cannot_delete_self")

    # Prevent deleting the last admin in the org
    if before.get("role") == "admin":
        try:
            remaining_admins = users_admin.count_documents({
                "org_id": before.get("org_id"),
                "role": "admin",
                "_id": {"$ne": oid}
            })
        except PyMongoError as e:
            raise ValueError("Database error while checking admin quorum") from e

        if remaining_admins == 0:
            raise ValueError("Cannot delete the last admin in this organization")

    try:
        res = users_admin.delete_one({"_id": oid})
    except PyMongoError as e:
        raise ValueError("Database error while deleting user") from e
    
    if not res.acknowledged or res.deleted_count != 1:
        raise ValueError(f"User {user_id} not found")

    # Best-effort audit
    try:
        before_safe = {
            k: before.get(k) for k in [
                "email", "full_name", "role", "status", "org_id",
                "created_at", "updated_at"
            ] if k in before
        }
        for k in ("created_at", "updated_at"):
            if isinstance(before_safe.get(k), (datetime,)):
                before_safe[k] = before_safe[k].isoformat()

        log_audit(
            action="delete",
            resource="users",
            actor={
                "id": current_user.get("id"),
                "role": current_user.get("role"),
                "org_id": current_user.get("org_id"),
            },
            target={"id": str(oid), "email": before.get("email")},
            reason=reason,
            before=before_safe,
            after=None,
            severity="info",
        )
    except Exception:
        pass

    return True


def list_users(current_user: dict) -> list[dict]:
    """
    List all users belonging to the current user's organization.

    Args:
        current_user (dict): The user performing the request. Must be admin.

    Returns:
        list[dict]: List of user documents (excluding passwords) restricted to the caller's org.
    """
    _must_admin(current_user)
    
    org_id = current_user.get("org_id")
    if not org_id:
        return []

    # FILTER BY ORG_ID FOR MULTI-TENANCY
    users = list(users_admin.find({"org_id": org_id}, {"password": 0}))
    for user in users:
        user["_id"] = str(user["_id"])
        if "created_at" in user:
            user["created_at"] = user["created_at"].isoformat()
        if "updated_at" in user:
            user["updated_at"] = user["updated_at"].isoformat()
            
    return users

def get_user(user_id: str, current_user: dict) -> dict:
    """Fetch fresh user data from the database."""
    # Safely extract the ID
    current_user_id = str(current_user.get("id") or current_user.get("_id") or current_user.get("sub"))
    is_self = current_user_id == str(user_id)
    
    # Enforce admin ONLY if they are trying to view someone else
    if not is_self:
        _must_admin(current_user)
        
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise ValueError("Invalid user ID format")
        
    user_doc = users_admin.find_one({"_id": oid}, {"password": 0})
    if not user_doc:
        raise ValueError("User not found")
        
    # Format for the frontend
    user_doc["id"] = str(user_doc.pop("_id"))
    
    # Convert dates to strings so jsonify doesn't crash
    if "created_at" in user_doc:
        user_doc["created_at"] = user_doc["created_at"].isoformat()
    if "updated_at" in user_doc:
        user_doc["updated_at"] = user_doc["updated_at"].isoformat()
        
    return user_doc
