#include "tasks/openvpn.hpp"

namespace {
bool ReplaceRemoteHostPreserveArgs(std::string& remote_line)
{
	std::istringstream token_stream(remote_line);
	std::vector<std::string> tokens;
	std::string token;

	while (token_stream >> token) {
		tokens.push_back(token);
	}

	if (tokens.size() < 3 || tokens[0] != "remote") {
		return false;
	}

	tokens[1] = "127.0.0.1";

	std::ostringstream rebuilt;
	for (size_t i = 0; i < tokens.size(); ++i) {
		if (i > 0) {
			rebuilt << ' ';
		}
		rebuilt << tokens[i];
	}

	remote_line = rebuilt.str();
	return true;
}

bool ReplaceLastRemoteDirective(std::string& config_content)
{
	std::istringstream input(config_content);
	std::vector<std::string> lines;
	std::string line;
	int last_remote_index = -1;

	while (std::getline(input, line)) {
		if (!line.empty() && line.back() == '\r') {
			line.pop_back();
		}
		if (line.rfind("remote ", 0) == 0) {
			last_remote_index = static_cast<int>(lines.size());
		}
		lines.push_back(line);
	}

	if (last_remote_index < 0) {
		return false;
	}

	if (!ReplaceRemoteHostPreserveArgs(lines[static_cast<size_t>(last_remote_index)])) {
		return false;
	}

	const bool had_trailing_newline = !config_content.empty() && config_content.back() == '\n';
	std::ostringstream output;
	for (size_t i = 0; i < lines.size(); ++i) {
		if (i > 0) {
			output << '\n';
		}
		output << lines[i];
	}
	if (had_trailing_newline) {
		output << '\n';
	}

	config_content = output.str();
	return true;
}
}

std::string VPNTask::OpenSSHTunnel(std::string ipv4, std::string port, int forward_port, std::string key)
{
	// Validate all inputs
	Sanitize::ValidateIPv4(ipv4);
	Sanitize::ValidatePortStr(port);
	Sanitize::ValidatePort(forward_port);
	Sanitize::ValidateKeyPath(key);

	std::string localForward = std::to_string(forward_port) + ":" + ipv4 + ":" + port;

	auto result = SafeExec::Run("ssh", {
		"-L", localForward,
		"root@localhost",
		"-i", "/" + key
	});
	return result.output;
}

VPNClientResult VPNTask::CreateVPNClient(const std::string& client_name, bool debug_localhost_remote)
{
	VPNClientResult result;
	result.success = false;

	// Validate client name
	Sanitize::ValidateClientName(client_name);

	// 1. Generate client certificate via EasyRSA
	//    EasyRSA expects to run from its own directory for relative pki/ paths
	std::cout << "[VPN] Building client cert for: " << client_name << std::endl;

	auto build_result = SafeExec::RunInDir(EASYRSA_DIR, "./easyrsa", {
		"--batch", "--days=3650",
		"build-client-full", client_name, "nopass"
	});

	std::cout << "[VPN] EasyRSA output: " << build_result.output << std::endl;

	if (!build_result.success()) {
		result.error = "EasyRSA failed while building client certificate for '" + client_name + "'";
		std::cerr << "[VPN] " << result.error << std::endl;
		return result;
	}
	// 2. Build the .ovpn file using SafeExec with grep
	std::string inline_path = std::string(EASYRSA_DIR) + "/pki/inline/private/" + client_name + ".inline";
	std::string ovpn_path = std::string(OVPN_OUTPUT_DIR) + "/" + client_name + ".ovpn";

	// Use grep safely — no shell involved, output captured via SafeExec
	auto grep_result = SafeExec::Run("grep", {
		"-vh", "^#",
		std::string(CLIENT_COMMON_TXT),
		inline_path
	});

	if (!grep_result.success()) {
		result.error = "Failed to generate .ovpn file content";
		std::cerr << "[VPN] " << result.error << std::endl;
		return result;
	}

	// Write the .ovpn content to file
	std::ofstream ovpn_out(ovpn_path, std::ios::binary);
	if (!ovpn_out.is_open()) {
		result.error = "Failed to write .ovpn file at " + ovpn_path;
		std::cerr << "[VPN] " << result.error << std::endl;
		return result;
	}
	ovpn_out.write(grep_result.output.data(), grep_result.output.size());
	ovpn_out.close();

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

	if (debug_localhost_remote) {
		if (!ReplaceLastRemoteDirective(file_content)) {
			result.error = "Failed to find remote directive in generated .ovpn content";
			std::cerr << "[VPN] " << result.error << std::endl;
			return result;
		}
	}

	result.success = true;
	result.filename = client_name + ".ovpn";
	result.content = std::vector<char>(file_content.begin(), file_content.end());

	std::cout << "[VPN] Successfully created config for " << client_name
	          << " (" << result.content.size() << " bytes)" << std::endl;

	// 4. Clean up the on-disk .ovpn file
	std::remove(ovpn_path.c_str());

	return result;
}
