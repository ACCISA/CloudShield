#pragma once

#include <string>
#include <iostream>
#include <optional>
#include <fstream>
#include <cstdlib>
#include <cstdio>
#include <vector>
#include <memory>

#include "utils/exec.hpp"

#define DEV_MODE //comment this line in prod

class ExecutableTask {
public:
	std::string RunCommand(std::string &command);
};

class SambaTask : public ExecutableTask {
private:
	// IMPORTANT TODO these commands allow command injections, we need sanitize inputs at some point
	static constexpr const char* SAMBA_SMB_CONF_PATH = "/etc/samba/smb.conf";
	static constexpr const char* USER_DELETE_CMD = "sudo samba-tool user delete %s";
	static constexpr const char* RESTART_SAMBA_CMD = "systemctl restart samba-ad-dc";
	static constexpr const char* USER_ADD_CMD = "samba-tool user add %s %s --profile-path='\\\\SAMBA.LOCAL\\profiles\\%USERNAME%'";
	static constexpr const char* RESET_PASSWORD_CMD = "samba-tool user setpassword %s --newpassword=%s";
	static constexpr const char* USER_LIST_CMD = "samba-tool user list";
	static constexpr const char* GROUP_ADD_CMD = "samba-tool group add %s";
	static constexpr const char* GROUP_ADD_TO_DOMAIN_USERS_CMD = "samba-tool group addmembers \"Domain Users\" %s";
	static constexpr const char* GROUP_ADD_MEMBER_CMD = "samba-tool group addmembers %s %s";
	static constexpr const char* GROUP_LIST_CMD = "samba-tool group list";
public:
	std::string AddDomainUser(std::string username, std::string password);
	std::string RemoveDomainUser(std::string username);
	std::string AddDomainGroup(std::string group_name);
	std::string LinkGroupToDomainUsers(std::string group_name);
	std::string AddUserToGroup(std::string group_name, std::string username);
	std::string CreateSambaFileShare(std::string share_name);
	bool DeleteSambaFileShare(std::string share_name);
	std::string RestartSambaService();
	std::string ResetUserPassword(std::string username, std::string new_password); // unimp
	std::vector<std::string> GetUserList();
	std::vector<std::string> GetGroupList();
	bool IsDomainUser(std::string username);
	bool IsDomainGroup(std::string group_name);
};
