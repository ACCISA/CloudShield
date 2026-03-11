#pragma once

#include <string>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <cstdlib>

#include "tasks/samba.hpp"
#include "utils/sanitize.hpp"
#include "utils/safe_exec.hpp"

struct VPNClientResult {
	bool success;
	std::string filename;
	std::vector<char> content;
	std::string error;
};

class VPNTask : public ExecutableTask {
private:
	static constexpr const char* EASYRSA_DIR = "/etc/openvpn/server/easy-rsa";
	static constexpr const char* CLIENT_COMMON_TXT = "/etc/openvpn/server/client-common.txt";
	static constexpr const char* OVPN_OUTPUT_DIR = "/root";
public:
	std::string OpenSSHTunnel(std::string ipv4, std::string port, int forward_port, std::string key);
	VPNClientResult CreateVPNClient(const std::string& client_name);
};
