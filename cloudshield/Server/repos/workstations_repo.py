from __future__ import annotations
from bson import ObjectId
from typing import List
from models import Workstation,WorkstationTemplate,WorkstationStatus

def insert_workstation_template(*, db, org_id: str, name: str, description: str, software: List[str], is_ready: bool, access_groups: List[str], members: List[str]):
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
        access_groups=access_groups,
        members=members
        ).model_dump(by_alias=True))

def get_workstation_template(*, db, org_id: str, template_id: str):
    ws_db = db.workstation_templates
    try:
        result = ws_db.find_one({
            "_id": ObjectId(template_id),
            "org_id":org_id})
        if not result:
            return None
        return result
    except Exception:
        return None

def get_workstation(*, db, org_id: str, vm_id: str):
    ws_db = db.workstations
    try:
        result = ws_db.find_one({
            "_id": ObjectId(vm_id),
            "org_id":org_id})
        if not result:
            return None
        return result
    except Exception:
        return None

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

def get_workstations(db, org_id: str):
    """
    Get all the workstations of an organization
    """

    ws_db = db.workstation_templates

    workstations = list(ws_db.find({"org_id": org_id}))
    
    for ws in workstations:
        ws["_id"] = str(ws["_id"])

    return workstations

def get_available_workstations(db, user_id: str):
    """
    Get workstations that are available to a user
    """

    groups_db = db.access_groups

    user_groups = groups_db.find({"_id": 1, "members":user_id}) # Get the groups the user is in
    
    workstation_template_cursor = db.workstation_tempaltes.find({ # Get the templates that these groups have access to
        "access_groups":{"$in":user_groups}
    })

    template_ids = list(workstation_template_cursor)

    workstations_cursor = db.workstations.find({ # find active workstations that use the workstation templates
        "template_id": {"$in":template_ids},
        "status": "ACTIVE"
    })

    return list(workstations_cursor)

