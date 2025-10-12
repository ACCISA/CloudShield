from proto import agent_pb2
from proto import agent_pb2_grpc
from logger import core_logger

import os
import json
import time
import schedule
import grpc
from google.protobuf.json_format import ParseDict

PROTOBUFS = {
    "SendProcessList":"ProcessList",
    "SendProcessListInformation":"ProcessListAckRes"
}

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
        self.conn_attempt_interval = 10
        self.state = {
            "agent_id": agent_id,
            "server_addr": server_addr,
            "port": port,
            "cache_path": cache_path,
            "create_grpc_channel_cb": self.create_grpc_channel_cb
        }
        self.tasks = []
        self.channel = None
        self.stub = None
        self.conn_attempt_job = None

        # Ensure the cache directory exists. Use makedirs to create parent directories
        # and handle Windows paths like '/tmp/...' by falling back to a system temp dir
        try:
            os.makedirs(self.cache_path, exist_ok=True)
        except OSError as e:
            core_logger.error(f"Unable to create cache path '{self.cache_path}': {e}")
            import tempfile
            fallback = os.path.join(tempfile.gettempdir(), "agent_cache")
            try:
                os.makedirs(fallback, exist_ok=True)
                self.cache_path = fallback
                core_logger.info(f"Falling back to cache path: {self.cache_path}")
            except OSError as e2:
                core_logger.critical(f"Unable to create fallback cache path '{fallback}': {e2}")
                raise

        self.create_grpc_channel()

        if self.channel is None:
            self.conn_attempt_job = schedule.every(self.conn_attempt_interval).seconds.do(self.create_grpc_channel)
    
    def set_task_channels(self, channel, stub):
        for task in self.tasks:
            task['function'].set_channel(channel, stub)
        core_logger.info("Channel has been set to registered tasks")

    def create_grpc_channel_cb(self):
        """
        Callback function for rescheduling gRPC connection attempts.

        This function is intended to be used by tasks that need to retry connecting
        to the gRPC server. If the agent loses its connection, this callback ensures
        that the connection attempt is rescheduled according to the agent's retry policy.
        """
        self.channel = None
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
            self.stub = agent_pb2_grpc.AgentServiceStub(channel)
            schedule.cancel_job(self.conn_attempt_job)
            self.set_task_channels(channel, self.stub)
            self.channel = channel
            return

        core_logger.error("Unable to connect to grpc server")
        return None

    def register_task(self, name, task, interval=5, run_once=False):
        """
        Register a task to the scheduler. This task must inherit from BaseTask. Tasks that fail sending messages will write them to cache.
        """
        self.tasks.append({
            "task_name": name,
            "function": task,
            "interval": interval,
            "run_once": run_once
        })
        task.set_channel(self.channel, self.stub)
        if run_once is False:
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
        Checks for cached messages on disk and resends them to the central server. Cached messages are delete after being successfully sent

        If the server was unavailable when logs were generated, the agent stores them
        locally. This function is invoked by the agent core to retrieve any cached
        messages and attempt delivery once the server is reachable again.
        """
        if self.channel is None: 
            return

        messages = []
        for filename in os.listdir(self.cache_path):
            filepath = os.path.join(self.cache_path, filename)
            if os.path.isfile(filepath) and ".json" in filepath:
                with open(filepath, "r") as f:
                    try:
                        messages.append({"filename":filepath, "cache":json.load(f)})
                    except json.JSONDecodeError:
                        core_logger.warning(f"Skipping corrupted file: {filename}")

        for message in messages:
            filename = message["filename"]
            grpc_call_name = message["cache"]["grpc"]
            data = message["cache"]["data"]

            if not hasattr(self.stub, grpc_call_name):
                raise AttributeError(f"gRPC call '{grpc_call_name}' does not exist")

            core_logger.info(f"Sending pending RPC '{grpc_call_name}'")

            protobuf_str = PROTOBUFS[grpc_call_name]
            if not hasattr(agent_pb2, protobuf_str):
                raise AttributeError(f"gRPC call '{grpc_call_name}' does not have a protobuf '{protobuf_str}'")

            getattr(agent_pb2, protobuf_str)
            
            request = ParseDict(data, agent_pb2.ProcessList())

            request.is_pending = True

            grpc_call = getattr(self.stub, grpc_call_name)
            try:
                grpc_call(request)
                os.remove(filename)
            except grpc.RpcError as e:
                core_logger.error(e)
                core_logger.error("Unable to send pending messages. A cache message may be invalid")
        

        core_logger.info(f"{len(messages)} cached message will be sent to server")
    
    def start_core(self):
        """
        Main agent loop, run tasks at their respective intervals. Also runs tasks that should only be executed once
        """
        run_once_tasks = [task["function"].run() for task in self.tasks if task["run_once"] is True]
        core_logger.info(f"{len(run_once_tasks)} unique task were executed on startup")
        schedule.every(self.core_interval).seconds.do(self.send_pending_messages)
        core_logger.info("Main agent loop has started")
        while True:
            schedule.run_pending()
            time.sleep(1)
