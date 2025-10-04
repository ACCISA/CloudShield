from tasks import BaseTask
from proto import agent_pb2
from logger import task_logger

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
                # Normalize fields that can be None or unexpected types
                pid = info.get('pid')
                name = info.get('name') or ''
                username = info.get('username') or ''
                create_time = str(info.get('create_time') or '')
                cpu_percent = str(info.get('cpu_percent') or '')
                memory_usage = ''
                if info.get('memory_info') and hasattr(info['memory_info'], 'rss'):
                    memory_usage = str(info['memory_info'].rss)

                # cmdline may be a list of strings or a single string; ensure it's iterable
                raw_cmdline = info.get('cmdline') or []
                if isinstance(raw_cmdline, str):
                    cmdline_str = raw_cmdline
                else:
                    try:
                        # Filter out non-string items and convert to string as fallback
                        cmdline_parts = [str(x) for x in raw_cmdline if x is not None]
                        cmdline_str = " ".join(cmdline_parts)
                    except TypeError:
                        cmdline_str = ''

                processes.append(agent_pb2.Process(
                    pid=pid,
                    name=name,
                    username=username,
                    create_time=create_time,
                    cpu_percent=cpu_percent,
                    memory_usage=memory_usage,
                    cmdline=cmdline_str,
                    ppid=info.get('ppid') or 0
                ))
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return processes

    def get_process_information(self, pid):
        return {"pid": 1, "name":"name"}

    def run(self):
        processes = self.get_process_list()
        request = agent_pb2.ProcessList(
            agent_id=self.agent_state["agent_id"],
            timestamp=int(time.time()),
            processes=processes,
            is_pending=False
        )

        response = self.send("SendProcessList", request)

        if response is None: 
            return

        if response.action is True:
            task_logger.info("Responding to GRPC Server with detailed process info")
            pids = response.pids
            processes_info = []
            for pid in pids:
                processes_info.append(self.get_process_information(pid))
            
            request_res = agent_pb2.ProcessListAckRes(
                    agent_id=self.agent_state["agent_id"],
                    timestamp=int(time.time()),
                    processes=processes_info,
                    is_pending=False
            )

            self.send("SendProcessListInformation", request_res)
