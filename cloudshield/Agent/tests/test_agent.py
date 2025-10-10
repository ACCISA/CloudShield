import unittest
import time
from unittest.mock import patch, MagicMock
from proto import agent_pb2_grpc
from proto import agent_pb2
from tasks import GetProcessListTask, BaseTask
from core import Agent

class DummyTask:
            def __init__(self):
                self.run = lambda: "ok"
            
            def set_channel(self, channel, stub):
                pass

            def run(self):
                pass


class TestSendProcessList(unittest.TestCase):

    def test_cache(self):
        pass

    def test_register_task_adds_task(self):
        ag = Agent("agent1", "localhost", 1234, "/tmp/agent_cache")
        d = DummyTask()
        ag.register_task("dummy", d, 2)

        assert len(ag.tasks) == 1
        assert ag.tasks[0]["task_name"] == "dummy"

    def test_send_process_list_offline(self):
        """
        This test should write the result of the task on disk since there is no connection to a grpc server
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=False, pids=[])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}
        
        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:
            task.run()
            mock_cache.assert_called_once()

        mock_stub.SendProcessList.assert_not_called()


    def test_send_process_list(self):
        """
        This test should not write the result of the task on disk since there is a mocked connection to a grpc server
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=False, pids=[])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:
            task.channel = mock_stub
            task.stub = mock_stub
            task.run()
            mock_cache.assert_not_called()

            

        mock_stub.SendProcessList.assert_called_once()


if __name__ == "__main__":
    unittest.main()
