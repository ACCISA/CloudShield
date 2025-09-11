from core import Agent 
from tasks import GetProcessListTask

agent = Agent(agent_id="agent-1", server_addr="localhost", port=50051)
# Register a task that will fetch the running processes every 30 seconds
agent.register_task(name="get_process_list", task=GetProcessListTask(agent.state), interval=5)
agent.start_core()
