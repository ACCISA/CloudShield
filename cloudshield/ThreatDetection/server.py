import signal
import time
import threading
import schedule
import time
import grpc
import urllib.parse
from concurrent import futures

import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc

from utils import get_agents, get_ip, is_valid_agent
from servicer import AgentServiceServicer

agents = get_agents()
heartbeats = {}


def log_heartbeat(agent_id, method):
    global heartbeats
    logged_heartbeats = heartbeats.get(agent_id, None)

    if logged_heartbeats is None:
        heartbeats[agent_id] = [method]
        return

    heartbeats[agent_id].append(method)


class ClientIPInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        method_name = handler_call_details.method
        handler = continuation(handler_call_details)
        if handler is None:
            return None  # no handler found, skip

        # Wrap unary-unary calls (most common)
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
                print(f"[Interceptor] Client IP: {ip}")
                if not is_valid_agent(agents, ip, agent_id):
                    print("invalid agent tried to talk to grpc")
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Invalid Agent")
                log_heartbeat(agent_id, method_name)
                return handler.unary_unary(request, context)

            return grpc.unary_unary_rpc_method_handler(
                new_unary_unary,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer
            )

        return handler

def serve(bind_address="0.0.0.0:50051"):
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=[ClientIPInterceptor()]
    )

    agent_pb2_grpc.add_AgentServiceServicer_to_server(
        AgentServiceServicer(), server
    )
    server.add_insecure_port(bind_address)

    server.start()
    print(f"gRPC server listening on {bind_address}")
    server.wait_for_termination()
    print("Server stopped.")

def print_heartbeats():
    while True:
        print("heartbeats ----------------")
        print(heartbeats)
        time.sleep(5)


if __name__ == "__main__":
    t = threading.Thread(target=print_heartbeats, daemon=True)
    t.start()

    serve()
