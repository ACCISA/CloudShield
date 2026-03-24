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

# Feed definitions: (url, label, strip_inline_comment)
# strip_inline_comment=True handles formats like "1.2.3.0/24 ; SBL12345"
DEFAULT_FEEDS: list[tuple[str, str, bool]] = [
    # Abuse.ch Feodo Tracker – banking trojan / botnet C2 IPs
    ("https://feodotracker.abuse.ch/downloads/ipblocklist.txt", "feodo_tracker", False),
    # Abuse.ch SSL Blacklist – IPs hosting malicious SSL certificates
    ("https://sslbl.abuse.ch/blacklist/sslipblacklist.txt", "abuse_ch_sslbl", False),
    # Emerging Threats – known compromised/malicious IPs (no auth required)
    ("https://rules.emergingthreats.net/blockrules/compromised-ips.txt", "emerging_threats", False),
    # Spamhaus DROP – hijacked netblocks / CIDR ranges
    ("https://www.spamhaus.org/drop/drop.txt", "spamhaus_drop", True),
    # Spamhaus EDROP – extended drop list
    ("https://www.spamhaus.org/drop/edrop.txt", "spamhaus_edrop", True),
]

# Keep legacy list for backward-compat (used if feed_urls kwarg passed directly)
DEFAULT_FEED_URLS: list[str] = [url for url, _, _ in DEFAULT_FEEDS]


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
        self._bad_nets: list[tuple[ipaddress.IPv4Network | ipaddress.IPv6Network, str]] = []
        # ip → feed label for richer alert messages
        self._ip_source: dict[str, str] = {}
        # Use explicit feed defs unless caller passed legacy URL list
        if feed_urls is not None:
            self._feeds: list[tuple[str, str, bool]] = [(u, "blocklist", False) for u in feed_urls]
        else:
            self._feeds = list(DEFAULT_FEEDS)
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

    def _add(self, entry: str, label: str = "blocklist") -> int:
        with self._lock:
            if "/" in entry:
                try:
                    net = ipaddress.ip_network(entry, strict=False)
                    self._bad_nets.append((net, label))
                    return 1
                except ValueError:
                    return 0
            ip = entry.strip()
            self._bad_ips.add(ip)
            self._ip_source.setdefault(ip, label)
            return 1

    def refresh_feeds(self, timeout: int = 30) -> int:
        """
        Pull each configured remote feed and merge IPs/CIDRs into the set.
        Returns total new entries added.
        """
        if not _HAS_REQUESTS:
            return 0

        total = 0
        for url, label, strip_comment in self._feeds:
            try:
                resp = _requests.get(url, timeout=timeout)
                resp.raise_for_status()
                for line in resp.text.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#") or line.startswith(";"):
                        continue
                    # Handle "CIDR ; comment" format (Spamhaus DROP/EDROP)
                    if strip_comment and ";" in line:
                        line = line.split(";", 1)[0].strip()
                    if not line:
                        continue
                    total += self._add(line, label)
            except Exception:
                continue

        self._last_refresh = time.time()
        return total

    # ── Checking ────────────────────────────────────────────────────────

    def get_source(self, ip: str) -> str:
        """Return the feed label that first flagged *ip*, or 'blocklist'."""
        with self._lock:
            if ip in self._ip_source:
                return self._ip_source[ip]
            try:
                addr = ipaddress.ip_address(ip)
            except ValueError:
                return "blocklist"
            for net, label in self._bad_nets:
                if addr in net:
                    return label
            return "blocklist"

    def is_bad(self, ip: str) -> bool:
        """Check if *ip* is in any blocklist."""
        with self._lock:
            if ip in self._bad_ips:
                return True
            try:
                addr = ipaddress.ip_address(ip)
            except ValueError:
                return False
            return any(addr in net for net, _ in self._bad_nets)

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
            proc = c.get("process_name") or c.get("processName") or "unknown process"

            if r_ip and self.is_bad(r_ip):
                feed = self.get_source(r_ip)
                hits.append(ThreatIntelHit(
                    ip=r_ip,
                    source=feed,
                    direction="outbound",
                    reason=(
                        f"Agent {agent_id} ({proc}) connecting to {r_ip}, "
                        f"flagged by {feed}"
                    ),
                ))
            if l_ip and self.is_bad(l_ip):
                feed = self.get_source(l_ip)
                hits.append(ThreatIntelHit(
                    ip=l_ip,
                    source=feed,
                    direction="inbound",
                    reason=(
                        f"Known-bad IP {l_ip} ({feed}) connecting to agent {agent_id}"
                    ),
                ))

        return hits

    @property
    def total_indicators(self) -> int:
        with self._lock:
            return len(self._bad_ips) + len(self._bad_nets)

    @property
    def last_refresh(self) -> float:
        return self._last_refresh
