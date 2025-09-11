import grpc
from concurrent import futures
import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc

class AgentService(agent_pb2_grpc.AgentServiceServicer):
    def SendProcessList(self, request, context):
        print(f"Received process list from agent: {request.agent_id}")
        print(f"Timestamp: {request.timestamp}")
        print(f"Number of processes: {len(request.processes)}\n")

        # Print details of each process
        for proc in request.processes:
            cmd = " ".join(proc.cmdline) if proc.cmdline else ""
            print(f"PID: {proc.pid}, PPID: {proc.ppid}, Name: {proc.name}, Cmd: {cmd}")

        # Respond with acknowledgment
        return agent_pb2.Ack(success=True, message="Process list received successfully")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    agent_pb2_grpc.add_AgentServiceServicer_to_server(AgentService(), server)
    server.add_insecure_port("[::]:50051")
    print("Server started on port 50051")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()

