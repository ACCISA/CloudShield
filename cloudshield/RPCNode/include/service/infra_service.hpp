#pragma once

#include <string>
#include <mutex>

#include <grpcpp/grpcpp.h>
#include <grpcpp/server_context.h>
#include <grpcpp/support/status.h>
#include <google/protobuf/empty.pb.h>

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
  	Status ResetUserPassword(ServerContext* context, const is::ResetUserPasswordData* request, is::ResetUserPasswordDataAck* response) override;
  	Status GetUserList(ServerContext* context, const google::protobuf::Empty* request, is::GetUserListDataAck* response) override;
    	Status RemoveDomainUser(ServerContext* context, const is::RemoveDomainUserData* request, is::RemoveDomainUserDataAck* response) override;
    	Status CreateSambaFileShare(ServerContext* context, const is::CreateSambaFileShareData* request, is::CreateSambaFileShareDataAck* response) override;
	Status AddDomainGroup(ServerContext* context, const is::AddDomainGroupData* request, is::AddDomainGroupDataAck* response) override;
	Status RestartSambaService(ServerContext* context, const google::protobuf::Empty* request, is::RestartSambaServiceDataAck* response) override;
	Status DeleteSambaFileShare(ServerContext* context, const is::DeleteSambaFileShareData* request, is::DeleteSambaFileShareDataAck* response) override;
private:
	static constexpr const char* USER_EXISTS = "already exists";
	static constexpr const char* USER_ADD_FAILED = "Failed to add user";
	static constexpr const char* DELETED_USER = "Deleted user";
	static constexpr const char* PASSWORD_SET_FAILED = "Failed to set password for user";
	static constexpr const char* PASSWORD_SET_SUCCESS = "Changed password OK";
	static constexpr const char* PASSWORD_CONSTRAINT_FAILED = "Constraint violation";
	static constexpr const char* GROUP_ADD_SUCCESS = "Added group";
	static constexpr const char* GROUP_ADD_MEMBERS_SUCCESS = "Added members";
	static constexpr const char* GROUP_ADD_FAILED = "Failed to add group";
	static constexpr const char* GROUP_EXISTS = "already exists";

	void populate_repeated(auto* response_field, const auto& source_vector);

	std::mutex mutex_;
};
