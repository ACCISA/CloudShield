## Windows installation automation

We can create as many powershell scripts to automate installation. As long as they end with .ps1 they will get executed when the windows image is installed. We can use this mechanism to customize
our windows installations. For example, setup_workstation.ps1 will set the DNS server and will join the samba domain. Other usages could be a script to set the background image or automatically install an application.

Make sure to test your scripts locally or on in a vm.

### CloudShield Agent

The `install_cloudshield_agent.ps1` script installs the agent binary and creates
a scheduled task that starts it on every boot under the SYSTEM account.

**Before building the workstation Docker image**, build the agent .exe:

```powershell
cd cloudshield\Agent
.\build_agent.ps1
```

This compiles `cloudshield_agent.exe` via PyInstaller and copies it into this
folder. The workstation Dockerfile then bakes it into the Windows ISO.

The scheduled task passes `SERVER_ADDR`, `SERVER_PORT`, and `AGENT_ID` to the
agent via environment variables. The provisioner should replace the placeholder
`THREAT_DETECTION_IP` in `install_cloudshield_agent.ps1` with the real IP of
the ThreatDetection server (same as it does for `SAMBA_IP` in
`setup_workstation.ps1`).

Logs are written to `%PROGRAMDATA%\CloudShield\Agent\logs\` and can be read at
any time without stopping the agent.
