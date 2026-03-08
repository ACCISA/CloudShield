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

# ── Configurable connection details ─────────────────────────────────────────
# These can be overridden with environment variables set by the provisioner.
$ServerAddr = if ($env:SERVER_ADDR) { $env:SERVER_ADDR } else { "THREAT_DETECTION_IP" }
$ServerPort = if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "50051" }
$AgentId    = if ($env:AGENT_ID)    { $env:AGENT_ID }    else { $env:COMPUTERNAME }

# ── Task settings ───────────────────────────────────────────────────────────
$TaskName        = "CloudShieldAgent"
$TaskDescription = "CloudShield endpoint monitoring agent — starts on boot and restarts on failure."

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

# 3. Remove any previous scheduled task with the same name
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Removed previous scheduled task '$TaskName'"
}

# 4. Build the scheduled task
#    - Trigger: AtStartup (runs when Windows boots)
#    - Principal: SYSTEM (no user logon required)
#    - Settings: RestartOnFailure every 60s, up to 3 retries;
#                the task never expires and is allowed to run indefinitely.
$action = New-ScheduledTaskAction `
    -Execute "$InstallDir\$AgentExeName" `
    -WorkingDirectory $InstallDir `
    -Argument "-AgentId $AgentId -ServerAddr $ServerAddr -ServerPort $ServerPort"

# We set env vars in the action argument line AND via a wrapper so the
# binary can read them from either source.  The agent reads SERVER_ADDR,
# SERVER_PORT and AGENT_ID from os.getenv().
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c set AGENT_ID=$AgentId && set SERVER_ADDR=$ServerAddr && set SERVER_PORT=$ServerPort && `"$InstallDir\$AgentExeName`"" `
    -WorkingDirectory $InstallDir

$trigger  = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 9999 `
    -RestartInterval (New-TimeSpan -Seconds 60) `
    -ExecutionTimeLimit (New-TimeSpan -Days 0)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Description $TaskDescription `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

Write-Host "  Scheduled task '$TaskName' registered (runs at startup as SYSTEM)."

# 5. Start the task immediately so the agent is running right away
Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Write-Host "[CloudShield] Agent installation complete."
