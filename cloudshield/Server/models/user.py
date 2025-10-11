from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Literal, Optional
import re

PASSWORD_RX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,128}$"
)  # ≥12 chars, upper, lower, digit, special

ORG_RX = re.compile(r"^[a-z0-9_-]{3,32}$")  # tweak to your org_id rules

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["admin", "employee"]
    full_name: str
    org_id: str

    # normalize + validate
    @field_validator("email")
    @classmethod
    def norm_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str, info):
        email = info.data.get("email", "")
        local = email.split("@", 1)[0] if email else ""
        if not PASSWORD_RX.match(v):
            raise ValueError(
                "Password must be 12+ chars and include upper, lower, digit, and symbol"
            )
        if local and local.lower() in v.lower():
            raise ValueError("Password must not contain your email name")
        COMMON = {"password", "password123", "qwerty", "letmein", "admin"}
        if v.lower() in COMMON:
            raise ValueError("Password is too common")
        return v

    @field_validator("org_id")
    @classmethod
    def valid_org(cls, v: str) -> str:
        v2 = v.strip()
        if not v2:
            raise ValueError("org_id is required")
        if not ORG_RX.match(v2):
            raise ValueError("org_id must be 3–32 chars: a–z, 0–9, _ or -")
        return v2

    @field_validator("full_name")
    @classmethod
    def nonempty_name(cls, v: str) -> str:
        v2 = v.strip()
        if len(v2) < 2:
            raise ValueError("full_name must be at least 2 characters")
        return v2

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "employee"]] = None
    status: Optional[Literal["active", "inactive"]] = None
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def norm_email(cls, v: Optional[EmailStr]) -> Optional[EmailStr]:
        return EmailStr(str(v).strip().lower()) if v else None

    @field_validator("full_name")
    @classmethod
    def nonempty_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v2 = v.strip()
        if len(v2) < 2:
            raise ValueError("full_name must be at least 2 characters")
        return v2
