#include <iostream>
#include <memory>
#include "config/config.hpp"
#include "service/infra_service.hpp"
#include "service/vpn_service.hpp"
#include "server/server.hpp"
#include "utils/init.hpp"
#include "utils/exec.hpp"
#include "tasks/samba.hpp"

void print_usage()
{
	std::cout << "Usage: ./protobuf [-samba or -vpn]" << std::endl;
}

int main(int argc, char** argv)
{
	if (argc == 1) {
		print_usage();
		return 1;
	}
	std::string samba_mode = "-samba";
	std::string openvpn_mode = "-vpn";
	try
	{	
		Config config = Config::New();
		
		if (argv[1] == samba_mode) {
			std::shared_ptr<InfraService> iService = std::make_shared<InfraService>();
			std::unique_ptr<InfraNode> iNode = std::make_unique<InfraNode>(config.host+":"+config.port, iService, is::InfraService::service_full_name());

			iNode->Start();
			return 0;
		}

		if (argv[1] == openvpn_mode) {
			//init_openvpn_mode();
			std::shared_ptr<VPNService> iService = std::make_shared<VPNService>();
			std::unique_ptr<InfraNode> iNode = std::make_unique<InfraNode>(config.host+":"+config.port, iService, is::InfraService::service_full_name());

			iNode->Start();
			return 0;
		}
		print_usage();
		return 1;
	}
	catch (const std::exception &e)
	{
		std::cerr << e.what() << '\n';
		return 1;
	}
	return 0;
}
