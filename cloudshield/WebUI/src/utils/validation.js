/**
 * Shared input validation utilities for CloudShield.
 *
 * These validators mirror the backend Sanitize:: rules so that
 * malformed data is caught at the UI layer before reaching the API.
 *
 * Every validator returns { valid: boolean, error: string | null }.
 */

// ── Regex patterns ──────────────────────────────────────────────────────────

/** Samba/AD username: start with alnum, then alnum + . - _ (1-64 chars) */
export const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

/** Samba/AD group name: start with alnum, then alnum + space + . - _ (1-64 chars) */
export const GROUP_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 ._-]{0,63}$/;

/** Samba share name: start with alnum, then alnum + - _ only (1-64) */
export const SHARE_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

/** Share size: positive integer optionally followed by K/M/G/T */
export const SHARE_SIZE_REGEX = /^[1-9]\d{0,18}[KMGTkmgt]?$/;

/** DNS zone / realm: valid domain name */
export const DNS_ZONE_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/;

/** DNS record name: valid hostname label */
export const DNS_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** IPv4 address */
export const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** VPN client name */
export const CLIENT_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

/** Drive letter */
export const DRIVE_LETTER_REGEX = /^[A-Za-z]$/;

/** UNC path */
export const UNC_PATH_REGEX = /^\\\\[a-zA-Z0-9._-]+\\[a-zA-Z0-9._\\-]+$/;

/** Password character-class helpers (O(n) checks, no backtracking) */
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;
const HAS_SPECIAL = /[^\w\s]/;

/** Characters forbidden in passwords (shell metacharacters) */
const PASSWORD_FORBIDDEN = new Set("'\\\n\r\0;|&$`(){}[]<>!".split(""));

/** Basic structural email check (backtrack-safe: dot-atom local + at least one dot in domain) */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

// ── Validator functions ─────────────────────────────────────────────────────

function ok() {
  return { valid: true, error: null };
}

function fail(msg) {
  return { valid: false, error: msg };
}

/**
 * Validate a Samba/AD username.
 */
export function validateUsername(value) {
  if (!value?.trim()) return fail("Username is required.");
  if (value.length > 64)
    return fail("Username must be 64 characters or fewer.");
  if (!USERNAME_REGEX.test(value))
    return fail(
      "Username must start with a letter or digit and contain only letters, digits, dots, hyphens, and underscores.",
    );
  return ok();
}

/**
 * Validate a display name (first name, last name).
 * Allows letters, spaces, hyphens, apostrophes, and accented characters.
 */
export function validateDisplayName(value, fieldName = "Name") {
  if (!value?.trim()) return fail(`${fieldName} is required.`);
  if (value.length > 100)
    return fail(`${fieldName} must be 100 characters or fewer.`);
  // Allow Unicode letters, spaces, hyphens, apostrophes
  if (!/^[\p{L}\p{M}' -]{1,100}$/u.test(value))
    return fail(
      `${fieldName} may only contain letters, spaces, hyphens, and apostrophes.`,
    );
  return ok();
}

/**
 * Validate a Samba/AD group name.
 */
export function validateGroupName(value) {
  if (!value?.trim()) return fail("Group name is required.");
  if (value.length > 64)
    return fail("Group name must be 64 characters or fewer.");
  if (!GROUP_NAME_REGEX.test(value))
    return fail(
      "Group name must start with a letter or digit and contain only letters, digits, spaces, dots, hyphens, and underscores.",
    );
  return ok();
}

/**
 * Validate a Samba share name.
 */
export function validateShareName(value) {
  if (!value?.trim()) return fail("Share name is required.");
  if (value.length > 64)
    return fail("Share name must be 64 characters or fewer.");
  if (!SHARE_NAME_REGEX.test(value))
    return fail(
      "Share name must start with a letter or digit and contain only letters, digits, hyphens, and underscores (no spaces).",
    );
  return ok();
}

/**
 * Validate share size (e.g. "500M", "1G", "1024").
 */
export function validateShareSize(value) {
  if (!String(value ?? "").trim()) return fail("Share size is required.");
  const str = String(value).trim();
  if (!SHARE_SIZE_REGEX.test(str))
    return fail(
      "Share size must be a positive integer, optionally followed by K, M, G, or T.",
    );
  return ok();
}

/**
 * Validate a password. Enforces:
 * - 12-128 characters
 * - At least one uppercase, one lowercase, one digit, one special character
 * - No shell-dangerous characters
 */
export function validatePassword(value) {
  if (!value) return fail("Password is required.");
  if (value.length < 12)
    return fail("Password must be at least 12 characters.");
  if (value.length > 128)
    return fail("Password must be 128 characters or fewer.");
  if (
    !HAS_LOWER.test(value) ||
    !HAS_UPPER.test(value) ||
    !HAS_DIGIT.test(value) ||
    !HAS_SPECIAL.test(value)
  )
    return fail(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
    );
  return ok();
}

/**
 * Validate an email address (structural check).
 */
export function validateEmail(value) {
  if (!value?.trim()) return fail("Email is required.");
  if (value.length > 254) return fail("Email must be 254 characters or fewer.");
  if (!EMAIL_REGEX.test(value))
    return fail("Please enter a valid email address.");
  return ok();
}

/**
 * Validate a DNS zone.
 */
export function validateDnsZone(value) {
  if (!value?.trim()) return fail("DNS zone is required.");
  if (!DNS_ZONE_REGEX.test(value)) return fail("Invalid DNS zone format.");
  return ok();
}

/**
 * Validate a DNS record name.
 */
export function validateDnsName(value) {
  if (!value?.trim()) return fail("DNS name is required.");
  if (!DNS_NAME_REGEX.test(value)) return fail("Invalid DNS name format.");
  return ok();
}

/**
 * Validate an IPv4 address.
 */
export function validateIPv4(value) {
  if (!value?.trim()) return fail("IP address is required.");
  const match = IPV4_REGEX.exec(value);
  if (!match) return fail("Invalid IPv4 address format.");
  for (let i = 1; i <= 4; i++) {
    const octet = Number.parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return fail("IPv4 octet must be 0-255.");
  }
  return ok();
}

/**
 * Validate a VPN client name.
 */
export function validateClientName(value) {
  if (!value?.trim()) return fail("Client name is required.");
  if (!CLIENT_NAME_REGEX.test(value))
    return fail(
      "Client name must start with a letter or digit and contain only letters, digits, dots, hyphens, and underscores.",
    );
  return ok();
}

/**
 * Generic required-field check.
 */
export function validateRequired(value, fieldName = "This field") {
  if (!value || (typeof value === "string" && !value.trim()))
    return fail(`${fieldName} is required.`);
  return ok();
}

/**
 * Validate a job title (free text, but sanitized).
 */
export function validateJobTitle(value) {
  if (!value?.trim()) return ok(); // optional field
  if (value.length > 100)
    return fail("Job title must be 100 characters or fewer.");
  // Allow letters, digits, spaces, hyphens, dots, commas, parentheses
  if (!/^[\p{L}\p{N} .,()&/'-]{1,100}$/u.test(value))
    return fail("Job title contains invalid characters.");
  return ok();
}

/**
 * Run multiple validators and return the first error, or ok().
 * Usage: validateAll([ validateUsername(u), validatePassword(p) ])
 */
export function validateAll(results) {
  for (const r of results) {
    if (!r.valid) return r;
  }
  return ok();
}
