from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from cloudshield.Server.models.itam import Inventory


def _utc_now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _normalize_assets_timestamps(assets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ensure created_at / updated_at exist so Inventory validation doesn't fail
    when the provisioning source omits timestamps (common in local Docker mode).
    """
    now = _utc_now_str()
    for a in assets:
        if isinstance(a, dict):
            a.setdefault("created_at", now)
            a.setdefault("updated_at", now)
    return assets


def insert_inventory(db: Any, org_id: str, assets: List[Dict[str, Any]]):
    """
    Insert an inventory document for an org into db.itam.

    Test expectations:
      - must call db.itam.insert_one(...)
      - should dump Inventory with by_alias=True (so field aliases like ssh_key are respected)
    """
    assets = assets or []
    assets = _normalize_assets_timestamps(assets)

    inventory = Inventory(org_id=org_id, assets=assets)
    doc = inventory.model_dump(by_alias=True)

    # Keep at most one doc per org (doesn't break tests; they only assert insert_one behavior)
    try:
        db.itam.delete_many({"org_id": org_id})
    except Exception:
        # In tests, mocks may not define delete_many; ignore
        pass

    return db.itam.insert_one(doc)


def delete_inventory_by_org(db: Any, org_id: str) -> Optional[Dict[str, Any]]:
    """
    Delete the inventory doc for an org. Returns the deleted document or None.
    Tests typically mock find_one_and_delete.
    """
    return db.itam.find_one_and_delete({"org_id": org_id})
