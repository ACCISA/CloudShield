from pydantic import BaseModel

class FileShare(BaseModel):
    name: str
    description: str
    owner: str
