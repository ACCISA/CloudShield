#include "service/infra_service.hpp"
#include "tasks/samba.hpp"

InfraService::InfraService()
{

}

void InfraService::populate_repeated(auto* repeated_field, const auto& source_vector)
{
	for (const auto& item : source_vector) {
		*repeated_field->Add() = item;
	}
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

Status InfraService::ResetUserPassword(ServerContext* context, const is::ResetUserPasswordData* request, is::ResetUserPasswordDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string username = request->username().c_str();
	std::string password = request->password().c_str();

	auto samba = std::make_unique<SambaTask>();

	if (!samba->IsDomainUser(username)) {
		response->set_status(is::Status::USER_NOT_FOUND);
		return Status(grpc::StatusCode::OK, "User not found");
	}

	std::string result = samba->ResetUserPassword(username, password);

	if ((result.find(this->PASSWORD_SET_FAILED) != std::string::npos) && (result.find(this->PASSWORD_CONSTRAINT_FAILED) != std::string::npos)) {
		response->set_status(is::Status::PASSWORD_REQ_FAILED);
		return Status(grpc::StatusCode::OK, "Password constraints not met");
	}

	if (result.find(this->PASSWORD_SET_FAILED) != std::string::npos) {
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "Failed to set password");
	}

	if (result.find(this->PASSWORD_SET_SUCCESS) != std::string::npos) {
		response->set_status(is::Status::SUCCESS);
		return Status(grpc::StatusCode::OK, "Successfully set password");
	}

	response->set_status(is::Status::UNKNOWN);
		
	return Status(grpc::StatusCode::OK, "User password reset failed unknown");
}

Status InfraService::RemoveDomainUser(ServerContext* context, const is::RemoveDomainUserData* request, is::RemoveDomainUserDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string username = request->username().c_str();

	auto samba = std::make_unique<SambaTask>();

	std::string result = samba->RemoveDomainUser(username);

	if (result == "not_found") {
		response->set_status(is::Status::USER_NOT_FOUND);
		return Status(grpc::StatusCode::OK, "User not found");
	}

	if (result.find(this->DELETED_USER) != std::string::npos) {
		response->set_status(is::Status::SUCCESS);
		return Status(grpc::StatusCode::OK, "User removed from successfully");

	}
	
	response->set_status(is::Status::UNKNOWN);

	return Status(grpc::StatusCode::OK, "User remove failed");


}

Status InfraService::GetUserList(ServerContext* context, const google::protobuf::Empty* request, is::GetUserListDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	auto samba = std::make_unique<SambaTask>();

	std::vector<std::string> users = samba->GetUserList();

	std::cout << "User count = " << users.size() << std::endl;

	response->mutable_users()->Assign(users.begin(), users.end());

	if (users.empty()) {
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "Failed to read user list");
	}

	response->set_status(is::Status::SUCCESS);

	return Status(grpc::StatusCode::OK, "User list retrieved");
}

Status InfraService::CreateSambaFileShare(ServerContext* context, const is::CreateSambaFileShareData* request, is::CreateSambaFileShareDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	is::Status status;

	std::string share_name = request->share_name().c_str();
	std::string share_size = request->share_size().c_str();

	std::cout << "Creating new file share" << std::endl;
	std::cout << "share_name: " << share_name << std::endl;
	std::cout << "share_size: " << share_size << std::endl;

	auto samba = std::make_unique<SambaTask>();

	status = samba->CreateSambaFileShare(share_name, share_size);

	response->set_status(status);

	return Status(grpc::StatusCode::OK, "New File share added successfully");
}

Status InfraService::RestartSambaService(ServerContext* context, const google::protobuf::Empty* request, is::RestartSambaServiceDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	is::Status status;
	
	auto samba = std::make_unique<SambaTask>();

	status = samba->RestartSambaService();

	std::cout << "Restarted samba service" << std::endl;

	response->set_status(status);
		
	return Status(grpc::StatusCode::OK, "Restared samba-ad-dc service");
}

Status InfraService::DeleteSambaFileShare(ServerContext* context, const is::DeleteSambaFileShareData* request, is::DeleteSambaFileShareDataAck* response)
{
	// TODO implement wipe_data and rm -rf share
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string share_name = request->share_name().c_str();
	bool wipe_data = request->wipe_data();

	std::cout << "RPC Call DeleteSambaFileShare" << std::endl;

	auto samba = std::make_unique<SambaTask>();

	bool result = samba->DeleteSambaFileShare(share_name);

	if (!result) {
		response->set_status(is::Status::SHARE_NOT_FOUND);
		return Status(grpc::StatusCode::OK, "Failed to delete samba share");
	}

	response->set_status(is::Status::SUCCESS);

	return Status(grpc::StatusCode::OK, "Deleted samba file share");
}

Status InfraService::AddDNSRecord(ServerContext* context, const is::AddDNSRecordData* request, is::AddDNSRecordDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	std::string result;

	AddDNSRecordData dns_record = {
		request->zone().c_str(),
		request->name().c_str(),
		request->target().c_str(),
		request->password().c_str()
	};

	auto samba = std::make_unique<SambaTask>();

	bool status = samba->AddDNSRecord(dns_record, result);

	if (!status) {
		std::cout << "Failed to add dns record" << std::endl;
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}

	if (result.find(AddDNSRecordH::RECORD_EXIST) != std::string::npos) {
		response->set_status(is::Status::DNS_RECORD_EXIST);
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}

	if (result.find(AddDNSRecordH::NAME_NOT_EXIST) != std::string::npos) {
		response->set_status(is::Status::DNS_ZONE_NOT_FOUND);
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}

	if (result.find(AddDNSRecordH::AUTH_FAIL) != std::string::npos) {
		response->set_status(is::Status::AUTH_FAIL);
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}

	if (result.find(AddDNSRecordH::SUCCESS) != std::string::npos) {
		response->set_status(is::Status::SUCCESS);
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}

	return Status(grpc::StatusCode::OK, "Added DNS entry");
}

Status InfraService::DeleteDNSRecord(ServerContext* context, const is::DeleteDNSRecordData* request, is::DeleteDNSRecordDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	std::string result;
	
	AddDNSRecordData dns_record = {
		request->zone().c_str(),
		request->name().c_str(),
		request->target().c_str(),
		request->password().c_str()
	};

	auto samba = std::make_unique<SambaTask>();

	bool status = samba->DeleteDNSRecord(dns_record, result);
	
	if (!status) {
		std::cout << "Failed to delete dns record" << std::endl;
		return Status(grpc::StatusCode::OK, "Failed to delete dns entry");
	}	

	if (result.find(DeleteDNSRecordH::SUCCESS) != std::string::npos) {
		return Status(grpc::StatusCode::OK, "Failed to delete dns entry");
	}

	if (result.find(DeleteDNSRecordH::NAME_NOT_EXIST) != std::string::npos) {
		return Status(grpc::StatusCode::OK, "Failed to delete dns entry");
	}

	if (result.find(DeleteDNSRecordH::RECORD_NOT_EXIST) != std::string::npos) {
		response->set_status(is::Status::DNS_RECORD_NOT_EXIST);
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}

	if (result.find(AddDNSRecordH::AUTH_FAIL) != std::string::npos) {
		response->set_status(is::Status::AUTH_FAIL);
		return Status(grpc::StatusCode::OK, "Failed to add DNS entry");
	}


	return Status(grpc::StatusCode::OK, "Deleted DNS entry");
}

Status InfraService::SyncNetlogonScript(ServerContext* context, const is::SyncNetlogonScriptData* request, is::SyncNetlogonScriptDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);
	std::string realm = request->realm().c_str();
	
	auto samba = std::make_unique<SambaTask>();

	bool status = samba->SyncNetlogonScript(realm, request->groups());

	return Status(grpc::StatusCode::OK, "Netlogon scripts synced");	
}
  	
