from .network_provisioning import provision_network as provision_network
from .network_provisioning import destroy_environment as destroy_environment
from .network_provisioning import provision_workstations as provision_workstations

from .dc_management import dc_add_user as dc_add_user

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
