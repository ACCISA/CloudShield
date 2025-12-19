#pragma once

#include <string>
#include <iostream>
#include <fstream>

#include "utils/exec.hpp"

class ExecutableTask {
public:
	std::string RunCommand(std::string &command);
};

class SambaTask : public ExecutableTask {
private:
	static constexpr const char* SAMBA_SMB_CONF_PATH = "/etc/samba/smb.conf";
	static constexpr const char* USER_ADD_CMD = "samba-tool user add %s %s --profile-path='\\\\SAMBA.LOCAL\\profiles\\%USERNAME%'";
	std::string RestartSambaService();
public:
	std::string AddDomainUser(std::string username, std::string password);
	std::string CreateSambaFileShare(std::string share_name);
};
