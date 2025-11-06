# ThreatDetection

**ThreatDetection** is a Python-based server responsible for managing and analyzing telemetry from endpoint **Agents** deployed across the organization.  
It uses **gRPC** to securely receive system metrics, behavioral data, and forensic artifacts from Windows workstations, and dynamically decides what actions to take based on detected anomalies or threats.

---

## Overview

The **ThreatDetection** component is the intelligence layer of the organization’s **security and monitoring architecture**.  
It processes incoming data from agents, performs threat analysis, and can issue commands back to agents for deeper data collection or containment actions.

Key responsibilities include:
- Receiving metrics and telemetry from endpoints  
- Detecting anomalies in process behavior and network activity  
- Managing dynamic agent instructions for deeper inspection  
- Integrating with external malware analysis platforms (e.g., **Assemblyline**)  

---

## Features

- **gRPC-Based Communication:** High-performance bi-directional data exchange between agents and the server.  
- **Process Whitelisting:** Maintains an internal whitelist of trusted Windows processes. Unknown processes trigger deeper inspection.  
- **Adaptive Data Collection:** Dynamically requests additional context from agents (open files, DLLs, registry keys, etc.) when suspicious behavior is detected.  
- **Network & System Monitoring:** Collects network connections, process lists, running services, registry keys, and other Windows artifacts.  
- **Automated Triage Integration:** Forwards suspicious files, IPs, or URLs to **Assemblyline** for malware analysis and scoring.  
- **Scalable Architecture:** Designed to manage and coordinate large numbers of agents simultaneously.  

---

## Simplified Architecture

**ThreatDetection** operates as the central control node in the agent-server ecosystem.

```text
+-------------------+       gRPC        +----------------------+
|   Agent (Client)  |  <--------------> |  ThreatDetection     |
| - Collects data   |                  | - Analyzes metrics    |
| - Executes orders |                  | - Issues instructions |
+-------------------+                  | - Queues suspicious   |
                                       |   samples for triage  |
                                       +----------+-----------+
                                                  |
                                                  v
                                       +----------------------+
                                       |  Assemblyline (Triage)|
                                       |  - Malware scanning    |
                                       |  - Threat scoring      |
                                       +----------+-------------+
                                                  |
                                                  v
                                       +----------------------+
                                       |  Background Service  |
                                       |  - Polls triage API   |
                                       |  - Fetches results    |
                                       |  - Updates threat DB  |
                                       +----------------------+
