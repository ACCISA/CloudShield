"""Tests for the Snort alert parser."""


from cloudshield.ThreatDetection.snort.alert_parser import (
    parse_fast_alert_line,
    parse_alert_file,
    SnortAlertWatcher,
)


# ── Sample alert lines ──────────────────────────────────────────────────────

FAST_LINE_FULL = (
    '01/15-14:30:22.123456  [**] [1:9000001:1] CS-VPN Port scan detected on VPN port [**]'
    ' [Classification: Attempted Information Leak] [Priority: 2]'
    ' {TCP} 192.168.1.100:54321 -> 10.8.0.1:1194'
)

FAST_LINE_MINIMAL = (
    '02/10-08:00:00.000000  [**] [1:9000005:1] CS-VPN Possible reverse shell (/bin/sh) [**]'
)

GARBAGE_LINE = "this is just random log noise"


# ── parse_fast_alert_line ───────────────────────────────────────────────────

def test_parse_full_alert():
    alert = parse_fast_alert_line(FAST_LINE_FULL)
    assert alert is not None
    assert alert.sid == 9000001
    assert alert.gid == 1
    assert alert.rev == 1
    assert "Port scan" in alert.msg
    assert alert.classtype == "Attempted Information Leak"
    assert alert.priority == 2
    assert alert.proto == "TCP"
    assert alert.src_ip == "192.168.1.100"
    assert alert.src_port == 54321
    assert alert.dst_ip == "10.8.0.1"
    assert alert.dst_port == 1194


def test_parse_minimal_alert():
    alert = parse_fast_alert_line(FAST_LINE_MINIMAL)
    assert alert is not None
    assert alert.sid == 9000005
    assert "reverse shell" in alert.msg


def test_parse_garbage_returns_none():
    assert parse_fast_alert_line(GARBAGE_LINE) is None


def test_parse_empty_returns_none():
    assert parse_fast_alert_line("") is None


def test_to_dict():
    alert = parse_fast_alert_line(FAST_LINE_FULL)
    d = alert.to_dict()
    assert isinstance(d, dict)
    assert d["sid"] == 9000001
    assert d["src_ip"] == "192.168.1.100"


# ── parse_alert_file ───────────────────────────────────────────────────────

def test_parse_alert_file(tmp_path):
    f = tmp_path / "alert"
    f.write_text(FAST_LINE_FULL + "\n" + GARBAGE_LINE + "\n" + FAST_LINE_MINIMAL + "\n")
    alerts = list(parse_alert_file(f))
    assert len(alerts) == 2
    assert alerts[0].sid == 9000001
    assert alerts[1].sid == 9000005


# ── SnortAlertWatcher ──────────────────────────────────────────────────────

def test_watcher_lifecycle(tmp_path):
    """Watcher starts, reads a new line, and delivers it via callback."""
    alert_file = tmp_path / "alert"
    alert_file.write_text("")  # create empty file

    received = []

    def on_alert(alert):
        received.append(alert)

    watcher = SnortAlertWatcher(str(alert_file), on_alert, poll_interval=0.05)
    watcher.start()
    assert watcher.running

    # Append a new alert to the file
    import time
    with open(alert_file, "a") as fh:
        fh.write(FAST_LINE_FULL + "\n")
        fh.flush()

    # Give the watcher time to pick it up
    time.sleep(0.3)

    watcher.stop()
    assert not watcher.running
    assert len(received) >= 1
    assert received[0].sid == 9000001


def test_watcher_handles_missing_file(tmp_path):
    """Watcher gracefully waits for a non-existent file."""
    watcher = SnortAlertWatcher(str(tmp_path / "nonexistent"), lambda a: None, poll_interval=0.05)
    watcher.start()
    assert watcher.running
    watcher.stop()
