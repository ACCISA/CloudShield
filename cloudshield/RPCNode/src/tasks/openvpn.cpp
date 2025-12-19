#include "tasks/openvpn.hpp"

std::string VPNTask::OpenSSHTunnel(std::string ipv4, std::string port, int forward_port, std::string key)
{
	std::string full_cmd = BuildCommand(this->OPEN_SSH_TUNNEL_CMD, 
			ipv4.c_str(),
		       	port.c_str(), 
			forward_port,
			key.c_str());
	return this->RunCommand(full_cmd);
}
