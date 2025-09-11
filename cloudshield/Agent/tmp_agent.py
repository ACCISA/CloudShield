# TEMP CODE TO TEST gRPC
import grpc
import psutil
import socket
import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc
import time
import os

def collect_processes(agent_id):
    for proc in psutil.process_iter(['pid', 'name', 'exe', 'username', 'cpu_percent', 'memory_info', 'create_time']):
        try:
            yield agent_pb2.AgentData(
                agent_id=agent_id,
                timestamp=int(time.time()),
                process=agent_pb2.Process(
                    pid=proc.info['pid'],
                    name=proc.info['name'] or "",
                    exe=proc.info['exe'] or "",
                    username=proc.info['username'] or "",
                    cpu_percent=proc.info['cpu_percent'],
                    memory_usage=proc.info['memory_info'].rss if proc.info['memory_info'] else 0,
                    create_time=int(proc.info['create_time'])
                )
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

def collect_netstat(agent_id):
    for conn in psutil.net_connections(kind='inet'):
        yield agent_pb2.AgentData(
            agent_id=agent_id,
            timestamp=int(time.time()),
            net_conn=agent_pb2.NetworkConnection(
                local_address=conn.laddr.ip if conn.laddr else "",
                local_port=conn.laddr.port if conn.laddr else 0,
                remote_address=conn.raddr.ip if conn.raddr else "",
                remote_port=conn.raddr.port if conn.raddr else 0,
                status=conn.status,
                pid=conn.pid or 0
            )
        )

def collect_event_logs(agent_id, path="C:\\Windows\\System32\\winevt\\Logs\\System.evtx"):
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = f.read()
        yield agent_pb2.AgentData(
            agent_id=agent_id,
            timestamp=int(time.time()),
            event_log=agent_pb2.WindowsEventLog(
                filename=os.path.basename(path),
                data=data
            )
        )

def run_agent():
    channel = grpc.insecure_channel("localhost:50051")
    stub = agent_pb2_grpc.AgentServiceStub(channel)

    agent_id = socket.gethostname()

    def generator():
        yield from collect_processes(agent_id)
        yield from collect_netstat(agent_id)
        yield from collect_event_logs(agent_id)

    response = stub.StreamData(generator())
    print("Server response:", response.message)

if __name__ == "__main__":
    run_agent()

