#include "service/vpn_service.hpp"

VPNService::VPNService()
{

}

Status VPNService::CreateVPNClient(ServerContext* context, const vs::CreateVPNClientData* request, vs::CreateVPNClientDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string client_name = request->client_name();
	std::cout << "[VPNService] CreateVPNClient called for: " << client_name << std::endl;

	if (client_name.empty()) {
		response->set_status(vs::FAILED);
		return Status(grpc::StatusCode::INVALID_ARGUMENT, "client_name is required");
	}

	auto vpn = std::make_unique<VPNTask>();
	VPNClientResult result = vpn->CreateVPNClient(client_name);

	if (!result.success) {
		std::cerr << "[VPNService] CreateVPNClient failed: " << result.error << std::endl;
		response->set_status(vs::FAILED);
		return Status(grpc::StatusCode::INTERNAL, result.error);
	}

	response->set_status(vs::SUCCESS);
	response->set_filename(result.filename);
	response->set_content(result.content.data(), result.content.size());

	std::cout << "[VPNService] Successfully created VPN config: " << result.filename
	          << " (" << result.content.size() << " bytes)" << std::endl;

	return Status::OK;
}

Status VPNService::OpenSSHTunnel(ServerContext* context, const vs::OpenSSHTunnelData* request, vs::OpenSSHTunnelDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string ipv4 = request->ipv4().c_str();
	std::string port = request->port().c_str();
	std::string key = request->key().c_str();

	int forward_port = GetRandomAvailablePort();

	auto vpn = std::make_unique<VPNTask>();

	std::string result = vpn->OpenSSHTunnel(ipv4, port, forward_port, key);

	std::cout << result << std::endl;
		
	return Status(grpc::StatusCode::OK, "SSH Tunnel created");
}

Status VPNService::Relay(ServerContext* context, const vs::RelayData* request, vs::RelayDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	std::cout << "Relaying.." << std::endl;
	std::string ipv4 	= request->ipv4().c_str();
	std::string port 	= request->port().c_str();
	std::string method_name = request->method_name().c_str();
	const char* data	= request->data().data();
	size_t data_size 	= request->data().size();

	std::string target_address = ipv4 + ":" + port;

	std::cout << "Relay request received (method_name=" << method_name.c_str() << " ,target_addr=" << target_address << ")" <<std::endl;

	// TODO implement cache for channels to next node
	// TODO since we create the channel with the next node, we should keep in mind that in prod we would use mTLS. How would we setup our PKI to automatically deploy these nodes with mTLS?
	
	auto channel = grpc::CreateChannel(target_address, grpc::InsecureChannelCredentials());
	grpc::GenericStub generic_stub(channel);

	// wrap the data we want to pass into a gRPC ByteBuffer
	grpc::Slice request_slice(data, data_size);
	grpc::ByteBuffer request_buffer(&request_slice, 1);
	grpc::ByteBuffer response_buffer;

	grpc::ClientContext client_context;

	client_context.set_deadline(context->deadline());
	
	// Forward call to next node using async completion queue
	grpc::CompletionQueue cq;
	auto response_reader = generic_stub.PrepareUnaryCall(&client_context, 
			method_name.c_str(), 
			request_buffer, 
			&cq);

	response_reader->StartCall();
	grpc::Status status;
	void* got_tag; // tag to track result from cq
	bool ok = false;

	response_reader->Finish(&response_buffer, &status, (void*)1);
	
	//blocking
	cq.Next(&got_tag, &ok);

	if (status.ok()) {
		std::vector<grpc::Slice> slices;
		response_buffer.Dump(&slices);
	
		response->set_status(vs::Status::SUCCESS);

		std::string* resp_data = response->mutable_response();
		resp_data->clear();
		for (const auto& slice : slices) {
			resp_data->append(reinterpret_cast<const char*>(slice.begin()), slice.size());
		}
		std::cout << "Relay completed. size=" << response->response().size() << std::endl;
		return status;
	} else {
		response->set_status(vs::Status::FAILED);
		return Status(status.error_code(), "PROXY FAIL: " + status.error_message()); 
	}
}
