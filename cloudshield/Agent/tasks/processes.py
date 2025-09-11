from tasks import BaseTask
from proto import agent_pb2

import psutil
import time

class GetProcessListTask(BaseTask):
    def __init__(self, agent_state):
        super().__init__(agent_state)
        self.agent_state = agent_state

    def get_process_list(self):
        """
        Returns a list of process info dictionaries including pid, name, username,
        create_time, cpu_percent, memory usage, cmdline, and parent pid.
        """
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'create_time',
                                         'cpu_percent', 'memory_info', 'cmdline', 'ppid']):
            try:
                info = proc.info
                processes.append({
                    'pid': info['pid'],
                    'name': info['name'],
                    'username': info['username'],
                    'create_time': str(info['create_time']),
                    'cpu_percent': str(info['cpu_percent']),
                    'memory_usage': str(info['memory_info'].rss) if info['memory_info'] else "",
                    'cmdline': info['cmdline'],
                    'ppid': info['ppid']
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return processes

    def run(self):
        processes = self.get_process_list()
        request = agent_pb2.ProcessList(
            agent_id=self.agent_state["agent_id"],
            timestamp=int(time.time()),
            processes=processes
        )

        self.send("SendProcessList", request)
