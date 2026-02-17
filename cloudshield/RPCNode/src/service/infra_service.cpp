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

Status InfraService::AddDomainGroup(ServerContext* context, const is::AddDomainGroupData* request, is::AddDomainGroupDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string group_name = request->group_name().c_str();

	auto samba = std::make_unique<SambaTask>();

	if (samba->IsDomainGroup(group_name)) {
		response->set_result("Group already exists");
		response->set_status(is::Status::DUPLICATE);
		return Status(grpc::StatusCode::OK, "Group exists");
	}

	std::string create_result = samba->AddDomainGroup(group_name);

	if (create_result.find(this->GROUP_EXISTS) != std::string::npos) {
		response->set_result(create_result);
		response->set_status(is::Status::DUPLICATE);
		return Status(grpc::StatusCode::OK, "Group exists");
	}

	if (create_result.find(this->GROUP_ADD_SUCCESS) == std::string::npos) {
		response->set_result(create_result);
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "Failed to add group");
	}

	std::string link_result = samba->LinkGroupToDomainUsers(group_name);

	std::string combined_result = create_result + "\n" + link_result;

	if (link_result.find(this->GROUP_ADD_MEMBERS_SUCCESS) == std::string::npos) {
		response->set_result(combined_result);
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "Failed to link group to Domain Users");
	}

	response->set_result(combined_result);
	response->set_status(is::Status::SUCCESS);
	return Status(grpc::StatusCode::OK, "Group added and linked successfully");
}

Status InfraService::AddUserToGroup(ServerContext* context, const is::AddUserToGroupData* request, is::AddUserToGroupDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string username = request->username();
	std::string group_name = request->group_name();

	auto samba = std::make_unique<SambaTask>();

	if (!samba->IsDomainGroup(group_name)) {
		response->set_status(is::Status::FAILED);
		response->set_result("Group not found");
		return Status(grpc::StatusCode::OK, "Group not found");
	}

	if (!samba->IsDomainUser(username)) {
		response->set_status(is::Status::USER_NOT_FOUND);
		response->set_result("User not found");
		return Status(grpc::StatusCode::OK, "User not found");
	}

	std::string membership_result = samba->AddUserToGroup(group_name, username);

	if (membership_result.find(this->GROUP_ADD_MEMBERS_SUCCESS) == std::string::npos) {
		response->set_status(is::Status::FAILED);
		response->set_result(membership_result);
		return Status(grpc::StatusCode::OK, "Failed to add user to group");
	}

	response->set_status(is::Status::SUCCESS);
	response->set_result(membership_result);
	return Status(grpc::StatusCode::OK, "User added to group successfully");
}

Status InfraService::RemoveDomainGroup(ServerContext* context, const is::RemoveDomainGroupData* request, is::RemoveDomainGroupDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string group_name = request->group_name().c_str();

	auto samba = std::make_unique<SambaTask>();

	if (!samba->IsDomainGroup(group_name)) {
		response->set_result(this->GROUP_NOT_FOUND);
		response->set_status(is::Status::GROUP_NOT_FOUND);
		return Status(grpc::StatusCode::OK, "Group not found");
	}

	std::string result = samba->RemoveDomainGroup(group_name);

	if (result.find(this->DELETED_GROUP) != std::string::npos) {
		response->set_result(result);
		response->set_status(is::Status::SUCCESS);
		return Status(grpc::StatusCode::OK, "Group removed successfully");
	}

	response->set_result(result);
	response->set_status(is::Status::FAILED);
	return Status(grpc::StatusCode::OK, "Failed to remove group");
}

Status InfraService::CreateDomainUserWithGroup(ServerContext* context, const is::CreateDomainUserWithGroupData* request, is::CreateDomainUserWithGroupDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string username = request->username();
	std::string password = request->password();
	std::string group_name = request->group_name();

	if (group_name.empty()) {
		group_name = username + "-group";
	}

	auto samba = std::make_unique<SambaTask>();

	if (samba->IsDomainUser(username)) {
		response->set_status(is::Status::DUPLICATE);
		response->set_user_result("User already exists");
		return Status(grpc::StatusCode::OK, "User exists");
	}

	bool group_exists = samba->IsDomainGroup(group_name);
	std::string group_result;

	if (!group_exists) {
		group_result = samba->AddDomainGroup(group_name);

		if (group_result.find(this->GROUP_ADD_SUCCESS) == std::string::npos) {
			response->set_group_result(group_result);
			response->set_status(is::Status::FAILED);
			return Status(grpc::StatusCode::OK, "Failed to add group");
		}
	} else {
		group_result = "Group already exists";
	}

	std::string link_result = samba->LinkGroupToDomainUsers(group_name);
	if (link_result.find(this->GROUP_ADD_MEMBERS_SUCCESS) == std::string::npos) {
		response->set_group_result(group_result);
		response->set_link_result(link_result);
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "Failed to link group to Domain Users");
	}

	std::string user_result = samba->AddDomainUser(username, password);

	if (user_result.find(this->USER_EXISTS) != std::string::npos) {
		response->set_group_result(group_result);
		response->set_link_result(link_result);
		response->set_user_result(user_result);
		response->set_status(is::Status::DUPLICATE);
		return Status(grpc::StatusCode::OK, "User exists");
	}

	if (user_result.find(this->USER_ADD_FAILED) != std::string::npos) {
		response->set_group_result(group_result);
		response->set_link_result(link_result);
		response->set_user_result(user_result);
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "User add failed");
	}

	std::string membership_result = samba->AddUserToGroup(group_name, username);

	if (membership_result.find(this->GROUP_ADD_MEMBERS_SUCCESS) == std::string::npos) {
		response->set_group_result(group_result);
		response->set_link_result(link_result);
		response->set_user_result(user_result);
		response->set_membership_result(membership_result);
		response->set_status(is::Status::FAILED);
		return Status(grpc::StatusCode::OK, "Failed to add user to group");
	}

	response->set_group_result(group_result);
	response->set_link_result(link_result);
	response->set_user_result(user_result);
	response->set_membership_result(membership_result);
	response->set_status(is::Status::SUCCESS);

	return Status(grpc::StatusCode::OK, "User, group, and linkage created successfully");
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

	this->populate_repeated(response->mutable_users(), users);

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

Status InfraService::UpdateSambaFileShare(ServerContext* context, const is::UpdateSambaFileShareData* request, is::UpdateSambaFileShareDataAck* response)
{
	std::lock_guard<std::mutex> lock(this->mutex_);

	std::string share_name = request->share_name().c_str();

	std::cout << "RPC Call UpdateSambaFileShare: " << share_name << std::endl;

	auto samba = std::make_unique<SambaTask>();

	// Collect groups and users from the repeated fields
	std::vector<std::string> groups;
	for (const auto& g : request->groups()) {
		groups.push_back(g);
	}
	std::vector<std::string> users;
	for (const auto& u : request->users()) {
		users.push_back(u);
	}

	bool result = samba->UpdateSambaFileShareACL(share_name, groups, users);

	if (!result) {
		response->set_status(is::Status::SHARE_NOT_FOUND);
		return Status(grpc::StatusCode::OK, "Failed to update samba share");
	}

	// Restart samba to apply new config
	samba->RestartSambaService();

	response->set_status(is::Status::SUCCESS);
	return Status(grpc::StatusCode::OK, "Updated samba file share ACLs");
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
  	
