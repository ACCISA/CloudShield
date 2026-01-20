"""Pydantic models for file share validation and MongoDB document creation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


class FileShare(BaseModel):
    """
    File share read model with all fields.
    
    Represents a complete file share as stored in MongoDB and returned by API.
    File shares are network folders mounted on workstations with assigned drive letters.
    
    Attributes:
        org_id: Organization identifier
        name: Share name (unique within organization)
        description: Description
        owner: Email or username of the share owner
        drive: Windows drive letter assignment (Z, Y, X, etc. - excluding C)
        groups: List of group names that have access to this share
        current_size: Current storage usage in bytes (optional, defaults to 0)
        max_size: Maximum storage quota in bytes (optional, None means unlimited)
    """
    org_id: str
    name: str
    description: str
    owner: str
    drive: str
    groups: List[str] = Field(default_factory=list)
    current_size: Optional[int] = 0
    max_size: Optional[int] = None


class FileShareCreate(BaseModel):
    """
    File share creation/validation model.
    
    Used to validate input when creating new file shares. Includes required
    fields for persistence and optional metadata fields.
    
    Attributes:
        org_id: Organization identifier
        name: Share name (required, must be unique within organization)
        groups: List of group names with access (defaults to empty list)
        drive: Windows drive letter (required, auto-allocated by service layer)
        description: description
        owner: Owner info
        current_size: Current storage usage in bytes (defaults to 0)
        max_size: Maximum storage quota in bytes (None means unlimited)
    
    Notes:
        - Drive letter is typically allocated by allocate_drive_letter() service
        - created_at and updated_at timestamps are added by create_fileshare_doc()
        - current_size starts at 0 and is updated as files are added
        - max_size is optional quota limit in bytes
    """
    org_id: str
    name: str
    groups: List[str] = Field(default_factory=list)
    drive: str
    description: Optional[str] = None
    owner: Optional[str] = None
    current_size: Optional[int] = 0
    max_size: Optional[int] = None


def create_fileshare_doc(share: FileShareCreate) -> dict:
    """
    Create a MongoDB-ready file share document with timestamps.
    
    Transforms a validated Pydantic model into a dict suitable for MongoDB
    insertion, adding created_at and updated_at timestamps.
    
    Args:
        share: Validated FileShareCreate model instance
    
    Returns:
        Dict ready for MongoDB insertion with structure:
        {
            "org_id": str,
            "name": str,
            "groups": List[str],
            "drive": str,
            "description": str | None,
            "owner": str | None,
            "current_size": int (defaults to 0),
            "max_size": int | None (None means unlimited),
            "created_at": datetime (UTC),
            "updated_at": datetime (UTC)
        }
    
    Notes:
        - Both timestamps are set to the same value at creation
        - updated_at will be modified by update_share() service
        - Does not include _id (MongoDB generates this on insert)
        - current_size initializes to 0 and is updated as files are added
    """
    now = datetime.now(timezone.utc)
    return {
        "org_id": share.org_id,
        "name": share.name,
        "groups": share.groups,
        "drive": share.drive,
        "description": share.description,
        "owner": share.owner,
        "current_size": share.current_size or 0,
        "max_size": share.max_size,
        "created_at": now,
        "updated_at": now,
    }
