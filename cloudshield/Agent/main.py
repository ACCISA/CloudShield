import os
from pathlib import Path

from core import Agent 
from tasks import GetProcessListTask
from tasks import GetProcessListTask, CallBootstrapTask


def resolve_cache_path() -> str:
	"""Create a cache directory in a non-publicly writable location."""
	program_data = os.getenv("PROGRAMDATA")
	if program_data:
		base_dir = Path(program_data) / "CloudShield" / "Agent"
	else:
		base_dir = Path.home() / ".cloudshield" / "agent"
	base_dir.mkdir(parents=True, exist_ok=True)
	return str(base_dir)

agent = Agent(agent_id="agent-1", server_addr="127.0.0.1", port=50051, cache_path=resolve_cache_path())
agent.register_task(name="bootstrap_check", task=CallBootstrapTask(agent.state), run_once=True)
# Register a task that will fetch the running processes every 30 seconds
agent.register_task(name="get_process_list", task=GetProcessListTask(agent.state), interval=5)

# Start core 
agent.start_core()
