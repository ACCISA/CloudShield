import grpc
from concurrent import futures
import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc

class AgentService(agent_pb2_grpc.AgentServiceServicer):
    def StreamData(self, request_iterator, context):
        for data in request_iterator:
            if data.HasField("process"):
                print(f"[Process] {data.process.pid} - {data.process.name}")
            elif data.HasField("net_conn"):
                print(f"[NetConn] {data.net_conn.local_address}:{data.net_conn.local_port} -> "
                      f"{data.net_conn.remote_address}:{data.net_conn.remote_port} "
                      f"({data.net_conn.status})")
            elif data.HasField("event_log"):
                print(f"[EventLog] Received {len(data.event_log.data)} bytes from {data.event_log.filename}")
        return agent_pb2.Ack(success=True, message="Data received")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    agent_pb2_grpc.add_AgentServiceServicer_to_server(AgentService(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("Server started on port 50051")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()

