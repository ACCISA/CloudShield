#include "tasks/samba.hpp"

std::string ExecutableTask::RunCommand(std::string &command)
{
	std::string result = ExecuteBinary(command);	
	return result;
};

std::string SambaTask::AddDomainUser(std::string username, std::string password)
{	
	std::cout << "aaaa" << std::endl;
	std::cout << this->USER_ADD_CMD << std::endl;
	std::cout << username.c_str() << std::endl;
	std::cout << password.c_str() << std::endl;
	std::string full_cmd = BuildCommand(this->USER_ADD_CMD, username.c_str(), password.c_str());
	std::cout << "debug" << std::endl;
	std::cout << full_cmd << std::endl;
	return this->RunCommand(full_cmd);
}

std::string SambaTask::RemoveDomainUser(std::string username)
{
	if (!this->IsDomainUser(username)) {
		std::cout << "User not found" << std::endl;
		return "not_found";
	}

	std::string full_cmd = BuildCommand(this->USER_DELETE_CMD, username.c_str());
	return this->RunCommand(full_cmd);
}

std::string SambaTask::AddDomainGroup(std::string group_name)
{
	std::string full_cmd = BuildCommand(this->GROUP_ADD_CMD, group_name.c_str());
	return this->RunCommand(full_cmd);
}

std::string SambaTask::LinkGroupToDomainUsers(std::string group_name)
{
	std::string full_cmd = BuildCommand(this->GROUP_ADD_TO_DOMAIN_USERS_CMD, group_name.c_str());
	return this->RunCommand(full_cmd);
}

std::string SambaTask::AddUserToGroup(std::string group_name, std::string username)
{
	std::string full_cmd = BuildCommand(this->GROUP_ADD_MEMBER_CMD, group_name.c_str(), username.c_str());
	return this->RunCommand(full_cmd);
}

std::string SambaTask::RemoveDomainGroup(std::string group_name)
{
	if (!this->IsDomainGroup(group_name)) {
		std::cout << "Group not found" << std::endl;
		return "not_found";
	}

	std::string full_cmd = BuildCommand(this->GROUP_DELETE_CMD, group_name.c_str());
	return this->RunCommand(full_cmd);
}

bool SambaTask::UpdateSambaFileShareACL(std::string share_name, const std::vector<std::string>& groups, const std::vector<std::string>& users)
{
	std::string configPath = this->SAMBA_SMB_CONF_PATH;
	std::string tempPath = configPath + ".tmp";

	std::ifstream inFile(configPath);
	std::ofstream outFile(tempPath);

	if (!inFile.is_open() || !outFile.is_open()) {
		std::cerr << "Error: Could not open configuration files." << std::endl;
		return false;
	}

	std::string line;
	std::string targetHeader = "[" + share_name + "]";
	bool insideTargetBlock = false;
	bool found = false;
	bool wroteValidUsers = false;

	// Build the new 'valid users' line from groups and users
	std::string validUsersLine = "\tvalid users = ";
	for (const auto& g : groups) {
		validUsersLine += "@\"" + g + "\" ";
	}
	for (const auto& u : users) {
		validUsersLine += u + " ";
	}

	while (std::getline(inFile, line)) {
		size_t first = line.find_first_not_of(" \t");
		std::string trimmedLine = (first == std::string::npos) ? "" : line.substr(first);

		if (trimmedLine.find(targetHeader) == 0) {
			insideTargetBlock = true;
			found = true;
			outFile << line << "\n";
			continue;
		}

		if (insideTargetBlock && trimmedLine.find("[") == 0) {
			// Exiting the target block, write new valid users if we haven't yet
			if (!wroteValidUsers) {
				outFile << validUsersLine << "\n";
				wroteValidUsers = true;
			}
			insideTargetBlock = false;
		}

		if (insideTargetBlock && trimmedLine.find("valid users") == 0) {
			// Replace the valid users line
			outFile << validUsersLine << "\n";
			wroteValidUsers = true;
			continue;
		}

		outFile << line << "\n";
	}

	// If we were inside the target block at EOF and didn't write valid users
	if (insideTargetBlock && !wroteValidUsers) {
		outFile << validUsersLine << "\n";
	}

	inFile.close();
	outFile.close();

	if (found) {
		if (std::rename(tempPath.c_str(), configPath.c_str()) == 0) {
			std::cout << "Successfully updated share ACLs: " << share_name << std::endl;
			return true;
		}
	} else {
		std::remove(tempPath.c_str());
		std::cerr << "Share not found: " << share_name << std::endl;
	}

	return false;
}

std::vector<std::string> SambaTask::GetUserList()
{
	std::vector<std::string> users;
	char buffer[128];

	FILE* pipe = popen(this->USER_LIST_CMD, "r");

	if (!pipe) {
		std::cout << "Failed to read pipe" << std::endl;
		return {};
	}
	
	try {
		while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
			std::string user = buffer;

			// remove last newline char
			if (!user.empty() && user.back() == '\n') {
				user.pop_back();
			}

			if (!user.empty()) {
				users.push_back(user);
			}

		}
	}
	catch (...) {
		pclose(pipe);
		return {};
	}

	pclose(pipe);
	return users;
}

std::vector<std::string> SambaTask::GetGroupList()
{
	std::vector<std::string> groups;
	char buffer[128];

	FILE* pipe = popen(this->GROUP_LIST_CMD, "r");

	if (!pipe) {
		std::cout << "Failed to read pipe" << std::endl;
		return {};
	}

	try {
		while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
			std::string group = buffer;

			if (!group.empty() && group.back() == '\n') {
				group.pop_back();
			}

			if (!group.empty()) {
				groups.push_back(group);
			}

		}
	}
	catch (...) {
		pclose(pipe);
		return {};
	}

	pclose(pipe);
	return groups;
}

bool SambaTask::IsDomainUser(std::string user)
{
	std::vector<std::string> users = this->GetUserList();

	for (const std::string& user_ : users) {
		if (user_ == user) {
			return true;
		}
	}
	return false;
}

bool SambaTask::IsDomainGroup(std::string group)
{
	std::vector<std::string> groups = this->GetGroupList();

	for (const std::string& group_ : groups) {
		if (group_ == group) {
			return true;
		}
	}
	return false;
}

std::string SambaTask::ResetUserPassword(std::string username, std::string new_password)
{
	std::string full_cmd = BuildCommand(this->RESET_PASSWORD_CMD, username.c_str(), new_password.c_str());
	return this->RunCommand(full_cmd);
}


is::Status SambaTask::CreateSambaFileShare(std::string share_name, std::string share_size)
{

	is::Status status;

	status = _create_sparse_file(share_name, share_size);

	if (status != is::Status::SUCCESS) {
		std::cout << "Failed to create sparse file" << std::endl;
		return status;
	}
	
	status = _add_share_conf(share_name);

	if (status != is::Status::SUCCESS) {
		std::cout << "Failed to create new samba share" << std::endl;
		return status;
	}
	
	status = _restart_samba_service();

	if (status != is::Status::SUCCESS) {
		std::cout << "Failed to restart samba service" << std::endl;
		return status;
	}

	return status;
	
}

bool SambaTask::DeleteSambaFileShare(std::string share_name)
{
    std::string configPath = this->SAMBA_SMB_CONF_PATH;
    std::string tempPath = configPath+".tmp";

    std::ifstream inFile(configPath);
    std::ofstream outFile(tempPath);

    if (!inFile.is_open() || !outFile.is_open()) {
        std::cerr << "Error: Could not open configuration files." << std::endl;
        return false;
    }

    std::string line;
    std::string targetHeader = "[" + share_name + "]";
    bool insideTargetBlock = false;
    bool found = false;

    while (std::getline(inFile, line)) {
        size_t first = line.find_first_not_of(" \t");
        std::string trimmedLine = (first == std::string::npos) ? "" : line.substr(first);

        if (trimmedLine.find(targetHeader) == 0) {
            insideTargetBlock = true;
            found = true;
            continue;
        }

        if (insideTargetBlock && trimmedLine.find("[") == 0) {
            insideTargetBlock = false;
        }

        if (!insideTargetBlock) {
            outFile << line << "\n";
        }
    }

    inFile.close();
    outFile.close();

    if (found) {
        if (std::rename(tempPath.c_str(), configPath.c_str()) == 0) {
            std::cout << "Successfully removed share: " << share_name << std::endl;
            return true;
        }
    } else {
        std::remove(tempPath.c_str());
        std::cerr << "Share not found." << std::endl;
    }

    return false;
}

bool SambaTask::AddDNSRecord(AddDNSRecordData& dns_record, std::string& result)
{
	std::string full_cmd = BuildCommand(this->ADD_DNS_CMD,
			dns_record.zone.c_str(),
			dns_record.name.c_str(),
			dns_record.target.c_str(),
			dns_record.password.c_str());
	
	result =  this->RunCommand(full_cmd);

	if (result.find("command not found") != std::string::npos) {
		return false;
	}

	return true;
}

bool SambaTask::DeleteDNSRecord(AddDNSRecordData& dns_record, std::string& result)
{
	std::string full_cmd = BuildCommand(this->DELETE_DNS_CMD,
			dns_record.zone.c_str(),
			dns_record.name.c_str(),
			dns_record.target.c_str(),
			dns_record.password.c_str());

	result = this->RunCommand(full_cmd);

	if (result.find("command not found") != std::string::npos) {
		return false;
	}

	return true;
}

bool SambaTask::SyncNetlogonScript(std::string realm, const google::protobuf::RepeatedPtrField<infra_service::v1::GroupMapping>& groups)
{
	if (groups.empty()) return false;

	std::ofstream out_file(BuildCommand(this->NETLOGON_SCRIPT_PATH, realm));

	out_file << "@echo off\n";
	out_file << "net use * /delete /y\n";

	if (!out_file.is_open()) return false;
	
	for (const auto& group_mapping : groups) {
		std::string group_name = group_mapping.group_name();

		out_file << "net groups /domain | findstr /i \"" << group_name << "\" > nul\n";
		out_file << "if %errorlevel% equ 0 (\n";


		for (const auto& share : group_mapping.shares()) {
	    		std::string share_path = share.share_path();
			std::string drive_letter = share.drive_letter();

			out_file << "	if not exist " << drive_letter << ": net use " << drive_letter << ": " << share_path << "\n";
		}

		out_file << ")\n";
		out_file << "\n";
	}
	return true;
}

is::Status SambaTask::RestartSambaService()
{
	_restart_samba_service();
	return is::Status::SUCCESS;
}
