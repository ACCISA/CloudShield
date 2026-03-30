"""
Beacon / C2 heartbeat detector for CloudShield.

C2 implants communicate home on a fixed timer (e.g. every 60 s).  This
produces a highly-regular series of connections to the same destination that
stands out from normal human-driven traffic.

Algorithm
---------
For each (agent_id, dst_ip) pair we keep a sliding window of the last N
connection timestamps.  Once we have ≥ MIN_SAMPLES timestamps we compute the
inter-arrival intervals and check the **coefficient of variation** (CV =
std / mean).  A CV below REGULARITY_THRESHOLD indicates clock-like regularity
consistent with a beacon.

We also require a minimum interval (>= MIN_INTERVAL_SECS) to avoid flagging
very chatty-but-legitimate services (e.g. DNS).

Typical C2 beacons have CV < 0.10; we use 0.20 to allow for slight jitter.
"""

from __future__ import annotations

import math
import time
from collections import defaultdict, deque
from dataclasses import dataclass, asdict


# ── Tunable constants ────────────────────────────────────────────────────────

MIN_SAMPLES: int = 4            # need this many timestamps before scoring
MAX_HISTORY: int = 20           # keep last N timestamps per (agent, dst)
REGULARITY_THRESHOLD: float = 0.20   # CV below this → beacon
MIN_INTERVAL_SECS: float = 10.0      # ignore bursts faster than this
MAX_INTERVAL_SECS: float = 3600.0    # ignore very infrequent connections


# ── Result dataclass ─────────────────────────────────────────────────────────

@dataclass
class BeaconResult:
    agent_id: str
    dst_ip: str
    dst_port: int
    timestamp: int
    interval_mean: float    # average seconds between connections
    interval_cv: float      # coefficient of variation (lower = more regular)
    sample_count: int
    is_beacon: bool
    process_name: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# ── Detector ─────────────────────────────────────────────────────────────────

class BeaconDetector:
    """
    Sliding-window beacon detector.

    Call :meth:`record` for every incoming connection batch.  Returns a list
    of :class:`BeaconResult` objects flagged as beacons in that batch.
    """

    def __init__(
        self,
        min_samples: int = MIN_SAMPLES,
        max_history: int = MAX_HISTORY,
        regularity_threshold: float = REGULARITY_THRESHOLD,
        min_interval: float = MIN_INTERVAL_SECS,
        max_interval: float = MAX_INTERVAL_SECS,
    ):
        self._min_samples = min_samples
        self._max_history = max_history
        self._threshold = regularity_threshold
        self._min_interval = min_interval
        self._max_interval = max_interval

        # (agent_id, dst_ip, dst_port) → deque of (timestamp, process_name)
        self._history: dict[
            tuple[str, str, int], deque[tuple[int, str]]
        ] = defaultdict(lambda: deque(maxlen=max_history))

    def record(self, conn_dicts: list[dict], agent_id: str) -> list[BeaconResult]:
        """
        Update history with new connections and return any newly-flagged beacons.
        """
        now = int(time.time())
        flagged: list[BeaconResult] = []
        seen_keys: set[tuple[str, str, int]] = set()

        for c in conn_dicts:
            r_ip = c.get("raddr_ip") or c.get("raddrIp") or ""
            r_port = int(c.get("raddr_port") or c.get("raddrPort") or 0)
            proc = c.get("process_name") or c.get("processName") or ""
            ts = int(c.get("timestamp") or now)

            if not r_ip or r_ip.startswith("127.") or r_ip == "0.0.0.0":
                continue

            key = (agent_id, r_ip, r_port)
            self._history[key].append((ts, proc))

            # Only score each key once per batch
            if key in seen_keys:
                continue
            seen_keys.add(key)

            result = self._score(key, ts)
            if result and result.is_beacon:
                flagged.append(result)

        return flagged

    def _score(self, key: tuple[str, str, int], ts: int) -> BeaconResult | None:
        agent_id, dst_ip, dst_port = key
        history = self._history[key]

        if len(history) < self._min_samples:
            return None

        timestamps = [t for t, _ in history]
        proc = next((p for _, p in reversed(history) if p), "")

        intervals = [
            timestamps[i + 1] - timestamps[i]
            for i in range(len(timestamps) - 1)
            if self._min_interval <= (timestamps[i + 1] - timestamps[i]) <= self._max_interval
        ]

        if len(intervals) < self._min_samples - 1:
            return None

        n = len(intervals)
        mean = sum(intervals) / n
        if mean <= 0:
            return None

        std = math.sqrt(sum((x - mean) ** 2 for x in intervals) / n)
        cv = std / mean

        is_beacon = cv < self._threshold

        return BeaconResult(
            agent_id=agent_id,
            dst_ip=dst_ip,
            dst_port=dst_port,
            timestamp=ts,
            interval_mean=round(mean, 2),
            interval_cv=round(cv, 4),
            sample_count=len(history),
            is_beacon=is_beacon,
            process_name=proc,
        )
