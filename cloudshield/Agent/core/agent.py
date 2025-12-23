"""CloudShield agent core managing gRPC connectivity and task scheduling."""
from proto import agent_pb2, agent_pb2_grpc
from logger import core_logger

import os
import json
import time
import schedule
import grpc
from google.protobuf.json_format import ParseDict

PROTOBUFS = {
    "SendProcessList":"ProcessList",
    "SendProcessListInformation":"ProcessListAckRes",
    "SendNetworkConnections": "NetConnList",
}


class Agent:
    """CloudShield monitoring agent with automatic gRPC reconnection."""

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
        """
        Update all registered tasks with the active gRPC channel.

        This method is called when the agent successfully establishes or re-establishes
        a connection to the server, ensuring all tasks have access to the current channel.
        """
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

        Note: This function will block the agent until the connection attempt is completed.
        We need to decide if we are okay with that. If not, we can implement an async
        or threaded approach.
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

    def register_task(self, name, task, interval=5, run_once=False, run_immediately=False):
        """
        Register a task to the scheduler. This task must inherit from BaseTask.
        Tasks that fail sending messages will write them to cache.
        """
        self.tasks.append({
            "task_name": name,
            "function": task,
            "interval": interval,
            "run_once": run_once,
            "run_immediately": run_immediately,
        })
        task.set_channel(self.channel, self.stub)
        if run_once is False:
            schedule.every(interval).seconds.do(task.run)
        core_logger.info(f"Task {name} added to scheduler (interval={interval})")
        if run_immediately:
            try:
                task.run()
            except Exception as exc:
                core_logger.error(f"Task '{name}' failed during immediate run: {exc}")

    def check_workstation(self):
        """Placeholder for workstation checks. Maintained for compatibility."""
        return None

    def is_grpc_server_up(self, channel):
        """
        Check if a gRPC server is reachable.
        """
        try:
            grpc.channel_ready_future(channel).result(timeout=2)
            return True
        except grpc.FutureTimeoutError:
            return False


    def _get_cached_files(self):
        """Get sorted list of cached JSON files."""
        try:
            entries = []
            for fn in os.listdir(self.cache_path):
                path = os.path.join(self.cache_path, fn)
                if os.path.isfile(path) and fn.endswith(".json"):
                    entries.append(path)
            entries.sort()
            return entries
        except FileNotFoundError:
            return []

    def _load_cached_message(self, filepath):
        """Load and validate cached message from file. Returns None if invalid."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                cached = json.load(f)
        except json.JSONDecodeError:
            core_logger.warning(f"Skipping corrupted file: {os.path.basename(filepath)}")
            return None
        except Exception as e:
            core_logger.warning(f"Skipping unreadable file {os.path.basename(filepath)}: {e}")
            return None

        grpc_call_name = cached.get("grpc")
        data = cached.get("data")
        if not grpc_call_name or data is None:
            core_logger.warning(f"Skipping malformed cache: {os.path.basename(filepath)}")
            return None

        return {"grpc_call_name": grpc_call_name, "data": data}

    def _build_grpc_request(self, grpc_call_name, data):
        """Build gRPC request from cached data."""
        grpc_call = getattr(self.stub, grpc_call_name)
        msg_name = PROTOBUFS.get(grpc_call_name) or grpc_call_name.replace("Send", "")
        msg_cls = getattr(agent_pb2, msg_name)
        request = ParseDict(data, msg_cls())

        try:
            setattr(request, "is_pending", True)
        except Exception:
            pass

        return grpc_call, request

    def _send_cached_message(self, filepath, grpc_call_name, data):
        """Send a single cached message. Returns True if successful."""
        grpc_call, request = self._build_grpc_request(grpc_call_name, data)
        core_logger.info(f"Sending pending RPC '{grpc_call_name}'")

        try:
            grpc_call(request)
            os.remove(filepath)
            return True
        except grpc.RpcError as e:
            core_logger.error(e)
            core_logger.error("Unable to send pending messages. A cache message may be invalid")
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

        entries = self._get_cached_files()
        if not entries:
            return

        sent_count = 0
        for filepath in entries:
            cached_msg = self._load_cached_message(filepath)
            if cached_msg is None:
                continue

            if self._send_cached_message(filepath, cached_msg["grpc_call_name"], cached_msg["data"]):
                sent_count += 1

        core_logger.info(f"{sent_count} cached message(s) sent; {len(entries) - sent_count} left on disk")


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
