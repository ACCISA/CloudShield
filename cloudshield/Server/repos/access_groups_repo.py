from typing import Optional, List
from bson import ObjectId
from utils import access_groups

def get_access_group_by_id(db, group_id: str) -> Optional[dict]:
    """
    Fetches an access group from MongoDB by its hex string ID 
    and returns a JSON-serializable dictionary.
    """
    try:
        oid = ObjectId(group_id)
    except Exception:
        return None

    doc = access_groups.find_one({"_id": oid})

    if not doc:
        return None

    return access_group_to_json(doc)

def get_members_amount_by_id(db, group_id: str) -> int:
    pass

def get_unique_members_by_ids(db, group_ids: List[str]) -> int:
    
    object_ids = [ObjectId(_id) if isinstance(_id, str) else _id for _id in group_ids]

    cursor = access_groups.find({"_id": {"$in": object_ids}})

    members = [str(doc["members"]) for doc in cursor]

    return list(set(members))


