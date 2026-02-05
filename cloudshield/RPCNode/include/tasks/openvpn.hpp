#pragma once

#include <string>
#include <iostream>

#include "tasks/samba.hpp"

class VPNTask : public ExecutableTask {
private:
	static constexpr const char* OPEN_SSH_TUNNEL_CMD = "ssh -L %d:%s:%s root@localhost -i /%s";
        static constexpr const char *GET_OPENVPN_CONFIG_CMD =
            "openvpn-create-new-client.sh %s";

      public:
        std::string OpenSSHTunnel(std::string ipv4, std::string port,
                                  int forward_port, std::string key);
        std::filebuf *CreateOpenVPNUser(std::string client_name);
};
