from __future__ import annotations
from typing import List
from ..models import Inventory, EC2Instance

def insert_inventory(*, db, org_id: str, assets: List[EC2Instance]):
    """
    Writes an Inventory document for org_id.
    Reusable from any workflow that generates or refreshes assets.
    """
    itam_db = db.itam
    return itam_db.insert_one(
    Inventory(org_id=org_id, assets=assets).model_dump(by_alias=True)
    )

def delete_inventory_by_org(*, db, org_id: str):
    """
    Deletes Inventory by org_id.
    Used by destroy job; also useful for reset flows.
    """
    itam_db = db.itam
    return itam_db.find_one_and_delete({"org_id": org_id})