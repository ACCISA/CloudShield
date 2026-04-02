<#
.SYNOPSIS
    Install the CloudShield Agent and register a scheduled task so it runs
    automatically on every boot.

.DESCRIPTION
    This script is executed during Windows OOBE via install.bat (C:\OEM\).
    It does the following:
      1. Copy the agent binary to a permanent location under Program Files.
      2. Create a ProgramData directory for logs and cache.
      3. Register a scheduled task that starts the agent at system startup
         under the SYSTEM account, with automatic restart on failure.

    Environment variables SERVER_ADDR and SERVER_PORT can be baked into the
    image or set before this script runs. They default to the ThreatDetection
    server address on the Docker network.
#>

$ErrorActionPreference = "Stop"

# ── Paths ───────────────────────────────────────────────────────────────────
$AgentExeName   = "cloudshield_agent.exe"
$OemAgentPath   = Join-Path $PSScriptRoot $AgentExeName
$InstallDir     = "$env:ProgramFiles\CloudShield\Agent"
$DataDir        = "$env:ProgramData\CloudShield\Agent"
$LogDir         = "$DataDir\logs"
$CacheDir       = "$DataDir\cache"
$RegisterTaskScript = Join-Path $PSScriptRoot "helpers\register_cloudshield_agent_task.ps1"

# ── Configurable connection details ─────────────────────────────────────────
# These can be overridden with environment variables set by the provisioner.
$ProvisionedAgentId = "ws-69cdd2e5bc2e94dc03f7383e-b60c1c1e"
$ServerAddr = $(if ($env:SERVER_ADDR) { $env:SERVER_ADDR } else { "172.23.17.5" })
$ServerPort = $(if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "50051" })
$AgentId    = $(if ($env:AGENT_ID) {
    $env:AGENT_ID
} elseif ($ProvisionedAgentId -match '^__.+__$') {
    $env:COMPUTERNAME
} else {
    $ProvisionedAgentId
})

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "[CloudShield] Installing agent..."

# 1. Create directories
foreach ($dir in @($InstallDir, $LogDir, $CacheDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created $dir"
    }
}

# 2. Copy the binary
if (-not (Test-Path $OemAgentPath)) {
    Write-Host "[CloudShield] ERROR: $OemAgentPath not found. Skipping agent install."
    exit 1
}
Copy-Item -Path $OemAgentPath -Destination "$InstallDir\$AgentExeName" -Force
Write-Host "  Agent binary copied to $InstallDir\$AgentExeName"

# 3. Register startup scheduled task using dedicated script.
if (-not (Test-Path $RegisterTaskScript)) {
    Write-Host "[CloudShield] ERROR: task registration script missing: $RegisterTaskScript"
    exit 1
}

& $RegisterTaskScript `
    -AgentExePath "$InstallDir\$AgentExeName" `
    -ServerAddr $ServerAddr `
    -ServerPort $ServerPort `
    -AgentId $AgentId

Write-Host "[CloudShield] Agent installation complete."

# Start the agent immediately — the scheduled task's startup trigger fires before
# this script runs during OOBE, so the first launch must be done explicitly here.
$LauncherCmdPath = "$InstallDir\launch_cloudshield_agent.cmd"
Write-Host "[CloudShield] Starting agent now..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$LauncherCmdPath`"" -WorkingDirectory $InstallDir -WindowStyle Hidden
