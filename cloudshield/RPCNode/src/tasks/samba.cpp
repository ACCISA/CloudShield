#include "tasks/samba.hpp"
#include <sstream>

std::string ExecutableTask::RunCommand(std::string &command)
{
	std::string result = ExecuteBinary(command);	
	return result;
};

std::string SambaTask::AddDomainUser(std::string username, std::string password)
{
	// Validate inputs before execution
	Sanitize::ValidateUsername(username);
	Sanitize::ValidatePassword(password);

	std::string profilePath = "\\\\SAMBA.LOCAL\\profiles\\%USERNAME%";

	auto result = SafeExec::Run("samba-tool", {
		"user", "add", username, password,
		"--profile-path=" + profilePath,
		"--script-path=logon.bat"
	});

	return result.output;
}

std::string SambaTask::RemoveDomainUser(std::string username)
{
	Sanitize::ValidateUsername(username);

	if (!this->IsDomainUser(username)) {
		std::cout << "User not found" << std::endl;
		return "not_found";
	}

	auto result = SafeExec::RunSudo("samba-tool", {"user", "delete", username});
	return result.output;
}

std::string SambaTask::AddDomainGroup(std::string group_name)
{
	Sanitize::ValidateGroupName(group_name);

	auto result = SafeExec::Run("samba-tool", {"group", "add", group_name});
	return result.output;
}

std::string SambaTask::LinkGroupToDomainUsers(std::string group_name)
{
	Sanitize::ValidateGroupName(group_name);

	auto result = SafeExec::Run("samba-tool", {"group", "addmembers", "Domain Users", group_name});
	return result.output;
}

std::string SambaTask::AddUserToGroup(std::string group_name, std::string username)
{
	Sanitize::ValidateGroupName(group_name);
	Sanitize::ValidateUsername(username);

	auto result = SafeExec::Run("samba-tool", {"group", "addmembers", group_name, username});
	return result.output;
}

std::string SambaTask::RemoveDomainGroup(std::string group_name)
{
	Sanitize::ValidateGroupName(group_name);

	if (!this->IsDomainGroup(group_name)) {
		std::cout << "Group not found" << std::endl;
		return "not_found";
	}

	auto result = SafeExec::Run("samba-tool", {"group", "delete", group_name});
	return result.output;
}

bool SambaTask::UpdateSambaFileShareACL(std::string share_name, const std::vector<std::string>& groups, const std::vector<std::string>& users)
{
	// Validate all inputs before writing to config
	Sanitize::ValidateShareName(share_name);
	for (const auto& g : groups) {
		Sanitize::ValidateGroupName(g);
	}
	for (const auto& u : users) {
		Sanitize::ValidateUsername(u);
	}

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

	auto result = SafeExec::Run("samba-tool", {"user", "list"});

	if (!result.success()) {
		std::cout << "Failed to list users" << std::endl;
		return {};
	}

	std::istringstream stream(result.output);
	std::string line;
	while (std::getline(stream, line)) {
		// remove trailing whitespace/newline
		while (!line.empty() && (line.back() == '\n' || line.back() == '\r' || line.back() == ' ')) {
			line.pop_back();
		}
		if (!line.empty()) {
			users.push_back(line);
		}
	}

	return users;
}

std::vector<std::string> SambaTask::GetGroupList()
{
	std::vector<std::string> groups;

	auto result = SafeExec::Run("samba-tool", {"group", "list"});

	if (!result.success()) {
		std::cout << "Failed to list groups" << std::endl;
		return {};
	}

	std::istringstream stream(result.output);
	std::string line;
	while (std::getline(stream, line)) {
		while (!line.empty() && (line.back() == '\n' || line.back() == '\r' || line.back() == ' ')) {
			line.pop_back();
		}
		if (!line.empty()) {
			groups.push_back(line);
		}
	}

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
	Sanitize::ValidateUsername(username);
	Sanitize::ValidatePassword(new_password);

	auto result = SafeExec::Run("samba-tool", {
		"user", "setpassword", username,
		"--newpassword=" + new_password
	});
	return result.output;
}


is::Status SambaTask::CreateSambaFileShare(std::string share_name, std::string share_size)
{
	// Validate inputs
	Sanitize::ValidateShareName(share_name);
	Sanitize::ValidateShareSize(share_size);

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
    Sanitize::ValidateShareName(share_name);

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
	Sanitize::ValidateDnsZone(dns_record.zone);
	Sanitize::ValidateDnsName(dns_record.name);
	Sanitize::ValidateIPv4(dns_record.target);
	Sanitize::ValidatePassword(dns_record.password);

	auto exec_result = SafeExec::Run("samba-tool", {
		"dns", "add", "127.0.0.1",
		dns_record.zone, dns_record.name, "A", dns_record.target,
		"-U", "administrator",
		"--password=" + dns_record.password
	});
	
	result = exec_result.output;

	if (result.find("command not found") != std::string::npos) {
		return false;
	}

	return true;
}

bool SambaTask::DeleteDNSRecord(AddDNSRecordData& dns_record, std::string& result)
{
	Sanitize::ValidateDnsZone(dns_record.zone);
	Sanitize::ValidateDnsName(dns_record.name);
	Sanitize::ValidateIPv4(dns_record.target);
	Sanitize::ValidatePassword(dns_record.password);

	auto exec_result = SafeExec::Run("samba-tool", {
		"dns", "delete", "127.0.0.1",
		dns_record.zone, dns_record.name, "A", dns_record.target,
		"-U", "administrator",
		"--password=" + dns_record.password
	});

	result = exec_result.output;

	if (result.find("command not found") != std::string::npos) {
		return false;
	}

	return true;
}

bool SambaTask::SyncNetlogonScript(std::string realm, const google::protobuf::RepeatedPtrField<infra_service::v1::GroupMapping>& groups)
{
	if (groups.empty()) return false;

	// Validate realm
	Sanitize::ValidateRealm(realm);

	std::ofstream out_file(BuildCommand(this->NETLOGON_SCRIPT_PATH, realm.c_str()));

	out_file << "@echo off\n";
	out_file << "net use * /delete /y\n";

	if (!out_file.is_open()) return false;
	
	for (const auto& group_mapping : groups) {
		std::string group_name = group_mapping.group_name();

		// Validate each group name and share data before writing to script
		Sanitize::ValidateGroupName(group_name);

		out_file << "net groups /domain | findstr /i \"" << group_name << "\" > nul\n";
		out_file << "if %errorlevel% equ 0 (\n";


		for (const auto& share : group_mapping.shares()) {
	    		std::string share_path = share.share_path();
			std::string drive_letter = share.drive_letter();

			// Validate share path and drive letter
			Sanitize::ValidateUNCPath(share_path);
			Sanitize::ValidateDriveLetter(drive_letter);

			out_file << "	if not exist " << drive_letter << ": net use " << drive_letter << ": " << share_path << "\n";
		}

		out_file << ")\n";
		out_file << "\n";
	}
	return true;
}

is::Status SambaTask::RestartSambaService()
{
	SafeExec::Run("systemctl", {"restart", "samba-ad-dc"});
	return is::Status::SUCCESS;
}
