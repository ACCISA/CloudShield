#pragma once

#include <string>
#include <vector>

/**
 * Safe command execution utilities that bypass the shell.
 *
 * Instead of passing commands through /bin/sh (which interprets metacharacters),
 * these functions use fork()/execvp() to invoke binaries directly with an
 * argument vector. This eliminates shell injection entirely.
 */
namespace SafeExec {

struct ExecResult {
    std::string output;
    int exitCode;
    bool success() const { return exitCode == 0; }
};

/**
 * Execute a binary directly with an argument vector.
 * No shell is involved — the binary is invoked via execvp().
 *
 * @param binary  The binary name or path (e.g. "samba-tool", "/usr/bin/sudo")
 * @param args    The argument vector (does NOT include argv[0]; the binary name is prepended)
 * @return        ExecResult with captured stdout+stderr and exit code
 *
 * Example:
 *   SafeExec::Run("samba-tool", {"user", "add", "john", "P@ss123"})
 *   executes: samba-tool user add john P@ss123
 *   with NO shell interpretation of any argument.
 */
ExecResult Run(const std::string& binary, const std::vector<std::string>& args);

/**
 * Execute a binary via sudo with an argument vector.
 * Equivalent to: sudo <binary> <args...>
 */
ExecResult RunSudo(const std::string& binary, const std::vector<std::string>& args);

} // namespace SafeExec

