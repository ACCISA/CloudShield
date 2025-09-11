# Cloud Host Agent

The Cloud Host Agent is a Python-based service that runs in the background on Windows workstations. Its primary role is to act as a sensor, continuously collecting host-level data and metrics to support security monitoring.

The agent gathers information such as:

Process listings (to identify suspicious or unknown processes)

Network connection data (to detect potential IOCs and malicious activity)

By monitoring these host activities, the agent helps ensure that security issues are detected early and can be acted upon promptly.

## Communication

The agent communicates with its central server using gRPC, which provides a well-defined, efficient, and scalable communication protocol. Through gRPC, both the agent and the server share a clear contract for how data is transmitted and received, ensuring reliable and structured data exchange
