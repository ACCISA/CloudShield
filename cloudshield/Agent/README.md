# CloudShield Agent — Features & gRPC API

The Cloud Host Agent is a Python-based service that runs in the background on Windows workstations. Its primary role is to act as a sensor, continuously collecting host-level data and metrics to support security monitoring.

The agent gathers information such as:

Process listings (to identify suspicious or unknown processes)

Network connection data (to detect potential IOCs and malicious activity)

By monitoring these host activities, the agent helps ensure that security issues are detected early and can be acted upon promptly.

## Communication

The agent communicates with its central server using gRPC, which provides a well-defined, efficient, and scalable communication protocol. Through gRPC, both the agent and the server share a clear contract for how data is transmitted and received, ensuring reliable and structured data exchange


Quick refs:
- Agent entry / runtime: `cloudshield/Agent/main.py`, `cloudshield/Agent/core/agent.py`
- Protobufs & gRPC stubs: `cloudshield/Agent/proto/agent.proto`, `cloudshield/Agent/proto/agent_pb2_grpc.py`
- Local test/mock server: `cloudshield/Agent/tools/mock_grpc_server.py`, tests: `cloudshield/Agent/tests/`
- Logging + bootstrapping: `cloudshield/Agent/logger.py`, `cloudshield/Agent/bootstrap/`

Supported features (implemented in this repo)
- Agent lifecycle and registration
  - Registers / re-registers with the central server and maintains identity/metadata.
  - See: `cloudshield/Agent/core/agent.py`, `cloudshield/Agent/main.py`.

- Health & heartbeat
  - Periodic heartbeat reporting of liveness and basic health/uptime information.
  - See: `cloudshield/Agent/core/agent.py` and tests in `cloudshield/Agent/tests/`.

- Task execution framework
  - Agent executes server-issued tasks and a set of local task modules (network, domain, processes, workstation).
  - See task implementations: `cloudshield/Agent/tasks/` (e.g. `network.py`, `domain_dns.py`, `processes.py`, `workstation.py`).
  - Task orchestration and execution lives in `cloudshield/Agent/core/agent.py` and `cloudshield/Agent/tasks/*`.

- Bootstrapping / installation helpers
  - Scripts and bootstrap logic for installing the agent as a service and initial configuration helpers.
  - See: `cloudshield/Agent/scripts/`, `cloudshield/Agent/bootstrap/`, `cloudshield/Agent/main.py`.

- Structured logging and local log capture
  - Centralized logger and log formatting used by the agent. Logs can be forwarded to the server or test tools.
  - See: `cloudshield/Agent/logger.py`, `cloudshield/Agent/logs/`, and test tooling `cloudshield/Agent/tools/received_requests*.jsonl`.

- gRPC client and test utilities
  - gRPC client usage via the generated stubs and a lightweight mock server used by unit tests and development.
  - See: `cloudshield/Agent/proto/`, `cloudshield/Agent/tools/mock_grpc_server.py`, `cloudshield/Agent/tests/test_mock_grpc_server.py`.

- Testability and mocks
  - Unit tests and mocked gRPC interactions are provided to validate behavior without a real central server.
  - See: `cloudshield/Agent/tests/`, `cloudshield/Agent/tools/`.

Notes on security & configuration
- TLS/token-based server auth and agent configuration are surfaced via the agent config files and command-line options. See config expectations and bootstrapping entrypoints in `cloudshield/Agent/` and `cloudshield/Agent/bootstrap/`.
- The agent attempts to minimize privileges and logs actions for auditability via task logs and test fixtures.

gRPC methods the Agent uses (conceptual)
For authoritative RPC names and message types, open `cloudshield/Agent/proto/agent.proto`. The following is a concise overview of the RPC surface the Agent implements/consumes and how the agent uses each RPC:

# AgentService gRPC API

This sections defines the **AgentService** interface used for communication between CloudShield agents (running on workstations or endpoints) and the CloudShield server.  
The service enables remote telemetry collection, workstation initialization, and system state synchronization.

---

## Overview

The **AgentService** exposes RPC methods for agents to send system data to the server, including:

- Process information and open files  
- Network connections  
- Event logs  
- Services and drivers  
- Workstation initialization metadata  

Each message type defines a structured payload that ensures consistency across agent implementations and server-side ingestion.

---

## Service Definition

### `rpc SendWorkstationInit(WorkstationInit) returns (Ack)`
Initializes communication between the agent and the server.  
Called once when the workstation first registers or reconnects.

**Request:**
- `agent_id`: Unique identifier for the agent.  
- `domain`: The domain or organization the workstation belongs to.  

**Response:**
- `Ack`: Indicates success or failure of registration.

---

### `rpc SendProcessList(ProcessList) returns (ProcessListAck)`
Sends a snapshot of all running processes on the workstation.

**Request:**
- `agent_id`: ID of the sending agent.  
- `timestamp`: Unix timestamp when the snapshot was taken.  
- `processes`: List of processes with PID, name, memory, CPU, etc.  
- `is_pending`: Indicates if the report is partial or queued.  

**Response:**
- `ProcessListAck`:  
  - `action`: Whether the agent should perform follow-up actions (e.g., send detailed info).  
  - `pids`: List of PIDs for which the server requests further information.

---

### `rpc SendProcessListInformation(ProcessListAckRes) returns (Ack)`
Provides detailed information for specific processes requested by the server.  
Typically follows a `SendProcessList` call if `action` is `true`.

**Request:**
- `agent_id`, `timestamp`: Identify the data batch.  
- `processes`: Detailed process data including open files, memory maps, and thread counts.  
- `is_pending`: Marks partial or queued transmission.  

**Response:**
- `Ack`: Confirms successful receipt.

---

### `rpc SendNetworkConnections(NetConnList) returns (Ack)`
Transmits the list of active network connections.

**Request:**
- `agent_id`, `timestamp`: Identify sender and capture time.  
- `conns`: Each entry includes local/remote addresses, ports, process ID, and connection state.  
- `is_pending`: Marks partial batches.  

**Response:**
- `Ack`: Acknowledges receipt.

---

### `rpc SendEventLogs(EventLogBatch) returns (Ack)`
Sends a batch of Windows Event Logs (or similar OS-level logs).

**Request:**
- `agent_id`, `timestamp`: Identify sender and log capture time.  
- `logs`: List of events containing timestamp, source, severity level, event ID, and message.  
- `is_pending`: Marks incomplete batches.  

**Response:**
- `Ack`: Confirms logs were successfully processed.

---

### `rpc SendServiceList(ServiceList) returns (Ack)`
Reports the current state of system services.

**Request:**
- `agent_id`, `timestamp`: Identify sender and capture time.  
- `services`: Includes service name, display name, PID, binary path, and start type.  
- `is_pending`: Marks partial data.  

**Response:**
- `Ack`: Acknowledges successful ingestion.

---

### `rpc SendDriverList(DriverList) returns (Ack)`
Transmits information about system drivers.

**Request:**
- `agent_id`, `timestamp`: Identify sender and capture time.  
- `drivers`: Includes driver name, display name, state, start type, and binary path.  
- `is_pending`: Marks partial data.  

**Response:**
- `Ack`: Confirms receipt.

---

## Core Message Types

### **Process**
Represents a running process, including its metadata (PID, name, CPU, memory, user, etc.).

### **ProcessInformation**
Extends `Process` with detailed runtime data:
- Open file descriptors  
- Memory maps  
- Thread count  

### **NetConn**
Describes a network connection (local/remote IP, ports, state, associated PID).

### **EventLog**
Captures a single OS-level event, with timestamp, source, level, ID, and message.

### **Service** and **Driver**
Represent currently active system services and kernel drivers, respectively.

### **Ack**
Generic acknowledgment message returned by the server to confirm successful processing or to return error messages.

---

## Usage Notes

- All messages use **proto3** syntax.  
- Communication is **bi-directional**, but all calls are **agent → server** initiated.  
- Data should be serialized using **gRPC over TLS** for confidentiality and integrity.  
- `agent_id` is a persistent unique identifier per workstation.  
- `timestamp` values use **Unix epoch time** (in seconds).  

---

## Example Flow

1. Agent calls `SendWorkstationInit()` on startup.  
2. Agent periodically sends:
   - `SendProcessList()`  
   - `SendNetworkConnections()`  
   - `SendEventLogs()`  
   - `SendServiceList()`  
   - `SendDriverList()`  
3. Server may respond with `ProcessListAck` containing PIDs of interest.  
4. Agent follows up with `SendProcessListInformation()` for those PIDs.  

---

## File
**Path:** `proto/agent_service.proto`  
**Syntax:** `proto3`  
**Package:** *(add your package name here if needed)*


Where to look for exact RPC names and message fields
- Primary source: `cloudshield/Agent/proto/agent.proto` (edit and regenerate stubs if you change RPCs).
- Generated stubs and usage: `cloudshield/Agent/proto/agent_pb2.py`, `cloudshield/Agent/proto/agent_pb2_grpc.py`.
- Mock and test implementations: `cloudshield/Agent/tools/mock_grpc_server.py`, `cloudshield/Agent/tests/`.

