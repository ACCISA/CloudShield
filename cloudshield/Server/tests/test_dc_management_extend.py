import unittest.mock
from types import SimpleNamespace
import socket
import paramiko
import pytest
import logging

from cloudshield.Server.tasks.dc_management import (
    exec_ssh,
    forward_ssh_tunnel,
    ExecSSHConfig
)

@pytest.fixture(autouse=True)
def configure_logging(caplog):
    """Configure logging for tests."""
    logging.basicConfig(level=logging.DEBUG)
    yield
    caplog.clear()

@pytest.fixture
def mock_logger():
    return logging.getLogger("test")

class MockSocket:
    def __init__(self):
        self.bind_called = False
        self.local_address = ('localhost', 12345)

    def bind(self, *args):
        self.bind_called = True

    def listen(self, *args):
        pass

    def setsockopt(self, *args):
        pass

    def getsockname(self):
        return self.local_address

    def close(self):
        pass

class TestDCManagementExtended:
    def test_exec_ssh_connection_error(self, monkeypatch, caplog, mock_logger):
        """Test exec_ssh handling when SSH connection fails"""
        
        class FailingSSHClient:
            def set_missing_host_key_policy(self, policy):
                pass
                
            def connect(self, *args, **kwargs):
                raise paramiko.SSHException("Connection failed")

            def close(self):
                pass
        
        monkeypatch.setattr('paramiko.SSHClient', lambda: FailingSSHClient())
        monkeypatch.setattr('cloudshield.Server.tasks.dc_management.get_available_local_port', lambda: 12345)
        
        # Mock ExecSSHConfig
        class MockExecSSHConfig:
            def __init__(self, org_id):
                self.vpn_ip = "1.2.3.4"
                self.vpn_key = "/tmp/key.pem"
                self.dc_priv_ip = "10.0.0.5"
                self.dc_key = "/tmp/dc.pem"
                self.failed = True
                
            def populate_config(self):
                return self
        
        monkeypatch.setattr(
            'cloudshield.Server.tasks.dc_management.ExecSSHConfig',
            MockExecSSHConfig
        )
        with pytest.raises(paramiko.ssh_exception.SSHException) as exec_err:
            result = exec_ssh("test_org", "test command", logger=mock_logger)
            assert result is None
        assert "Connection failed" in str(exec_err.value)

    def test_forward_tunnel_socket_error(self, monkeypatch, caplog, mock_logger):
        """Test forward_tunnel handling of socket errors"""
        
        monkeypatch.setattr('socket.socket', lambda *args, **kwargs: MockSocket())
        
        transport = unittest.mock.MagicMock()
        
        res = forward_ssh_tunnel(12345, "localhost", 22, transport, 3389, logger=mock_logger)

        assert res is None


class TestDCManagementExtendedSSH:
    @pytest.fixture(autouse=True)
    def mock_inventory(self, monkeypatch):
        """Mock get_inventory_from_org_id to return a successful inventory."""
        mock_inventory_data = {
            "org_id": "test_org",
            "assets": ["asset1", "asset2"],  # Example assets
            "vpn_ip": "1.2.3.4",
            "vpn_key": "/tmp/key.pem",
            "dc_priv_ip": "10.0.0.5",
            "dc_key": "/tmp/dc.pem"
        }

        monkeypatch.setattr('cloudshield.Server.tasks.dc_management.get_inventory_from_org_id', lambda org_id: mock_inventory_data)

    def test_exec_ssh_connection_error(self, monkeypatch, mock_logger):
        """Test exec_ssh handling when SSH connection fails"""
        
        class FailingSSHClient:
            def set_missing_host_key_policy(self, policy):
                pass
                
            def connect(self, *args, **kwargs):
                raise paramiko.SSHException("Connection failed")

            def close(self):
                pass
        
        monkeypatch.setattr('paramiko.SSHClient', lambda: FailingSSHClient())
        monkeypatch.setattr('cloudshield.Server.tasks.dc_management.get_available_local_port', lambda: 12345)
        
        # Mock ExecSSHConfig
        class MockExecSSHConfig:
            def __init__(self, org_id):
                self.vpn_ip = "1.2.3.4"
                self.vpn_key = "/tmp/key.pem"
                self.dc_priv_ip = "10.0.0.5"
                self.dc_key = "/tmp/dc.pem"
                self.failed = True
                
            def populate_config(self):
                return self
        
        monkeypatch.setattr(
            'cloudshield.Server.tasks.dc_management.ExecSSHConfig',
            MockExecSSHConfig
        )
        with pytest.raises(paramiko.ssh_exception.SSHException) as ssh_error:
            result = exec_ssh("test_org", "test command", logger=mock_logger)
            assert result is None
            assert "Connection Failed" in ssh_error

    def test_exec_ssh_success(self, monkeypatch, mock_logger):
        """Test exec_ssh handling when SSH connection succeeds"""
        
        class SuccessSSHClient:
            
            def get_transport(self):
                return {}

            def set_missing_host_key_policy(self, policy):
                pass
                
            def connect(self, *args, **kwargs):
                pass

            def exec_command(self, command):
                print("ASDASDASD")
                return (None, SimpleNamespace(read=lambda: b"success output\n"), None)

            def close(self):
                pass
        
        monkeypatch.setattr('paramiko.SSHClient', lambda: SuccessSSHClient())
        monkeypatch.setattr('cloudshield.Server.tasks.dc_management.get_available_local_port', lambda: 12345)
        
        # Mock ExecSSHConfig
        class MockExecSSHConfig:
            def __init__(self, org_id):
                self.vpn_ip = "1.2.3.4"
                self.vpn_key = "/tmp/key.pem"
                self.dc_priv_ip = "10.0.0.5"
                self.dc_key = "/tmp/dc.pem"
                self.failed = True
                
            def populate_config(self):
                return self
        
        monkeypatch.setattr(
            'cloudshield.Server.tasks.dc_management.ExecSSHConfig',
            MockExecSSHConfig
        )
        
        result = exec_ssh("test_org", "echo hello", logger=mock_logger)
        assert result.stdout == "success output"
        assert result.stderr is None

    def test_forward_tunnel_socket_error(self, monkeypatch, mock_logger):
        """Test forward_tunnel handling of socket errors"""
        
        monkeypatch.setattr('socket.socket', lambda *args, **kwargs: MockSocket())
        
        transport = unittest.mock.MagicMock()
        
        forward_ssh_tunnel(12345, "localhost", 22, transport, 3389, logger=mock_logger)
        

    def test_forward_tunnel_success(self, monkeypatch, mock_logger):
        """Test forward_tunnel handling when successful"""
        
        class SuccessTransport:
            def open_channel(self, *args, **kwargs):
                return SimpleNamespace()

            def close(self):
                pass
        
        monkeypatch.setattr('socket.socket', lambda *args, **kwargs: MockSocket())
        
        transport = SuccessTransport()
        result = forward_ssh_tunnel(12345, "localhost", 22, transport, 3389, logger=mock_logger)
        
        assert result is None  # Assuming forward_ssh_tunnel returns None on success

    @pytest.mark.parametrize("transport_error", [
        paramiko.SSHException("Channel error"),
        socket.error("Network error"),
        Exception("Unknown error")
    ])
    def test_forward_tunnel_transport_errors(self, transport_error, monkeypatch, mock_logger):
        """Test forward_tunnel handling of various transport errors"""
        
        monkeypatch.setattr('socket.socket', lambda *args, **kwargs: MockSocket())
        
        transport = unittest.mock.MagicMock()
        forward_ssh_tunnel(12345, "localhost", 22, transport, 3389, logger=mock_logger)
        
    def test_exec_ssh_with_command_timeout(self, monkeypatch, mock_logger):
        """Test exec_ssh with command execution timeout"""
        
        class TimeoutSSHClient:
            def set_missing_host_key_policy(self, policy):
                pass
                
            def connect(self, *args, **kwargs):
                pass
                
            def exec_command(self, *args, **kwargs):
                raise socket.timeout("Command timed out")
                
            def close(self):
                pass

            def get_transport(self):
                return {}
                
        monkeypatch.setattr('paramiko.SSHClient', lambda: TimeoutSSHClient())
        monkeypatch.setattr('cloudshield.Server.tasks.dc_management.get_available_local_port', lambda: 12345)
        
        # Mock ExecSSHConfig
        class MockExecSSHConfig:
            def __init__(self, org_id):
                self.vpn_ip = "1.2.3.4"
                self.vpn_key = "/tmp/key.pem"
                self.dc_priv_ip = "10.0.0.5"
                self.dc_key = "/tmp/dc.pem"
                self.failed = True
                
            def populate_config(self):
                return self
        
        monkeypatch.setattr(
            'cloudshield.Server.tasks.dc_management.ExecSSHConfig',
            MockExecSSHConfig
        )
        with pytest.raises(TimeoutError) as exec_err:
            result = exec_ssh("test_org", "long_running_command", logger=mock_logger)
            assert result is None
            assert "Command timed out" in exec_err

    def test_exec_ssh_invalid_command(self, monkeypatch, mock_logger):
        """Test exec_ssh with an invalid command"""
        
        class InvalidCommandSSHClient:
            def set_missing_host_key_policy(self, policy):
                pass

            def get_transport(self):
                return {}
                
            def connect(self, *args, **kwargs):
                pass

            def exec_command(self, command):
                raise ValueError("Invalid command")

            def close(self):
                pass
        
        monkeypatch.setattr('paramiko.SSHClient', lambda: InvalidCommandSSHClient())
        monkeypatch.setattr('cloudshield.Server.tasks.dc_management.get_available_local_port', lambda: 12345)
        
        # Mock ExecSSHConfig
        class MockExecSSHConfig:
            def __init__(self, org_id):
                self.vpn_ip = "1.2.3.4"
                self.vpn_key = "/tmp/key.pem"
                self.dc_priv_ip = "10.0.0.5"
                self.dc_key = "/tmp/dc.pem"
                self.failed = True

                
            def populate_config(self):
                return self
        
        monkeypatch.setattr(
            'cloudshield.Server.tasks.dc_management.ExecSSHConfig',
            MockExecSSHConfig
        )
        
        with pytest.raises(ValueError) as exec_err:
            result = exec_ssh("test_org", "invalid_command", logger=mock_logger)
            assert result is None
            assert "Invalid Command" in exec_err

    def test_exec_ssh_config_missing_assets(self):
        """Test ExecSSHConfig when required assets are missing"""
        from cloudshield.Server.models import Inventory
        
        mock_inventory = unittest.mock.MagicMock(spec=Inventory)
        mock_inventory.org_id = "test_org"
        mock_inventory.assets = []  # No assets
        
        ssh_config = ExecSSHConfig(mock_inventory).populate_config()
        
        assert ssh_config is None

    def test_exec_ssh_with_empty_command(self, monkeypatch, mock_logger):
        """Test exec_ssh with an empty command"""

        class MockExecSSHConfig:
            def __init__(self, org_id):
                self.vpn_ip = "1.2.3.4"
                self.vpn_key = "/tmp/key.pem"
                self.dc_priv_ip = "10.0.0.5"
                self.dc_key = "/tmp/dc.pem"
                self.failed = True
                
            def populate_config(self):
                return self
        
        monkeypatch.setattr(
            'cloudshield.Server.tasks.dc_management.ExecSSHConfig',
            MockExecSSHConfig
        )

        result = exec_ssh("test_org", "", logger=mock_logger)
        assert result is None
