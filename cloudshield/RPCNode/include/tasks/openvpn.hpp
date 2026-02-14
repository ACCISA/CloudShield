#pragma once

#include <string>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <cstdlib>

#include "tasks/samba.hpp"

struct VPNClientResult {
	bool success;
	std::string filename;
	std::vector<char> content;
	std::string error;
};

class VPNTask : public ExecutableTask {
private:
	static constexpr const char* OPEN_SSH_TUNNEL_CMD = "ssh -L %d:%s:%s root@localhost -i /%s";
	static constexpr const char* EASYRSA_DIR = "/etc/openvpn/server/easy-rsa";
	static constexpr const char* CLIENT_COMMON_TXT = "/etc/openvpn/server/client-common.txt";
	static constexpr const char* EASYRSA_BUILD_CMD = "cd /etc/openvpn/server/easy-rsa && ./easyrsa --batch --days=3650 build-client-full %s nopass 2>&1";
	static constexpr const char* OVPN_OUTPUT_DIR = "/root";
public:
	std::string OpenSSHTunnel(std::string ipv4, std::string port, int forward_port, std::string key);
	VPNClientResult CreateVPNClient(const std::string& client_name);
};
