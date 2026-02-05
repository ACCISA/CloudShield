from pydantic import BaseModel
from typing import List

class Software(BaseModel):
    name: str
    description: str
    path: str

class Workstation(BaseModel):
    name: str
    description: str
    softawre: List[str]
    is_reasy: bool
    access_groups: List[str]
