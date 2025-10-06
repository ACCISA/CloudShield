from pydantic import BaseModel, EmailStr
from typing import Literal, Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["admin", "employee"]
    full_name: str
    org_id: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "employee"]] = None
    status: Optional[Literal["active", "inactive"]] = None
    full_name: Optional[str] = None