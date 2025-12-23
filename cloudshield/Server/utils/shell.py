from __future__ import annotations
import subprocess
from typing import Optional, List

def run_stream(cmd: list[str], *, cwd: str, env: Optional[dict] = None, logger=None, tail_keep: int = 50) -> List[str]:
    """
    Generic, reusable command runner that streams combined stdout/stderr to a logger,
    yields nothing (kept simple for callsites), but returns a tail of the output for debug UIs.
    Extracted from tasks so any worker (terraform) can reuse it.
    """
    if logger:
        logger.debug("Executing command: %s (cwd=%s)", " ".join(cmd), cwd)


    all_output: List[str] = [] # Collect all output lines for tail return`

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
        all_output.append(stripped)
        if logger:
            logger.debug("[cmd] %s", stripped)


    proc.wait()
    if proc.returncode != 0:
        if logger:
            logger.error("Command failed (%s): rc=%s", " ".join(cmd), proc.returncode)
            logger.error("Last %d lines:\n%s", min(30, len(all_output)), "\n".join(all_output[-30:]))
        raise subprocess.CalledProcessError(proc.returncode, cmd)


    if logger:
        logger.debug("Command succeeded: %s", " ".join(cmd))


    return all_output[-tail_keep:]
