#include "utils/exec.hpp"

std::string ExecuteBinary(const std::string& command) {
    std::array<char, 128> buffer;
    std::string result;
    
    std::string fullCommand = command + " 2>&1";
    std::string fullCommandLocale = "export PYTHONIOENCODING=utf-8; export LC_ALL=en_US.UTF-8; export LANG=en_US.UTF-8; " + fullCommand;

    // popen opens a process by creating a pipe, forking, and invoking the shell
    // "r" means we want to read the output
    //
    std::cout << fullCommandLocale << std::endl;
    std::cout << fullCommandLocale.c_str() << std::endl;
    FILE* pipe = popen(fullCommandLocale.c_str(), "r");
    
    if (!pipe) {
        return "ERROR: Could not open pipe.";
    }

    try {
        while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
            result += buffer.data();
        }
    } catch (...) {
        pclose(pipe);
        throw;
    }

    int exitCode = pclose(pipe);
    
    int actualExitStatus = WEXITSTATUS(exitCode);

    if (actualExitStatus != 0 && result.empty()) {
        return "ERROR: Process exited with code " + std::to_string(actualExitStatus);
    }

    return result;
}
