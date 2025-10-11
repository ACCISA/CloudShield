from types import SimpleNamespace

import psutil

from cloudshield.Agent.tasks.processes import GetProcessListTask


class FakeProc:
    def __init__(self, info=None, exc=None):
        self._info = info or {}
        self._exc = exc

    @property
    def info(self):
        if self._exc:
            raise self._exc
        return self._info


class BadCmdline:
    def __iter__(self):  # pragma: no cover - iteration raises instead
        raise TypeError("not iterable")


def _make_task(tmp_path):
    agent_state = {
        "agent_id": "test-agent",
        "server_addr": "127.0.0.1",
        "port": 50051,
        "cache_path": str(tmp_path),
        "create_grpc_channel_cb": lambda: None,
    }
    return GetProcessListTask(agent_state)


def test_get_process_list_normalizes_process_fields(monkeypatch, tmp_path):
    mem = SimpleNamespace(rss=4096)
    procs = [
        FakeProc(
            {
                "pid": 123,
                "name": "python",
                "username": "tester",
                "create_time": 1700.5,
                "cpu_percent": 12.34,
                "memory_info": mem,
                "cmdline": ["python", "-m", "agent"],
                "ppid": 1,
            }
        )
    ]
    monkeypatch.setattr(psutil, "process_iter", lambda *_args, **_kwargs: procs)

    task = _make_task(tmp_path)
    processes = task.get_process_list()

    assert len(processes) == 1
    process = processes[0]
    assert process.pid == 123
    assert process.name == "python"
    assert process.username == "tester"
    assert process.create_time == "1700.5"
    assert process.cpu_percent == "12.34"
    assert process.memory_usage == "4096"
    assert process.cmdline == "python -m agent"
    assert process.ppid == 1


def test_get_process_list_handles_cmdline_edge_cases(monkeypatch, tmp_path):
    procs = [
        FakeProc(
            {
                "pid": 1,
                "name": None,
                "username": None,
                "create_time": None,
                "cpu_percent": None,
                "memory_info": None,
                "cmdline": "python script.py",
                "ppid": None,
            }
        ),
        FakeProc(
            {
                "pid": 2,
                "name": "agent",
                "username": "svc",
                "create_time": 0,
                "cpu_percent": 0,
                "memory_info": None,
                "cmdline": BadCmdline(),
                "ppid": 0,
            }
        ),
        FakeProc(exc=psutil.AccessDenied(pid=3)),
    ]
    monkeypatch.setattr(psutil, "process_iter", lambda *_args, **_kwargs: procs)

    task = _make_task(tmp_path)
    processes = task.get_process_list()

    assert len(processes) == 2
    first, second = processes
    assert first.name == ""
    assert first.username == ""
    assert first.create_time == ""
    assert first.cpu_percent == ""
    assert first.cmdline == "python script.py"
    assert first.ppid == 0

    assert second.cmdline == ""
    assert second.memory_usage == ""


def test_run_returns_when_send_none(monkeypatch, tmp_path):
    task = _make_task(tmp_path)
    monkeypatch.setattr(task, "get_process_list", lambda: ["payload"])

    send_calls = []

    def fake_send(name, request):
        send_calls.append((name, request))
        return None

    monkeypatch.setattr(task, "send", fake_send)

    task.run()

    assert len(send_calls) == 1
    assert send_calls[0][0] == "SendProcessList"


def test_run_sends_follow_up_when_action_requested(monkeypatch, tmp_path):
    task = _make_task(tmp_path)
    monkeypatch.setattr(task, "get_process_list", lambda: ["proc-list"])
    monkeypatch.setattr("cloudshield.Agent.tasks.processes.time.time", lambda: 1700000000)

    send_calls = []

    def fake_get_info(pid):
        return {"pid": pid, "name": f"proc-{pid}"}

    monkeypatch.setattr(task, "get_process_information", fake_get_info)

    def fake_send(name, request):
        send_calls.append((name, request))
        if len(send_calls) == 1:
            return SimpleNamespace(action=True, pids=[10, 20])
        return SimpleNamespace(success=True)

    monkeypatch.setattr(task, "send", fake_send)

    task.run()

    assert len(send_calls) == 2
    first_name, first_request = send_calls[0]
    assert first_name == "SendProcessList"
    assert first_request.agent_id == "test-agent"
    assert first_request.timestamp == 1700000000
    assert first_request.processes == ["proc-list"]

    second_name, second_request = send_calls[1]
    assert second_name == "SendProcessListInformation"
    expected = [
        {"pid": 10, "name": "proc-10"},
        {"pid": 20, "name": "proc-20"},
    ]
    assert second_request.processes == expected


def test_run_skips_follow_up_when_not_requested(monkeypatch, tmp_path):
    task = _make_task(tmp_path)
    monkeypatch.setattr(task, "get_process_list", lambda: ["proc-list"])
    monkeypatch.setattr("cloudshield.Agent.tasks.processes.time.time", lambda: 42)

    send_calls = []

    def fake_send(name, request):
        send_calls.append((name, request))
        return SimpleNamespace(action=False, pids=[])

    monkeypatch.setattr(task, "send", fake_send)

    task.run()

    assert len(send_calls) == 1
    assert send_calls[0][0] == "SendProcessList"
