import os
import sys
import socket
from pathlib import Path


def _calculate_base_dir() -> Path:
	"""Resolve directory that holds bundled resources when frozen."""
	if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
		return Path(sys._MEIPASS)
	return Path(__file__).resolve().parent


BASE_DIR = _calculate_base_dir()
if str(BASE_DIR) not in sys.path:
	# Ensure sibling packages (core, tasks, etc.) are importable when frozen.
	sys.path.insert(0, str(BASE_DIR))

try:
	from .core import Agent
	from .tasks import (
		CallBootstrapTask,
		DomainDnsCheckTask,
		EnsureDomainMembershipTask,
		GetProcessListTask,
		NetworkListingTask,
	)
except ImportError:  # Support running outside package context
	from core import Agent
	from tasks import (
		CallBootstrapTask,
		DomainDnsCheckTask,
		EnsureDomainMembershipTask,
		GetProcessListTask,
		NetworkListingTask,
	)

def resolve_cache_path() -> str:
	"""Create a cache directory in a non-publicly writable location."""
	program_data = os.getenv("PROGRAMDATA")
	if program_data:
		base_dir = Path(program_data) / "CloudShield" / "Agent"
	else:
		base_dir = Path.home() / ".cloudshield" / "agent"
	base_dir.mkdir(parents=True, exist_ok=True)
	return str(base_dir)


def resolve_config_path() -> str:
	configured = os.getenv("CLOUDSHIELD_AGENT_CONFIG")
	if configured:
		return configured
	return str(BASE_DIR / "config" / "agent_config.json")

if __name__ == "__main__":

    # Use hostname as default agent_id so each provisioned workstation is unique.
    agent_id = os.getenv("AGENT_ID", socket.gethostname())

    # SERVER_ADDR should point to the ThreatDetection gRPC server.
    # The install_cloudshield_agent.ps1 OEM script injects these env vars
    # via the scheduled task; they can also be set in agent_config.json.
    server_addr = os.getenv("SERVER_ADDR", "127.0.0.1")
    server_port = int(os.getenv("SERVER_PORT", "50051"))


    agent = Agent(
        agent_id=agent_id,
        server_addr=server_addr,
        port=server_port,
        cache_path=resolve_cache_path(),
    )

    config_path = resolve_config_path()

    ensure_domain_task = EnsureDomainMembershipTask(agent.state, config_path=config_path)
    agent.register_task(name="ensure_domain_membership", task=ensure_domain_task, run_once=True)

    agent.register_task(name="bootstrap_check", task=CallBootstrapTask(agent.state), run_once=True)

    # Register a task that will fetch the running processes every 30 seconds
    agent.register_task(name="get_process_list", task=GetProcessListTask(agent.state), interval=5)

    domain_task = DomainDnsCheckTask(agent.state, config_path=config_path)
    agent.register_task(name="domain_dns_check", task=domain_task, interval=300, run_immediately=True)

    # NEW: Network listing task (every 5s)
    agent.register_task(name="network_list", task=NetworkListingTask(agent.state), interval=5)

    # Start core 
    agent.start_core()
