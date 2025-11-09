import sys
import types
from types import SimpleNamespace

import pytest

if "proto" not in sys.modules:
    proto_pkg = types.ModuleType("proto")
    proto_pkg.__path__ = []
    sys.modules["proto"] = proto_pkg

if "proto.agent_pb2" not in sys.modules:
    agent_pb2 = types.ModuleType("proto.agent_pb2")
    sys.modules["proto.agent_pb2"] = agent_pb2
else:
    agent_pb2 = sys.modules["proto.agent_pb2"]


class _NetConn:
    def __init__(self, **kw):
        self.__dict__.update(kw)


class _NetConnList:
    def __init__(self, agent_id, timestamp, conns, is_pending):
        self.agent_id = agent_id
        self.timestamp = timestamp
        self.conns = conns
        self.is_pending = is_pending


if not hasattr(agent_pb2, "NetConn"):
    agent_pb2.NetConn = _NetConn
if not hasattr(agent_pb2, "NetConnList"):
    agent_pb2.NetConnList = _NetConnList

setattr(sys.modules["proto"], "agent_pb2", agent_pb2)

from cloudshield.Agent.tasks.network import NetworkListingTask as _NLT  # noqa: E402
import cloudshield.Agent.tasks.network as network_mod  # noqa: E402


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, m, *a):
        self.messages.append(("info", m % a if a else m))

    def warning(self, m, *a):
        self.messages.append(("warning", m % a if a else m))

    def debug(self, m, *a):
        self.messages.append(("debug", m % a if a else m))


@pytest.fixture(autouse=True)
def fresh_logger(monkeypatch):
    lg = DummyLogger()
    monkeypatch.setattr(network_mod, "task_logger", lg)
    return lg


def _patch_psutil(monkeypatch, connections, name_map=None, raise_exc=None, counter=None):
    def net_connections(kind="inet"):
        if raise_exc:
            raise raise_exc("denied")
        return [
            SimpleNamespace(laddr=laddr, raddr=raddr, status=status, pid=pid)
            for (laddr, raddr, status, pid) in connections
        ]

    class _Proc:
        def __init__(self, pid):
            self._pid = pid

        def name(self):
            if counter is not None:
                counter[self._pid] = counter.get(self._pid, 0) + 1
            return (name_map or {}).get(self._pid, "")

    ps = types.SimpleNamespace(
        net_connections=net_connections,
        Process=_Proc,
        AccessDenied=Exception,
        Error=Exception,
        NoSuchProcess=Exception,
        ZombieProcess=Exception,
    )
    monkeypatch.setattr(network_mod, "psutil", ps)


def test_get_connections_builds_entries(monkeypatch):
    laddr1 = SimpleNamespace(ip="127.0.0.1", port=6379)
    raddr1 = SimpleNamespace(ip="", port=0)
    laddr2 = ("::ffff:127.0.0.1", 50051)
    raddr2 = ("::ffff:127.0.0.1", 37760)
    _patch_psutil(
        monkeypatch,
        [(laddr1, raddr1, "LISTEN", 123), (laddr2, raddr2, "ESTABLISHED", 999)],
        name_map={123: "redis", 999: "python"},
    )
    task = _NLT({"agent_id": "a"})
    conns = task.get_connections()
    assert len(conns) == 2
    c0, c1 = conns
    assert (
        c0.laddr_ip,
        c0.laddr_port,
        c0.raddr_ip,
        c0.raddr_port,
        c0.status,
        c0.pid,
        c0.process_name,
    ) == ("127.0.0.1", 6379, "", 0, "LISTEN", 123, "redis")
    assert (
        c1.laddr_ip,
        c1.laddr_port,
        c1.raddr_ip,
        c1.raddr_port,
        c1.status,
        c1.pid,
        c1.process_name,
    ) == ("::ffff:127.0.0.1", 50051, "::ffff:127.0.0.1", 37760, "ESTABLISHED", 999, "python")


def test_missing_raddr_normalized(monkeypatch):
    laddr = SimpleNamespace(ip="0.0.0.0", port=8000)
    _patch_psutil(monkeypatch, [(laddr, None, "LISTEN", 42)], name_map={42: "svc"})
    task = _NLT({"agent_id": "a"})
    conns = task.get_connections()
    assert len(conns) == 1
    c = conns[0]
    assert (c.laddr_ip, c.laddr_port, c.raddr_ip, c.raddr_port, c.process_name) == (
        "0.0.0.0",
        8000,
        "",
        0,
        "svc",
    )


def test_access_denied_returns_empty_and_logs(monkeypatch, fresh_logger):
    class Denied(Exception):
        pass

    _patch_psutil(monkeypatch, [], raise_exc=Denied)
    monkeypatch.setattr(network_mod.psutil, "AccessDenied", Denied)
    monkeypatch.setattr(network_mod.psutil, "Error", Denied)
    task = _NLT({"agent_id": "a"})
    conns = task.get_connections()
    assert conns == []
    assert any(lvl == "warning" and "network listing unavailable" in msg for lvl, msg in fresh_logger.messages)


def test_name_cache_used_once_per_pid(monkeypatch):
    counter = {}
    laddr = SimpleNamespace(ip="127.0.0.1", port=1)
    raddr = SimpleNamespace(ip="", port=0)
    _patch_psutil(
        monkeypatch,
        [(laddr, raddr, "LISTEN", 7), (laddr, raddr, "ESTABLISHED", 7), (laddr, raddr, "LISTEN", 8)],
        name_map={7: "p7", 8: "p8"},
        counter=counter,
    )
    task = _NLT({"agent_id": "a"})
    task.get_connections()
    assert counter.get(7) == 1
    assert counter.get(8) == 1


def test_run_sends_batch(monkeypatch):
    laddr1 = SimpleNamespace(ip="127.0.0.1", port=6379)
    raddr1 = SimpleNamespace(ip="", port=0)
    _patch_psutil(monkeypatch, [(laddr1, raddr1, "LISTEN", 1)], name_map={1: "svc"})
    task = _NLT({"agent_id": "agent-1"})
    calls = []
    monkeypatch.setattr(task, "send", lambda name, req: calls.append((name, req)))
    task.run()
    assert calls and calls[0][0] == "SendNetworkConnections"
    req = calls[0][1]
    assert req.agent_id == "agent-1"
    assert len(req.conns) == 1
    first_conn = list(req.conns)[0]
    assert first_conn.process_name == "svc"
