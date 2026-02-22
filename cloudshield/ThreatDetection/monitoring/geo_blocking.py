"""
GeoIP-based suspicious IP detection for CloudShield.

Strategy
--------
Maintains a **country allow-list** (configurable).  IPs originating from
countries *not* on the list are flagged as suspicious.  Optionally, a
**bogon / reserved-range** check is also performed.

GeoIP data source
-----------------
Uses the lightweight ``geoip2`` library with a local MaxMind GeoLite2-Country
database (free, requires registration at maxmind.com).  If the library or
database is not present the module degrades to an IP-range heuristic that
still catches obviously bogon/private sources connecting from the WAN side.
"""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

# ── Optional geoip2 import ──────────────────────────────────────────────────
try:
    import geoip2.database  # type: ignore[import-untyped]
    _HAS_GEOIP = True
except ImportError:  # pragma: no cover
    _HAS_GEOIP = False


# ── Defaults ────────────────────────────────────────────────────────────────

DEFAULT_ALLOWED_COUNTRIES: frozenset[str] = frozenset({
    "CA", "US",  # North America — adjust per deployment
})

# Bogon / reserved CIDRs that should never appear as a WAN source
_BOGON_NETS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
]


@dataclass
class GeoIPResult:
    ip: str
    country: str
    is_allowed: bool
    is_bogon: bool
    reason: str

    def to_dict(self) -> dict:
        return asdict(self)


def _is_bogon(ip: str) -> bool:
    """Return True if *ip* falls in a bogon / reserved range."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return True  # unparseable → treat as suspicious
    return any(addr in net for net in _BOGON_NETS)


class GeoIPChecker:
    """
    Check remote IPs against a GeoIP country allow-list and bogon ranges.

    Parameters
    ----------
    db_path : str | Path | None
        Path to a MaxMind GeoLite2-Country.mmdb file.
    allowed_countries : set[str] | None
        ISO-3166-1 alpha-2 country codes to allow.  Defaults to CA + US.
    """

    def __init__(
        self,
        db_path: str | Path | None = None,
        allowed_countries: Iterable[str] | None = None,
    ):
        self._allowed = frozenset(allowed_countries or DEFAULT_ALLOWED_COUNTRIES)
        self._reader = None
        if db_path and _HAS_GEOIP:
            try:
                self._reader = geoip2.database.Reader(str(db_path))
            except Exception:
                pass

    # ── Public API ──────────────────────────────────────────────────────

    def check(self, ip: str) -> GeoIPResult:
        """Evaluate a single IP address."""
        bogon = _is_bogon(ip)

        country = self._lookup(ip) if not bogon else ""
        is_allowed = country.upper() in self._allowed if country else not bogon

        reasons = []
        if bogon:
            reasons.append("bogon/reserved range")
        if country and country.upper() not in self._allowed:
            reasons.append(f"country {country} not in allow-list")

        return GeoIPResult(
            ip=ip,
            country=country,
            is_allowed=is_allowed and not bogon,
            is_bogon=bogon,
            reason="; ".join(reasons) if reasons else "",
        )

    def check_many(self, ips: Iterable[str]) -> list[GeoIPResult]:
        """Evaluate multiple IPs; returns only the *suspicious* ones."""
        results = []
        for ip in ips:
            r = self.check(ip)
            if not r.is_allowed:
                results.append(r)
        return results

    # ── Internal ────────────────────────────────────────────────────────

    def _lookup(self, ip: str) -> str:
        if not self._reader:
            return ""
        try:
            resp = self._reader.country(ip)
            return resp.country.iso_code or ""
        except Exception:
            return ""

    def close(self) -> None:
        if self._reader:
            self._reader.close()
