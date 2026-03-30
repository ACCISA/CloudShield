import re
import uuid
import base64
import grpc
from rq import get_current_job
from google.protobuf import empty_pb2

from services.user_service import persist_domain_user, remove_domain_user_from_db
from services.shares_services import create_share, delete_share
from services.vpn_config_service import store_vpn_config
from utils import get_logger

from genproto.infra_service import infra_service_pb2 as infra_pb2
from genproto.vpn_service import vpn_service_pb2 as vpn_pb2
from genproto.vpn_service import vpn_service_pb2_grpc as vpn_pb2_grpc

from .task import proxy_rpc_request, get_server_nodes, get_grpc_channel


def short_uuid():
    # Generate UUID4 and encode it in URL-safe Base64
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('ascii')


USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]{1,20}$')
MIN_PW_LEN = 8
MAX_PW_LEN = 128
PRIVATE_KEYS_PATH = "/var/lib/cloudshield/terraform/generated"


PROXY_FAIL_MESSAGE = {"status":"FAILED", "message":"Failed to proxy rpc request"}

# Module-level logger for non-job logging
_module_logger = get_logger("tasks")
UNEXPECTED_RESPONSE="Unexpected response"
USER_ALREADY_EXISTS="User already exists"
USER_NOT_FOUND="User not found"
INVALID_GROUP="invalid group name"

def validate_username(username: str, logger=None):
    """
    Validate username to prevent CLI Injections
    """
    if logger is None:
        logger = _module_logger
    
    if not USERNAME_RE.fullmatch(username):
        logger.error(f"Invalid username: only A-Z a-z 0-9. Given: {username}")
        return False
    return True

def validate_password(password:str, logger=None):
    """
    Validate password to prevent CLI Injections
    """
    if logger is None:
        logger = _module_logger
    
    if not (MIN_PW_LEN <= len(password) <= MAX_PW_LEN):
        logger.error(f"Password length must be between {MIN_PW_LEN} and {MAX_PW_LEN}")
        return False
    if '\n' in password or '\r' in password:
        logger.error("Password must not contain newline characters")
        return False
    if any(ord(c) < 32 for c in password):
        logger.error("Password contains control characters; not allowed")
        return False
    return True

def sync_netlogon_script():
    """
    After editing file shares we must sync the netlogon scripts so that users get the updates shares mapped to a network drive when they login
    """
    #we have to complete makign RPC request to sync netlogon script
    #request = infra_pb2.SyncNetlogonScript(realm=realm)

    #then call real func to pull all shares
    #shares = get_all_group_shares()
    pass

def dc_create_file_share(
    org_id: str,
    share_name: str,
    users: list = None,
    groups: list = None,
    description: str = None,
    max_size: int = None
):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "stating dc_create_samba_file_share"
        job.save_meta()

    nodes = get_server_nodes(org_id) or {}

    if not nodes:
        logger.error("Inventory is empty for org_id=%s", org_id)
    
    request = infra_pb2.CreateSambaFileShareData(share_name=share_name, share_size="100M")

    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.CreateSambaFileShare", request=request)

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE


    response = infra_pb2.CreateSambaFileShareDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    
    if status == infra_pb2.SUCCESS:
        # store new file share in mongodb
        # sync netlogon share
        #sync_netlogon_script(realm)
        logger.info("Successfully created new samba file share")
        try:
            # NOTE: Replace mock size defaults once real usage/quota logic is implemented.
            effective_max_size = max_size if max_size is not None else "50"
            mock_current_size = "7"
            create_share(
                org_id=org_id,
                name=share_name,
                users=users or [],
                groups=groups or [],
                description=description,
                current_size=mock_current_size,
                max_size=effective_max_size,
            )
        except Exception as exc:
            logger.error(f"Failed to persist file share in database: {exc}")
            return {
                "status": "FAILED",
                "message": "File share created in samba but failed to persist in database",
            }
        return {"status":"SUCCESS","message":"Successfully created new samba file share"}

    if status == infra_pb2.FAILED:
        logger.info("Failed to create new samba file share")
        return {"status":"FAILED","message":"Failed to create new samba file share"}

    logger.error("Failed to create file share, uknown reason")
    return {"status":"UNKNOWN","message":"Failed to create new samba file share, reason unknown"}


def dc_delete_file_share(org_id: str, share_name: str, wipe_data: bool = False):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "stating dc_delete_file_share"
        job.save_meta()

    nodes = get_server_nodes(org_id)
    
    request = infra_pb2.DeleteSambaFileShareData(share_name=share_name, wipe_data=wipe_data)

    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.DeleteSambaFileShare", request=request)

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE
    

    response = infra_pb2.DeleteSambaFileShareDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    
    if status == infra_pb2.SUCCESS:
        logger.info("Successfully delete new samba file share")
        try:
            delete_share(org_id=org_id, name=share_name)
        except Exception as exc:
            logger.error(f"Failed to delete file share from database: {exc}")
            return {
                "status": "FAILED",
                "message": "File share deleted in samba but failed to delete from database",
            }
        return {"status":"SUCCESS","message":"Successfully deleted new samba file share"}
    if status == infra_pb2.SHARE_NOT_FOUND:
        logger.info("Failed to find samba file share")
        return {"status":"SHARE_NOT_FOUND", "message":"Failed to find samba file share"}
    if status == infra_pb2.FAILED:
        logger.info("Failed to delete new samba file share")
        return {"status":"FAILED","message":"Failed to delete new samba file share"}

    return {"status":"UNKNOWN","message":"Failed to delete new samba file share, unknown reason"}

def dc_restart_samba_service(org_id: str):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_restart_samba_service"
        job.save_meta()
    
    nodes = get_server_nodes(org_id)

    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.RestartSambaService", request = empty_pb2.Empty())

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE


    response = infra_pb2.RestartSambaServiceDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully restart samba-ad-dc service")
        return {"status":"SUCCESS","message":"Successfully restared samba-ad-dc service"}
    if status == infra_pb2.FAILED:
        logger.error("Failed to restart samba-ad-dc service")
        return {"status":"FAILED", "message":"Failed to restart samba-ad-dc service"}

    logger.error("Failed to restart samba-ad-dc service, for unknown reason")
    return {"status":"UNKNOWN","message":"Failed to restart samba-ad-dc service, for unknown reason"}

def dc_set_password(org_id: str, username: str, new_password: str):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_set_password"
        job.save_meta()

    nodes = get_server_nodes(org_id)

    request = infra_pb2.ResetUserPasswordData(username=username, password=new_password)

    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.ResetUserPassword", request=request)

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE


    response = infra_pb2.ResetUserPasswordDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status


    if status == infra_pb2.SUCCESS:
        logger.info("Successfully set user password")
        return {"status":"SUCCESS", "message":"Successfully set user password"}

    if status == infra_pb2.PASSWORD_REQ_FAILED:
        logger.error("New password violates constraints")
        return {"status":"PASSWORD_REQ_FAILED", "message":"New password violates constraints"}

    if status == infra_pb2.USER_NOT_FOUND:
        logger.error(f"User not found (user={username}")
        return {"status":"USER_NOT_FOUND", "message":USER_NOT_FOUND}

    if status == infra_pb2.FAILED:
        logger.error("Failed to set password")
        return {"status":"FAILED", "message":"Failed to set password"}
    
    logger.error("Failed to set user password, unknwon reason")
    return {"status":"UNKNOWN", "message":"Failed to set user password, unknown"}



def dc_user_list(org_id: str):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_user_list"
        job.save_meta()

    nodes = get_server_nodes(org_id)

    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.GetUserList", request = empty_pb2.Empty())

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    response = infra_pb2.GetUserListDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    users = response.users

    logger.info("users: " + str(users))

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully retrieved user list")
        return {"status":"SUCCESS", "message":"Successfully retrieved user list", "result":{"users":list(users)}}

    logger.error("Failed to retrieve user list")
    return {"status":"FAILED", "message":"Failed to retrieve user list"}


def dc_add_group(org_id: str, group_name: str):
    """
    Create a new security group in Samba and nest it under the Domain Users group
    to keep group visibility consistent for default user access.
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_add_group"
        job.save_meta()

    if not validate_username(group_name, logger=logger):
        if job is not None:
            job.meta["progress"] = INVALID_GROUP
            job.save_meta()
        return {"message": f"the group name is invalid (group={group_name})"}

    nodes = get_server_nodes(org_id)

    request = infra_pb2.AddDomainGroupData(group_name=group_name)

    proxy_response = proxy_rpc_request(
        nodes,
        method_name="infra_service.v1.InfraService.AddDomainGroup",
        request=request,
    )

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    response = infra_pb2.AddDomainGroupDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully created group and linked to Domain Users")
        return {"status": "SUCCESS", "message": "Successfully created group"}

    if status == infra_pb2.DUPLICATE:
        logger.warning("Group already exists")
        return {"status": "DUPLICATE", "message": "Group already exists"}

    if status == infra_pb2.FAILED:
        logger.error("Failed to create group")
        return {"status": "FAILED", "message": "Failed to create group"}

    logger.error("Unexpected response when creating group")
    return {"status": "UNKNOWN", "message": UNEXPECTED_RESPONSE}


def dc_remove_group(org_id: str, group_name: str):
    """
    Remove a security group from Samba Active Directory.
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_remove_group"
        job.save_meta()

    if not validate_username(group_name, logger=logger):
        if job is not None:
            job.meta["progress"] = INVALID_GROUP
            job.save_meta()
        return {"message": f"the group name is invalid (group={group_name})"}

    nodes = get_server_nodes(org_id)

    request = infra_pb2.RemoveDomainGroupData(group_name=group_name)

    proxy_response = proxy_rpc_request(
        nodes,
        method_name="infra_service.v1.InfraService.RemoveDomainGroup",
        request=request,
    )

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    response = infra_pb2.RemoveDomainGroupDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully removed group %s", group_name)
        return {"status": "SUCCESS", "message": "Successfully removed group"}

    if status == infra_pb2.GROUP_NOT_FOUND:
        logger.warning("Group not found: %s", group_name)
        return {"status": "GROUP_NOT_FOUND", "message": "Group not found"}

    if status == infra_pb2.FAILED:
        logger.error("Failed to remove group %s", group_name)
        return {"status": "FAILED", "message": "Failed to remove group"}

    logger.error("Unexpected response when removing group")
    return {"status": "UNKNOWN", "message": UNEXPECTED_RESPONSE}


def dc_update_file_share(
    org_id: str,
    share_name: str,
    groups: list = None,
    users: list = None,
):
    """
    Update ACLs (valid users / groups) on an existing Samba file share
    and restart the Samba service so changes take effect.
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_update_file_share"
        job.save_meta()

    nodes = get_server_nodes(org_id) or {}

    if not nodes:
        logger.error("Inventory is empty for org_id=%s", org_id)

    request = infra_pb2.UpdateSambaFileShareData(
        share_name=share_name,
        groups=groups or [],
        users=users or [],
    )

    proxy_response = proxy_rpc_request(
        nodes,
        method_name="infra_service.v1.InfraService.UpdateSambaFileShare",
        request=request,
    )

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    response = infra_pb2.UpdateSambaFileShareDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully updated file share ACLs for %s", share_name)
        return {"status": "SUCCESS", "message": "Successfully updated file share"}

    if status == infra_pb2.SHARE_NOT_FOUND:
        logger.error("Share not found: %s", share_name)
        return {"status": "SHARE_NOT_FOUND", "message": "Share not found"}

    if status == infra_pb2.FAILED:
        logger.error("Failed to update file share %s", share_name)
        return {"status": "FAILED", "message": "Failed to update file share"}

    logger.error("Failed to update file share, unknown reason")
    return {"status": "UNKNOWN", "message": "Failed to update file share, reason unknown"}


def create_vpn_config_for_user(org_id: str, username: str, nodes: dict, logger):
    """Call the OpenVPN gRPC node to generate a client .ovpn and store it in MongoDB.

    Returns:
        dict with ``status`` key (``SUCCESS`` or ``FAILED``).
    """
    openvpn_node = nodes.get("OPENVPN")
    if openvpn_node is None:
        logger.error("No OPENVPN node in inventory for org_id=%s", org_id)
        return {"status": "FAILED", "message": "No OPENVPN node found"}

    try:
        channel = get_grpc_channel(openvpn_node.get_host())
        stub = vpn_pb2_grpc.VPNServiceStub(channel)

        vpn_request = vpn_pb2.CreateVPNClientData(client_name=username)
        vpn_response = stub.CreateVPNClient(vpn_request, timeout=120)

        if vpn_response.status == vpn_pb2.SUCCESS:
            store_vpn_config(
                org_id=org_id,
                username=username,
                filename=vpn_response.filename,
                content=vpn_response.content,
            )
            logger.info("VPN config stored for %s/%s", org_id, username)
            return {"status": "SUCCESS"}

        logger.error("CreateVPNClient returned status=%s", vpn_response.status)
        return {"status": "FAILED", "message": "gRPC call returned non-success status"}
    except grpc.RpcError as exc:
        logger.error("VPN gRPC call failed org_id=%s username=%s: %s", org_id, username, exc)
        return {"status": "FAILED", "message": str(exc)}
    except Exception as exc:
        logger.exception("VPN config creation failed org_id=%s username=%s", org_id, username)
        return {"status": "FAILED", "message": str(exc)}


def dc_add_user(org_id: str, username: str, password: str, email: str):
    """
    Note: this job should only be executed if a network was provisioned for that org_id
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_add_user"
        job.save_meta()

    if not validate_username(username, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid username"
            job.save_meta()
        return {"message":f"the provider username is invalid (username={username})"}
    if not validate_password(password, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid password"
            job.save_meta()
        return {"message":f"the provider password is invalid (password={password})"}
    
    
    # this tasks is meant for the domain controller so we get that node's ip
    nodes = get_server_nodes(org_id) or {}

    if not nodes:
        logger.error("Inventory is empty for org_id=%s", org_id)
        return {"message":"empty inventory"}

    request = infra_pb2.AddDomainUserData(username=username, password=password)

    # this request needs to be proxyed through the vpn server because it is destined for the domain controller
    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.AddDomainUser", request=request)
    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    # we have to first serialize the bytes from the proxy_response.response field
    response = infra_pb2.AddDomainUserDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    result = response.result

    logger.info("result: " + str(result))

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully added user")

        # Generate and store VPN config for the new user
        vpn_result = create_vpn_config_for_user(org_id, username, nodes, logger)
        return {
            "status": "SUCCESS",
            "message": "Successfully added user",
            "vpn_config": vpn_result,
        }

    if status == infra_pb2.FAILED:
        logger.error("Failed to add user")
        return {"status": "FAILED", "message":"Failed to add user"}
    
    if status == infra_pb2.DUPLICATE:
        logger.error("Duplicate user found")
        return {"status": "DUPLICATE", "message":USER_ALREADY_EXISTS}
    logger.error("Failed to add user for unexpected reason")
    return {"status":"UNKNOWN", "message":UNEXPECTED_RESPONSE}


def dc_add_user_to_group(org_id: str, username: str, group_name: str):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_add_user_to_group"
        job.save_meta()

    if not validate_username(username, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid username"
            job.save_meta()
        return {"message": f"the username is invalid (username={username})"}

    if not validate_username(group_name, logger=logger):
        if job is not None:
            job.meta["progress"] = INVALID_GROUP
            job.save_meta()
        return {"message": f"the group name is invalid (group={group_name})"}

    nodes = get_server_nodes(org_id)

    request = infra_pb2.AddUserToGroupData(username=username, group_name=group_name)

    proxy_response = proxy_rpc_request(
        nodes,
        method_name="infra_service.v1.InfraService.AddUserToGroup",
        request=request,
    )

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    response = infra_pb2.AddUserToGroupDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully added user to group")
        return {"status": "SUCCESS", "message": "Successfully added user to group"}

    if status == infra_pb2.USER_NOT_FOUND:
        logger.warning("User not found while adding to group")
        return {"status": "USER_NOT_FOUND", "message": USER_NOT_FOUND}

    if status == infra_pb2.FAILED:
        logger.error("Failed to add user to group")
        return {"status": "FAILED", "message": "Failed to add user to group"}

    logger.error("Unexpected response when adding user to group")
    return {"status": "UNKNOWN", "message": "Unexpected response"}


def dc_create_user_with_group(org_id: str, username: str, password: str, group_name: str | None = None):  # NOSONAR
    """
    Create a domain user, provision a group, nest it under Domain Users, and add the user to that group.
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_create_user_with_group"
        job.save_meta()

    if not validate_username(username, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid username"
            job.save_meta()
        return {"message": f"the provider username is invalid (username={username})"}

    if not validate_password(password, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid password"
            job.save_meta()
        return {"message": f"the provider password is invalid (password={password})"}

    if group_name is None or group_name.strip() == "":
        group_name = f"{username}-group"

    if not validate_username(group_name, logger=logger):
        if job is not None:
            job.meta["progress"] = INVALID_GROUP
            job.save_meta()
        return {"message": f"the group name is invalid (group={group_name})"}

    nodes = get_server_nodes(org_id)

    request = infra_pb2.CreateDomainUserWithGroupData(
        username=username,
        password=password,
        group_name=group_name,
    )

    proxy_response = proxy_rpc_request(
        nodes,
        method_name="infra_service.v1.InfraService.CreateDomainUserWithGroup",
        request=request,
    )

    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    response = infra_pb2.CreateDomainUserWithGroupDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    result_payload = {
        "user_result": response.user_result,
        "group_result": response.group_result,
        "link_result": response.link_result,
        "membership_result": response.membership_result,
    }

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully created user with group linkage")
        email_local_part = re.sub(r'[^A-Za-z0-9._%+-]', '', short_uuid())
        if not email_local_part:
            email_local_part = "user-" + short_uuid()
        email = f"{email_local_part}@example.com"
        persist_domain_user(org_id, username, password, email)
        return {"status": "SUCCESS", "message": "User and group created", "result": result_payload}

    if status == infra_pb2.DUPLICATE:
        logger.warning(USER_ALREADY_EXISTS)
        return {"status": "DUPLICATE", "message": USER_ALREADY_EXISTS, "result": result_payload}

    if status == infra_pb2.FAILED:
        logger.error("Failed to create user with group")
        return {"status": "FAILED", "message": "Failed to create user with group", "result": result_payload}

    logger.error("Unexpected response when creating user with group")
    return {"status": "UNKNOWN", "message": UNEXPECTED_RESPONSE, "result": result_payload}



def dc_remove_user(org_id: str, username: str):
    """
    Note: this job should only be executed if a network was provisioned for that org_id
    """

    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_remove_user"
        job.save_meta()

    
    # this tasks is meant for the domain controller so we get that node's ip
    nodes = get_server_nodes(org_id)

    request = infra_pb2.RemoveDomainUserData(username=username)

    # this request needs to be proxyed through the vpn server because it is destined for the domain controller
    proxy_response = proxy_rpc_request(nodes, method_name="infra_service.v1.InfraService.RemoveDomainUser", request=request)
        
    if proxy_response is None:
        return PROXY_FAIL_MESSAGE

    # we have to first serialize the bytes from the proxy_response.response field
    response = infra_pb2.RemoveDomainUserDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status

    
    if status == infra_pb2.SUCCESS:
        logger.info("Successfully removed user")
        # Remove user from database with audit logging
        removed = remove_domain_user_from_db(org_id, username, job_id=job_id)
        if removed:
            logger.info(f"User {username} removed from database")
        else:
            logger.warning(f"User {username} not found in database")
        return {"status": "SUCCESS", "message":"Successfully removed user"}

    if status == infra_pb2.FAILED:
        logger.error("Failed to remove user")
        return {"status": "FAILED", "message":"Failed to remove user"}
    
    if status == infra_pb2.USER_NOT_FOUND:
        logger.error("Failed to find user")
        return {"status": "USER_NOT_FOUND", "message":USER_NOT_FOUND}
    
    logger.error("unknown error when removing user")
    return {"status":"UNKNOWN", "message":UNEXPECTED_RESPONSE}
