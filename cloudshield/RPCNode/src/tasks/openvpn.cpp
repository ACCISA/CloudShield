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

VPNClientResult VPNTask::CreateVPNClient(const std::string& client_name)
{
	VPNClientResult result;
	result.success = false;

	// 1. Generate client certificate via EasyRSA
	std::string build_cmd = BuildCommand(this->EASYRSA_BUILD_CMD, client_name.c_str());
	std::cout << "[VPN] Running: " << build_cmd << std::endl;
	std::string build_output = ExecuteBinary(build_cmd);
	std::cout << "[VPN] EasyRSA output: " << build_output << std::endl;

	// 2. Build the .ovpn file (same as openvpn-install.sh)
	//    grep -vh '^#' client-common.txt pki/inline/private/<client>.inline > <client>.ovpn
	std::string inline_path = std::string(EASYRSA_DIR) + "/pki/inline/private/" + client_name + ".inline";
	std::string ovpn_path = std::string(OVPN_OUTPUT_DIR) + "/" + client_name + ".ovpn";

	std::string gen_ovpn_cmd = "grep -vh '^#' " + std::string(CLIENT_COMMON_TXT) + " " + inline_path + " > " + ovpn_path;
	std::cout << "[VPN] Building .ovpn: " << gen_ovpn_cmd << std::endl;
	int gen_ret = std::system(gen_ovpn_cmd.c_str());
	if (gen_ret != 0) {
		result.error = "Failed to generate .ovpn file";
		std::cerr << "[VPN] " << result.error << std::endl;
		return result;
	}

	// 3. Read the .ovpn file into memory
	std::ifstream ovpn_file(ovpn_path, std::ios::binary);
	if (!ovpn_file.is_open()) {
		result.error = "Failed to open generated .ovpn file at " + ovpn_path;
		std::cerr << "[VPN] " << result.error << std::endl;
		return result;
	}

	std::ostringstream oss;
	oss << ovpn_file.rdbuf();
	std::string file_content = oss.str();
	ovpn_file.close();

	result.success = true;
	result.filename = client_name + ".ovpn";
	result.content = std::vector<char>(file_content.begin(), file_content.end());

	std::cout << "[VPN] Successfully created config for " << client_name
	          << " (" << result.content.size() << " bytes)" << std::endl;

	// 4. Clean up the on-disk .ovpn file
	std::remove(ovpn_path.c_str());

	return result;
}
