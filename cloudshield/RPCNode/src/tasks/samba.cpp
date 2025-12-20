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
