"""Tests for TrafficRateMonitor and SpikeResult."""

import pytest
from cloudshield.ThreatDetection.anomaly.rate_monitor import TrafficRateMonitor, SpikeResult


class TestSpikeResult:
    def test_to_dict(self):
        sr = SpikeResult(
            agent_id="a1", timestamp=1700000000,
            current_rate=100.0, baseline_rate=20.0,
            baseline_std=5.0, spike_ratio=5.0, is_spike=True,
        )
        d = sr.to_dict()
        assert d["agent_id"] == "a1"
        assert d["is_spike"] is True
        assert d["spike_ratio"] == 5.0


class TestTrafficRateMonitor:
    def test_no_spike_without_baseline(self):
        """Before min_baseline_windows, spike detection is inactive."""
        mon = TrafficRateMonitor(min_baseline_windows=5)
        for i in range(4):
            r = mon.record("a1", 100, timestamp=1000 + i)
            assert r.is_spike is False

    def test_spike_after_baseline(self):
        """A huge jump after a stable baseline triggers a spike."""
        mon = TrafficRateMonitor(
            window_size=30,
            threshold_factor=3.0,
            min_baseline_windows=5,
            min_absolute_count=10,
        )
        # Build a stable baseline of ~20 connections
        for i in range(10):
            mon.record("a1", 20, timestamp=1000 + i)

        # Sudden burst
        result = mon.record("a1", 500, timestamp=1050)
        assert result.is_spike is True
        assert result.spike_ratio > 10

    def test_no_spike_gradual_increase(self):
        """Gradual increases within std should not trigger."""
        mon = TrafficRateMonitor(
            threshold_factor=3.0, min_baseline_windows=5, min_absolute_count=10
        )
        for i in range(10):
            mon.record("a1", 20 + i, timestamp=1000 + i)

        # Slight bump within 3σ of the mean (~24.5 ± 2.87 * 3 = ~33.1)
        result = mon.record("a1", 30, timestamp=1020)
        assert result.is_spike is False

    def test_min_absolute_count(self):
        """Even a huge ratio doesn't trigger if absolute count is low."""
        mon = TrafficRateMonitor(min_absolute_count=50, min_baseline_windows=3)
        for i in range(5):
            mon.record("a1", 2, timestamp=1000 + i)

        # 20 is 10x baseline of 2 but below min_absolute_count=50
        result = mon.record("a1", 20, timestamp=1020)
        assert result.is_spike is False

    def test_per_agent_isolation(self):
        """Different agents have independent baselines."""
        mon = TrafficRateMonitor(min_baseline_windows=3, min_absolute_count=10)
        for i in range(5):
            mon.record("a1", 100, timestamp=1000 + i)
            mon.record("a2", 10, timestamp=1000 + i)

        # 100 for a2 would be a spike but not for a1
        r1 = mon.record("a1", 100, timestamp=1010)
        r2 = mon.record("a2", 100, timestamp=1010)
        assert r1.is_spike is False
        # a2 has baseline ~10, so 100 is a big jump
        assert r2.is_spike is True

    def test_get_baseline_unknown_agent(self):
        mon = TrafficRateMonitor()
        mean, std = mon.get_baseline("unknown")
        assert mean == 0.0
        assert std == 0.0

    def test_get_baseline_known_agent(self):
        mon = TrafficRateMonitor()
        mon.record("a1", 50, timestamp=1000)
        mon.record("a1", 60, timestamp=1001)
        mean, std = mon.get_baseline("a1")
        assert mean == pytest.approx(55.0)
        assert std > 0

    def test_agents_list(self):
        mon = TrafficRateMonitor()
        mon.record("a1", 10, timestamp=1)
        mon.record("a2", 20, timestamp=1)
        assert sorted(mon.agents()) == ["a1", "a2"]

    def test_clear_single(self):
        mon = TrafficRateMonitor()
        mon.record("a1", 10, timestamp=1)
        mon.record("a2", 20, timestamp=1)
        mon.clear("a1")
        assert "a1" not in mon.agents()
        assert "a2" in mon.agents()

    def test_clear_all(self):
        mon = TrafficRateMonitor()
        mon.record("a1", 10, timestamp=1)
        mon.clear()
        assert mon.agents() == []

    def test_rolling_window_size(self):
        """History deque should not exceed window_size."""
        mon = TrafficRateMonitor(window_size=5)
        for i in range(20):
            mon.record("a1", 10, timestamp=i)
        # Internal history should be capped
        assert len(mon._history["a1"]) == 5
