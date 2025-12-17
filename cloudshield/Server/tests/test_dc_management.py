import unittest.mock
from types import SimpleNamespace


def test_validate_username_valid():
    from cloudshield.Server.tasks.dc_management import validate_username
    
    assert validate_username("john_doe") is True
    assert validate_username("user123") is True
    assert validate_username("test.user") is True
    assert validate_username("user-name") is True
    assert validate_username("a") is True
    assert validate_username("12345678901234567890") is True  # 20 chars


def test_validate_username_invalid():
    from cloudshield.Server.tasks.dc_management import validate_username
    
    assert validate_username("") is False
    assert validate_username("user name") is False  # spaces
    assert validate_username("user@domain") is False  # @ symbol
    assert validate_username("123456789012345678901") is False  # 21 chars, too long
    assert validate_username("user$") is False  # $ symbol
    assert validate_username("user!") is False  # ! symbol


def test_validate_username_with_logger(caplog):
    import logging
    from cloudshield.Server.tasks.dc_management import validate_username
    
    logger = logging.getLogger("test")
    caplog.set_level(logging.ERROR, logger="test")
    
    result = validate_username("invalid user!", logger=logger)
    
    assert result is False
    assert "Invalid username" in caplog.text


def test_validate_password_valid():
    from cloudshield.Server.tasks.dc_management import validate_password
    
    assert validate_password("Password123!") is True
    assert validate_password("12345678") is True  # min 8 chars
    assert validate_password("a" * 128) is True  # max 128 chars
    assert validate_password("P@ssw0rd!#$%") is True


def test_validate_password_invalid_length():
    from cloudshield.Server.tasks.dc_management import validate_password
    
    assert validate_password("short") is False  # less than 8 chars
    assert validate_password("a" * 129) is False  # more than 128 chars


def test_validate_password_invalid_newlines():
    from cloudshield.Server.tasks.dc_management import validate_password
    
    assert validate_password("password\n123") is False
    assert validate_password("password\r123") is False


def test_validate_password_invalid_control_chars():
    from cloudshield.Server.tasks.dc_management import validate_password
    
    assert validate_password("password\x00") is False  # null char
    assert validate_password("password\x01") is False  # control char


def test_validate_password_with_logger(caplog):
    import logging
    from cloudshield.Server.tasks.dc_management import validate_password
    
    logger = logging.getLogger("test")
    caplog.set_level(logging.ERROR, logger="test")
    
    result = validate_password("short", logger=logger)
    
    assert result is False
    assert "Password length must be between" in caplog.text


def test_ssh_exec_result():
    from cloudshield.Server.tasks.dc_management import SSHExecResult
    
    result = SSHExecResult("stdin_data", "stdout_data", "stderr_data")
    
    assert result.stdin == "stdin_data"
    assert result.stdout == "stdout_data"
    assert result.stderr == "stderr_data"


def test_forward_ssh_tunnel(monkeypatch, caplog):
    import logging
    from cloudshield.Server.tasks.dc_management import forward_ssh_tunnel
    
    logger = logging.getLogger("test")
    caplog.set_level(logging.INFO, logger="test")
    
    mock_transport = unittest.mock.MagicMock()
    mock_thread = unittest.mock.MagicMock()
    
    def fake_thread(target, args, daemon):
        mock_thread.target = target
        mock_thread.args = args
        mock_thread.daemon = daemon
        return mock_thread
    
    import threading
    monkeypatch.setattr(threading, "Thread", fake_thread)
    
    forward_ssh_tunnel(8080, "remote.host", 22, mock_transport, 3389, logger=logger)
    
    assert "SSH tunnel created" in caplog.text
    assert mock_thread.start.called


def test_get_available_local_port():
    from cloudshield.Server.tasks.dc_management import get_available_local_port
    
    port = get_available_local_port()
    
    assert isinstance(port, int)
    assert port > 0
    assert port < 65536


def test_exec_ssh_config_populate():
    from cloudshield.Server.tasks.dc_management import ExecSSHConfig
    from cloudshield.Server.models import Inventory
    
    # Create mock assets
    mock_vpn = SimpleNamespace(
        name="test_org_openvpn_server",
        public_ip="1.2.3.4",
        priv_key_path="vpn_key"
    )
    
    mock_dc = SimpleNamespace(
        name="test_org_samba",
        private_ip="10.0.0.5",
        priv_key_path="dc_key"
    )
    
    mock_inventory = unittest.mock.MagicMock(spec=Inventory)
    mock_inventory.org_id = "test_org"
    mock_inventory.assets = [mock_vpn, mock_dc]
    
    config = ExecSSHConfig(mock_inventory)
    
    assert config.vpn_ip == "1.2.3.4"
    assert "vpn_key.pem" in config.vpn_key
    assert config.dc_priv_ip == "10.0.0.5"
    assert "dc_key.pem" in config.dc_key


def test_exec_ssh_config_partial_assets():
    from cloudshield.Server.tasks.dc_management import ExecSSHConfig
    from cloudshield.Server.models import Inventory
    
    # Only VPN asset
    mock_vpn = SimpleNamespace(
        name="test_org_openvpn_server",
        public_ip="1.2.3.4",
        priv_key_path="vpn_key"
    )
    
    mock_inventory = unittest.mock.MagicMock(spec=Inventory)
    mock_inventory.org_id = "test_org"
    mock_inventory.assets = [mock_vpn]
    
    config = ExecSSHConfig(mock_inventory)
    
    assert config.vpn_ip == "1.2.3.4"
    assert config.dc_priv_ip is None
    assert config.dc_key is None


def test_exec_ssh_returns_none_when_no_inventory(monkeypatch):
    from cloudshield.Server.tasks.dc_management import exec_ssh
    
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_inventory_from_org_id",
        lambda org_id: None
    )
    
    result = exec_ssh("nonexistent_org", "echo test")
    
    assert result is None


def test_dc_add_user_invalid_username(monkeypatch):
    from cloudshield.Server.tasks.dc_management import dc_add_user
    
    # Mock the job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock the logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    result = dc_add_user("test_org", "invalid user!", "Password123!")
    
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid username"


def test_dc_add_user_invalid_password(monkeypatch):
    from cloudshield.Server.tasks.dc_management import dc_add_user
    
    # Mock the job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock the logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    result = dc_add_user("test_org", "validuser", "short")
    
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid password"


def test_dc_add_user_without_job(monkeypatch):
    from cloudshield.Server.tasks.dc_management import dc_add_user
    
    # No job context
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock the logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    # Mock exec_ssh
    mock_result = SimpleNamespace(stdout="User created", stderr="")
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.exec_ssh",
        lambda org_id, command, logger: mock_result
    )
    
    # Mock persist_domain_user
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Should not raise an error
    dc_add_user("test_org", "validuser", "Password123!")


def test_dc_add_user_persists_on_success(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from cloudshield.Server.tasks.dc_management import dc_add_user
    
    # Mock job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    # Mock exec_ssh to return success (no stderr)
    mock_result = SimpleNamespace(stdout="User created successfully", stderr="")
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.exec_ssh",
        lambda org_id, command, logger: mock_result
    )
    
    # Mock persist_domain_user
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    dc_add_user("test_org", "testuser", "Password123!")

    # Assert persist_domain_user was called with correct args
    mock_persist.assert_called_once()
    called_args = mock_persist.call_args

    assert called_args[0][0] == "test_org"
    assert called_args[0][1]== "testuser"
    assert called_args[0][2] == "Password123!"
    assert "@gmail.com" in called_args[0][3]

    assert any("user_mongo_id_123" in str(call) for call in mock_logger.info.call_args_list)


def test_dc_add_user_does_not_persist_on_failure(monkeypatch):
    """Test that dc_add_user does NOT persist when Samba command fails"""
    from cloudshield.Server.tasks.dc_management import dc_add_user
    
    # Mock job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    # Mock exec_ssh to return error (stderr present)
    mock_result = SimpleNamespace(
        stdout="",
        stderr="ERROR: command failed"
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.exec_ssh",
        lambda org_id, command, logger: mock_result
    )
    
    # Mock persist_domain_user
    mock_persist = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    dc_add_user("test_org", "testuser", "Password123!")
    
    # Assert persist_domain_user was not called
    mock_persist.assert_not_called()
