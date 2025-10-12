import unittest
import os
import shutil
from unittest.mock import patch, MagicMock
from proto import agent_pb2_grpc
from proto import agent_pb2
from tasks import GetProcessListTask
from core import Agent

class DummyTask:
            def __init__(self):
                self.run = lambda: "ok"
            
            def set_channel(self, channel, stub):
                pass

            def run(self):
                pass


class TestSendProcessList(unittest.TestCase):


    def test_send_pending_messages(self):
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=False, pids=[])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}
        folder = "/tmp/agent_cache"
        before = len([f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))])
        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub):
            task.run()

        after = len([f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))])
        assert before + 1 == after, "One file should have been written to cache since there is no connection"
        mock_stub.SendProcessList.assert_not_called()
        
        ag = Agent("agent1", "localhost", 1234, "/tmp/agent_cache")

        # mimic that a network connection is now available
        ag.channel = mock_stub
        ag.stub = mock_stub
        ag.send_pending_messages()

        cleared = len([f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))])

        assert cleared == 0


    def test_grpc_channel_creation(self):
        """
        Since there is no connection, the channel should not be created
        """
        ag = Agent("agent1", "localhost", 1234, "/tmp/agent_cache")
        with patch.object(ag, "is_grpc_server_up", return_value=True):
            ag.create_grpc_channel_cb()

        assert ag.stub is not None



    def test_grpc_channel_creation_callback(self):
        """
        Since there is no connection, the callback should keep the channel to None
        """
        ag = Agent("agent1", "localhost", 1234, "/tmp/agent_cache")
        ag.create_grpc_channel_cb()

        assert ag.channel is None


    def test_no_cache_path(self):
        """
        Test the cache path creation
        """
        cache = "/tmp/agent_cache"
        if os.path.exists(cache):
            shutil.rmtree(cache)
        Agent("agent1", "localhost", 1234, cache)
        assert os.path.isdir(cache), "Directory does not exist"
    
    def test_set_task_channels(self):
        """
        Test setting a grpc channel to all task
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=False, pids=[])
        ag = Agent("agent1", "localhost", 1234, "/tmp/agent_cache")

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        ag.register_task("get_process_list", task, 5)

        ag.set_task_channels(mock_stub, mock_stub)

        assert ag.tasks[0]["function"].channel is not None
        assert ag.tasks[0]["function"].stub is not None

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:
            task.run()
            mock_cache.assert_not_called()

            

        mock_stub.SendProcessList.assert_called_once()




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

    def test_send_process_list_information(self):
        """
        This test should not write the result of the task on disk since there is a mocked connection to a grpc server
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=True, pids=[])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:
            task.channel = mock_stub
            task.stub = mock_stub
            task.run()
            mock_cache.assert_not_called()

        mock_stub.SendProcessList.assert_called_once()
    
    def test_send_process_list_information_pids(self):
        """
        This test should not write the result of the task on disk since there is a mocked connection to a grpc server
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=True, pids=[1,2,3,4])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:
            task.channel = mock_stub
            task.stub = mock_stub
            task.run()
            mock_cache.assert_not_called()

        mock_stub.SendProcessList.assert_called_once()

    def test_set_channel(self):
        """
        Test the functionality of setting a channel and stub to a task after its creation
        """
        real_stub = agent_pb2_grpc.AgentServiceStub(MagicMock())
        mock_stub = MagicMock(spec=real_stub)
        mock_stub.SendProcessList.return_value = agent_pb2.ProcessListAck(action=True, pids=[1,2,3,4])

        task = GetProcessListTask(MagicMock())
        task.agent_state = {"agent_id":"agent-1", "cache_path":"/tmp/agent_cache"}

        with patch("proto.agent_pb2_grpc.AgentServiceStub", return_value=mock_stub), patch.object(task, "cache_message") as mock_cache:

            assert task.set_channel(None, mock_stub) is False
            assert task.set_channel(mock_stub, mock_stub) is True
            task.run()
            mock_cache.assert_not_called()

        mock_stub.SendProcessList.assert_called_once()



if __name__ == "__main__":
    unittest.main()
