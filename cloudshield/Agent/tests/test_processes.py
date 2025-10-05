import pytest
from tasks.processes import GetProcessListTask


def test_get_process_list_returns_protobuf_processes(tmp_path):
    # Prepare a minimal agent state with a temporary cache path
    agent_state = {
        "agent_id": "test-agent",
        "server_addr": "127.0.0.1",
        "port": 50051,
        "cache_path": str(tmp_path)
    }

    task = GetProcessListTask(agent_state)
    processes = task.get_process_list()

    # Expect a list
    assert isinstance(processes, list)

    # If there are any processes, they should be protobuf Process messages with cmdline string
    for p in processes:
        # basic attribute checks
        assert hasattr(p, 'pid')
        assert hasattr(p, 'name')
        assert hasattr(p, 'cmdline')
        assert isinstance(p.cmdline, str)

    # This test is tolerant to environments with 0 processes returned by psutil.filtering
    assert isinstance(processes, list)
