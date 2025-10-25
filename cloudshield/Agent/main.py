import os
from pathlib import Path

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
	return str(Path(__file__).resolve().parent / "config" / "agent_config.json")

agent = Agent(agent_id="agent-1", server_addr="127.0.0.1", port=50051, cache_path=resolve_cache_path())

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
