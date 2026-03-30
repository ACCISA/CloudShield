from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class Software(BaseModel):
    name: str
    description: str
    path: str

class WorkstationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROVISIONING = "provisioning"

class WorkstationTemplate(BaseModel):
    name: str
    org_id: str
    description: str
    software: List[str]
    is_ready: bool
    access_groups: List[str]
    members: List[str]

class Workstation(BaseModel):
    org_id: str
    template_id: str
    mac: Optional[str] = None
    ipv4_address: Optional[str] = None
    status: WorkstationStatus
