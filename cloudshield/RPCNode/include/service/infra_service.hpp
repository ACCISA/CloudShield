#pragma once

#include <string>
#include <mutex>

#include <grpcpp/grpcpp.h>
#include <grpcpp/server_context.h>
#include <grpcpp/support/status.h>

#include "infra_service/infra_service.grpc.pb.h"
#include "infra_service/infra_service.pb.h"

namespace is = infra_service::v1;

using grpc::Status;
using grpc::StatusCode;
using grpc::ServerContext;

class InfraService final : public is::InfraService::Service
{
public:
	InfraService();

	
  	Status AddDomainUser(ServerContext* context, const is::AddDomainUserData* request, is::AddDomainUserDataAck* response) override;
    	Status RemoveDomainUser(ServerContext* context, const is::RemoveDomainUserData* request, is::RemoveDomainUserDataAck* response) override;
    	Status CreateSambaFileShare(ServerContext* context, const is::CreateSambaFileShareData* request, is::CreateSambaFileShareDataAck* response) override;
private:
	static constexpr const char* USER_EXISTS = "already exists";
	static constexpr const char* USER_ADD_FAILED = "Failed to add user";
	std::mutex mutex_;
};
