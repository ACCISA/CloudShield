"""
Per-agent traffic-rate monitor for CloudShield.

Maintains a rolling baseline of connection counts per agent per time window
and flags sudden spikes.  Designed to catch:

- DDoS amplification from a compromised workstation
- Burst port scanning
- Worm lateral-movement floods

Architecture
────────────
Each call to :meth:`record` stores the current window's connection count for
an agent.  After enough windows have been recorded the monitor computes a
rolling mean + std and triggers a spike alert when the current count exceeds
``mean + threshold_factor * std``.

The monitor is **lock-free per agent** (dict of deques) and O(1) per
``record`` call.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass, asdict


@dataclass
class SpikeResult:
    """Emitted when a traffic spike is detected for an agent."""
    agent_id: str
    timestamp: int
    current_rate: float        # connections in this window
    baseline_rate: float       # rolling average
    baseline_std: float        # rolling std
    spike_ratio: float         # current / baseline
    is_spike: bool

    def to_dict(self) -> dict:
        return asdict(self)


class TrafficRateMonitor:
    """
    Rolling-window traffic-rate monitor.

    Parameters
    ----------
    window_size : int
        Number of historical windows kept for the rolling baseline.
    threshold_factor : float
        A spike is flagged when ``current > mean + threshold_factor * std``.
        Default 3.0 (~99.7 % of a normal distribution).
    min_baseline_windows : int
        Minimum number of historical windows before spike detection activates.
    min_absolute_count : int
        Minimum connection count to even consider a spike (avoids false
        positives on near-zero baselines).
    """

    def __init__(
        self,
        window_size: int = 30,
        threshold_factor: float = 3.0,
        min_baseline_windows: int = 5,
        min_absolute_count: int = 20,
    ):
        self._window_size = window_size
        self._threshold = threshold_factor
        self._min_windows = min_baseline_windows
        self._min_count = min_absolute_count

        # agent_id → deque of (timestamp, count) tuples
        self._history: dict[str, deque[tuple[int, float]]] = defaultdict(
            lambda: deque(maxlen=window_size)
        )

    # ── Public API ──────────────────────────────────────────────────────

    def record(self, agent_id: str, count: int, timestamp: int = 0) -> SpikeResult:
        """
        Record the connection count for *agent_id* in the current window and
        return spike analysis.

        Parameters
        ----------
        agent_id : str
            The agent whose traffic is being recorded.
        count : int
            Number of connections seen in this time window.
        timestamp : int
            Epoch seconds.  Defaults to ``time.time()``.
        """
        ts = timestamp or int(time.time())
        history = self._history[agent_id]

        # Compute baseline from existing history (before appending current)
        mean, std = self._stats(history)
        history.append((ts, float(count)))

        # Not enough history yet → no spike
        if len(history) <= self._min_windows:
            return SpikeResult(
                agent_id=agent_id,
                timestamp=ts,
                current_rate=float(count),
                baseline_rate=mean,
                baseline_std=std,
                spike_ratio=1.0 if mean == 0 else count / max(mean, 1),
                is_spike=False,
            )

        ratio = count / max(mean, 1)
        is_spike = (
            count >= self._min_count
            and count > mean + self._threshold * max(std, 1)
        )

        return SpikeResult(
            agent_id=agent_id,
            timestamp=ts,
            current_rate=float(count),
            baseline_rate=mean,
            baseline_std=std,
            spike_ratio=ratio,
            is_spike=is_spike,
        )

    def get_baseline(self, agent_id: str) -> tuple[float, float]:
        """Return (mean, std) for *agent_id*, or (0, 0) if unknown."""
        history = self._history.get(agent_id)
        if not history:
            return 0.0, 0.0
        return self._stats(history)

    def agents(self) -> list[str]:
        """Return list of all tracked agent IDs."""
        return list(self._history.keys())

    def clear(self, agent_id: str | None = None) -> None:
        """Clear history for one agent, or all agents if *agent_id* is None."""
        if agent_id:
            self._history.pop(agent_id, None)
        else:
            self._history.clear()

    # ── Internals ───────────────────────────────────────────────────────

    @staticmethod
    def _stats(history: deque[tuple[int, float]]) -> tuple[float, float]:
        """Compute (mean, std) from the history deque."""
        if not history:
            return 0.0, 0.0
        counts = [c for _, c in history]
        n = len(counts)
        mean = sum(counts) / n
        if n < 2:
            return mean, 0.0
        variance = sum((c - mean) ** 2 for c in counts) / n
        return mean, variance ** 0.5
