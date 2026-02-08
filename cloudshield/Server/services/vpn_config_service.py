"""VPN configuration file storage and retrieval service.

Stores .ovpn client configuration files in MongoDB so the DesktopUI
can pull them later to establish an OpenVPN tunnel.
"""

from __future__ import annotations

import base64
from datetime import datetime, timezone

from bson import Binary

from utils import get_logger

logger = get_logger("vpn_config_service")


def _get_vpn_configs_collection():
    """Lazy import to avoid circular / startup-time DB issues."""
    from utils.database import vpn_configs

    return vpn_configs


def store_vpn_config(
    org_id: str,
    username: str,
    filename: str,
    content: bytes,
) -> dict:
    """Upsert a VPN config file for a user inside an organization.

    Args:
        org_id: Organization identifier.
        username: Domain username the config belongs to.
        filename: Original .ovpn filename (e.g. ``john.ovpn``).
        content: Raw bytes of the configuration file.

    Returns:
        dict with ``matched_count`` and ``modified_count`` (or upserted id).
    """
    vpn_configs = _get_vpn_configs_collection()

    now = datetime.now(timezone.utc)
    result = vpn_configs.update_one(
        {"org_id": org_id, "username": username},
        {
            "$set": {
                "filename": filename,
                "content": Binary(content),
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )

    logger.info(
        "Stored VPN config for %s/%s (%s) – upserted=%s",
        org_id,
        username,
        filename,
        result.upserted_id is not None,
    )
    return {
        "matched_count": result.matched_count,
        "modified_count": result.modified_count,
        "upserted_id": str(result.upserted_id) if result.upserted_id else None,
    }


def get_vpn_config(org_id: str, username: str) -> dict | None:
    """Retrieve the stored VPN config for a user.

    Returns:
        dict with ``filename``, ``content_b64``, ``created_at``, ``updated_at``
        or *None* if no config exists.
    """
    vpn_configs = _get_vpn_configs_collection()

    doc = vpn_configs.find_one({"org_id": org_id, "username": username})
    if doc is None:
        return None

    return {
        "filename": doc["filename"],
        "content_b64": base64.b64encode(doc["content"]).decode("ascii"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }
