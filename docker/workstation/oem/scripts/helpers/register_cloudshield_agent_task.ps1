<#
.SYNOPSIS
    Register or update the CloudShield Agent scheduled task.

.DESCRIPTION
    Creates a startup scheduled task that launches the packaged agent binary
    under the SYSTEM account and restarts it automatically if it exits.

    This script is safe to run multiple times. If the task exists, it is
    replaced with updated settings and launch parameters.
#>

param(
    [string]$AgentExePath = "$env:ProgramFiles\CloudShield\Agent\cloudshield_agent.exe",
    [string]$ServerAddr = $(if ($env:SERVER_ADDR) { $env:SERVER_ADDR } else { "172.23.17.5" }),
    [string]$ServerPort = $(if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "50051" }),
    [string]$AgentId = $(if ($env:AGENT_ID) { $env:AGENT_ID } else { "ws-69cdd2e5bc2e94dc03f7383e-b60c1c1e" })
)

$ErrorActionPreference = "Stop"

$TaskName = "CloudShieldAgent"
$TaskDescription = "CloudShield endpoint monitoring agent - starts on boot and restarts on failure."

if ($AgentId -match '^__.+__$') {
    $AgentId = $env:COMPUTERNAME
}

if (-not (Test-Path $AgentExePath)) {
    Write-Host "[CloudShield] Agent binary not found at $AgentExePath. Skipping task registration."
    exit 0
}

$DataDir = "$env:ProgramData\CloudShield\Agent"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

$LauncherCmdPath = Join-Path $DataDir "launch_cloudshield_agent.cmd"
$launcherContent = @(
    '@echo off',
    'setlocal',
    ('set "AGENT_ID={0}"' -f $AgentId),
    ('set "SERVER_ADDR={0}"' -f $ServerAddr),
    ('set "SERVER_PORT={0}"' -f $ServerPort),
    ('"{0}"' -f $AgentExePath)
) -join "`r`n"

Set-Content -Path $LauncherCmdPath -Value $launcherContent -Encoding ASCII -Force
Write-Host "[CloudShield] Wrote task launcher: $LauncherCmdPath"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[CloudShield] Removed previous scheduled task '$TaskName'"
}

$action = New-ScheduledTaskAction `
    -Execute "$env:SystemRoot\System32\cmd.exe" `
    -Argument "/c `"$LauncherCmdPath`"" `
    -WorkingDirectory (Split-Path -Path $AgentExePath -Parent)

$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'  # 30s delay to allow network to come up before agent connects
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

# Also register a Registry Run key so the agent starts unconditionally on every
# boot, even when the workstation is cloned from a template image where the
# scheduled task state may be saved as already "Running".
$RunKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
Set-ItemProperty -Path $RunKey -Name "CloudShieldAgent" `
    -Value "cmd.exe /c `"$LauncherCmdPath`"" -Force
Write-Host "[CloudShield] Registry Run key set for CloudShieldAgent."

Write-Host "[CloudShield] Scheduled task '$TaskName' is registered."