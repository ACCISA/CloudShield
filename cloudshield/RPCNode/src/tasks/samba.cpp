#include "tasks/samba.hpp"

std::string ExecutableTask::RunCommand(std::string &command)
{
	std::string result = ExecuteBinary(command);	
	return result;
};

std::string SambaTask::AddDomainUser(std::string username, std::string password)
{
	std::string full_cmd = BuildCommand(this->USER_ADD_CMD, username.c_str(), password.c_str());
	return this->RunCommand(full_cmd);
}

std::string SambaTask::RemoveDomainUser(std::string username)
{
	if (!this->IsDomainUser(username)) {
		return "not_found";
	}

	std::string full_cmd = BuildCommand(this->USER_DELETE_CMD, username.c_str());
	return this->RunCommand(full_cmd);
}

std::string SambaTask::RestartSambaService()
{
	std::system(this->RESTART_SAMBA_CMD);
	return "";
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

std::string SambaTask::ResetUserPassword(std::string username, std::string new_password)
{
	std::string full_cmd = BuildCommand(this->RESET_PASSWORD_CMD, username.c_str(), new_password.c_str());
	return this->RunCommand(full_cmd);
}


std::string SambaTask::CreateSambaFileShare(std::string share_name)
{


	std::ofstream out_file;
	out_file.open(SAMBA_SMB_CONF_PATH, std::ios_base::app);

	if (out_file.is_open()) {

		out_file << "[" << share_name << "]" << std::endl;
		out_file << "	path = /srv/samba/shared/" << share_name << std::endl;
		out_file << "	browseable = yes" << std::endl;
		out_file << "	read only = no" << std::endl;
		out_file << "	valid users = @\"Domain Users" << std::endl;
		out_file << "	create mask = 0660" << std::endl;
		out_file << "	directory mask = 2770" << std::endl;

		out_file.close();

		this->RestartSambaService();

	} else {
		return "";
	}

	return "";
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

bool SambaTask::SyncNetlogonScript(const google::protobuf::RepeatedPtrField<infra_service::v1::GroupMapping>& groups)
{
	if (groups.empty()) return false;

	std::ofstream out_file(this->NETLOGON_SCRIPT_PATH);

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
}
