# Server thinks its using our terraform script but we are providing it a docker provisioner for testing
from .provision import provision_network_docker as provision_network_terraform
from .provision import destroy_network_docker as destroy
from .provision import get_target_dir as get_target_dir
