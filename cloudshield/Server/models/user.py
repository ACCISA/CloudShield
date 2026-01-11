from pydantic import BaseModel, EmailStr, field_validator
from pydantic_core import PydanticCustomError
from typing import Literal, Optional, List
import re

PASSWORD_RX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,128}$"
)  # ≥12 chars, upper, lower, digit, special

ORG_RX = re.compile(r"^[a-z0-9_-]{3,32}$")  # tweak to your org_id rules

class UserCreate(BaseModel):
    """
    Pydantic model for validating data when creating a new user.

    Fields:
        email (EmailStr): The user's unique email address. Automatically normalized to lowercase.
        password (str): The user's password; must be strong and secure.
        role (Literal["admin", "employee"]): The assigned role for the new user.
        full_name (str): The user's full name; must be non-empty.
        org_id (str): Organization identifier the user belongs to, validated via regex.

    Notes:
        - Enforces password strength (≥12 chars, upper/lower/digit/special).
        - Rejects common passwords and passwords containing the local part of the email.
        - Ensures valid org_id structure (3–32 lowercase alphanumeric, underscores, or dashes).
    """
    email: EmailStr
    password: str
    username: Optional[str] = None
    role: Literal["admin", "employee"]
    full_name: str
    org_id: str
    file_shares: Optional[List[str]] = []

    # normalize + validate
    @field_validator("email")
    @classmethod
    def norm_email(cls, v: str) -> str:
        """
        Normalize and validate the user's email address.

        - Trims whitespace.
        - Converts to lowercase for consistent storage and comparison.
        """
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str, info):
        """
        Enforce strong password requirements.

        Validates that:
            - Password length is at least 12 characters.
            - Includes uppercase, lowercase, digit, and special character.
            - Does not contain the local part of the user's email.
            - Is not in the list of known weak passwords.

        Raises:
            ValueError: If password fails any of the strength or uniqueness checks.
        """
        email = info.data.get("email", "")
        local = email.split("@", 1)[0] if email else ""
        if not PASSWORD_RX.match(v):
            raise PydanticCustomError(
                "password_strength",
                "Password must be 12+ chars and include upper, lower, digit, and symbol",
                {},
            )
        if local and local.lower() in v.lower():
            raise PydanticCustomError(
                "password_contains_email",
                "Password must not contain your email name",
                {},
            )
        COMMON = {"password", "password123", "qwerty", "letmein", "admin"}
        if v.lower() in COMMON:
            raise PydanticCustomError(
                "password_common",
                "Password is too common",
                {},
            )
        return v

    @field_validator("org_id")
    @classmethod
    def valid_org(cls, v: str) -> str:
        """
        Validate organization identifier (org_id).

        - Must not be empty.
        - Must match regex pattern allowing lowercase letters, numbers, underscores, or dashes.
        - Length must be between 3 and 32 characters.

        Raises:
            ValueError: If org_id format is invalid.
        """
        v2 = v.strip()
        if not v2:
            raise PydanticCustomError("org_id_required", "org_id is required", {})
        if not ORG_RX.match(v2):
            raise PydanticCustomError(
                "org_id_format",
                "org_id must be 3–32 chars: a–z, 0–9, _ or -",
                {},
            )
        return v2

    @field_validator("full_name")
    @classmethod
    def nonempty_name(cls, v: str) -> str:
        """
        Validate that the user's full name is provided and non-trivial.

        - Trims whitespace.
        - Must contain at least 2 visible characters.

        Raises:
            ValueError: If name is empty or too short.
        """
        v2 = v.strip()
        if len(v2) < 2:
            raise PydanticCustomError(
                "full_name_too_short",
                "full_name must be at least 2 characters",
                {},
            )
        return v2

class UserUpdate(BaseModel):
    """
    Pydantic model for validating updates to an existing user.

    Fields (all optional):
        email (EmailStr): New email address; normalized to lowercase if provided.
        password (str): New password; validated for strength if provided.
        role (Literal["admin", "employee"]): Updated role if applicable.
        status (Literal["active", "inactive"]): Account status toggle.
        full_name (str): Updated full name; must remain ≥2 characters if set.

    Notes:
        - Only provided fields are validated and updated.
        - Password and full_name validators are conditional.
    """
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    username: Optional[str] = None
    role: Optional[Literal["admin", "employee"]] = None
    status: Optional[Literal["active", "inactive"]] = None
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def norm_email(cls, v: Optional[str]) -> Optional[str]:
        """
        Normalize the email address if provided.

        - Converts to lowercase.
        - Trims whitespace.
        """  
        return str(v).strip().lower() if v else None

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: Optional[str], info) -> Optional[str]:
        """
        Validate password strength on user update.

        Requirements:
            - Must include uppercase, lowercase, digit, and special character.
            - Must be at least 8 characters long (slightly relaxed from creation rule).
            - Must not include the local part of the email address.

        Skips validation if password is not being updated.
        """
        if v is None:
            return v
        email = info.data.get("email", "")
        local = email.split("@", 1)[0] if email else ""
        if not PASSWORD_RX.match(v):
            raise ValueError(
                "Password must be 8+ chars with uppercase, lowercase, digit, and special char"
            )
        if local and local.lower() in v.lower():
            raise ValueError("Password must not contain your email name")
        return v

    @field_validator("full_name")
    @classmethod
    def nonempty_name(cls, v: Optional[str]) -> Optional[str]:
        """
        Validate that full name, if updated, remains meaningful.

        - Trims whitespace.
        - Requires a minimum of 2 characters.

        Skips validation if no update provided.
        """
        if v is None:
            return v
        v2 = v.strip()
        if len(v2) < 2:
            raise ValueError("full_name must be at least 2 characters")
        return v2
