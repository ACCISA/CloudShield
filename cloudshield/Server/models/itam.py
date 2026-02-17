from __future__ import annotations

from typing import List, Union
from pydantic import BaseModel, Field, field_validator
from pydantic.config import ConfigDict

Number = Union[int, float]


class EC2Instance(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    public_ip: str
    private_ip: str
    vpc_id: str
    name: str
    priv_key_path: str = Field(alias="ssh_key")
    ami_id: str
    cpu: float
    created_at: str
    instance_id: str
    os: str
    ports: List[str]
    ram_gb: float
    status: str
    storage_size_gb: int
    subnet_id: str
    updated_at: str
    port: str

    @field_validator("cpu", "ram_gb", mode="before")
    @classmethod
    def coerce_number(cls, v):
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            s = v.strip()
            try:
                return float(s)
            except ValueError:
                pass
        raise ValueError(f"Expected a number (int/float) for cpu/ram_gb, got: {v!r}")


class Inventory(BaseModel):
    org_id: str
    assets: List[EC2Instance]
