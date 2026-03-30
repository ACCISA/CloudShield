from __future__ import annotations
import subprocess
from collections import deque
from typing import Optional, List

def run_stream(cmd: list[str], *, cwd: str, env: Optional[dict] = None, logger=None, tail_keep: int = 50) -> List[str]:
    """
    Generic, reusable command runner that streams combined stdout/stderr to a logger,
    yields nothing (kept simple for callsites), but returns a tail of the output for debug UIs.
    Extracted from tasks so any worker (terraform) can reuse it.
    """
    if logger:
        logger.debug("Executing command: %s (cwd=%s)", " ".join(cmd), cwd)


    # Keep a bounded output tail to prevent unbounded memory growth.
    # We retain at least 30 lines to provide useful failure context.
    tail_window = max(30, tail_keep)
    output_tail: deque[str] = deque(maxlen=tail_window)

    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        stripped = line.rstrip("\n")
        output_tail.append(stripped)
        if logger:
            logger.debug("[cmd] %s", stripped)


    proc.wait()
    if proc.returncode != 0:
        if logger:
            logger.error("Command failed (%s): rc=%s", " ".join(cmd), proc.returncode)
            tail_lines = list(output_tail)[-30:]
            logger.error("Last %d lines:\n%s", len(tail_lines), "\n".join(tail_lines))
        raise subprocess.CalledProcessError(proc.returncode, cmd)


    if logger:
        logger.debug("Command succeeded: %s", " ".join(cmd))

    if tail_keep <= 0:
        return []
    return list(output_tail)[-tail_keep:]