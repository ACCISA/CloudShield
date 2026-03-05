#include "utils/safe_exec.hpp"

#include <iostream>
#include <array>
#include <cstring>
#include <unistd.h>
#include <sys/wait.h>

namespace SafeExec {

ExecResult Run(const std::string& binary, const std::vector<std::string>& args) {
    ExecResult result;
    result.exitCode = -1;

    // Build argv for execvp: [binary, arg1, arg2, ..., nullptr]
    std::vector<const char*> argv;
    argv.push_back(binary.c_str());
    for (const auto& arg : args) {
        argv.push_back(arg.c_str());
    }
    argv.push_back(nullptr);

    // Create a pipe to capture stdout + stderr
    int pipefd[2];
    if (pipe(pipefd) == -1) {
        result.output = "ERROR: Failed to create pipe: " + std::string(strerror(errno));
        return result;
    }

    pid_t pid = fork();
    if (pid == -1) {
        close(pipefd[0]);
        close(pipefd[1]);
        result.output = "ERROR: Failed to fork: " + std::string(strerror(errno));
        return result;
    }

    if (pid == 0) {
        // ── Child process ──────────────────────────────────────────────
        close(pipefd[0]); // Close read end

        // Redirect stdout and stderr to the pipe
        dup2(pipefd[1], STDOUT_FILENO);
        dup2(pipefd[1], STDERR_FILENO);
        close(pipefd[1]);

        // Set locale for consistent output
        setenv("PYTHONIOENCODING", "utf-8", 1);
        setenv("LC_ALL", "en_US.UTF-8", 1);
        setenv("LANG", "en_US.UTF-8", 1);

        // execvp searches PATH for the binary
        execvp(binary.c_str(), const_cast<char* const*>(argv.data()));

        // If execvp returns, it failed
        std::cerr << "ERROR: execvp failed for '" << binary << "': " << strerror(errno) << std::endl;
        _exit(127);
    }

    // ── Parent process ─────────────────────────────────────────────────
    close(pipefd[1]); // Close write end

    // Read all output from the child
    std::array<char, 4096> buffer;
    ssize_t bytesRead;
    while ((bytesRead = read(pipefd[0], buffer.data(), buffer.size())) > 0) {
        result.output.append(buffer.data(), bytesRead);
    }
    close(pipefd[0]);

    // Wait for child to finish
    int status;
    waitpid(pid, &status, 0);

    if (WIFEXITED(status)) {
        result.exitCode = WEXITSTATUS(status);
    } else if (WIFSIGNALED(status)) {
        result.exitCode = 128 + WTERMSIG(status);
        result.output += "\nProcess killed by signal " + std::to_string(WTERMSIG(status));
    }

    std::cout << "[SafeExec] " << binary;
    for (const auto& arg : args) {
        std::cout << " " << arg;
    }
    std::cout << " -> exit " << result.exitCode << std::endl;

    return result;
}

ExecResult RunSudo(const std::string& binary, const std::vector<std::string>& args) {
    std::vector<std::string> sudoArgs;
    sudoArgs.push_back(binary);
    sudoArgs.insert(sudoArgs.end(), args.begin(), args.end());
    return Run("sudo", sudoArgs);
}

} // namespace SafeExec

