#pragma once

#include <string>
#include <mutex>
#include <memory>

#include <grpcpp/grpcpp.h>
#include <grpcpp/generic/generic_stub.h>
#include <grpcpp/server_context.h>
#include <grpcpp/support/status.h>

#include "infra_service/vpn_service.grpc.pb.h"
#include "infra_service/vpn_service.pb.h"

#include "utils/ssh_tunnel.hpp"
#include "utils/exec.hpp"

#include "tasks/openvpn.hpp"

namespace vs = vpn_service::v1;

using grpc::Status;
using grpc::StatusCode;
using grpc::ServerContext;

class VPNService final : public vs::VPNService::Service
{
public:
	VPNService();
    	Status CreateVPNClient(ServerContext* context, 
			const vs::CreateVPNClientData* request, 
			vs::CreateVPNClientDataAck* response) 
		override;
    	
	Status OpenSSHTunnel(ServerContext* context, 
			const vs::OpenSSHTunnelData* request, 
			vs::OpenSSHTunnelDataAck* response) 
		override;

    	Status Relay(ServerContext* context,
		       	const vs::RelayData* request, 
			vs::RelayDataAck* response) 
		override;



private:
	std::mutex mutex_;
};
