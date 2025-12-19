#include "service/infra_service.hpp"
#include "tasks/samba.hpp"

InfraService::InfraService()
{

}

Status InfraService::AddDomainUser(ServerContext* context, const is::AddDomainUserData* request, is::AddDomainUserDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string username = request->username().c_str();
	std::string password = request->password().c_str();

	std::cout << "username: " << username << "; password: " << password << std::endl;

	auto samba = std::make_unique<SambaTask>();
	
	std::string result = samba->AddDomainUser(username, password);

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
		

	std::cout << result << std::endl;

	response->set_result(result);
	response->set_status(is::Status::SUCCESS);

	return Status(grpc::StatusCode::OK, "User added to domain successfully");
}

Status InfraService::RemoveDomainUser(ServerContext* context, const is::RemoveDomainUserData* request, is::RemoveDomainUserDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	return Status(grpc::StatusCode::OK, "User removed from successfully");
}

