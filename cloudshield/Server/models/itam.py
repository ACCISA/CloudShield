from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class EC2Instance(BaseModel):
    model_config = ConfigDict(extra="ignore")

    public_ip: str
    private_ip: str
    vpc_id: str
    name: str
    instance_id: str
    subnet_id: str
    ami_id: str
    os: str
    cpu: float
    ram_gb: float
    storage_size_gb: int
    ports: list[str]
    status: str
    port: str


class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: Any | None = Field(default=None, alias="_id")
    org_id: str
    assets: list[EC2Instance]
