import tempfile
import os
from core import Agent 
from tasks import GetProcessListTask, CallBootstrapTask
from tasks.network import NetworkListingTask

cache_dir = os.path.join(tempfile.gettempdir(), "agent_cache")

agent = Agent(agent_id="agent-1", server_addr="127.0.0.1", port=50051, cache_path=cache_dir)
# Register a task that will run once and execute our bootstrap script
agent.register_task(name="bootstrap_check", task=CallBootstrapTask(agent.state), run_once=True)
# Register a task that will fetch the running processes every 30 seconds
agent.register_task(name="get_process_list", task=GetProcessListTask(agent.state), interval=5)

# NEW: Network listing task (every 5s)
agent.register_task(name="network_list", task=NetworkListingTask(agent.state), interval=5)

# Start core 
agent.start_core()
