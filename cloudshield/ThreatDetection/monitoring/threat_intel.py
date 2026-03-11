"""
Lightweight threat-intelligence IP reputation checker for CloudShield.

Maintains an in-memory set of known-bad IPs/CIDRs that can be loaded from:
- A local flat file (one IP or CIDR per line)
- A remote URL (e.g., blocklist.de, abuse.ch)

The checker is designed to be called from the ThreatDetection servicer on
every incoming ``NetConn`` batch so that connections to/from flagged IPs
generate an Elasticsearch alert immediately.
"""

from __future__ import annotations

import ipaddress
import threading
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

# Optional: requests for fetching remote blocklists
try:
    import requests as _requests  # type: ignore[import-untyped]
    _HAS_REQUESTS = True
except ImportError:  # pragma: no cover
    _HAS_REQUESTS = False


# ── Data ────────────────────────────────────────────────────────────────────

# Small curated seed list — known C2 / scanning /
# abuse infrastructure (examples, replace with real feeds in production).
_SEED_BAD_IPS: set[str] = set()

# Well-known remote blocklist URLs (one IP per line).
DEFAULT_FEED_URLS: list[str] = [
    # Abuse.ch Feodo Tracker (banking trojans / C2)
    "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
]


@dataclass
class ThreatIntelHit:
    """A match against a known-bad IP."""
    ip: str
    source: str      # which feed / list matched
    direction: str   # "inbound" | "outbound" | "lateral"
    reason: str

    def to_dict(self) -> dict:
        return asdict(self)


# ── Checker ─────────────────────────────────────────────────────────────────

class ThreatIntelChecker:
    """
    IP reputation checker backed by local + remote blocklists.

    Usage::

        checker = ThreatIntelChecker()
        checker.load_file("/etc/cloudshield/bad_ips.txt")
        checker.refresh_feeds()          # pull latest from remote URLs

        hits = checker.check_connections(conn_dicts)
        for h in hits:
            es_log("threat_intel_hits", h.to_dict())
    """

    def __init__(
        self,
        seed_ips: Iterable[str] | None = None,
        feed_urls: list[str] | None = None,
    ):
        self._lock = threading.Lock()
        self._bad_ips: set[str] = set(seed_ips or _SEED_BAD_IPS)
        self._bad_nets: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
        self._feed_urls = feed_urls if feed_urls is not None else list(DEFAULT_FEED_URLS)
        self._last_refresh: float = 0.0

    # ── Loading ─────────────────────────────────────────────────────────

    def load_file(self, path: str | Path) -> int:
        """Load IPs/CIDRs from a local text file. Returns count added."""
        added = 0
        try:
            with open(path, "r") as fh:
                for line in fh:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    added += self._add(line)
        except Exception:
            pass
        return added

    def add_ips(self, ips: Iterable[str]) -> int:
        """Manually add IPs/CIDRs. Returns count added."""
        return sum(self._add(ip) for ip in ips)

    def _add(self, entry: str) -> int:
        with self._lock:
            if "/" in entry:
                try:
                    net = ipaddress.ip_network(entry, strict=False)
                    self._bad_nets.append(net)
                    return 1
                except ValueError:
                    return 0
            self._bad_ips.add(entry.strip())
            return 1

    def refresh_feeds(self, timeout: int = 30) -> int:
        """
        Pull each configured remote feed URL and merge IPs into the set.
        Returns total new entries added.
        """
        if not _HAS_REQUESTS:
            return 0

        total = 0
        for url in self._feed_urls:
            try:
                resp = _requests.get(url, timeout=timeout)
                resp.raise_for_status()
                for line in resp.text.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    total += self._add(line)
            except Exception:
                continue

        self._last_refresh = time.time()
        return total

    # ── Checking ────────────────────────────────────────────────────────

    def is_bad(self, ip: str) -> bool:
        """Check if *ip* is in any blocklist."""
        with self._lock:
            if ip in self._bad_ips:
                return True
            try:
                addr = ipaddress.ip_address(ip)
            except ValueError:
                return False
            return any(addr in net for net in self._bad_nets)

    def check_connections(
        self,
        conns: Iterable[dict],
        agent_id: str = "",
    ) -> list[ThreatIntelHit]:
        """
        Scan a batch of connection dicts for known-bad IPs.

        Checks both local (``laddr_ip``) and remote (``raddr_ip``) addresses.
        """
        hits: list[ThreatIntelHit] = []
        for c in conns:
            l_ip = c.get("laddr_ip") or c.get("laddrIp") or ""
            r_ip = c.get("raddr_ip") or c.get("raddrIp") or ""

            if r_ip and self.is_bad(r_ip):
                hits.append(ThreatIntelHit(
                    ip=r_ip,
                    source="blocklist",
                    direction="outbound",
                    reason=f"Agent {agent_id} connecting to known-bad IP {r_ip}",
                ))
            if l_ip and self.is_bad(l_ip):
                hits.append(ThreatIntelHit(
                    ip=l_ip,
                    source="blocklist",
                    direction="inbound",
                    reason=f"Known-bad IP {l_ip} connecting to agent {agent_id}",
                ))

        return hits

    @property
    def total_indicators(self) -> int:
        with self._lock:
            return len(self._bad_ips) + len(self._bad_nets)

    @property
    def last_refresh(self) -> float:
        return self._last_refresh
