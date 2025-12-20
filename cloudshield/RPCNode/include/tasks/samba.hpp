#pragma once

#include <string>
#include <iostream>
#include <optional>
#include <fstream>
#include <cstdlib>

#include "utils/exec.hpp"

#define DEV_MODE //comment this line in prod

class ExecutableTask {
public:
	std::string RunCommand(std::string &command);
};

class SambaTask : public ExecutableTask {
private:
	static constexpr const char* SAMBA_SMB_CONF_PATH = "/etc/samba/smb.conf";
	static constexpr const char* RESTART_SAMBA_CMD = "systemctl restart samba-ad-dc";
	static constexpr const char* USER_ADD_CMD = "samba-tool user add %s %s --profile-path='\\\\SAMBA.LOCAL\\profiles\\%USERNAME%'";
public:
	std::string AddDomainUser(std::string username, std::string password);
	std::string CreateSambaFileShare(std::string share_name);
	std::string RestartSambaService();
};
