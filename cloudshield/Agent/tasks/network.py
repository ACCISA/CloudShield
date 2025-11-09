# cloudshield/Agent/tasks/network.py

"""
Network listing task.

This module defines :class:`NetworkListingTask`, a periodic agent task that
captures a snapshot of the workstation's network sockets and ships it to the
CloudShield backend. Each run collects:

- Local/remote IPs and ports
- TCP state (e.g., LISTEN, ESTABLISHED)
- PID/process

If the server can’t be reached, the snapshot is saved locally and
retried later.
"""
try:  # Prefer package-relative imports
    from .task import BaseTask
    from ..proto import agent_pb2
    from ..logger import task_logger
except ImportError:  # pragma: no cover - fallback when executed as top-level package
    from tasks.task import BaseTask  # type: ignore
    from proto import agent_pb2  # type: ignore
    from logger import task_logger  # type: ignore

import psutil
import time


class NetworkListingTask(BaseTask):
    """Collect and send a snapshot of active inet sockets."""
    def __init__(self, agent_state):
        super().__init__(agent_state)

    def _ip(self, addr):
        if not addr:
            return ""
        # psutil can return a tuple (ip, port) or an object with .ip/.port
        return getattr(addr, "ip", addr[0] if isinstance(addr, (tuple, list)) else "")

    def _port(self, addr):
        if not addr:
            return 0
        return int(getattr(addr, "port", addr[1] if isinstance(addr, (tuple, list)) else 0))

    def get_connections(self):
        """Return current inet sockets as NetConn records; tolerates permission errors."""
        conns = []
        try:
            items = psutil.net_connections(kind="inet")
        except (psutil.AccessDenied, psutil.Error) as e:
            task_logger.warning(f"network listing unavailable: {e}")
            return conns

        # Cache process names to avoid repeated lookups for the same PID
        name_cache = {}

        for c in items:
            try:
                l_ip, l_port = self._ip(c.laddr), self._port(c.laddr)
                r_ip, r_port = self._ip(c.raddr), self._port(c.raddr)
                status = str(getattr(c, "status", "") or "")
                pid = c.pid or 0

                pname = ""
                if pid:
                    if pid not in name_cache:
                        try:
                            name_cache[pid] = psutil.Process(pid).name() or ""
                        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                            name_cache[pid] = ""
                    pname = name_cache[pid]

                conns.append(agent_pb2.NetConn(
                    laddr_ip=l_ip,
                    laddr_port=l_port,
                    raddr_ip=r_ip,
                    raddr_port=r_port,
                    status=status,
                    pid=pid,
                    process_name=pname,
                ))
            except Exception:
                # Skip any odd entries safely
                continue
        return conns

    def run(self):
        """Build a NetConnList batch and send it."""
        batch = agent_pb2.NetConnList(
            agent_id=self.agent_state["agent_id"],
            timestamp=int(time.time()),
            conns=self.get_connections(),
            is_pending=False,
        )
        task_logger.info(f"Sending {len(batch.conns)} network connections")
        self.send("SendNetworkConnections", batch)
