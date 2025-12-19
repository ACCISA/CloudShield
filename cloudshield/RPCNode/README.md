# RPCNode - gRPC C++ Server

The **RPCNode** is the core C++ server running on our infrastructure nodes. It executes system-level tasks dispatched by the API. This guide explains the component's architecture and demonstrates how to implement a task, such as adding a user to a Domain Controller.

## ServerNode Architecture

We currently utilize two distinct node types:

* **OPENVPN (Edge Node):** The internet-facing node. It is directly accessible by the API.
* **DOMAIN_CONTROLLER (Internal Node):** An isolated node residing in the same VPC as the OPENVPN node but without a public interface.

Because the API cannot reach a `DOMAIN_CONTROLLER` directly, it uses a **Proxy RPC** pattern. The request is sent to the OPENVPN node, which then relays the RPC request to the internal DOMAIN_CONTROLLER.

<img width="500" height="300" alt="image" src="https://github.com/user-attachments/assets/1a245005-3c2e-4281-b04c-f8d333e03a2a" />

---

## Implementing RPC Methods

To create a new task, follow this three-step implementation process:

### 1. Define the Proto Definitions
Define the request and response structures in the `.proto` file. Here is the definition for `AddDomainUser`:

```proto
message AddDomainUserData {
        string username = 1;
        string password = 2;
}

message AddDomainUserDataAck {
        Status status    = 1;
        string result   = 2;
}

service InfraService {
        rpc AddDomainUser(AddDomainUserData) returns (AddDomainUserDataAck);
}
```

### 2. C++ Server Implementation
Implement the logic within the InfraService class. This typically involves interfacing with system-level binaries (e.g., samba-tool).

```cpp
Status InfraService::AddDomainUser(ServerContext* context, const is::AddDomainUserData* request, is::AddDomainUserDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string username = request->username().c_str();
	std::string password = request->password().c_str();

	auto samba = std::make_unique<SambaTask>();	
	std::string result = samba->AddDomainUser(username, password); // executes a command: samba-tool user create <username> <password>

	if (result.find(this->USER_EXISTS) != std::string::npos) {
		std::cout << "Duplicate request, user already exists" << std::endl;
		response->set_result(result);
		response->set_status(is::Status::DUPLICATE);
		return Status(grpc::StatusCode::OK, "User exists");
	}

	if (result.find(this->USER_ADD_FAILED) != std::string::npos) {
		std::cout << "Failed adding domain user" << std::endl;
		response->set_result(result);
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "User add failed");
	}
		
	response->set_result(result);
	response->set_status(is::Status::SUCCESS);

	return Status(grpc::StatusCode::OK, "User added to domain successfully");
}
```

### 3. API Integration (Python)
Invoke the method from the API layer using the proxy routing logic.

File: cloudshield/Server/tasks/dc_management.py
```py
def dc_add_user(org_id: str, username: str, password: str):

  # Get all the ServerNode(s) that are owned by our org_id (DOMAIN_CONTROLLER and OPENVPN)
  nodes = GetServerNodes(org_id) # You should normally check if this is None

  # We prepare the protobuf request that is destined to our DOMAIN_CONTROLLER node
  request = infra_pb2.AddDomainUserData(username=username, password=password)
  
  # We proxy our request through the OPENVPN and specify what RPC method we want the DOMAIN_CONTROLLER node to execute
  proxy_response = ProxyRPCRequest(nodes, method_name="infra_service.v1.InfraService.AddDomainUser", request=request)
  
  proxy_status = proxy_response.status
  
  # We have to first serialize the bytes from the proxy_response.response field to extract the result from our proxied RPC
  response = infra_pb2.AddDomainUserDataAck()
  response.ParseFromString(proxy_response.response)
```
