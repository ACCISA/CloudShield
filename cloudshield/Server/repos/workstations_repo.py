from __future__ import annotations
from bson import ObjectId
from typing import List
from models import Workstation,WorkstationTemplate,Software,WorkstationStatus

def insert_workstation_template(*, db, org_id: str, name: str, description: str, software: List[str], is_ready: bool, access_groups: List[str]):
    """
    Writes an Inventory document for org_id.
    Reusable from any workflow that generates or refreshes assets.
    """
    ws_db = db.workstation_templates
    return ws_db.insert_one(
    WorkstationTemplate(
        name=name,
        org_id=org_id,
        description=description,
        software=software,
        is_ready=is_ready,
        access_groups=access_groups
        ).model_dump(by_alias=True)
    )

def get_workstation_template(*, db, org_id: str, template_id: str):
    ws_db = db.workstation_templates
    result = ws_db.find_one({"_id": ObjectId(template_id)})
    if not result:
        return None
    return result

def get_workstation(*, db, org_id: str, vm_id: str):
    ws_db = db.workstations
    result = ws_db.find_one({"_id": ObjectId(vm_id)})
    if not result:
        return None
    return result

def insert_workstation(*, db, org_id: str, template_id: str):
    """
    Writes an Inventory document for org_id.
    Reusable from any workflow that generates or refreshes assets.
    """
    ws_db = db.workstations
    return ws_db.insert_one(
    Workstation(
        org_id=org_id,
        template_id=template_id,
        status=WorkstationStatus.INACTIVE
        ).model_dump(by_alias=True)
    )
def update_workstation_template(db, template_id: str, **updates):
    """
    Updates specific fields of a workstation document by its ID.
    Usage: update_workstation(db, "some_id", status=WorkstationStatus.ACTIVE)
    """
    ws_db = db.workstation_templates

    update_data = {k: v for k, v in updates.items() if v is not None}

    result = ws_db.update_one(
        {"_id": template_id},
        {"$set": update_data}
    )

    return result.modified_count

def update_workstation(db, workstation_id: str, **updates):
    """
    Updates specific fields of a workstation document by its ID.
    Usage: update_workstation(db, "some_id", status=WorkstationStatus.ACTIVE)
    """
    ws_db = db.workstations

    update_data = {k: v for k, v in updates.items() if v is not None}

    result = ws_db.update_one(
        {"_id": workstation_id},
        {"$set": update_data}
    )

    return result.modified_count
