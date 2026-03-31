"""Service layer for file shares (create/list/delete)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, List

from pymongo.errors import PyMongoError

from models.shares import FileShareCreate, create_fileshare_doc
from utils import shares, get_logger


DRIVE_LETTERS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]
RESERVED_DRIVES = {"C"}
logger = get_logger("service")


def _normalize_size_value(value: str | int | None) -> str | None:
    """Normalize size-like values to the string form expected by the share models."""
    if value is None:
        return None
    return str(value)

def _normalize_drive_letter(value: str) -> str:
    """
    Normalize a drive letter to uppercase and strip whitespace.
    
    """
    return (value or "").strip().upper()


def _available_drive_letters(used: Iterable[str]) -> List[str]:
    """
    Calculate available drive letters excluding used and reserved drives.
    
    Args:
        used: Iterable of already-assigned drive letters
    
    Returns:
        List of available drive letters in reverse alphabetical order (Z->A)
        excluding reserved drive 'C'
    """
    used_set = {_normalize_drive_letter(letter) for letter in used if letter}
    candidates = [letter for letter in DRIVE_LETTERS if letter not in RESERVED_DRIVES]
    candidates.reverse()
    return [letter for letter in candidates if letter not in used_set]


def allocate_drive_letter(org_id: str) -> str:
    """
    Allocate the next available drive letter for an organization.
    
    Queries MongoDB for existing drive assignments and returns the first
    available drive letter in reverse alphabetical order (Z, Y, X, ..., D, B, A).
    Drive letter 'C' is reserved and never assigned.
    
    Args:
        org_id: Organization identifier to scope drive allocation
    
    Returns:
        Next available drive letter (e.g., "Z", "Y", "X")
    
    Raises:
        ValueError: If all 25 drive letters (A-Z excluding C) are exhausted
    """
    used = [
        _normalize_drive_letter(doc.get("drive"))
        for doc in shares.find({"org_id": org_id}, {"drive": 1})
    ]
    available = _available_drive_letters(used)
    if not available:
        raise ValueError("No available drive letters")
    return available[0]


def create_share(
    org_id: str,
    name: str,
    kind: str | None = None,
    groups: List[str] | None = None,
    users: List[str] | None = None,
    description: str | None = None,
    owner: str | None = None,
    current_size: str | int | None = None,
    max_size: str | int | None = None,
) -> dict:
    """
    Create a new file share record with auto-allocated drive letter.
    
    Allocates a unique drive letter (Z->A order), validates input via Pydantic,
    and persists the share to. The share will be mountable as a network
    drive on workstations (e.g., Z:, Y:, X:).
    
    Args:
        org_id: Organization identifier to scope the share
        name: Share name (must be unique within organization)
        kind: Type of share (e.g., "folder", "file", etc.) - optional
        groups: Optional list of group names that have access to this share
        users: Optional list of usernames that have access to this share
        description: Optional human-readable description
        owner: Optional email/username of the share owner
        current_size: Current storage usage
        max_size: Maximum storage quota (None means unlimited)

    Returns:
        Document dict with all share fields including:
        - id: String representation of MongoDB ObjectId
        - drive: Allocated drive letter (e.g., "Z")
        - kind: Type of share (or None)
        - groups: List of group names
        - users: List of usernames
        - current_size: Storage usage in bytes
        - max_size: Storage quota in bytes (or None)
        - created_at/updated_at: ISO format timestamps
    
    Raises:
        ValueError: If no drive letters available or MongoDB insertion fails
        PyMongoError: If database operation fails (wrapped in ValueError)
    """
    logger.info("Attempting to create file share for org_id=%s, name=%s", org_id, name)
    drive = allocate_drive_letter(org_id)
    share_model = FileShareCreate(
        org_id=org_id,
        name=name,
        kind=kind,
        groups=groups or [],
        users=users or [],
        drive=drive,
        description=description,
        owner=owner,
        current_size=_normalize_size_value(current_size) or "0",
        max_size=_normalize_size_value(max_size),
    )
    logger.info("Validated file share model: %s", share_model)
    share_doc = create_fileshare_doc(share_model)
    try:
        res = shares.insert_one(share_doc)
        logger.info("Created file share with id=%s, drive=%s for org_id=%s", res.inserted_id, drive, org_id)
    except PyMongoError as exc:
        raise ValueError(f"Failed to create file share: {exc}") from exc
    share_doc["id"] = str(res.inserted_id)
    return share_doc


def list_shares(org_id: str) -> List[dict]:
    """
    List all file shares for an organization
    
    Args:
        org_id: Organization identifier to filter shares
    
    Returns:
        List of document dicts, each containing:
        - _id: MongoDB ObjectId
        - org_id: Organization identifier
        - name: Share name
        - drive: Allocated drive letter
        - groups: List of group names with access
        - description: Optional description
        - owner: Optional owner email/username
        - created_at/updated_at: datetime objects
    """
    docs = shares.find({"org_id": org_id}).sort("created_at", 1)
    return list(docs)


def list_groups_with_shares(org_id: str) -> List[dict]:
    """
    List groups and their associated shares (inverted view).
    
    Transforms share-centric data (share -> groups) into group-centric data
    (group -> shares). Useful for displaying which shares each group has access to.
    
    Args:
        org_id: Organization identifier to filter shares
    
    Returns:
        List of dicts with structure:
        [
            {
                "group": {
                    "name": "engineering",
                    "shares": ["Documents", "Projects"]
                }
            },
            ...
        ]
        Groups are sorted by name, shares are sorted and deduplicated.
    """
    groups_map: dict[str, List[str]] = {}
    for doc in shares.find({"org_id": org_id}, {"name": 1, "groups": 1}):
        share_name = doc.get("name")
        for group in doc.get("groups") or []:
            groups_map.setdefault(group, []).append(share_name)
    return [{"group": {"name": name, "shares": sorted(set(names))}} for name, names in groups_map.items()]


def update_share(org_id: str, name: str, update_fields: dict) -> bool:
    """
    Update file share metadata (groups, description, owner, sizes).
    
    Automatically sets updated_at timestamp. Does not allow changing
    org_id, name, or drive fields.
    
    Args:
        org_id: Organization identifier to scope the update
        name: Share name to update (immutable identifier)
        update_fields: Dict of fields to update. Supported keys:
            - groups: List[str] - Group names with access
            - description: str - Human-readable description
            - owner: str - Owner email/username
            - current_size: int - Current storage usage
            - max_size: int | None - Maximum storage quota 
    
    Returns:
        True if share was found and updated, False if not found
    """
    if not update_fields:
        return False

    update_fields["updated_at"] = datetime.now(timezone.utc)

    result = shares.update_one(
        {"org_id": org_id, "name": name},
        {"$set": update_fields}
    )
    return result.matched_count > 0


def update_share_current_size(org_id: str, name: str, current_size: int) -> bool:
    """
    Update the current storage usage for a file share.
    
    Convenience wrapper around update_share() for updating current_size.
    Intended for use by background monitoring jobs that track disk usage.
    
    Args:
        org_id: Organization identifier
        name: Share name
        current_size: Current storage usage in bytes
    
    Returns:
        True if share was found and updated, False if not found
    
    Example:
        >>> update_share_usage("test123", "Documents", 5368709120)
        True
    """
    return update_share(org_id, name, {"current_size": current_size})


def update_share_max_size(org_id: str, name: str, max_size: int | None) -> bool:
    """
    Update the maximum storage quota for a file share.
    
    Convenience wrapper around update_share() for updating max_size.
    Intended for admin operations setting storage limits. Pass None for unlimited.
    
    Args:
        org_id: Organization identifier
        name: Share name
        max_size: Maximum storage quota in bytes, or None for unlimited
    
    Returns:
        True if share was found and updated, False if not found
    
    Example:
        >>> update_share_quota("test123", "Documents", 10737418240)  # 10 GB limit
        True
        >>> update_share_quota("test123", "Public", None)  # Remove limit
        True
    """
    return update_share(org_id, name, {"max_size": max_size})


def delete_share(org_id: str, name: str) -> bool:
    """
    Delete a file share record from MongoDB.
    
    Removes the share document, freeing up the allocated drive letter
    for reuse by future shares in the same organization.
    
    Args:
        org_id: Organization identifier to scope the deletion
        name: Share name to delete
    
    Returns:
        True if share was found and deleted, False if not found
    """
    deleted = shares.find_one_and_delete({"org_id": org_id, "name": name})
    return deleted is not None
