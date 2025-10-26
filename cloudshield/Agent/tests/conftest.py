import importlib.util
import pathlib
import sys
import types

# Delegate to the repository root conftest.py to avoid duplicating fixture/stub code.
# This loader imports the file and injects its public names into this module's globals
# so pytest finds the fixtures as if they were defined here.
root_conftest = pathlib.Path(__file__).resolve().parents[3] / "conftest.py"
spec = importlib.util.spec_from_file_location("root_conftest", str(root_conftest))
module = importlib.util.module_from_spec(spec)
sys.modules["root_conftest"] = module
spec.loader.exec_module(module)

for name in dir(module):
    if not name.startswith("_"):
        globals()[name] = getattr(module, name)


def ensure_logger_stub():
    if "logger" not in sys.modules:
        logger_module = types.ModuleType("logger")

        class _DummyLogger:
            def __init__(self):
                self.messages = []

            def debug(self, message, *args):
                self.messages.append(("debug", self._format(message, *args)))

            def info(self, message, *args):
                self.messages.append(("info", self._format(message, *args)))

            def warning(self, message, *args):
                self.messages.append(("warning", self._format(message, *args)))

            def error(self, message, *args):
                self.messages.append(("error", self._format(message, *args)))

            @staticmethod
            def _format(message, *args):
                return message % args if args else message

        logger_module.task_logger = _DummyLogger()
        logger_module.core_logger = _DummyLogger()
        sys.modules["logger"] = logger_module
    else:
        logger_module = sys.modules["logger"]
        for attr in ("task_logger", "core_logger"):
            if not hasattr(logger_module, attr):
                setattr(logger_module, attr, type("_Dummy", (), {"info": lambda *_: None, "error": lambda *_: None, "warning": lambda *_: None})())


ensure_logger_stub()


def ensure_proto_stubs():
    proto_pkg = sys.modules.get("proto")
    if not proto_pkg:
        proto_pkg = types.ModuleType("proto")
        proto_pkg.__path__ = []
        sys.modules["proto"] = proto_pkg

    agent_pb2_module = sys.modules.get("proto.agent_pb2")

    class _BaseMessage:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

        def __repr__(self):
            attrs = ", ".join(f"{k}={v!r}" for k, v in self.__dict__.items())
            return f"{self.__class__.__name__}({attrs})"

    class Process(_BaseMessage):
        def __init__(
            self,
            pid=0,
            name="",
            username="",
            create_time="",
            cpu_percent="",
            memory_usage="",
            cmdline="",
            ppid=0,
        ):
            super().__init__(
                pid=pid,
                name=name,
                username=username,
                create_time=create_time,
                cpu_percent=cpu_percent,
                memory_usage=memory_usage,
                cmdline=cmdline,
                ppid=ppid,
            )

    class ProcessList(_BaseMessage):
        def __init__(self, agent_id="", timestamp=0, processes=None, is_pending=False):
            super().__init__(
                agent_id=agent_id,
                timestamp=timestamp,
                processes=list(processes or []),
                is_pending=is_pending,
            )

    class ProcessListAck(_BaseMessage):
        def __init__(self, action=False, pids=None):
            super().__init__(action=action, pids=list(pids or []))

    class ProcessListAckRes(_BaseMessage):
        def __init__(self, agent_id="", timestamp=0, processes=None, is_pending=False):
            super().__init__(
                agent_id=agent_id,
                timestamp=timestamp,
                processes=list(processes or []),
                is_pending=is_pending,
            )
    class ProcessInformation(_BaseMessage):
        def __init__(self, pid,name,open_files,memory_maps,threads):
            pass


    class Ack(_BaseMessage):
        def __init__(self, success=True, message="OK"):
            super().__init__(success=success, message=message)

    class WorkstationInit(_BaseMessage):
        def __init__(self, agent_id="", domain=""):
            super().__init__(agent_id=agent_id, domain=domain)

    if not agent_pb2_module:
        agent_pb2_module = types.ModuleType("proto.agent_pb2")
        sys.modules["proto.agent_pb2"] = agent_pb2_module

    for attr_name, attr_value in {
        "Process": Process,
        "ProcessList": ProcessList,
        "ProcessListAck": ProcessListAck,
        "ProcessListAckRes": ProcessListAckRes,
        "ProcessInformation": ProcessInformation,
        "Ack": Ack,
        "WorkstationInit": WorkstationInit,
    }.items():
        setattr(agent_pb2_module, attr_name, attr_value)

    setattr(proto_pkg, "agent_pb2", agent_pb2_module)

    agent_pb2_grpc_module = sys.modules.get("proto.agent_pb2_grpc")

    class AgentServiceServicer:
        def __init__(self, *args, **kwargs):
            pass

    def add_servicer_to_server(servicer, server):
        if hasattr(server, "register_servicer"):
            server.register_servicer(servicer)
        else:
            setattr(server, "attached_servicer", servicer)

    class AgentServiceStub:
        def __init__(self, channel):
            self._channel = channel

        def _dispatch(self, rpc_name, request):
            grpc_module = sys.modules.get("grpc")
            registry = getattr(grpc_module, "_FAKE_SERVER_REGISTRY", {}) if grpc_module else {}
            server = registry.get(getattr(self._channel, "target", None))
            if server is None and registry:
                # Fallback for tests that do not bind explicit targets
                server = next(iter(registry.values()))
            if server:
                return server.invoke(rpc_name, request)
            raise getattr(grpc_module, "RpcError", Exception)("No server available")

        def SendWorkstationInit(self, request):
            return self._dispatch("SendWorkstationInit", request)

        def SendProcessList(self, request):
            return self._dispatch("SendProcessList", request)

        def SendProcessListInformation(self, request):
            return self._dispatch("SendProcessListInformation", request)

    if not agent_pb2_grpc_module:
        agent_pb2_grpc_module = types.ModuleType("proto.agent_pb2_grpc")
        sys.modules["proto.agent_pb2_grpc"] = agent_pb2_grpc_module

    for attr_name, attr_value in {
        "AgentServiceServicer": AgentServiceServicer,
        "add_AgentServiceServicer_to_server": add_servicer_to_server,
        "AgentServiceStub": AgentServiceStub,
    }.items():
        setattr(agent_pb2_grpc_module, attr_name, attr_value)

    setattr(proto_pkg, "agent_pb2_grpc", agent_pb2_grpc_module)


ensure_proto_stubs()
