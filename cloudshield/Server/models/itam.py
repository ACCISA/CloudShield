from pydantic import BaseModel
from typing import List

class EC2Instance(BaseModel):
    public_ip: str
    private_ip: str
    vpc_id: str
    name: str
    priv_key_path: str
    ami_id: str
    cpu: int
    created_at: str
    instance_id: str
    os: str
    ports: List[str]
    ram_gb: str
    status: str
    storage_size_gb: int
    subnet_id: str
    updated_at: str

class Inventory(BaseModel):
    org_id: str
    assets: List[EC2Instance]


