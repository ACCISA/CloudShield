#pragma once

#include <string>
#include <iostream>
#include <optional>
#include <fstream>
#include <cstdlib>
#include <cstdio>
#include <vector>
#include <memory>
#include <google/protobuf/repeated_field.h>

#include "utils/exec.hpp"
#include "utils/sanitize.hpp"
#include "utils/safe_exec.hpp"

#include "infra_service/infra_service.grpc.pb.h"
#include "infra_service/infra_service.pb.h"

#include "tasks/CreateSambaFileShare/task.hpp"

#define DEV_MODE //comment this line in prod

namespace is = infra_service::v1;

struct AddDNSRecordData {
	std::string zone;
	std::string name;
	std::string target;
	std::string password;
};

struct AddDNSRecordH {
	static constexpr const char* NAME_NOT_EXIST = "WERR_DNS_ERROR_NAME_DOES_NOT_EXIST";
	static constexpr const char* RECORD_EXIST = "WERR_DNS_ERROR_RECORD_ALREADY_EXISTS";
	static constexpr const char* SUCCESS = "Record added successfully";
	static constexpr const char* AUTH_FAIL = "NT_STATUS_LOGON_FAILURE";
};

struct DeleteDNSRecordH {
	static constexpr const char* SUCCESS = "Record deleted successfully";
	static constexpr const char* RECORD_NOT_EXIST = "WERR_DNS_ERROR_RECORD_DOES_NOT_EXIST";
	static constexpr const char* NAME_NOT_EXIST = "WERR_DNS_ERROR_NAME_DOES_NOT_EXIST";
	static constexpr const char* AUTH_FAIL = "NT_STATUS_LOGON_FAILURE";
};

class ExecutableTask {
public:
	std::string RunCommand(std::string &command);
};

class SambaTask : public ExecutableTask {
private:
	// Netlogon script path template (only interpolated with validated realm)
	static constexpr const char* NETLOGON_SCRIPT_PATH = "/var/lib/samba/sysvol/%s/scripts/logon.bat";
public:
	static constexpr const char* SAMBA_SMB_CONF_PATH = "/etc/samba/smb.conf";
	std::string AddDomainUser(std::string username, std::string password);
	std::string RemoveDomainUser(std::string username);
	is::Status CreateSambaFileShare(std::string share_name, std::string share_size);
	std::string AddDomainGroup(std::string group_name);
	std::string RemoveDomainGroup(std::string group_name);
	std::string LinkGroupToDomainUsers(std::string group_name);
	std::string AddUserToGroup(std::string group_name, std::string username);
	bool DeleteSambaFileShare(std::string share_name);
	std::string ResetUserPassword(std::string username, std::string new_password);
	std::vector<std::string> GetUserList();
	std::vector<std::string> GetGroupList();
	bool IsDomainUser(std::string username);
	bool AddDNSRecord(AddDNSRecordData& dns_record, std::string& result);
	bool DeleteDNSRecord(AddDNSRecordData& dns_record, std::string& result);
	bool SyncNetlogonScript(std::string realm, const google::protobuf::RepeatedPtrField<infra_service::v1::GroupMapping>& groups);
	is::Status RestartSambaService();
	bool UpdateSambaFileShareACL(std::string share_name, const std::vector<std::string>& groups, const std::vector<std::string>& users);
	bool IsDomainGroup(std::string group_name);
};
