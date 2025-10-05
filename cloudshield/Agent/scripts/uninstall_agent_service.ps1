<#
Uninstall-AgentService.ps1
Uninstalls the CloudShield agent Windows service and removes files from the install directory.
Usage (run as Administrator):
    .\uninstall_agent_service.ps1 -ServiceName CloudShieldAgent
#>
param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "CloudShieldAgent",

    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "$env:ProgramFiles\CloudShield\Agent",

    [Parameter(Mandatory=$false)]
    [switch]$RemoveFiles
)

function Ensure-Admin {
    $current = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Error "This script must be run as Administrator. Right-click PowerShell and 'Run as administrator'."
        exit 1
    }
}

Ensure-Admin

# Stop service if running
try {
    sc.exe stop "$ServiceName" | Out-Null
} catch {
    Write-Warning "Could not stop service or service not running."
}

# Delete service
try {
    sc.exe delete "$ServiceName" | Out-Null
    Write-Host "Service '$ServiceName' deleted."
} catch {
    Write-Warning "Could not delete service: $_"
}

if ($RemoveFiles) {
    try {
        # Remove install dir
        Remove-Item -Path $InstallDir -Recurse -Force
        Write-Host "Removed install directory: $InstallDir"
    } catch {
        Write-Warning "Could not remove install directory: $_"
    }

    # Remove install log and EventLog source if present
    $InstallLog = Join-Path $env:ProgramData 'CloudShield\Agent\install.log'
    if (Test-Path $InstallLog) {
        try { Remove-Item -Path $InstallLog -Force } catch { Write-Warning "Could not remove install log: $_" }
    }
    $EventSource = 'CloudShieldAgentInstaller'
    try {
        if ([System.Diagnostics.EventLog]::SourceExists($EventSource)) {
            # Removing an event source requires direct registry access; attempt to remove
            $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\EventLog\Application\$EventSource"
            if (Test-Path $regPath) { Remove-Item -Path $regPath -Recurse -Force }
            Write-Host "Removed Event Log source: $EventSource"
        }
    } catch {
        Write-Warning "Could not remove Event Log source: $_"
    }
}
