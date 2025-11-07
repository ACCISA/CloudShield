import builtins
import types
from types import SimpleNamespace
import unittest.mock

import logging

from cloudshield.Server.tasks import dc_management as dc_mod
from cloudshield.Server.tasks.dc_management import forward_ssh_tunnel

def test_forward_ssh_tunnel(monkeypatch):
    forward_ssh_tunnel(local_port=2222, remote_host="127.0.0.1", remote_port=2222, transport={}, target_port=2222)

def test_exec_ssh_success(monkeypatch):
    """
    Exercise the successful path of exec_ssh by mocking:
    - inventory/config (ExecSSHConfig)
    - paramiko.SSHClient for both jump host and target host
    - port allocation
    - forwarding (no-op)
    """

    # Provide a deterministic logger
    logger = logging.getLogger("test")

    # Mock ExecSSHConfig to provide expected attributes
    class MockExecSSHConfig:
        def __init__(self, inventory):
            # attributes used by exec_ssh
            self.vpn_ip = "1.2.3.4"
            self.vpn_key = "/tmp/vpn_key.pem"
            self.dc_priv_ip = "10.0.0.5"
            self.dc_key = "/tmp/dc_key.pem"
            self.failed = False

    monkeypatch.setattr(dc_mod, "ExecSSHConfig", MockExecSSHConfig)

    # Mock get_inventory_from_org_id to return some inventory object
    monkeypatch.setattr(dc_mod, "get_inventory_from_org_id", lambda org_id: SimpleNamespace(org_id=org_id))

    # Mock get_available_local_port to return a fixed port
    monkeypatch.setattr(dc_mod, "get_available_local_port", lambda: 22022)

    # Make forward_ssh_tunnel a no-op (it's started in a thread in real code)
    monkeypatch.setattr(dc_mod, "forward_ssh_tunnel", lambda *args, **kwargs: None)

    # Build a fake paramiko.SSHClient that behaves for jump and target connections
    class FakeFileLike:
        def __init__(self, data: bytes):
            self._data = data

        def read(self, *args, **kwargs):
            return self._data

        def readlines(self):
            return [self._data]

    class FakeSSHClient:
        def __init__(self):
            self._connected_to = None

        def set_missing_host_key_policy(self, policy):
            # no-op
            pass

        def connect(self, hostname=None, port=22, username=None, key_filename=None, *args, **kwargs):
            # record where we connected to so exec_command behavior can vary if needed
            self._connected_to = (hostname, port, username, key_filename)

        def get_transport(self):
            # return a fake transport object (forward_ssh_tunnel is no-op anyway)
            return unittest.mock.MagicMock()

        def exec_command(self, command, timeout=None):
            # Simulate command execution on the target SSH client (connected to localhost:local_port)
            # Return simple file-like objects similar to paramiko behavior
            stdin = FakeFileLike(b"")
            stdout = FakeFileLike(b"User created\n")
            stderr = FakeFileLike(b"")
            return (stdin, stdout, stderr)

        def close(self):
            pass

    # Monkeypatch paramiko.SSHClient used inside module
    monkeypatch.setattr(dc_mod.paramiko, "SSHClient", FakeSSHClient)

    # Now call exec_ssh and assert we get a SSHExecResult with expected stdout
    result = dc_mod.exec_ssh("test_org", "sudo samba-tool user add testuser", logger=logger)

    # Validate result type and content
    assert result is not None, "exec_ssh returned None for mocked success path"
    # result can be an instance of SSHExecResult in module
    assert isinstance(result, dc_mod.SSHExecResult)
    assert "User created" in result.stdout.decode() if isinstance(result.stdout, (bytes, bytearray)) else "User created" in result.stdout
