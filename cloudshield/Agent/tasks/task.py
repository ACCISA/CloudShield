
from proto import agent_pb2_grpc

import grpc
from abc import ABC, abstractmethod

class BaseTask(ABC):

    def __init__(self, agent_state):
        # TODO setup TLS for a secure channel
        self.agent_state = agent_state
        self.channel = grpc.insecure_channel(f"{self.agent_state['server_addr']}:{self.agent_state['port']}")
        self.stub = agent_pb2_grpc.AgentServiceStub(self.channel)

    @abstractmethod
    def run(self):
        """
        Execute the task
        """
        pass

    def send(self, grpc_call_name, request):
        """
        Send the result of the task to the server using the provided grpc name. For this to work the RPC call has to be defined in a .proto file and the stub code has to be generated inside of proto/
        """
        if not hasattr(self.stub, grpc_call_name):
            raise AttributeError(f"gRPC call '{grpc_call_name}' does not exist")
        
        grpc_call = getattr(self.stub, grpc_call_name)

        return grpc_call(request)
