try:  # Honour legacy flat module first for compatibility with tests
    from logger import task_logger  # type: ignore
except ImportError:  # pragma: no cover - fallback to package-relative import
    from ..logger import task_logger

import os
import grpc
import json
from datetime import datetime
from abc import ABC, abstractmethod
from google.protobuf.json_format import MessageToDict


def _to_json_compatible(value):
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, dict):
        return {k: _to_json_compatible(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_json_compatible(v) for v in value]
    if hasattr(value, "__dict__"):
        return {k: _to_json_compatible(v) for k, v in vars(value).items() if not k.startswith("_")}
    return str(value)


def _serialize_request(request):
    """Return a JSON-serialisable representation of a gRPC request."""
    try:
        return MessageToDict(request, preserving_proto_field_name=True)
    except (AttributeError, TypeError, ValueError):
        return _to_json_compatible(request)

class BaseTask(ABC):

    def __init__(self, agent_state):
        # TODO setup TLS for a secure channel
        self.agent_state = agent_state
        self.channel = None
        self.stub = None

    def set_channel(self, channel, stub):
        if channel is None: 
            return False
        self.channel = channel
        self.stub = stub
        return True

    @abstractmethod
    def run(self):
        """
        Execute the task
        """
        pass

    def cache_message(self, grpc_call_name, request):
        """
        Writes a message to disk for later retry.

        The message is saved to the location specified by `cache_path` in the agent
        configuration. This allows the agent to persist messages when the server is
        unavailable and resend them later.
        """
        # TODO set limit for cache size
        # Use a safe filename (no colons) to support Windows filesystems
        curtime = datetime.now().strftime(f"%Y-%m-%d_%H-%M-%S_{grpc_call_name}_message.json")
        filepath = os.path.join(self.agent_state["cache_path"], curtime)
        os.makedirs(self.agent_state["cache_path"], exist_ok=True)
        request_json = _serialize_request(request)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({"grpc": grpc_call_name, "data": request_json}, f, ensure_ascii=False)

    def send(self, grpc_call_name, request):
        """
        Send the result of the task to the server using the provided grpc name. For this to work the RPC call has to be defined in a .proto file and the stub code has to be generated inside of proto/
        """
        if self.channel is None:
            task_logger.info(f"Storing RPC '{grpc_call_name}' on disk")
            self.cache_message(grpc_call_name,request)
            return None

        if not hasattr(self.stub, grpc_call_name):
            raise AttributeError(f"gRPC call '{grpc_call_name}' does not exist")

        task_logger.info(f"Sending RPC '{grpc_call_name}'")
        
        grpc_call = getattr(self.stub, grpc_call_name)
        
        try:
            return grpc_call(request)
        except grpc.RpcError as e:
            self.cache_message(grpc_call_name,request)
            task_logger.error(e)
            task_logger.error("Unable to reach server, message written to disk")
            self.channel = None
            self.agent_state["create_grpc_channel_cb"]()
            return None

