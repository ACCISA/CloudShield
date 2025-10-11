import unittest
import pytest
from unittest.mock import patch, MagicMock
from proto import agent_pb2_grpc
from proto import agent_pb2
from tasks import BaseTask, GetProcessListTask
from core import Agent

class DummyTask(BaseTask):
            def __init__(self, agent_state):
                self.agent_state = agent_state
            
            def set_channel(self, channel, stub):
                pass

            def run(self):
                self.send("UnknownGRPCMethod", None)


class TestSendProcessList(unittest.TestCase):

    def test_cache_message_written(self):
        """
        Test that a grpc request was stored on disk
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=True, pids=[1,2,3,4])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub):
            result = task.run()



    def test_task_invalid_grpc(self):
        """
        Test a custom task that is implemented with an unknown gRPC method
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=True, pids=[1,2,3,4])

        task = DummyTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:
            task.stub = mock_stub
            task.channel = mock_stub
            with pytest.raises(AttributeError) as errorStr:
                result = task.run()
            assert "does not exist" in str(errorStr)
            mock_cache.assert_not_called()



if __name__ == "__main__":
    unittest.main()
