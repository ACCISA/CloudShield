from pydantic import BaseModel
from typing import List

class FileShare(BaseModel):
    name: str
    description: str
    owner: str
