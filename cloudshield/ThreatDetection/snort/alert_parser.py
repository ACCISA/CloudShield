"""
Snort alert log parser for CloudShield.

Reads Snort *fast-alert* output and converts each line into a structured
dict suitable for Elasticsearch ingestion or API consumption.

Fast-alert format example
─────────────────────────
01/15-14:30:22.123456  [**] [1:9000001:1] CS-VPN Port scan detected on VPN port [**]
  [Classification: Attempted Information Leak] [Priority: 2]
  {TCP} 192.168.1.100:54321 -> 10.8.0.1:1194
"""

from __future__ import annotations

import os
import re
import time
import threading
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Generator

# Regex for Snort "fast" alert lines
_FAST_RE = re.compile(
    r"(?P<ts>\d{2}/\d{2}-\d{2}:\d{2}:\d{2}\.\d+)\s+"
    r"\[\*\*\]\s+\[(?P<gid>\d+):(?P<sid>\d+):(?P<rev>\d+)\]\s+"
    r"(?P<msg>.+?)\s+\[\*\*\]"
    r"(?:.*?\[Classification:\s*(?P<classtype>[^\]]+)\])?"
    r"(?:.*?\[Priority:\s*(?P<priority>\d+)\])?"
    r"(?:.*?\{(?P<proto>\w+)\}\s+(?P<src_ip>[^:]+):(?P<src_port>\d+)\s+->\s+"
    r"(?P<dst_ip>[^:]+):(?P<dst_port>\d+))?"
)


@dataclass
class SnortAlert:
    """Structured representation of a single Snort alert."""
    timestamp: str
    sid: int
    gid: int
    rev: int
    msg: str
    classtype: str = ""
    priority: int = 0
    proto: str = ""
    src_ip: str = ""
    src_port: int = 0
    dst_ip: str = ""
    dst_port: int = 0
    raw: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def parse_fast_alert_line(line: str) -> SnortAlert | None:
    """Parse one Snort fast-alert line into a :class:`SnortAlert`."""
    m = _FAST_RE.match(line.strip())
    if not m:
        return None
    return SnortAlert(
        timestamp=m.group("ts") or "",
        sid=int(m.group("sid") or 0),
        gid=int(m.group("gid") or 0),
        rev=int(m.group("rev") or 0),
        msg=(m.group("msg") or "").strip(),
        classtype=(m.group("classtype") or "").strip(),
        priority=int(m.group("priority") or 0),
        proto=(m.group("proto") or "").upper(),
        src_ip=m.group("src_ip") or "",
        src_port=int(m.group("src_port") or 0),
        dst_ip=m.group("dst_ip") or "",
        dst_port=int(m.group("dst_port") or 0),
        raw=line.strip(),
    )


def parse_alert_file(path: str | Path) -> Generator[SnortAlert, None, None]:
    """Yield :class:`SnortAlert` objects from a Snort fast-alert log file."""
    with open(path, "r") as fh:
        for line in fh:
            alert = parse_fast_alert_line(line)
            if alert:
                yield alert


class SnortAlertWatcher:
    """
    Background thread that tails a Snort alert file and invokes a callback
    for every new alert.  Designed to be started once by the ThreatDetection
    server so parsed alerts flow into Elasticsearch in real-time.

    Usage::

        from snort.alert_parser import SnortAlertWatcher

        def on_alert(alert):
            es_log("snort_alerts", alert.to_dict())

        watcher = SnortAlertWatcher("/var/log/snort/alert", on_alert)
        watcher.start()    # non-blocking
        ...
        watcher.stop()
    """

    def __init__(self, path: str | Path, callback, poll_interval: float = 1.0):
        self._path = str(path)
        self._callback = callback
        self._poll = poll_interval
        self._seek_to_end = seek_to_end
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    # ── public API ──────────────────────────────────────────────────────
    def start(self) -> None:
        """Start the watcher in a daemon thread."""
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Signal the watcher to stop."""
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    # ── internals ───────────────────────────────────────────────────────
    def _run(self) -> None:
        """Tail-follow the alert file."""
        # Wait for the file to appear
        while not os.path.exists(self._path) and not self._stop.is_set():
            time.sleep(self._poll)

        if self._stop.is_set():
            return

        with open(self._path, "r") as fh:            # Jump to end of file
            # Jump to end of file if requested
            if self._seek_to_end:
                fh.seek(0, 2)
            while not self._stop.is_set():
                line = fh.readline()
                if not line:
                    time.sleep(self._poll)
                    continue
                alert = parse_fast_alert_line(line)
                if alert:
                    try:
                        self._callback(alert)
                    except Exception:
                        pass  # never crash the watcher
