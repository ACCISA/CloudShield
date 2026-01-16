#pragma once

#include <string>
#include <iostream>
#include <fstream>
#include <cstdlib>
#include <sys/wait.h>
#include <filesystem>

#include "utils/exec.hpp"
#include "tasks/samba.hpp"

#include "infra_service/infra_service.grpc.pb.h"
#include "infra_service/infra_service.pb.h"

namespace is = infra_service::v1;
namespace fs = std::filesystem;

is::Status _create_sparse_file(std::string share_name, std::string share_size);
is::Status _add_share_conf(std::string share_name);
is::Status _restart_samba_service();
bool _delete_sparse_file(std::string share_name);
