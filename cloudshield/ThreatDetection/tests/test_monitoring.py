"""Tests for the security monitoring helpers (fail2ban, geo-blocking, threat intel)."""


from cloudshield.ThreatDetection.monitoring.fail2ban import (
    Fail2BanManager,
    parse_jail_status,
    OPENVPN_JAIL,
    DEFAULT_JAILS,
)
from cloudshield.ThreatDetection.monitoring.geo_blocking import (
    GeoIPChecker,
    GeoIPResult,
    _is_bogon,
)
from cloudshield.ThreatDetection.monitoring.threat_intel import (
    ThreatIntelChecker,
    ThreatIntelHit,
)


# ═══════════════════════════════════════════════════════════════════════════
# Fail2Ban
# ═══════════════════════════════════════════════════════════════════════════

class TestJailConfig:
    def test_render(self):
        text = OPENVPN_JAIL.render()
        assert "[openvpn]" in text
        assert "enabled  = true" in text
        assert "port     = 1194" in text

    def test_default_jails_count(self):
        assert len(DEFAULT_JAILS) == 3


class TestParseJailStatus:
    RAW = """
Status for the jail: sshd
|- Filter
|  |- Currently failed: 3
|  |- Total failed:     12
|  `- File list:        /var/log/auth.log
`- Actions
   |- Currently banned: 2
   |- Total banned:     5
   `- Banned IP list:   192.168.1.100 10.0.0.5
"""

    def test_parse_complete(self):
        status = parse_jail_status(self.RAW)
        assert status.name == "sshd"
        assert status.currently_failed == 3
        assert status.total_failed == 12
        assert status.currently_banned == 2
        assert status.total_banned == 5
        assert status.banned_ips == ["192.168.1.100", "10.0.0.5"]

    def test_parse_empty(self):
        status = parse_jail_status("")
        assert status.name == ""
        assert status.currently_banned == 0

    def test_to_dict(self):
        status = parse_jail_status(self.RAW)
        d = status.to_dict()
        assert d["name"] == "sshd"
        assert isinstance(d["banned_ips"], list)


class TestFail2BanManager:
    def test_dry_run_generate(self, tmp_path):
        mgr = Fail2BanManager(dry_run=True)
        text = mgr.generate_jail_local(dest=str(tmp_path / "jail.local"))
        assert "[openvpn]" in text
        assert "[sshd]" in text
        assert "[samba]" in text
        # dry_run: file should NOT be written
        assert not (tmp_path / "jail.local").exists()

    def test_generate_writes_file(self, tmp_path):
        mgr = Fail2BanManager(dry_run=False)
        dest = tmp_path / "jail.local"
        text = mgr.generate_jail_local(dest=str(dest))
        assert dest.exists()
        assert dest.read_text() == text

    def test_generate_openvpn_filter(self):
        mgr = Fail2BanManager(dry_run=True)
        text = mgr.generate_openvpn_filter()
        assert "failregex" in text
        assert "TLS Auth Error" in text

    def test_generate_samba_filter(self):
        mgr = Fail2BanManager(dry_run=True)
        text = mgr.generate_samba_filter()
        assert "NT_STATUS_WRONG_PASSWORD" in text

    def test_dry_run_jail_status(self):
        mgr = Fail2BanManager(dry_run=True)
        s = mgr.jail_status("sshd")
        assert s.name == "sshd"

    def test_dry_run_ban_unban(self):
        mgr = Fail2BanManager(dry_run=True)
        assert mgr.ban_ip("sshd", "1.2.3.4") is True
        assert mgr.unban_ip("sshd", "1.2.3.4") is True


# ═══════════════════════════════════════════════════════════════════════════
# GeoIP / Geo-blocking
# ═══════════════════════════════════════════════════════════════════════════

class TestIsBogon:
    def test_rfc1918(self):
        assert _is_bogon("10.0.0.1") is True
        assert _is_bogon("172.16.0.1") is True
        assert _is_bogon("192.168.0.1") is True

    def test_loopback(self):
        assert _is_bogon("127.0.0.1") is True

    def test_multicast(self):
        assert _is_bogon("224.0.0.1") is True

    def test_public(self):
        assert _is_bogon("8.8.8.8") is False
        assert _is_bogon("93.184.216.34") is False

    def test_invalid(self):
        assert _is_bogon("not-an-ip") is True


class TestGeoIPChecker:
    def test_default_checker_bogon(self):
        checker = GeoIPChecker()
        r = checker.check("10.0.0.1")
        assert r.is_bogon is True
        assert r.is_allowed is False

    def test_public_ip_no_db(self):
        """Without a GeoIP DB, public IPs are allowed (no country to block)."""
        checker = GeoIPChecker()
        r = checker.check("8.8.8.8")
        assert r.is_bogon is False
        assert r.is_allowed is True  # can't determine country → default allow

    def test_check_many_returns_suspicious(self):
        checker = GeoIPChecker()
        results = checker.check_many(["8.8.8.8", "10.0.0.1", "192.168.1.1"])
        # Only bogon IPs should appear
        flagged_ips = {r.ip for r in results}
        assert "10.0.0.1" in flagged_ips
        assert "192.168.1.1" in flagged_ips
        assert "8.8.8.8" not in flagged_ips

    def test_result_to_dict(self):
        r = GeoIPResult(ip="1.2.3.4", country="XX", is_allowed=False, is_bogon=False, reason="test")
        d = r.to_dict()
        assert d["ip"] == "1.2.3.4"
        assert d["is_allowed"] is False


# ═══════════════════════════════════════════════════════════════════════════
# Threat Intel
# ═══════════════════════════════════════════════════════════════════════════

class TestThreatIntelChecker:
    def test_init_empty(self):
        checker = ThreatIntelChecker(seed_ips=[], feed_urls=[])
        assert checker.total_indicators == 0

    def test_add_ips(self):
        checker = ThreatIntelChecker(seed_ips=[], feed_urls=[])
        added = checker.add_ips(["1.2.3.4", "5.6.7.0/24"])
        assert added == 2
        assert checker.total_indicators == 2

    def test_is_bad_exact(self):
        checker = ThreatIntelChecker(seed_ips=["1.2.3.4"], feed_urls=[])
        assert checker.is_bad("1.2.3.4") is True
        assert checker.is_bad("1.2.3.5") is False

    def test_is_bad_cidr(self):
        checker = ThreatIntelChecker(seed_ips=[], feed_urls=[])
        checker.add_ips(["192.0.2.0/24"])
        assert checker.is_bad("192.0.2.100") is True
        assert checker.is_bad("192.0.3.1") is False

    def test_load_file(self, tmp_path):
        f = tmp_path / "bad.txt"
        f.write_text("# comment\n1.2.3.4\n5.6.7.0/24\n\n")
        checker = ThreatIntelChecker(seed_ips=[], feed_urls=[])
        count = checker.load_file(f)
        assert count == 2
        assert checker.is_bad("1.2.3.4") is True
        assert checker.is_bad("5.6.7.100") is True

    def test_check_connections_outbound(self):
        checker = ThreatIntelChecker(seed_ips=["99.99.99.99"], feed_urls=[])
        conns = [
            {"laddr_ip": "10.0.0.1", "raddr_ip": "99.99.99.99"},
            {"laddr_ip": "10.0.0.2", "raddr_ip": "8.8.8.8"},
        ]
        hits = checker.check_connections(conns, agent_id="test")
        assert len(hits) == 1
        assert hits[0].ip == "99.99.99.99"
        assert hits[0].direction == "outbound"

    def test_check_connections_inbound(self):
        checker = ThreatIntelChecker(seed_ips=["10.0.0.1"], feed_urls=[])
        conns = [{"laddr_ip": "10.0.0.1", "raddr_ip": "8.8.8.8"}]
        hits = checker.check_connections(conns)
        assert len(hits) == 1
        assert hits[0].direction == "inbound"

    def test_hit_to_dict(self):
        h = ThreatIntelHit(ip="1.2.3.4", source="test", direction="outbound", reason="bad")
        d = h.to_dict()
        assert d["ip"] == "1.2.3.4"

    def test_refresh_feeds_no_requests(self):
        """When requests isn't available, refresh_feeds returns 0."""
        checker = ThreatIntelChecker(seed_ips=[], feed_urls=[])
        # Temporarily remove requests if present
        import cloudshield.ThreatDetection.monitoring.threat_intel as mod
        original = mod._HAS_REQUESTS
        mod._HAS_REQUESTS = False
        try:
            assert checker.refresh_feeds() == 0
        finally:
            mod._HAS_REQUESTS = original
