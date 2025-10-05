<#
Install-AgentService.ps1
Installs the CloudShield agent as a Windows service using sc.exe.
Usage (run as Administrator):
    .\install_agent_service.ps1 -AgentPath "C:\path\to\agent.exe"
    OR
    .\install_agent_service.ps1 -AgentPath "C:\path\to\main.py" -PythonPath "C:\Python313\pythonw.exe"

This script will:
 - copy the provided agent executable/script into %ProgramFiles%\CloudShield\Agent
 - create a Windows service that points to the executable (or pythonw+script)
 - configure a simple restart policy
 - start the service

Notes:
 - You must run this script with Administrator privileges (it will abort otherwise).
 - If you provide a .py file path, also provide -PythonPath referring to pythonw.exe.
 - When you build a standalone agent .exe, use the path to that .exe as -AgentPath.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$AgentPath = "",

    [Parameter(Mandatory=$false)]
    [string]$PythonPath = "",

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "CloudShieldAgent",

    [Parameter(Mandatory=$false)]
    [string]$DisplayName = "CloudShield Agent",

    [Parameter(Mandatory=$false)]
    [string]$Description = "CloudShield endpoint agent service",

    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "$env:ProgramFiles\CloudShield\Agent",

    [Parameter(Mandatory=$false)]
    [ValidateSet('auto','demand','disabled')]
    [string]$StartMode = 'auto'
)

function Ensure-Admin {
    $current = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Error "This script must be run as Administrator. Right-click PowerShell and 'Run as administrator'."
        exit 1
    }
}

Ensure-Admin

if ([string]::IsNullOrWhiteSpace($AgentPath)) {
    Write-Error "AgentPath is required. Pass the path to the agent .exe or .py file via -AgentPath"
    exit 1
}

# Normalize paths
$AgentPath = (Resolve-Path -Path $AgentPath).ProviderPath
if ($PythonPath -ne "") {
    $PythonPath = (Resolve-Path -Path $PythonPath).ProviderPath
}

# --- Install logging and Event Log source --------------------------------------------------
$InstallLogDir = Join-Path $env:ProgramData 'CloudShield\Agent'
if (-not (Test-Path $InstallLogDir)) {
    New-Item -Path $InstallLogDir -ItemType Directory -Force | Out-Null
}
$InstallLog = Join-Path $InstallLogDir 'install.log'
function Log-Install {
    param([string]$msg)
    $ts = (Get-Date).ToString('o')
    $entry = "$ts - $msg"
    Add-Content -Path $InstallLog -Value $entry -Encoding UTF8
    Write-Host $msg
}

# Event log source for installer messages
$EventSource = 'CloudShieldAgentInstaller'
function Ensure-EventSource {
    param([string]$src)
    try {
        if (-not [System.Diagnostics.EventLog]::SourceExists($src)) {
            [System.Diagnostics.EventLog]::CreateEventSource($src, 'Application')
            Log-Install "Created EventLog source: $src"
        }
    } catch {
        Log-Install "EventLog registration failed: $_"
    }
}

Ensure-EventSource -src $EventSource

# Helper to check if a Windows service exists
function Service-Exists {
    param([string]$name)
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    return $null -ne $svc
}

# If service exists, stop and delete it to allow a clean recreate (idempotent)
$isUpgrade = $false
if (Service-Exists -name $ServiceName) {
    Log-Install "Service $ServiceName already exists. Preparing to replace it."
    $isUpgrade = $true
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        sc.exe delete $ServiceName | Out-Null
        Log-Install "Stopped and deleted existing service $ServiceName"
    } catch {
        Log-Install "Failed to stop/delete existing service: $_"
    }
}

# Create installation directory
if (-not (Test-Path -Path $InstallDir)) {
    New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
}

# Copy agent file to InstallDir
$targetExeName = [IO.Path]::GetFileName($AgentPath)
$targetExePath = Join-Path $InstallDir $targetExeName
try {
    Copy-Item -Path $AgentPath -Destination $targetExePath -Force
    Log-Install "Copied agent to: $targetExePath"
} catch {
    Log-Install "Failed to copy agent: $_"
    exit 2
}

# Create a PowerShell wrapper that will launch the agent and wait. Using a wrapper
# makes the service process persistent (PowerShell) so the Service Control Manager
# sees a running process and avoids the 30s start timeout for non-service exes.
$wrapperPath = Join-Path $InstallDir 'run_agent_wrapper.ps1'
$wrapperStdOut = Join-Path $InstallDir 'agent_stdout.log'
$wrapperStdErr = Join-Path $InstallDir 'agent_stderr.log'
$wrapperContent = @"
# Auto-generated wrapper created by install_agent_service.ps1
Set-Location -Path "${InstallDir}"
$ErrorActionPreference = 'Continue'
try {
    Write-Output "Wrapper starting agent: $targetExePath"
    Start-Process -FilePath "$targetExePath" -ArgumentList @() -NoNewWindow -RedirectStandardOutput "$wrapperStdOut" -RedirectStandardError "$wrapperStdErr" -Wait
} catch {
    Write-Error "Agent wrapper failed: $_"
    exit 1
}
"@
try {
    $wrapperContent | Out-File -FilePath $wrapperPath -Encoding UTF8 -Force
    Log-Install "Created wrapper script: $wrapperPath"
} catch {
    Log-Install "Failed to create wrapper script: $_"
}

# Determine binPath for service (handle .exe vs .py)
$ext = [IO.Path]::GetExtension($targetExePath).ToLower()
if ($ext -eq '.exe') {
    # Quote the path safely for command usage
    $binPath = '"' + $targetExePath + '"'
    # BinaryPathName should point to the wrapper (powershell launching the wrapper)
    $psExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $binPathRaw = ('"{0}" -NoProfile -ExecutionPolicy Bypass -File "{1}"' -f $psExe, $wrapperPath)
} elseif ($ext -eq '.py') {
    if ([string]::IsNullOrWhiteSpace($PythonPath)) {
        Write-Error "PythonPath is required when installing a .py agent. Provide the path to pythonw.exe via -PythonPath"
        exit 1
    }
    # Build a quoted command: "<pythonw>" "<script>"
    $binPath = ('"{0}" "{1}"' -f $PythonPath, $targetExePath)
    # Use a wrapper for .py as well so SCM tracks the wrapper PowerShell process
    $psExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $binPathRaw = ('"{0}" -NoProfile -ExecutionPolicy Bypass -File "{1}"' -f $psExe, $wrapperPath)
} else {
    Write-Error "Unsupported agent file extension '$ext'. Use a compiled .exe or a .py file."
    exit 1
}
# Create the service using New-Service (more robust quoting for BinaryPathName)
Log-Install "Creating service '$ServiceName' via New-Service..."
try {
    switch ($StartMode) {
        'auto' { $startup = 'Automatic' }
        'demand' { $startup = 'Manual' }
        'disabled' { $startup = 'Disabled' }
        default { $startup = 'Automatic' }
    }
    Log-Install "New-Service -Name $ServiceName -BinaryPathName '$binPathRaw' -DisplayName '$DisplayName' -StartupType $startup"
    New-Service -Name $ServiceName -BinaryPathName $binPathRaw -DisplayName $DisplayName -StartupType $startup -ErrorAction Stop
    Log-Install "Created service $ServiceName"
} catch {
    Log-Install "Service create failed: $_"
    exit 2
}

# Set a simple description via registry (avoids sc.exe description quoting issues)
try {
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName"
    Log-Install "Setting Description in registry: $regPath"
    Set-ItemProperty -Path $regPath -Name 'Description' -Value $Description -ErrorAction Stop
    Log-Install "Service description set."
} catch {
    Write-Warning "Could not set service description: $_"
}

# Configure service to restart on failure using sc.exe (service must exist)
try {
    Log-Install "Running: sc.exe failure $ServiceName reset= 86400 actions= restart/5000"
    $failureOutput = & sc.exe failure $ServiceName 'reset= 86400' 'actions= restart/5000' 2>&1
    if ($failureOutput) { $failureOutput | ForEach-Object { Log-Install $_ } }
} catch {
    Write-Warning "Could not configure failure actions: $_"
}

# Start the service using Start-Service
try {
    Log-Install "Starting service $ServiceName via Start-Service"
    Start-Service -Name $ServiceName -ErrorAction Stop
    Log-Install "Service '$ServiceName' start command issued."
} catch {
    Log-Install "Could not start service: $_"
}

# Verify service state with retries
$start = Get-Date
$deadline = $start.AddSeconds(30)
$svcRunning = $false
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    $s = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($s -and $s.Status -eq 'Running') {
        $svcRunning = $true
        break
    }
}
if ($svcRunning) {
    Log-Install "Service $ServiceName is running. Install successful."
    Write-Host "Installation finished and service is running."
    exit 0
} else {
    Log-Install "Service $ServiceName failed to reach Running state. Check Event Viewer and $InstallLog"
    Write-Host "Installation finished but service did not start. See $InstallLog"
    exit 3
}
