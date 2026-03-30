from __future__ import annotations
import logging
from typing import Iterable, List, Dict, Any
from models import EC2Instance

logger = logging.getLogger("cloudshield.adapters.terraform_to_models")

def map_metadata_to_ec2_instances(metadata: Iterable[Dict[str, Any]]) -> List[EC2Instance]:
    """
    Transforms provisioner metadata (dicts) --> domain EC2Instance models.
    Centralizes field mapping for reuse.
    """
    logger.debug("map_metadata_to_ec2_instances input: %s", metadata)
    assets: List[EC2Instance] = []
    for asset in metadata:
        assets.append(
            EC2Instance(
                port = asset.get("port"),
                public_ip = asset.get("public_ip") or "",
                private_ip = asset["private_ip"],
                vpc_id = asset["vpc_id"],
                name = asset["name"],
                priv_key_path = asset["ssh_key"],
                ami_id = asset["ami_id"],
                cpu = asset["cpu"],
                created_at = asset["created_at"],
                instance_id = asset["instance_id"],
                os = asset["os"],
                ports = asset["ports"],
                ram_gb = asset["ram_gb"],
                status = asset["status"],
                storage_size_gb = asset["storage_size_gb"],
                subnet_id = asset["subnet_id"],
                updated_at = asset["updated_at"],
            )
        )
    return assets
