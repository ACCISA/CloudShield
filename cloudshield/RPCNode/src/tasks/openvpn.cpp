#include "tasks/openvpn.hpp"
#include <fstream>

std::string VPNTask::OpenSSHTunnel(std::string ipv4, std::string port, int forward_port, std::string key)
{
	std::string full_cmd = BuildCommand(this->OPEN_SSH_TUNNEL_CMD, 
			ipv4.c_str(),
		       	port.c_str(), 
			forward_port,
			key.c_str());
	return this->RunCommand(full_cmd);
}

std::filebuf *VPNTask::CreateOpenVPNUser(std::string client_name) {
  std::string full_cmd =
      BuildCommand(this->GET_OPENVPN_CONFIG_CMD, client_name.c_str());
  std::string output = this->RunCommand(full_cmd);

  std::filebuf *fb = new std::filebuf();
  fb->open(("/home/ubuntu/" + client_name + ".ovpn").c_str(), std::ios::out);
  fb->sputn(output.c_str(), output.size());
  fb->close();
  return fb;
}
