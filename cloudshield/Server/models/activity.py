from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

# Mapping raw RPC method names to human-readable strings
RPC_METHOD_MAPPING = {
    "/infra_service.v1.InfraService/AddUser": "Created a new user",
    "/infra_service.v1.InfraService/RemoveUser": "Removed a user",
    "/infra_service.v1.InfraService/AddWorkstation": "Provisioned a workstation",
    "/infra_service.v1.InfraService/CreateShare": "Created a file share",
    # Add other GRPC methods here
}

class ActivityLog(BaseModel):
    org_id: str
    event_type: str  # The raw RPC method name (e.g., /infra_service.v1.InfraService/AddUser)
    description: str # The UI friendly string
    actor: Optional[str] = "System" # Who performed the action (default to System if unknown)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict) # Extra context
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def create_activity_log_doc(org_id: str, method_name: str, actor: str = "System") -> dict:
    """
    Creates a dictionary ready for MongoDB insertion.
    Automatically maps the technical method name to a human string.
    """
    # 1. Map the technical name to a UI string
    # We strip the service prefix if it exists to be safe, or lookup directly
    ui_description = RPC_METHOD_MAPPING.get(method_name, f"Executed action: {method_name.split('/')[-1]}")
    
    # 2. Create the model
    log_entry = ActivityLog(
        org_id=org_id,
        event_type=method_name,
        description=ui_description,
        actor=actor
    )
    
    # 3. Return dict for MongoDB
    return log_entry.model_dump()