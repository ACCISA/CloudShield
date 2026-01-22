from .network_provisioning import provision_network as provision_network
from .network_provisioning import destroy_environment as destroy_environment
from .network_provisioning import provision_workstations as provision_workstations

from .dc_management import dc_add_user as dc_add_user
from .dc_management import dc_remove_user as dc_remove_user
from .dc_management import dc_restart_samba_service as dc_restart_samba_service
from .dc_management import dc_user_list as dc_user_list
from .dc_management import dc_set_password as dc_set_password
from .dc_management import dc_create_user_with_group as dc_create_user_with_group
from .dc_management import dc_create_file_share as dc_create_file_share
from .dc_management import dc_delete_file_share as dc_delete_file_share

from .task import get_server_nodes as get_server_nodes
from .task import proxy_rpc_request as proxy_rpc_request
from .task import NodeType as NodeType

# Alias for backward compatibility with tests
destroy_infra = destroy_environment

# Import provision_main from provisioner if available (used by tests)
try:
    import cloudshield.Cloud.provisioner.provision as _provision_module
except ImportError:
    try:
        import provision as _provision_module  # type: ignore[import]
    except ImportError:
        _provision_module = None

if _provision_module is not None:
    provision_main = _provision_module.provision_network_terraform
else:
    provision_main = None  # type: ignore[assignment]

