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
#include "tasks/CreateSambaFileShare/task.hpp"

#include "infra_service/infra_service.grpc.pb.h"
#include "infra_service/infra_service.pb.h"

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
	// IMPORTANT TODO these commands allow command injections, we need sanitize inputs at some point
	static constexpr const char* ADD_DNS_CMD = "samba-tool dns add 127.0.0.1 %s %s A %s -U administrator --password='%s'";
	static constexpr const char* DELETE_DNS_CMD = "samba-tool dns delete 127.0.0.1 %s %s A %s -U administrator --password='%s'";
	static constexpr const char* USER_DELETE_CMD = "sudo samba-tool user delete %s";
	static constexpr const char* USER_ADD_CMD = "samba-tool user add %s %s --profile-path='\\\\SAMBA.LOCAL\\profiles\\%USERNAME%' --script-path=\"logon.bat\"";
	static constexpr const char* RESET_PASSWORD_CMD = "samba-tool user setpassword %s --newpassword=%s";
	static constexpr const char* USER_LIST_CMD = "samba-tool user list";

	static constexpr const char* NETLOGON_SCRIPT_PATH = "/var/lib/samba/sysvol/%s/scripts/logon.bat";
	static constexpr const char* WINDOWS_GROUP_LOOKUP_CMD = "net groups /domain | findstr /i '%s' > nul\n";

public:
	static constexpr const char* SAMBA_SMB_CONF_PATH = "/etc/samba/smb.conf";
	static constexpr const char* RESTART_SAMBA_CMD = "systemctl restart samba-ad-dc";
	std::string AddDomainUser(std::string username, std::string password);
	std::string RemoveDomainUser(std::string username);
	bool CreateSambaFileShare(std::string share_name, std::string share_size);
	bool DeleteSambaFileShare(std::string share_name);
	std::string ResetUserPassword(std::string username, std::string new_password); // unimp
	std::vector<std::string> GetUserList();
	bool IsDomainUser(std::string username);
	bool AddDNSRecord(AddDNSRecordData& dns_record, std::string& result);
	bool DeleteDNSRecord(AddDNSRecordData& dns_record, std::string& result);
	bool SyncNetlogonScript(std::string realm, const google::protobuf::RepeatedPtrField<infra_service::v1::GroupMapping>& groups);
};
