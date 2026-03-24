"""Helpers for generating domain-controller-safe usernames."""

from __future__ import annotations

import re
import unicodedata


MAX_DC_USERNAME_LENGTH = 20
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]")


def _normalize_name_part(part: str) -> str:
    """Convert a single name segment to lowercase ASCII alphanumerics."""
    ascii_part = (
        unicodedata.normalize("NFKD", part or "")
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return _NON_ALNUM_RE.sub("", ascii_part)


def derive_username(full_name: str, max_length: int = MAX_DC_USERNAME_LENGTH) -> str:
    """
    Build a deterministic username from a human name.

    Examples:
        - "Jake Edwards" -> "j_edwards"
        - "James John" -> "j_john"
        - "Madonna" -> "madonna"

    The result is normalized to lowercase ASCII and capped to ``max_length``
    to stay compatible with the DC username validator.
    """
    if max_length < 1:
        raise ValueError("max_length must be at least 1")

    parts = [_normalize_name_part(part) for part in (full_name or "").split()]
    parts = [part for part in parts if part]

    if not parts:
        return ""

    if len(parts) == 1:
        return parts[0][:max_length]

    first_initial = parts[0][0]
    separator = "_" if max_length > 1 else ""
    remaining = max_length - len(first_initial) - len(separator)
    if remaining <= 0:
        return first_initial[:max_length]

    last_name = parts[-1][:remaining]
    return f"{first_initial}{separator}{last_name}"
