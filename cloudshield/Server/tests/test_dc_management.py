import unittest.mock
import logging
import types

from genproto.infra_service import infra_service_pb2 as infra_pb2
from genproto.vpn_service import vpn_service_pb2

def test_validate_username_valid():
    from tasks.dc_management import validate_username
    
    assert validate_username("john_doe") is True
    assert validate_username("user123") is True
    assert validate_username("test.user") is True
    assert validate_username("user-name") is True
    assert validate_username("a") is True
    assert validate_username("12345678901234567890") is True  # 20 chars


def test_validate_username_invalid():
    from tasks.dc_management import validate_username
    
    assert validate_username("") is False
    assert validate_username("user name") is False  # spaces
    assert validate_username("user@domain") is False  # @ symbol
    assert validate_username("123456789012345678901") is False  # 21 chars, too long
    assert validate_username("user$") is False  # $ symbol
    assert validate_username("user!") is False  # ! symbol


def test_validate_username_with_logger(caplog):
    import logging
    from tasks.dc_management import validate_username
    
    logger = logging.getLogger("test")
    caplog.set_level(logging.ERROR, logger="test")
    
    result = validate_username("invalid user!", logger=logger)
    
    assert result is False
    assert "Invalid username" in caplog.text


def test_validate_password_valid():
    from tasks.dc_management import validate_password
    
    assert validate_password("Password123!") is True
    assert validate_password("12345678") is True  # min 8 chars
    assert validate_password("a" * 128) is True  # max 128 chars
    assert validate_password("P@ssw0rd!#$%") is True


def test_validate_password_invalid_length():
    from tasks.dc_management import validate_password
    
    assert validate_password("short") is False  # less than 8 chars
    assert validate_password("a" * 129) is False  # more than 128 chars


def test_validate_password_invalid_newlines():
    from tasks.dc_management import validate_password
    
    assert validate_password("password\n123") is False
    assert validate_password("password\r123") is False


def test_validate_password_invalid_control_chars():
    from tasks.dc_management import validate_password
    
    assert validate_password("password\x00") is False  # null char
    assert validate_password("password\x01") is False  # control char


def test_validate_password_with_logger(caplog):
    import logging
    from tasks.dc_management import validate_password
    
    logger = logging.getLogger("test")
    caplog.set_level(logging.ERROR, logger="test")
    
    result = validate_password("short", logger=logger)
    
    assert result is False
    assert "Password length must be between" in caplog.text


def test_dc_add_user_invalid_username(monkeypatch):
    from tasks.dc_management import dc_add_user
    
    # Mock the job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock the logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    result = dc_add_user("test_org", "invalid user!", "Password123!","invalid@mail.com")
    
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid username"


def test_dc_add_user_invalid_password(monkeypatch):
    from tasks.dc_management import dc_add_user
    
    # Mock the job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: mock_job
    )
    
    # Mock the logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    result = dc_add_user("test_org", "validuser", "short","valid@mail.com")
    
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid password"


def test_dc_add_user_without_job(monkeypatch):
    from tasks.dc_management import dc_add_user
    
    # No job context
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock the logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    # Mock persist_domain_user
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Should not raise an error
    dc_add_user("test_org", "validuser", "Password123!","valid@mail.com")


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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.AddDomainUserDataAck(status=infra_pb2.SUCCESS, result="User added successfully").SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )

    # Mock create_vpn_config_for_user (called on success path)
    mock_vpn = unittest.mock.MagicMock(return_value={"status": "SUCCESS", "filename": "testuser.ovpn"})
    monkeypatch.setattr(
        "tasks.dc_management.create_vpn_config_for_user",
        mock_vpn
    )
    
    # Execute
    result = dc_add_user("test_org", "testuser", "Password123!","test@mail.com")

    # Assert persist_domain_user was called with correct args
    mock_persist.assert_called_once()
    called_args = mock_persist.call_args

    assert called_args[0][0] == "test_org"
    assert called_args[0][1]== "testuser"
    assert called_args[0][2] == "Password123!"
    assert "@mail.com" in called_args[0][3]

    # Assert VPN config was created
    mock_vpn.assert_called_once()
    assert result["status"] == "SUCCESS"
    assert result["vpn_config"]["status"] == "SUCCESS"


def test_dc_add_user_does_not_persist_on_failure(monkeypatch):
    """Test that dc_add_user does NOT persist when Samba command fails"""
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
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        lambda name, job_id=None: mock_logger
    )
    
    # Mock persist_domain_user
    mock_persist = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    dc_add_user("test_org", "testuser", "Password123!","test@mail.com")
    
    # Assert persist_domain_user was not called
    mock_persist.assert_not_called()


def test_dc_add_user_to_group_success(monkeypatch):
    from tasks.dc_management import dc_add_user_to_group

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "job-123"
    mock_job.meta = {}
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)

    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: mock_logger)

    body = infra_pb2.AddUserToGroupDataAck(status=infra_pb2.SUCCESS).SerializeToString()
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body),
    )

    result = dc_add_user_to_group("org1", "jane", "admins")

    assert result["status"] == "SUCCESS"
    assert "job-123" == mock_job.id


def test_dc_add_user_to_group_user_not_found(monkeypatch):
    from tasks.dc_management import dc_add_user_to_group

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "job-123"
    mock_job.meta = {}
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)

    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: mock_logger)

    body = infra_pb2.AddUserToGroupDataAck(status=infra_pb2.USER_NOT_FOUND).SerializeToString()
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body),
    )

    result = dc_add_user_to_group("org1", "missing", "admins")

    assert result["status"] == "USER_NOT_FOUND"


def test_dc_add_user_to_group_invalid_inputs(monkeypatch):
    from tasks.dc_management import dc_add_user_to_group

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "job-123"
    mock_job.meta = {}
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)

    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: mock_logger)

    result_user = dc_add_user_to_group("org1", "bad user", "admins")
    assert "invalid" in result_user["message"]
    assert mock_job.meta["progress"] == "invalid username"

    result_group = dc_add_user_to_group("org1", "jane", "bad group")
    assert "invalid" in result_group["message"]
    assert mock_job.meta["progress"] == "invalid group name"


def test_dc_create_file_share_success_no_job(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_create_file_share
    
    # Mock job
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )

    # Execute
    result = dc_create_file_share("test_org", "data", [], [], "description", "20G")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "SUCCESS"


def test_dc_create_file_share_unknown(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_create_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=100).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_create_file_share("test_org", "data")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "UNKNOWN"



def test_dc_create_file_share_success(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_create_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_create_file_share("test_org", "data", [], [], "description", "20G")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "SUCCESS"


# --- dc_add_group tests ---


def _make_group_ack(status: int):
    return infra_pb2.AddDomainGroupDataAck(status=status).SerializeToString()


def _make_user_with_group_ack(status: int):
    return infra_pb2.CreateDomainUserWithGroupDataAck(
        status=status,
        user_result="ok",
        group_result="ok",
        link_result="ok",
        membership_result="ok",
    ).SerializeToString()


def test_dc_add_group_invalid_name_sets_progress(monkeypatch):
    from tasks.dc_management import dc_add_group

    mock_job = unittest.mock.MagicMock()
    mock_job.meta = {}
    mock_job.save_meta = lambda: None
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)

    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: mock_logger)

    result = dc_add_group("org", "bad name")

    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid group name"


def test_dc_add_group_success(monkeypatch):
    from tasks.dc_management import dc_add_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})

    def mock_proxy(nodes, method_name, request):
        return types.SimpleNamespace(response=_make_group_ack(infra_pb2.SUCCESS))

    monkeypatch.setattr("tasks.dc_management.proxy_rpc_request", mock_proxy)

    result = dc_add_group("org", "group1")
    assert result["status"] == "SUCCESS"


def test_dc_add_group_duplicate(monkeypatch):
    from tasks.dc_management import dc_add_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_group_ack(infra_pb2.DUPLICATE)),
    )

    result = dc_add_group("org", "group1")
    assert result["status"] == "DUPLICATE"


def test_dc_add_group_failed(monkeypatch):
    from tasks.dc_management import dc_add_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_group_ack(infra_pb2.FAILED)),
    )

    result = dc_add_group("org", "group1")
    assert result["status"] == "FAILED"


def test_dc_add_group_unknown(monkeypatch):
    from tasks.dc_management import dc_add_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_group_ack(999)),
    )

    result = dc_add_group("org", "group1")
    assert result["status"] == "UNKNOWN"


def test_dc_add_group_proxy_fail(monkeypatch):
    from tasks.dc_management import dc_add_group
    from tasks.dc_management import PROXY_FAIL_MESSAGE

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr("tasks.dc_management.proxy_rpc_request", lambda nodes, method_name, request: None)

    result = dc_add_group("org", "group1")
    assert result == PROXY_FAIL_MESSAGE


# --- dc_create_user_with_group tests ---


def test_dc_create_user_with_group_invalid_username(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    mock_job = unittest.mock.MagicMock()
    mock_job.meta = {}
    mock_job.save_meta = lambda: None
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())

    result = dc_create_user_with_group("org", "bad user", "Password123!", "team")
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid username"


def test_dc_create_user_with_group_invalid_password(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    mock_job = unittest.mock.MagicMock()
    mock_job.meta = {}
    mock_job.save_meta = lambda: None
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())

    result = dc_create_user_with_group("org", "validuser", "short", "team")
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid password"


def test_dc_create_user_with_group_invalid_group(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    mock_job = unittest.mock.MagicMock()
    mock_job.meta = {}
    mock_job.save_meta = lambda: None
    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: mock_job)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())

    result = dc_create_user_with_group("org", "validuser", "Password123!", "bad group")
    assert "invalid" in result["message"].lower()
    assert mock_job.meta["progress"] == "invalid group name"


def test_dc_create_user_with_group_proxy_fail(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group, PROXY_FAIL_MESSAGE

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr("tasks.dc_management.proxy_rpc_request", lambda nodes, method_name, request: None)

    result = dc_create_user_with_group("org", "validuser", "Password123!", "team")
    assert result == PROXY_FAIL_MESSAGE


def test_dc_create_user_with_group_success_persists(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr("tasks.dc_management.short_uuid", lambda: "abc123")

    mock_persist = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.persist_domain_user", mock_persist)

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_user_with_group_ack(infra_pb2.SUCCESS)),
    )

    result = dc_create_user_with_group("org", "validuser", "Password123!", group_name=None)

    mock_persist.assert_called_once()
    persisted_email = mock_persist.call_args[0][3]
    assert persisted_email.endswith("@example.com")
    assert result["status"] == "SUCCESS"


def test_dc_create_user_with_group_email_fallback(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr("tasks.dc_management.short_uuid", lambda: "!!!")

    mock_persist = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.persist_domain_user", mock_persist)

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_user_with_group_ack(infra_pb2.SUCCESS)),
    )

    dc_create_user_with_group("org", "validuser", "Password123!", group_name="team")

    persisted_email = mock_persist.call_args[0][3]
    assert persisted_email.startswith("user-")
    assert persisted_email.endswith("@example.com")


def test_dc_create_user_with_group_duplicate(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_user_with_group_ack(infra_pb2.DUPLICATE)),
    )

    result = dc_create_user_with_group("org", "validuser", "Password123!", group_name="team")
    assert result["status"] == "DUPLICATE"


def test_dc_create_user_with_group_failed(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_user_with_group_ack(infra_pb2.FAILED)),
    )

    result = dc_create_user_with_group("org", "validuser", "Password123!", group_name="team")
    assert result["status"] == "FAILED"


def test_dc_create_user_with_group_unknown(monkeypatch):
    from tasks.dc_management import dc_create_user_with_group

    monkeypatch.setattr("tasks.dc_management.get_current_job", lambda: None)
    monkeypatch.setattr("tasks.dc_management.get_logger", lambda name, job_id=None: logging.getLogger())
    monkeypatch.setattr("tasks.dc_management.get_server_nodes", lambda org_id: {"DOMAIN_CONTROLLER": True, "OPENVPN": True})
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        lambda nodes, method_name, request: types.SimpleNamespace(response=_make_user_with_group_ack(999)),
    )

    result = dc_create_user_with_group("org", "validuser", "Password123!", group_name="team")
    assert result["status"] == "UNKNOWN"


def test_dc_create_file_share_failed(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_create_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=infra_pb2.FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_create_file_share("test_org", "data")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "FAILED"

def test_dc_delete_file_share_success(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_delete_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_delete_file_share("test_org", "data")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "SUCCESS"



def test_dc_delete_file_share_failed(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_delete_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=infra_pb2.FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_delete_file_share("test_org", "data")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "FAILED"


def test_dc_delete_file_share_unknown_no_job(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_delete_file_share
    
    # Mock job
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=100).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_delete_file_share("test_org", "data")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "UNKNOWN"


def test_dc_delete_file_share_unknown(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_delete_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.CreateSambaFileShareDataAck(status=100).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_delete_file_share("test_org", "data")
    print(result)

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "UNKNOWN"


def test_dc_restart_samba_service_unknown(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_restart_samba_service
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.RestartSambaServiceDataAck(status=100).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_restart_samba_service("test_org")

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "UNKNOWN"

def test_dc_restart_samba_service_failed(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_restart_samba_service, dc_delete_file_share
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.RestartSambaServiceDataAck(status=infra_pb2.FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_restart_samba_service("test_org")

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "FAILED"

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.DeleteSambaFileShareDataAck(status=infra_pb2.SHARE_NOT_FOUND).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    result = dc_delete_file_share("test_org", "share")

    assert result["status"] == "SHARE_NOT_FOUND"


def test_dc_restart_samba_service_success(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_restart_samba_service
    
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
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.RestartSambaServiceDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_restart_samba_service("test_org")


    # Assert persist_domain_user was called with correct args
    assert result["status"] == "SUCCESS"

    def mock_proxy_rpc_request(nodes, method_name, request):
        return None

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    result = dc_restart_samba_service("test_org")

    assert result["status"] == "FAILED"
    assert result["message"] == "Failed to proxy rpc request"


def test_dc_restart_samba_service_success_no_job(monkeypatch):
    """Test that dc_add_user persists user data when command succeeds"""
    from tasks.dc_management import dc_restart_samba_service
    
    # Mock job
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.RestartSambaServiceDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    
    # Mock persist_domain_user
    # TODO mock persist_file_share
    mock_persist = unittest.mock.MagicMock(return_value="user_mongo_id_123")
    monkeypatch.setattr(
        "tasks.dc_management.persist_domain_user",
        mock_persist
    )
    
    # Execute
    result = dc_restart_samba_service("test_org")

    # Assert persist_domain_user was called with correct args
    assert result["status"] == "SUCCESS"


def test_dc_set_password(monkeypatch):
    # test all possible rpc ack outcomes
    from tasks.dc_management import dc_set_password

     # Mock job
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.ResetUserPasswordDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_set_password("test_org", "user", "password")

    assert result["status"] == "SUCCESS"

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: mock_job
    )
 

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.ResetUserPasswordDataAck(status=infra_pb2.USER_NOT_FOUND).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    result = dc_set_password("test_org", "user", "password")

    assert result["status"] ==  "USER_NOT_FOUND"


    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.ResetUserPasswordDataAck(status=infra_pb2.PASSWORD_REQ_FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    result = dc_set_password("test_org", "user", "password")

    assert result["status"] ==  "PASSWORD_REQ_FAILED"


    def mock_proxy_rpc_request(nodes, method_name, request):
        return None

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    result = dc_set_password("test_org", "user", "password")

    assert result["status"] ==  "FAILED"
    assert result["message"] == "Failed to proxy rpc request"

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.ResetUserPasswordDataAck(status=infra_pb2.UNKNOWN).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    result = dc_set_password("test_org", "user", "password")

    assert result["status"] ==  "UNKNOWN"

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.ResetUserPasswordDataAck(status=infra_pb2.FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )

    result = dc_set_password("test_org", "user", "password")

    assert result["status"] ==  "FAILED"

    

def test_dc_user_list(monkeypatch):
    # test all possible rpc ack outcomes
    from tasks.dc_management import dc_user_list

     # Mock job
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.GetUserListDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_user_list("test_org")

    assert result["status"] == "SUCCESS"


    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: mock_job
    )
 
    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.GetUserListDataAck(status=infra_pb2.FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_user_list("test_org")

    assert result["status"] == "FAILED"

    def mock_proxy_rpc_request(nodes, method_name, request):
        return None

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_user_list("test_org")

    assert result["status"] == "FAILED"

def test_dc_remove_user(monkeypatch):
    # test all possible rpc ack outcomes
    from tasks.dc_management import dc_remove_user

     # Mock job
    monkeypatch.setattr(
        "tasks.dc_management.get_current_job",
        lambda: None
    )
    
    # Mock logger

    def mock_logger(name, job_id):
        logger = logging.getLogger()
        return logger
    monkeypatch.setattr(
        "tasks.dc_management.get_logger",
        mock_logger
    )
    
    types.SimpleNamespace(stdout="User created successfully", stderr="")

    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.GetUserListDataAck(status=infra_pb2.SUCCESS).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_remove_user("test_org", "user")

    assert result["status"] == "SUCCESS"


    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.GetUserListDataAck(status=infra_pb2.FAILED).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_remove_user("test_org", "user")

    assert result["status"] == "FAILED"


    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.GetUserListDataAck(status=infra_pb2.UNKNOWN).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_remove_user("test_org", "user")

    assert result["status"] == "UNKNOWN"


    def mock_proxy_rpc_request(nodes, method_name, request):
        body = infra_pb2.GetUserListDataAck(status=infra_pb2.USER_NOT_FOUND).SerializeToString()

        response = vpn_service_pb2.RelayDataAck(status=vpn_service_pb2.SUCCESS, response=body)
        return response

    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_remove_user("test_org", "user")

    assert result["status"] == "USER_NOT_FOUND"


    def mock_proxy_rpc_request(nodes, method_name, request):
        return None
    monkeypatch.setattr(
        "tasks.dc_management.proxy_rpc_request",
        mock_proxy_rpc_request
    )
    
    result = dc_remove_user("test_org", "user")

    assert result["status"] == "FAILED"
    assert result["message"] == "Failed to proxy rpc request"


# ---------------------------------------------------------------------------
# create_vpn_config_for_user tests
# ---------------------------------------------------------------------------


def test_create_vpn_config_no_openvpn_node():
    """Returns FAILED when OPENVPN node is missing from inventory."""
    from tasks.dc_management import create_vpn_config_for_user

    logger = unittest.mock.MagicMock()
    result = create_vpn_config_for_user("org1", "alice", {}, logger)

    assert result["status"] == "FAILED"
    assert "No OPENVPN node" in result["message"]
    logger.error.assert_called_once()


def test_create_vpn_config_success(monkeypatch):
    """Happy path: gRPC returns SUCCESS and config is stored."""
    from tasks.dc_management import create_vpn_config_for_user

    # Mock gRPC channel + stub
    mock_channel = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.get_grpc_channel", lambda host: mock_channel)

    mock_response = unittest.mock.MagicMock()
    mock_response.status = vpn_service_pb2.SUCCESS
    mock_response.filename = "alice.ovpn"
    mock_response.content = b"ovpn-content"

    mock_stub = unittest.mock.MagicMock()
    mock_stub.CreateVPNClient.return_value = mock_response
    monkeypatch.setattr(
        "tasks.dc_management.vpn_pb2_grpc.VPNServiceStub",
        lambda ch: mock_stub,
    )

    mock_store = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.store_vpn_config", mock_store)

    openvpn_node = unittest.mock.MagicMock()
    openvpn_node.get_host.return_value = "172.23.0.12:50055"
    nodes = {"OPENVPN": openvpn_node}
    logger = unittest.mock.MagicMock()

    result = create_vpn_config_for_user("org1", "alice", nodes, logger)

    assert result["status"] == "SUCCESS"
    mock_store.assert_called_once_with(
        org_id="org1",
        username="alice",
        filename="alice.ovpn",
        content=b"ovpn-content",
    )


def test_create_vpn_config_grpc_non_success(monkeypatch):
    """Returns FAILED when gRPC returns a non-SUCCESS status."""
    from tasks.dc_management import create_vpn_config_for_user

    mock_channel = unittest.mock.MagicMock()
    monkeypatch.setattr("tasks.dc_management.get_grpc_channel", lambda host: mock_channel)

    mock_response = unittest.mock.MagicMock()
    mock_response.status = vpn_service_pb2.FAILED

    mock_stub = unittest.mock.MagicMock()
    mock_stub.CreateVPNClient.return_value = mock_response
    monkeypatch.setattr(
        "tasks.dc_management.vpn_pb2_grpc.VPNServiceStub",
        lambda ch: mock_stub,
    )

    openvpn_node = unittest.mock.MagicMock()
    openvpn_node.get_host.return_value = "172.23.0.12:50055"
    nodes = {"OPENVPN": openvpn_node}
    logger = unittest.mock.MagicMock()

    result = create_vpn_config_for_user("org1", "alice", nodes, logger)

    assert result["status"] == "FAILED"
    assert "non-success" in result["message"]


def test_create_vpn_config_grpc_exception(monkeypatch):
    """Returns FAILED when gRPC call raises an exception."""
    from tasks.dc_management import create_vpn_config_for_user

    monkeypatch.setattr(
        "tasks.dc_management.get_grpc_channel",
        unittest.mock.MagicMock(side_effect=Exception("connection refused")),
    )

    openvpn_node = unittest.mock.MagicMock()
    openvpn_node.get_host.return_value = "172.23.0.12:50055"
    nodes = {"OPENVPN": openvpn_node}
    logger = unittest.mock.MagicMock()

    result = create_vpn_config_for_user("org1", "alice", nodes, logger)

    assert result["status"] == "FAILED"
    assert "connection refused" in result["message"]

