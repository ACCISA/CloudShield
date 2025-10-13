<#!
Bootstrap.ps1
Placeholder script invoked by the CloudShield agent when the workstation is not
joined to the expected domain. For the capstone project, this script simply logs
basic information to confirm that the domain bootstrap hook was triggered.

You can expand this script later with real domain join commands (for example
`samba-tool`, `Add-Computer`, or `netdom`).

Usage:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\bootstrap.ps1 -ExpectedDomain corp.example.local
    (Parameters are optional.)
#>

param(
    [string]$ExpectedDomain = "",
    [switch]$VerboseLogging
)

$logRoot = Join-Path $env:ProgramData 'CloudShield\\Agent'
if (-not (Test-Path $logRoot)) {
    New-Item -Path $logRoot -ItemType Directory -Force | Out-Null
}
$logPath = Join-Path $logRoot 'bootstrap.log'
$timestamp = (Get-Date).ToString('o')

function Write-BootstrapLog {
    param([string]$Message)
    $entry = "{0} - {1}" -f $timestamp, $Message
    Add-Content -Path $logPath -Value $entry -Encoding UTF8
    if ($VerboseLogging) {
        Write-Host $Message
    }
}

Write-BootstrapLog "Bootstrap script executed."
if ($ExpectedDomain) {
    Write-BootstrapLog "Expected domain parameter: $ExpectedDomain"
}

try {
    $hostname = $env:COMPUTERNAME
    Write-BootstrapLog "Hostname: $hostname"

    $domainInfo = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object PartOfDomain, Domain
    if ($domainInfo.PartOfDomain) {
        Write-BootstrapLog "Currently joined to domain: $($domainInfo.Domain)"
    } else {
        Write-BootstrapLog "Machine is not joined to any domain."
    }
} catch {
    Write-BootstrapLog "Failed to query domain status: $_"
}

try {
    $evtSource = 'CloudShieldBootstrap'
    if (-not [System.Diagnostics.EventLog]::SourceExists($evtSource)) {
        [System.Diagnostics.EventLog]::CreateEventSource($evtSource, 'Application')
    }
    $evtMessage = "CloudShield bootstrap placeholder invoked on $env:COMPUTERNAME"
    [System.Diagnostics.EventLog]::WriteEntry($evtSource, $evtMessage, [System.Diagnostics.EventLogEntryType]::Information)
    Write-BootstrapLog "Event log entry written."
} catch {
    Write-BootstrapLog "Failed to write event log entry: $_"
}

Write-BootstrapLog "Bootstrap script finished."
