#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include <regex>

/**
 * Input sanitization and validation utilities.
 *
 * All validators throw std::invalid_argument if the input is malformed.
 * Use these BEFORE passing any user-supplied data to command execution.
 */
namespace Sanitize {

// ── Exception type ──────────────────────────────────────────────────────────
class ValidationError : public std::invalid_argument {
public:
    using std::invalid_argument::invalid_argument;
};

// ── Validators (throw ValidationError on bad input) ─────────────────────────

/**
 * Samba/AD username: 1-64 chars, alphanumeric + dot + hyphen + underscore.
 * Must start with a letter or digit.
 */
std::string ValidateUsername(const std::string& input);

/**
 * Samba/AD group name: 1-64 chars, alphanumeric + space + dot + hyphen + underscore.
 * Must start with a letter or digit.
 */
std::string ValidateGroupName(const std::string& input);

/**
 * Samba share name: 1-64 chars, alphanumeric + hyphen + underscore.
 * No spaces, no dots (used in filesystem paths).
 */
std::string ValidateShareName(const std::string& input);

/**
 * Share size string for dd: e.g. "1G", "500M", "1024K", or plain digits.
 */
std::string ValidateShareSize(const std::string& input);

/**
 * DNS zone: valid hostname characters.
 */
std::string ValidateDnsZone(const std::string& input);

/**
 * DNS record name: valid hostname label.
 */
std::string ValidateDnsName(const std::string& input);

/**
 * IPv4 address: strict dotted-quad.
 */
std::string ValidateIPv4(const std::string& input);

/**
 * Network port: 1-65535.
 */
int ValidatePort(int port);
std::string ValidatePortStr(const std::string& input);

/**
 * File path component: no shell metacharacters, no path traversal.
 */
std::string ValidatePathComponent(const std::string& input);

/**
 * SSH key path: alphanumeric + / + . + - + _ only, no traversal.
 */
std::string ValidateKeyPath(const std::string& input);

/**
 * VPN client name: alphanumeric + hyphen + underscore + dot, 1-64 chars.
 */
std::string ValidateClientName(const std::string& input);

/**
 * Windows drive letter: single letter A-Z.
 */
std::string ValidateDriveLetter(const std::string& input);

/**
 * UNC share path: must match \\server\share pattern, no shell metacharacters.
 */
std::string ValidateUNCPath(const std::string& input);

/**
 * AD realm / domain name: valid domain-style string.
 */
std::string ValidateRealm(const std::string& input);

/**
 * Password: allow most printable chars but reject shell metacharacters
 * that could break out of single-quoted context.
 * Specifically blocks: ' (single quote), \, ;, |, &, $, `, (, ), {, }, <, >, newline, null
 */
std::string ValidatePassword(const std::string& input);

// ── Shell escape (defense-in-depth, use when exec*() isn't available) ───────

/**
 * Wraps value in single quotes with proper escaping.
 * This is a last resort — prefer using SafeExec with argument vectors.
 */
std::string ShellEscape(const std::string& input);

} // namespace Sanitize

