#pragma once

#include <string>
#include <iostream>
#include <fstream>

#include "utils/exec.hpp"
#include "tasks/samba.hpp"

bool _create_sparse_file(std::string share_name, std::string share_size);
bool _add_share_conf(std::string share_name);
bool _restart_samba_service();
