import grpc
from proto import agent_pb2, agent_pb2_grpc

def main():
    channel = grpc.insecure_channel('127.0.0.1:50051')
    grpc.channel_ready_future(channel).result(timeout=5)
    stub = agent_pb2_grpc.AgentServiceStub(channel)
    req = agent_pb2.WorkstationInit(agent_id='test-client', domain='example.local')
    resp = stub.SendWorkstationInit(req)
    print('Response:', resp)

if __name__ == '__main__':
    main()
