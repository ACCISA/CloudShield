"""gRPC threat detection server with agent authentication and heartbeat monitoring."""
import time
import threading
import grpc
from concurrent import futures

import proto.agent_pb2_grpc as agent_pb2_grpc

from utils import get_agents, is_valid_agent
from servicer import AgentServiceServicer
from state import state_manager
from logger import state_logger, server_logger, interceptor_logger

agents = get_agents()
heartbeats = {}


def log_heartbeat(agent_id, method):
    """Record agent heartbeat with method name."""
    global heartbeats
    logged_heartbeats = heartbeats.get(agent_id, None)

    if logged_heartbeats is None:
        heartbeats[agent_id] = [method]
        return

    heartbeats[agent_id].append(method)


class ClientIPInterceptor(grpc.ServerInterceptor):
    """gRPC interceptor for IP-based agent authentication and heartbeat tracking."""

    def intercept_service(self, continuation, handler_call_details):
        method_name = handler_call_details.method
        handler = continuation(handler_call_details)
        if handler is None:
            return None

        if handler.unary_unary:
            def new_unary_unary(request, context):
                peer = context.peer()
                agent_id = getattr(request, "agent_id", None)
                if peer.startswith("ipv4:"):
                    ip = peer.split(":")[1]
                elif peer.startswith("ipv6:"):
                    ip = peer.split("]:")[0][5:]
                else:
                    ip = "unknown"
                if not is_valid_agent(agents, ip, agent_id):
                    interceptor_logger.warning("invalid agent tried to talk to grpc")
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Invalid Agent")

                if agent_id is None:
                    interceptor_logger.warning("rpc message received with no agent_id")
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Invalid RPC call")

                log_heartbeat(agent_id, method_name)
                return handler.unary_unary(request, context)

            return grpc.unary_unary_rpc_method_handler(
                new_unary_unary,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer
            )

        return handler


def serve(bind_address="0.0.0.0:50051"):
    """Start gRPC server with agent authentication interceptor."""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=[ClientIPInterceptor()]
    )

    agent_pb2_grpc.add_AgentServiceServicer_to_server(
        AgentServiceServicer(""), server
    )
    server.add_insecure_port(bind_address)

    server.start()
    server_logger.info(f"gRPC server listening on {bind_address}")
    server.wait_for_termination()
    server_logger.info("Server stopped.")

def print_heartbeats():
    while True:
        time.sleep(5)

def monitor_state():
    state_logger.info("monitoring thread has started")
    while True:
        state_manager.alert_missing_responses()
        time.sleep(5)

if __name__ == "__main__":
    t = threading.Thread(target=print_heartbeats, daemon=True)
    t2= threading.Thread(target=monitor_state, daemon=True)
    t.start()
    t2.start()

    serve()
