import threading
import time
import tempfile
import os
import json

import grpc
from proto import agent_pb2, agent_pb2_grpc

from tools.mock_grpc_server import serve


def test_mock_server_records_rpc():
    # Use an ephemeral port to avoid collisions
    host = '127.0.0.1'
    port = 50060

    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.jsonl')
    os.close(tmp_fd)

    # start server in a thread
    t = threading.Thread(target=serve, kwargs={
        'host': host,
        'port': port,
        'out_file': tmp_path,
        'max_calls': 1,
        'timeout': 10
    }, daemon=True)
    t.start()

    # wait a short moment for server to start
    time.sleep(0.5)

    # create a channel and send a WorkstationInit RPC
    channel = grpc.insecure_channel(f"{host}:{port}")
    grpc.channel_ready_future(channel).result(timeout=5)
    stub = agent_pb2_grpc.AgentServiceStub(channel)

    req = agent_pb2.WorkstationInit(agent_id='test-agent', domain='example.local')
    resp = stub.SendWorkstationInit(req)
    assert resp.success is True

    # wait for server to record and shut down
    t.join(timeout=5)

    # read the recorded file and assert content
    with open(tmp_path, 'r', encoding='utf-8') as fh:
        lines = [json.loads(line) for line in fh if line.strip()]

    assert any(entry.get('rpc') == 'SendWorkstationInit' for entry in lines)

    # cleanup
    try:
        os.remove(tmp_path)
    except Exception:
        pass
