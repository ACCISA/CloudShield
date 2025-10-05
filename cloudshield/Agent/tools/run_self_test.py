"""
Start the mock server in a thread, send one WorkstationInit RPC, and print the recorded JSONL.
This runs in a single process so you don't need multiple terminals.
"""
import threading
import time
import os
import json
import tempfile

import sys
import os
import grpc

# Ensure the Agent package root is on sys.path when running this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AGENT_ROOT = os.path.dirname(SCRIPT_DIR)
if AGENT_ROOT not in sys.path:
    sys.path.insert(0, AGENT_ROOT)

from proto import agent_pb2, agent_pb2_grpc

from tools.mock_grpc_server import serve


def main():
    host = '127.0.0.1'
    port = 50051
    out_file = os.path.join(os.path.dirname(__file__), 'received_requests_selftest.jsonl')
    # remove existing
    try:
        if os.path.exists(out_file):
            os.remove(out_file)
    except Exception:
        pass

    # start server in thread with max_calls=1 so it auto exits
    t = threading.Thread(target=serve, kwargs={
        'host': host,
        'port': port,
        'out_file': out_file,
        'max_calls': 1,
        'timeout': 10
    }, daemon=True)
    t.start()

    # wait for server to be ready
    deadline = time.time() + 5
    channel = grpc.insecure_channel(f"{host}:{port}")
    try:
        grpc.channel_ready_future(channel).result(timeout=5)
    except Exception as e:
        print('Failed to connect to server:', e)
        return

    stub = agent_pb2_grpc.AgentServiceStub(channel)
    req = agent_pb2.WorkstationInit(agent_id='selftest-agent', domain='example.local')
    resp = stub.SendWorkstationInit(req)
    print('RPC response:', resp)

    # wait for server thread to finish
    t.join(timeout=10)

    # print recorded file
    if os.path.exists(out_file):
        with open(out_file, 'r', encoding='utf-8') as fh:
            data = [json.loads(l) for l in fh if l.strip()]
        print('Recorded entries:', json.dumps(data, indent=2))
    else:
        print('No recorded file found at', out_file)

if __name__ == '__main__':
    main()
