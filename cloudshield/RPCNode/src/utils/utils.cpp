#include "utils/init.hpp"

int VerifySamba()
{
    std::string samba_path = "/usr/bin/samba-tool";

    if (fs::exists(samba_path)) {
        return FOUND;
    }

    return NOT_FOUND;
}
