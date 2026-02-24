"""
Fail2Ban integration helper for CloudShield.

Provides:
- Programmatic jail configuration generation (OpenVPN, SSH, Samba)
- Parsing of ``fail2ban-client status`` output to surface bans
- A thin wrapper to ban/unban IPs via subprocess
"""

from __future__ import annotations

import re
import subprocess
import shutil
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Sequence


# ── Configuration templates ─────────────────────────────────────────────────

_JAIL_TEMPLATE = """\
[{name}]
enabled  = true
port     = {port}
filter   = {filter_name}
logpath  = {logpath}
maxretry = {max_retry}
findtime = {find_time}
bantime  = {ban_time}
action   = iptables-allports[name={name}, protocol=all]
"""

_OPENVPN_FILTER = """\
[Definition]
failregex = ^.*\\b<HOST>:\\d+ TLS Auth Error.*$
            ^.*\\b<HOST>:\\d+ VERIFY ERROR.*$
            ^.*\\bTLS Error:.*<HOST>:\\d+.*$
ignoreregex =
"""

_SSH_FILTER_NAME = "sshd"   # built-in

_SAMBA_FILTER = """\
[Definition]
failregex = ^.*smbd.*\\[<HOST>\\].*NT_STATUS_WRONG_PASSWORD.*$
            ^.*smbd.*\\[<HOST>\\].*NT_STATUS_NO_SUCH_USER.*$
ignoreregex =
"""


@dataclass
class JailConfig:
    """Parameters for a single fail2ban jail."""
    name: str
    port: str
    filter_name: str
    logpath: str
    max_retry: int = 5
    find_time: int = 600
    ban_time: int = 3600

    def render(self) -> str:
        return _JAIL_TEMPLATE.format(**asdict(self))


# ── Pre-built jail configs ──────────────────────────────────────────────────

OPENVPN_JAIL = JailConfig(
    name="openvpn",
    port="1194",
    filter_name="openvpn",
    logpath="/var/log/openvpn/openvpn-status.log",
    max_retry=5,
    find_time=600,
    ban_time=7200,
)

SSH_JAIL = JailConfig(
    name="sshd",
    port="22",
    filter_name="sshd",
    logpath="/var/log/auth.log",
    max_retry=5,
    find_time=600,
    ban_time=3600,
)

SAMBA_JAIL = JailConfig(
    name="samba",
    port="445",
    filter_name="samba",
    logpath="/var/log/samba/log.smbd",
    max_retry=5,
    find_time=600,
    ban_time=3600,
)

DEFAULT_JAILS = [OPENVPN_JAIL, SSH_JAIL, SAMBA_JAIL]


# ── Status parser ───────────────────────────────────────────────────────────

_BANNED_RE = re.compile(r"Banned IP list:\s*(.*)")


@dataclass
class JailStatus:
    """Parsed status for a single fail2ban jail."""
    name: str
    currently_failed: int = 0
    total_failed: int = 0
    currently_banned: int = 0
    total_banned: int = 0
    banned_ips: list[str] | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def parse_jail_status(raw: str) -> JailStatus:
    """Parse the text output of ``fail2ban-client status <jail>``."""
    name = ""
    cur_fail = tot_fail = cur_ban = tot_ban = 0
    ips: list[str] = []

    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("Status for the jail:"):
            name = line.split(":", 1)[1].strip()
        elif "Currently failed:" in line:
            cur_fail = int(line.split(":", 1)[1].strip())
        elif "Total failed:" in line:
            tot_fail = int(line.split(":", 1)[1].strip())
        elif "Currently banned:" in line:
            cur_ban = int(line.split(":", 1)[1].strip())
        elif "Total banned:" in line:
            tot_ban = int(line.split(":", 1)[1].strip())
        elif "Banned IP list:" in line:
            ip_str = line.split(":", 1)[1].strip()
            ips = [ip.strip() for ip in ip_str.split() if ip.strip()]

    return JailStatus(
        name=name,
        currently_failed=cur_fail,
        total_failed=tot_fail,
        currently_banned=cur_ban,
        total_banned=tot_ban,
        banned_ips=ips,
    )


# ── Manager class ───────────────────────────────────────────────────────────

class Fail2BanManager:
    """
    High-level wrapper around fail2ban CLI.

    Set ``dry_run=True`` in dev / test environments to avoid touching the
    real fail2ban daemon.
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run

    @staticmethod
    def is_available() -> bool:
        """Return True if fail2ban-client is on PATH."""
        return shutil.which("fail2ban-client") is not None

    def generate_jail_local(
        self,
        jails: Sequence[JailConfig] | None = None,
        dest: str | Path = "/etc/fail2ban/jail.local",
    ) -> str:
        """
        Generate a ``jail.local`` file from *jails* and optionally write it.

        Returns the rendered text.
        """
        jails = jails or DEFAULT_JAILS
        header = "# CloudShield auto-generated fail2ban jails\n\n"
        body = "\n".join(j.render() for j in jails)
        content = header + body

        if not self.dry_run:
            Path(dest).parent.mkdir(parents=True, exist_ok=True)
            Path(dest).write_text(content)
        return content

    def generate_openvpn_filter(
        self,
        dest: str | Path = "/etc/fail2ban/filter.d/openvpn.conf",
    ) -> str:
        if not self.dry_run:
            Path(dest).parent.mkdir(parents=True, exist_ok=True)
            Path(dest).write_text(_OPENVPN_FILTER)
        return _OPENVPN_FILTER

    def generate_samba_filter(
        self,
        dest: str | Path = "/etc/fail2ban/filter.d/samba.conf",
    ) -> str:
        if not self.dry_run:
            Path(dest).parent.mkdir(parents=True, exist_ok=True)
            Path(dest).write_text(_SAMBA_FILTER)
        return _SAMBA_FILTER

    def jail_status(self, jail_name: str) -> JailStatus:
        """Query the running fail2ban daemon for *jail_name* status."""
        if self.dry_run:
            return JailStatus(name=jail_name)
        try:
            out = subprocess.check_output(
                ["fail2ban-client", "status", jail_name],
                text=True,
                timeout=10,
            )
            return parse_jail_status(out)
        except Exception:
            return JailStatus(name=jail_name)

    def all_jail_statuses(self) -> list[JailStatus]:
        """Return status dicts for all three default jails."""
        return [self.jail_status(j.name) for j in DEFAULT_JAILS]

    def ban_ip(self, jail_name: str, ip: str) -> bool:
        if self.dry_run:
            return True
        try:
            subprocess.check_call(
                ["fail2ban-client", "set", jail_name, "banip", ip],
                timeout=10,
            )
            return True
        except Exception:
            return False

    def unban_ip(self, jail_name: str, ip: str) -> bool:
        if self.dry_run:
            return True
        try:
            subprocess.check_call(
                ["fail2ban-client", "set", jail_name, "unbanip", ip],
                timeout=10,
            )
            return True
        except Exception:
            return False
