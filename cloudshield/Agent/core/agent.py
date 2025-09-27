from .logging_setup import logger

import time
#import grpc
import schedule

class Agent:

    def __init__(self, agent_id, server_addr, port):
        self.agent_id = agent_id
        self.server_addr = server_addr
        self.port = port
        self.state = {
            "agent_id": agent_id,
            "server_addr": server_addr,
            "port": port
        }
        self.tasks = []

    def register_task(self, name, task, interval):
        self.tasks.append({
            "task_name": name,
            "function": task,
            "interval": interval
        })
        schedule.every(interval).seconds.do(task.run)
        logger.info(f"Task {name} added to scheduler (interval={interval})")
    
    def check_workstation(self):
        pass

    def start_core(self):
        """
        Main agent loop, run tasks at their respective intervals
        """
        logger.info("Main agent loop has started")
        while True:
            schedule.run_pending()
            time.sleep(1)


