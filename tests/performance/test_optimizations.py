"""
Performance-focused tests aligned with runtime helpers.

Run with: python -m pytest tests/performance/test_optimizations.py -v
"""
import subprocess

from cloudshield.Server.utils import shell


class _DummyLogger:
    def __init__(self):
        self.debug_calls: list[str] = []
        self.error_calls: list[str] = []

    def debug(self, msg, *args):
        self.debug_calls.append(msg % args if args else str(msg))

    def error(self, msg, *args):
        self.error_calls.append(msg % args if args else str(msg))


def test_run_stream_keeps_bounded_tail(monkeypatch):
    """run_stream should return only the requested output tail."""

    class _Proc:
        def __init__(self):
            self.stdout = (f"Line {i}\n" for i in range(1000))
            self.returncode = 0

        def wait(self):
            return None

    monkeypatch.setattr(shell.subprocess, "Popen", lambda *a, **k: _Proc())
    logger = _DummyLogger()

    tail = shell.run_stream(["dummy"], cwd=".", logger=logger, tail_keep=50)

    assert len(tail) == 50
    assert tail[0] == "Line 950"
    assert tail[-1] == "Line 999"


def test_run_stream_failure_logs_last_30_lines(monkeypatch):
    """run_stream should include up to 30 trailing lines in failure logs."""

    class _Proc:
        def __init__(self):
            self.stdout = (f"Err {i}\n" for i in range(45))
            self.returncode = 2

        def wait(self):
            return None

    monkeypatch.setattr(shell.subprocess, "Popen", lambda *a, **k: _Proc())
    logger = _DummyLogger()

    try:
        shell.run_stream(["dummy"], cwd=".", logger=logger, tail_keep=10)
        assert False, "Expected CalledProcessError"
    except subprocess.CalledProcessError as exc:
        assert exc.returncode == 2

    assert any("Command failed" in line for line in logger.error_calls)
    last_block = next(line for line in logger.error_calls if line.startswith("Last "))
    assert "Err 15" in last_block
    assert "Err 44" in last_block


def test_run_stream_tail_keep_zero_returns_empty(monkeypatch):
    """tail_keep=0 should return an empty list while still executing command."""

    class _Proc:
        def __init__(self):
            self.stdout = (f"Line {i}\n" for i in range(10))
            self.returncode = 0

        def wait(self):
            return None

    monkeypatch.setattr(shell.subprocess, "Popen", lambda *a, **k: _Proc())

    tail = shell.run_stream(["dummy"], cwd=".", tail_keep=0)
    assert tail == []
