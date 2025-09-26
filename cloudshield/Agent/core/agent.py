from logger import core_logger

import os
import json
import time
import schedule
import grpc

class Agent:

    def __init__(self, agent_id, server_addr, port, cache_path):
        """
        Initialize the agent and manage gRPC connectivity.

        When the agent class is instantiated, it attempts to create a gRPC channel
        to connect to the gRPC server. If the connection fails, `self.channel` is set
        to `None` and the core registers a task to retry the connection every
        `self.conn_attempt_interval` seconds.

        Once the connection succeeds, any registered tasks are updated with the
        active gRPC channel. This design ensures that the agent can continue its
        periodic monitoring tasks and write results to disk even if the server is
        down. The server being unavailable does not interrupt the agent, and it will
        keep attempting to reconnect. Once the server is back online, cached results
        can be forwarded automatically.
        """
        self.agent_id = agent_id
        self.server_addr = server_addr
        self.port = port
        self.cache_path = cache_path
        self.core_interval = 10
        self.conn_attempt_interval = 30
        self.state = {
            "agent_id": agent_id,
            "server_addr": server_addr,
            "port": port,
            "cache_path": cache_path,
            "create_grpc_channel_cb": self.create_grpc_channel_cb
        }
        self.tasks = []
        if not os.path.exists(cache_path) or not os.path.isdir(cache_path):
            os.mkdir(cache_path)

        self.channel = None
        self.conn_attempt_job = None
        self.create_grpc_channel()

        if self.channel is None:
            self.conn_attempt_job = schedule.every(self.conn_attempt_interval).seconds.do(self.create_grpc_channel)
    
    def set_task_channels(self, channel):
        for task in self.tasks:
            task['function'].set_channel(channel)
        core_logger.info("Channel has been set to registered tasks")

    def create_grpc_channel_cb(self):
        """
        Callback function for rescheduling gRPC connection attempts.

        This function is intended to be used by tasks that need to retry connecting
        to the gRPC server. If the agent loses its connection, this callback ensures
        that the connection attempt is rescheduled according to the agent's retry policy.
        """
        self.create_grpc_channel()
        schedule.every(self.conn_attempt_interval).seconds.do(self.create_grpc_channel)
        core_logger.info("Rescheduled 'create_grpc_channel' from callback function")
    
    def create_grpc_channel(self):
        """
        Attempt to create a gRPC channel and connect to the server.

        This function tries to establish a channel with the gRPC server and checks
        its availability using `self.is_grpc_server_up()`. If the server is reachable,
        the channel is assigned to all tasks so they can forward results. The
        recurring job that periodically attempts to connect to the server is also
        canceled once a successful connection is made.

        If the server is not reachable, the function returns, and the
        agent will retry the connection after `self.conn_attempt_interval` seconds.

        Note: This function will block the agent until the connection attempt is completed. We need to decide if we are okay with that. If not, we can implement an async or threaded approach.
        """
        channel = grpc.insecure_channel(f"{self.server_addr}:{str(self.port)}")

        if self.is_grpc_server_up(channel) is True:
            schedule.cancel_job(self.conn_attempt_job)
            self.set_task_channels(channel)
            self.channel = channel
            return

        core_logger.error("Unable to connect to grpc server")
        return None

    def register_task(self, name, task, interval):
        self.tasks.append({
            "task_name": name,
            "function": task,
            "interval": interval
        })
        task.set_channel(self.channel)
        schedule.every(interval).seconds.do(task.run)
        core_logger.info(f"Task {name} added to scheduler (interval={interval})")
    
    def check_workstation(self):
        """
        Check if our gRPC server is reachable.
        """
        pass

    def is_grpc_server_up(self, channel):
        """
        Check if a gRPC server is reachable.
        """
        try:
            grpc.channel_ready_future(channel).result(timeout=2)
            return True
        except grpc.FutureTimeoutError:
            return False

    
    def send_pending_messages(self):
        """
        Checks for cached messages on disk and resends them to the central server.

        If the server was unavailable when logs were generated, the agent stores them
        locally. This function is invoked by the agent core to retrieve any cached
        messages and attempt delivery once the server is reachable again.
        """
        messages = []
        for filename in os.listdir(self.cache_path):
            filepath = os.path.join(self.cache_path, filename)
            if os.path.isfile(filepath) and ".json" in filepath:
                with open(filepath, "r") as f:
                    try:
                        messages.append(json.load(f))
                    except json.JSONDecodeError:
                        core_logger.warning(f"Skipping corrupted file: {filename}")
    
    def start_core(self):
        """
        Main agent loop, run tasks at their respective intervals
        """
        schedule.every(self.core_interval).seconds.do(self.send_pending_messages)
        core_logger.info("Main agent loop has started")
        while True:
            schedule.run_pending()
            time.sleep(1)
