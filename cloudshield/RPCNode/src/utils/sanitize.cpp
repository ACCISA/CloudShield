#include "utils/sanitize.hpp"

#include <algorithm>
#include <cctype>
#include <sstream>

namespace Sanitize {

// ── Helpers ─────────────────────────────────────────────────────────────────

static void RequireNonEmpty(const std::string& input, const char* field) {
    if (input.empty()) {
        throw ValidationError(std::string(field) + " must not be empty");
    }
}

static void RequireMaxLen(const std::string& input, size_t max, const char* field) {
    if (input.size() > max) {
        throw ValidationError(std::string(field) + " exceeds maximum length of " + std::to_string(max));
    }
}

static bool MatchesRegex(const std::string& input, const std::string& pattern) {
    static thread_local std::unordered_map<std::string, std::regex> cache;
    auto it = cache.find(pattern);
    if (it == cache.end()) {
        it = cache.emplace(pattern, std::regex(pattern)).first;
    }
    return std::regex_match(input, it->second);
}

// ── Validators ──────────────────────────────────────────────────────────────

std::string ValidateUsername(const std::string& input) {
    RequireNonEmpty(input, "Username");
    RequireMaxLen(input, 64, "Username");

    // Samba usernames: start with alnum, then alnum + . - _
    if (!MatchesRegex(input, R"(^[a-zA-Z0-9][a-zA-Z0-9.\-_]{0,63}$)")) {
        throw ValidationError(
            "Username must start with a letter or digit and contain only "
            "letters, digits, dots, hyphens, and underscores (max 64 chars)");
    }
    return input;
}

std::string ValidateGroupName(const std::string& input) {
    RequireNonEmpty(input, "Group name");
    RequireMaxLen(input, 64, "Group name");

    // Groups may contain spaces (e.g. "Domain Users")
    if (!MatchesRegex(input, R"(^[a-zA-Z0-9][a-zA-Z0-9 .\-_]{0,63}$)")) {
        throw ValidationError(
            "Group name must start with a letter or digit and contain only "
            "letters, digits, spaces, dots, hyphens, and underscores (max 64 chars)");
    }
    return input;
}

std::string ValidateShareName(const std::string& input) {
    RequireNonEmpty(input, "Share name");
    RequireMaxLen(input, 64, "Share name");

    // No spaces or dots — used directly in filesystem paths
    if (!MatchesRegex(input, R"(^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,63}$)")) {
        throw ValidationError(
            "Share name must start with a letter or digit and contain only "
            "letters, digits, hyphens, and underscores (max 64 chars)");
    }
    return input;
}

std::string ValidateShareSize(const std::string& input) {
    RequireNonEmpty(input, "Share size");
    RequireMaxLen(input, 20, "Share size");

    // e.g. "500M", "1G", "1024K", or plain number (bytes)
    if (!MatchesRegex(input, R"(^[1-9][0-9]{0,18}[KMGTkmgt]?$)")) {
        throw ValidationError(
            "Share size must be a positive integer optionally followed by K, M, G, or T");
    }
    return input;
}

std::string ValidateDnsZone(const std::string& input) {
    RequireNonEmpty(input, "DNS zone");
    RequireMaxLen(input, 253, "DNS zone");

    if (!MatchesRegex(input, R"(^[a-zA-Z0-9]([a-zA-Z0-9.\-]{0,251}[a-zA-Z0-9])?$)")) {
        throw ValidationError("DNS zone must be a valid domain name");
    }
    return input;
}

std::string ValidateDnsName(const std::string& input) {
    RequireNonEmpty(input, "DNS name");
    RequireMaxLen(input, 63, "DNS name");

    if (!MatchesRegex(input, R"(^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$)")) {
        throw ValidationError("DNS name must be a valid hostname label");
    }
    return input;
}

std::string ValidateIPv4(const std::string& input) {
    RequireNonEmpty(input, "IPv4 address");
    RequireMaxLen(input, 15, "IPv4 address");

    if (!MatchesRegex(input, R"(^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$)")) {
        throw ValidationError("Invalid IPv4 address format");
    }

    // Verify each octet is 0-255
    std::istringstream iss(input);
    std::string octet;
    while (std::getline(iss, octet, '.')) {
        int val = std::stoi(octet);
        if (val < 0 || val > 255) {
            throw ValidationError("IPv4 octet out of range (0-255)");
        }
    }
    return input;
}

int ValidatePort(int port) {
    if (port < 1 || port > 65535) {
        throw ValidationError("Port must be between 1 and 65535");
    }
    return port;
}

std::string ValidatePortStr(const std::string& input) {
    RequireNonEmpty(input, "Port");
    RequireMaxLen(input, 5, "Port");

    if (!MatchesRegex(input, R"(^[0-9]{1,5}$)")) {
        throw ValidationError("Port must be numeric");
    }
    int port = std::stoi(input);
    ValidatePort(port);
    return input;
}

std::string ValidatePathComponent(const std::string& input) {
    RequireNonEmpty(input, "Path component");
    RequireMaxLen(input, 255, "Path component");

    // No shell metacharacters, no path traversal
    if (input.find("..") != std::string::npos) {
        throw ValidationError("Path traversal (..) is not allowed");
    }

    // Allow only safe characters
    if (!MatchesRegex(input, R"(^[a-zA-Z0-9._\-/]+$)")) {
        throw ValidationError(
            "Path component contains disallowed characters. "
            "Only letters, digits, dots, hyphens, underscores, and slashes are allowed");
    }
    return input;
}

std::string ValidateKeyPath(const std::string& input) {
    RequireNonEmpty(input, "Key path");
    RequireMaxLen(input, 255, "Key path");

    // Prevent traversal
    if (input.find("..") != std::string::npos) {
        throw ValidationError("Path traversal (..) is not allowed in key path");
    }

    if (!MatchesRegex(input, R"(^[a-zA-Z0-9._\-/]+$)")) {
        throw ValidationError("Key path contains disallowed characters");
    }
    return input;
}

std::string ValidateClientName(const std::string& input) {
    RequireNonEmpty(input, "Client name");
    RequireMaxLen(input, 64, "Client name");

    if (!MatchesRegex(input, R"(^[a-zA-Z0-9][a-zA-Z0-9.\-_]{0,63}$)")) {
        throw ValidationError(
            "Client name must start with a letter or digit and contain only "
            "letters, digits, dots, hyphens, and underscores");
    }
    return input;
}

std::string ValidateDriveLetter(const std::string& input) {
    RequireNonEmpty(input, "Drive letter");

    if (!MatchesRegex(input, R"(^[A-Za-z]$)")) {
        throw ValidationError("Drive letter must be a single letter A-Z");
    }
    return input;
}

std::string ValidateUNCPath(const std::string& input) {
    RequireNonEmpty(input, "UNC path");
    RequireMaxLen(input, 260, "UNC path");

    // UNC: \\server\share or \\server\share\subpath
    if (!MatchesRegex(input, R"(^\\\\[a-zA-Z0-9.\-_]+\\[a-zA-Z0-9.\-_\\]+$)")) {
        throw ValidationError("UNC path must be in \\\\server\\share format with safe characters");
    }
    return input;
}

std::string ValidateRealm(const std::string& input) {
    RequireNonEmpty(input, "Realm");
    RequireMaxLen(input, 253, "Realm");

    if (!MatchesRegex(input, R"(^[a-zA-Z0-9]([a-zA-Z0-9.\-]{0,251}[a-zA-Z0-9])?$)")) {
        throw ValidationError("Realm must be a valid domain name");
    }
    return input;
}

std::string ValidatePassword(const std::string& input) {
    RequireNonEmpty(input, "Password");
    RequireMaxLen(input, 128, "Password");

    // Block characters that could escape single-quote context or inject commands
    static const std::string forbidden = "'\\\n\r\0;|&$`(){}[]<>!";
    for (char c : input) {
        if (c < 0x20 && c != '\t') {
            throw ValidationError("Password contains disallowed control characters");
        }
        if (forbidden.find(c) != std::string::npos) {
            throw ValidationError(
                "Password contains disallowed special characters. "
                "Avoid: ' \\ ; | & $ ` ( ) { } [ ] < > !");
        }
    }
    return input;
}

// ── Shell escape ────────────────────────────────────────────────────────────

std::string ShellEscape(const std::string& input) {
    // Wrap in single quotes, escaping any embedded single quotes: ' → '\''
    std::string result = "'";
    for (char c : input) {
        if (c == '\'') {
            result += "'\\''";
        } else if (c == '\0') {
            // Drop null bytes
            continue;
        } else {
            result += c;
        }
    }
    result += "'";
    return result;
}

} // namespace Sanitize

