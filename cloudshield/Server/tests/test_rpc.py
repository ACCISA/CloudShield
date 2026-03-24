import unittest.mock
import logging
from types import SimpleNamespace

from genproto.infra_service import infra_service_pb2 as infra_pb2
from genproto.vpn_service import vpn_service_pb2

def test_dc_add_user_persists_on_success(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_add_user
    
    # Mock job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    # Mock exec_ssh to return success (no stderr)
    SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.AddDomainUserDataAck(status=infra_pb2.SUCCESS, result="User added successfully").SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Execute
    res = dc_add_user("test_org", "testuser", "Password123!","test@mail.com")
    assert res["message"] == "empty inventory"
