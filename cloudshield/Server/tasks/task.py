import grpc
from enum import Enum
from google.protobuf import descriptor_pool


from genproto.vpn_service import vpn_service_pb2 as vpn_pb2
from genproto.vpn_service import vpn_service_pb2_grpc as vpn_pb2_grpc

from utils import get_logger, get_inventory_from_org_id


logger = get_logger("tasks")

class NodeType(Enum):
    DOMAIN_CONTROLLER = 1
    OPENVPN = 2

class ServerNode:
    def __init__(self, org_id, ip, port, node_type):
        self.ip = ip
        self.port = port
        self.org_id = org_id
        self.node_type = node_type

    def get_host(self):
        return self.ip + ":" + self.port

def get_full_grpc_path(short_method_name):
    pool = descriptor_pool.Default()
    try:
        method_desc = pool.FindMethodByName(short_method_name)
        
        service_full_name = method_desc.containing_service.full_name
        
        return f"/{service_full_name}/{method_desc.name}"
    except KeyError:
        return None

def get_grpc_channel(host):
    return grpc.insecure_channel(host)

def GetServerNodes(org_id):
    openvpn_name = f"{org_id}_openvpn_server"
    dc_name = f"{org_id}_samba"
 
    inventory = get_inventory_from_org_id(org_id)

    if inventory is None:
        logger.error("Inventory is empty for org_id: "+org_id)
        return None
    
    server_nodes={}

    for asset in inventory.assets:
        if asset.name == openvpn_name:
            server_nodes["OPENVPN"] = ServerNode(org_id=org_id,
                                     ip=asset.public_ip,
                                     port=asset.port,
                                     node_type=NodeType.OPENVPN)

        if asset.name == dc_name:
            server_nodes["DOMAIN_CONTROLLER"] = ServerNode(org_id=org_id,
                                     ip=asset.private_ip,
                                     port=asset.port,
                                     node_type=NodeType.DOMAIN_CONTROLLER)

    return server_nodes

def GetServerNode(org_id, node_type):

    nodes = GetServerNodes(org_id)

    for node in nodes.items():
        if node.node_type == node_type:
            return node

def ProxyRPCRequest(nodes, method_name, request):

    if len(nodes.items()) < 2:
        return None

    domain_controller_node = nodes["DOMAIN_CONTROLLER"]
    openvpn_node = nodes["OPENVPN"]

    full_method_name = get_full_grpc_path(method_name) # grpc server Relay expects the full method name

    if full_method_name is None:
        logger.error(f"Failed to find full method name for '{method_name}'")   
        return None

    logger.info(f"Full method name found '{full_method_name}'")
    logger.info(f"Proxying from {openvpn_node.ip}:{openvpn_node.port} to {domain_controller_node.ip}:{domain_controller_node.port}")

    channel = get_grpc_channel(openvpn_node.get_host())

    stub = vpn_pb2_grpc.VPNServiceStub(channel)

    serialized_data = request.SerializeToString()

    proxy_request = vpn_pb2.RelayData(ipv4=domain_controller_node.ip, port=domain_controller_node.port, data=serialized_data, method_name=full_method_name)
    try:
        return stub.Relay(proxy_request)
    except Exception as e:
        logger.error("Proxy Fail: " + str(e))
        return None

