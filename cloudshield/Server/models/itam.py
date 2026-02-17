# cloudshield/Server/models/itam.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


def utc_now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def parse_gb(v: Any) -> float:
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().lower()
    # handles: "4GB", "4 gb", "0.5", "8g"
    s = s.replace(" ", "")
    if s.endswith("gb"):
        s = s[:-2]
    if s.endswith("g"):
        s = s[:-1]
    return float(s)


class EC2Instance(BaseModel):
    public_ip: str = ""
    private_ip: str
    vpc_id: str
    name: str
    instance_id: str
    ami_id: str
    os: str
    cpu: float
    ram_gb: float
    storage_size_gb: float
    ports: list[str] = Field(default_factory=list)
    subnet_id: str
    status: str
    port: str

    # make these resilient (fixes your runtime log)
    created_at: str = Field(default_factory=utc_now_str)
    updated_at: str = Field(default_factory=utc_now_str)

    @field_validator("ram_gb", mode="before")
    @classmethod
    def _ram_gb(cls, v: Any) -> float:
        return parse_gb(v)

    @field_validator("cpu", "storage_size_gb", mode="before")
    @classmethod
    def _nums(cls, v: Any) -> float:
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        return float(str(v).strip())


class Inventory(BaseModel):
    org_id: str
    assets: list[EC2Instance] = Field(default_factory=list)
