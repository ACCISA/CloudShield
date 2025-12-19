#pragma once

#include <string>
#include <iostream>

#include "utils/exec.hpp"

class ExecutableTask {
public:
	std::string RunCommand(std::string &command);
};

class SambaTask : public ExecutableTask {
private:
	static constexpr const char* USER_ADD_CMD = "samba-tool user add %s %s";
public:
	std::string AddDomainUser(std::string username, std::string password);
};
