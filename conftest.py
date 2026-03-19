import sys
import time
import types
from unittest.mock import MagicMock
import os

def _stub_module(name, attrs=None):
    if name in sys.modules:
        return sys.modules[name]
    m = types.ModuleType(name)
    if attrs:
        for k, v in attrs.items():
            setattr(m, k, v)
    sys.modules[name] = m
    return m

# Provide lightweight stubs for optional dependencies used by the codebase so
# tests run in CI/local envs that don't have every library installed.

# ---------------------------------------------------------------------------
# MongoDB / PyMongo
# ---------------------------------------------------------------------------
# Many modules import `utils.database` at import time, which attempts a real
# Mongo connection and can fail in local dev. For unit tests we default to a
# lightweight stub unless the developer opts in.
if os.getenv("CLOUDSHIELD_USE_REAL_MONGO") not in {"1", "true", "TRUE", "yes", "YES"}:
    try:
        import pymongo  # noqa: F401
        import pymongo.errors as _pymongo_errors  # noqa: F401

        mock_mongo_client = MagicMock()
        mock_mongo_client.return_value.admin.command.return_value = None

        # Preserve error classes if present; fall back to generic Exception.
        DuplicateKeyError = getattr(_pymongo_errors, "DuplicateKeyError", Exception)
        OperationFailure = getattr(_pymongo_errors, "OperationFailure", Exception)
        PyMongoError = getattr(_pymongo_errors, "PyMongoError", Exception)

        pymongo.MongoClient = mock_mongo_client
        pymongo.errors.DuplicateKeyError = DuplicateKeyError
        pymongo.errors.OperationFailure = OperationFailure
        pymongo.errors.PyMongoError = PyMongoError
    except Exception:
        # If pymongo isn't installed at all, create a stub module.
        mock_errors = MagicMock()
        mock_errors.PyMongoError = Exception
        mock_errors.DuplicateKeyError = Exception
        mock_errors.OperationFailure = Exception

        mock_pymongo = MagicMock()
        mock_pymongo.MongoClient = MagicMock()
        mock_pymongo.MongoClient.return_value.admin.command.return_value = None
        mock_pymongo.errors = mock_errors

        sys.modules["pymongo"] = mock_pymongo
        sys.modules["pymongo.errors"] = mock_errors

# Pydantic's EmailStr requires `email_validator`; provide a minimal stub if missing.
try:
    import email_validator  # noqa: F401
except Exception:
    class EmailNotValidError(ValueError):
        pass

    class _ValidatedEmail:
        def __init__(self, email: str):
            normalized = email.strip().lower()
            self.email = normalized
            # Pydantic may read `.normalized` from email_validator's return value.
            self.normalized = normalized
            if "@" in normalized:
                self.local_part, self.domain = normalized.split("@", 1)
            else:
                self.local_part, self.domain = normalized, ""
            # Common attribute used by email_validator.
            self.ascii_email = normalized

    def validate_email(email: str, *args, **kwargs):  # noqa: ARG001
        if not isinstance(email, str) or "@" not in email:
            raise EmailNotValidError("Invalid email")
        return _ValidatedEmail(email.strip())

    _stub_module(
        "email_validator",
        {
            "EmailNotValidError": EmailNotValidError,
            "validate_email": validate_email,
        },
    )

# bcrypt is used for password hashing; stub if missing so tests can import.
try:
    import bcrypt  # noqa: F401
except Exception:
    import base64
    import hashlib
    import os as _os

    _BCRYPT_PREFIX = b"$2b$12$"
    _SALT_LEN = 22  # typical bcrypt salt payload length

    def _gensalt(*_args, **_kwargs):
        # Return bcrypt-looking salt bytes; unique per call.
        raw = _os.urandom(16)
        b64 = base64.b64encode(raw).replace(b"+", b".")
        return _BCRYPT_PREFIX + b64[:_SALT_LEN]

    def _hashpw(password: bytes, salt: bytes) -> bytes:
        print("heeerre")
        if len(password) > 72:
            raise ValueError("password cannot be longer than 72 bytes")
        # Produce a stable, bcrypt-shaped hash that depends on both password and salt.
        # Format: <salt>$<digest>
        digest = hashlib.sha256(salt + b"|" + password).digest()
        digest_b64 = base64.b64encode(digest).rstrip(b"=")
        # Real bcrypt hashes are 60 chars; our salt is 29 bytes, plus '$' is 1,
        # so keep digest portion at 30 bytes.
        return salt + b"$" + digest_b64[:30]

    def _checkpw(password: bytes, hashed: bytes) -> bool:
        # Our fake hash embeds the salt as the first part.
        if not isinstance(hashed, (bytes, bytearray)) or not hashed.startswith(_BCRYPT_PREFIX):
            return False
        salt = bytes(hashed[: len(_BCRYPT_PREFIX) + _SALT_LEN])
        return _hashpw(password, salt) == hashed

    _stub_module(
        "bcrypt",
        {
            "gensalt": _gensalt,
            "hashpw": _hashpw,
            "checkpw": _checkpw,
        },
    )


class _FakeRpcError(Exception):
    """Minimal stand-in for grpc.RpcError"""


class _FakeFutureTimeoutError(TimeoutError):
    """Raised when our fake future times out waiting for connectivity."""


class _FakeChannel:
    def __init__(self, target):
        self.target = target


class _FakeFuture:
    def __init__(self, channel):
        self._channel = channel

    def result(self, timeout=None):
        deadline = None if timeout is None else time.time() + timeout
        while True:
            if _SERVERS.get(self._channel.target):
                return True
            if deadline is not None and time.time() >= deadline:
                raise _FakeFutureTimeoutError()
            time.sleep(0.01)


class _FakeServer:
    def __init__(self):
        self._targets = []
        self._servicers = []

    def add_insecure_port(self, target):
        self._targets.append(target)
        return target

    def register_servicer(self, servicer):
        self._servicers.append(servicer)

    def start(self):
        for target in self._targets:
            _SERVERS[target] = self

    def stop(self, _grace):
        for target in list(self._targets):
            _SERVERS.pop(target, None)

    # Helpers used by our fake stubs
    def invoke(self, rpc_name, request):
        for servicer in self._servicers:
            handler = getattr(servicer, rpc_name, None)
            if handler:
                return handler(request, context=None)
        raise _FakeRpcError(f"RPC '{rpc_name}' not implemented")


_SERVERS = {}


def _fake_insecure_channel(target):
    return _FakeChannel(target)


def _fake_channel_ready_future(channel):
    return _FakeFuture(channel)


def _fake_server(*_args, **_kwargs):
    return _FakeServer()

mock_utilities = MagicMock()
mock_utilities.first_version_is_lower = lambda v1, v2: False

grpc_attrs = {
    "_utilities": mock_utilities,
    "__version__":'1.48.2',
    "insecure_channel": _fake_insecure_channel,
    "channel_ready_future": _fake_channel_ready_future,
    "server": _fake_server,
    "RpcError": _FakeRpcError,
    "FutureTimeoutError": _FakeFutureTimeoutError,
}


_grpc_module = _stub_module("grpc", grpc_attrs)
setattr(_grpc_module, "_FAKE_SERVER_REGISTRY", _SERVERS)

sys.modules["grpc"] = _grpc_module
sys.modules["grpc._utilities"] = mock_utilities


class _Sched:
    def __init__(self, interval=None):
        self.interval = interval
        # emulate schedule.every(...).seconds returning an object with .do()
        self.seconds = self

    def do(self, func):
        # no-op scheduler in tests
        return None


_stub_module(
    "schedule",
    {
        "every": lambda interval=None: _Sched(interval),
        "run_pending": lambda: None,
        "cancel_job": lambda _job: None,
    },
)


# boto3, rq, redis are common optional dependencies in repo; provide minimal stubs
# python-dotenv is used by Server modules for env loading; stub if missing.
try:
    from dotenv import load_dotenv  # noqa: F401
except Exception:
    _stub_module("dotenv", {"load_dotenv": lambda *a, **k: None})

try:  # use real boto3 if available
    import boto3  # noqa: F401
except Exception:
    _stub_module("boto3")


def _get_current_job_stub():
    job = types.SimpleNamespace()
    job.meta = {}
    job.save_meta = lambda: None
    job.id = "test-job"
    job.is_finished = False
    job.result = None
    job.get_status = lambda: "queued"
    return job


try:  # prefer real rq for tests (provides Job, Queue, etc.)
    import rq  # noqa: F401
except Exception:
    class _FakeRQJob:
        """Minimal stand-in for rq.job.Job used by job_service."""

        def __init__(self, job_id: str = "test-job"):
            self.id = job_id
            self.meta = {}
            self.result = None
            self.exc_info = None

        @classmethod
        def fetch(cls, job_id: str, connection=None):  # noqa: ARG003
            return cls(job_id)

        def get_status(self):
            return "queued"


    class _FakeQueue:
        """Minimal stand-in for rq.Queue used by redis_client/task enqueue."""

        def __init__(self, connection=None, default_timeout=None, *args, **kwargs):  # noqa: ARG002
            self.connection = connection
            self.default_timeout = default_timeout

        def enqueue(self, func, *args, **kwargs):  # noqa: ARG002
            # Return a job-like object with an id.
            return _FakeRQJob("test-job")


    rq_job_module = _stub_module("rq.job", {"Job": _FakeRQJob})
    _stub_module(
        "rq",
        {
            "get_current_job": lambda: _get_current_job_stub(),
            "Queue": _FakeQueue,
            "job": rq_job_module,
        },
    )

try:  # prefer real redis (for Redis class). If missing, provide minimal stub.
    import redis  # noqa: F401
except Exception:
    class _Redis:  # minimal placeholder
        def __init__(self, *a, **k):
            pass

        def ping(self):
            return True

    _stub_module("redis", {"Redis": _Redis})


# Stub provisioner module for tests
def _provision_network_terraform_stub(*args, **kwargs):
    return {"status": "success", "message": "Provisioned (test stub)"}

def _provision_workstation(*args, **kwargs):
    return {
        "public_ip": "1.2.3.4",
        "port":"50055",
        "private_ip": "10.0.0.1",
        "vpc_id": "vpc-123",
        "name": "test-instance",
        "ssh_key": "test_key",
        "ami_id": "ami-123",
        "cpu": 2,
        "created_at": "2025-01-01",
        "instance_id": "i-123",
        "os": "Ubuntu",
        "ports": ["sg-123"],
        "ram_gb": "4GB",
        "status": "running",
        "storage_size_gb": 50,
        "subnet_id": "subnet-123",
        "updated_at": "2025-01-01",
    }

def _provision_default_workstation(*args, **kwargs):
    return {}

def _destroy_stub(*args, **kwargs):
    return {"status": "success", "message": "Destroyed (test stub)"}

def _provision_workstation_vm(*args, **kwargs):
    return {}

def _init_cloud(*args, **kwargs):
    return

def _get_target_dir_stub(org_id: str, generated_dir: str | None = None) -> str:
    import os
    base = generated_dir or os.path.join("cloudshield", "Cloud", "provisioner", "generated", org_id)
    return os.path.abspath(base)


_stub_module(
    "provisioner",
    {
        "provision_network_terraform": _provision_network_terraform_stub,
        "provision_workstation":_provision_workstation,
            "destroy_infra": _destroy_stub,
            "get_target_dir": _get_target_dir_stub,
            "provision_default_workstation": _provision_default_workstation,
            "provision_custom_workstation": _provision_default_workstation,
            "provision_workstation_vm": _provision_workstation_vm,
            "init_cloud": _init_cloud
    },
)
