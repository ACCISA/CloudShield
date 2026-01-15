#pragma once

#include <string>
#include <iostream>

#include "tasks/samba.hpp"

class VPNTask : public ExecutableTask {
private:
	static constexpr const char* OPEN_SSH_TUNNEL_CMD = "ssh -L %d:%s:%s root@localhost -i /%s";
public:
	std::string OpenSSHTunnel(std::string ipv4, std::string port, int forward_port, std::string key);
};
