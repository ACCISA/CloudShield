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
