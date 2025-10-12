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
    [string]$StartMode = 'auto',

    # If present, automatically download a known NSSM release to the script folder
    [Parameter(Mandatory=$false)]
    [switch]$AutoDownloadNssm = $false,

    # When set, the script will not attempt to start the service after creating it
    [Parameter(Mandatory=$false)]
    [switch]$NoStart = $false
)

function Ensure-AdminOrRelaunch {
    $current = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        # Re-launch this script elevated, preserving bound parameters and simple args
        try {
            $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
            foreach ($k in $PSBoundParameters.Keys) {
                $val = $PSBoundParameters[$k]
                if ($val -is [switch]) {
                    if ($val.IsPresent) { $argList += " -$k" }
                } else {
                    # quote values
                    $escaped = $val -replace '"','\"'
                    $argList += " -$k `"$escaped`""
                }
            }
            if ($args.Count -gt 0) {
                # append raw args (best-effort)
                foreach ($a in $args) { $argList += " $a" }
            }
            Start-Process -FilePath PowerShell -ArgumentList $argList -Verb RunAs -WindowStyle Normal
            Write-Host "Relaunching elevated... please accept the UAC prompt."
        } catch {
            Write-Error "Failed to relaunch elevated: $_. Please re-run this script as Administrator."
            exit 1
        }
        exit 0
    }
}

Ensure-AdminOrRelaunch

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
# Use the install log directory (ProgramData) for wrapper stdout/stderr so LocalSystem can write them
$wrapperStdOut = Join-Path $InstallLogDir 'agent_stdout.log'
$wrapperStdErr = Join-Path $InstallLogDir 'agent_stderr.log'
$wrapperContent = @'
# Diagnostic wrapper created by install_agent_service.ps1
param()
# Paths
$logDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$stdout = "{STDOUT}"
$stderr = "{STDERR}"
$diag = "{DIAG}"

Function Log($m) { $ts = (Get-Date).ToString('o'); Add-Content -Path $diag -Value "$ts - $m" }

try {
    Log "Wrapper started. Working dir: $logDir"
    Log "User: $([Environment]::UserName); Machine: $env:COMPUTERNAME"
    Log "PATH: $env:Path"
    Log "Listing install directory:"
    Get-ChildItem -Path $logDir | ForEach-Object { Log "  $_" }

    $agent = "{AGENT}"
    Log "Attempting to start agent: $agent"

    $proc = Start-Process -FilePath $agent -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    Log "Started child process pid=$($proc.Id). HasExited=$($proc.HasExited)"

    # Wait briefly to detect immediate exits
    $waited = $proc.WaitForExit(15000)
    Log "WaitForExit(15000) returned: $waited; HasExited=$($proc.HasExited)"

    if ($proc.HasExited) {
        Log "Child exited quickly with code: $($proc.ExitCode)"
        # capture stderr tail
        try { Get-Content -Path $stderr -Tail 200 -ErrorAction SilentlyContinue | ForEach-Object { Log "stderr: $_" } } catch {}
        exit $proc.ExitCode
    } else {
        Log "Child still running; wrapper will wait for full exit."
        $proc.WaitForExit()
        Log "Child exited later with code: $($proc.ExitCode)"
    }
} catch {
    Log "Wrapper exception: $_"
    try { Add-Content -Path $stderr -Value "Wrapper exception: $_`n" -Encoding UTF8 } catch {}
    exit 1
}
'@

# substitute the agent and log paths (we use single-quoted here-string, do replacements)
$wrapperContent = $wrapperContent -replace '\{AGENT\}', $targetExePath
$wrapperContent = $wrapperContent -replace '\{STDOUT\}', $wrapperStdOut
$wrapperContent = $wrapperContent -replace '\{STDERR\}', $wrapperStdErr
# diag path should be in ProgramData so LocalSystem can write to it
$wrapperContent = $wrapperContent -replace '\{DIAG\}', (Join-Path $InstallLogDir 'wrapper_diag.log')
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
# Create the service. Prefer using NSSM (Non-Sucking Service Manager) if present
$nssmCandidates = @(
    (Join-Path $PSScriptRoot 'nssm.exe'),
    (Join-Path $InstallDir 'nssm.exe')
)
$nssmPath = $nssmCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# Optionally auto-download NSSM into the script folder when requested
if ($AutoDownloadNssm -and -not $nssmPath) {
    try {
        Log-Install "AutoDownloadNssm requested. Downloading NSSM..."
        $tmpZip = Join-Path $env:TEMP 'nssm.zip'
        $nssmUrl = 'https://nssm.cc/release/nssm-2.24.zip'
        Invoke-WebRequest -Uri $nssmUrl -OutFile $tmpZip -UseBasicParsing -ErrorAction Stop
        # extract appropriate win64 binary if available
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($tmpZip, $env:TEMP)
        # search for nssm.exe under extracted folder
        $extracted = Get-ChildItem -Path $env:TEMP -Recurse -Filter 'nssm.exe' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\win64\\' } | Select-Object -First 1
        if (-not $extracted) {
            $extracted = Get-ChildItem -Path $env:TEMP -Recurse -Filter 'nssm.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
        }
        if ($extracted) {
            Copy-Item -Path $extracted.FullName -Destination (Join-Path $PSScriptRoot 'nssm.exe') -Force
            Log-Install "Downloaded and placed nssm.exe at: $PSScriptRoot\nssm.exe"
            $nssmPath = Join-Path $PSScriptRoot 'nssm.exe'
        } else {
            Log-Install "Could not locate nssm.exe inside the downloaded archive."
        }
    } catch {
        Log-Install "Auto-download of NSSM failed: $_"
    } finally {
        if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue }
    }
}

function Install-Service-With-Nssm {
    param($nssm, $svcName, $exePath, $wrapper)
    try {
        Log-Install "Installing service via NSSM at: $nssm"
        # Create a small launcher .cmd in the install dir that calls PowerShell with the wrapper path (avoids quoting issues)
        $launcherPath = Join-Path $InstallDir 'run_agent_launcher.cmd'
        $launcherContent = "@echo off`r`n`"$psExe`" -NoProfile -ExecutionPolicy Bypass -NoLogo -File `"$wrapper`" %*`r`n"
        try {
            $launcherContent | Out-File -FilePath $launcherPath -Encoding ASCII -Force
            Log-Install "Created launcher: $launcherPath"
        } catch {
            Log-Install "Failed to create launcher: $_"
            return $false
        }

        # Install NSSM pointing at the launcher (so Windows will execute the .cmd via cmd.exe and preserve quoting)
        $installArgs = @('install', $svcName, $launcherPath)
        Log-Install "Running: $nssm $($installArgs -join ' ')"
        $out = & $nssm @installArgs 2>&1
        if ($out) { $out | ForEach-Object { Log-Install $_ } }

        # Ensure working directory and stdout/stderr are set
        & $nssm 'set' $svcName 'AppDirectory' $InstallDir 2>&1 | ForEach-Object { Log-Install $_ }
        & $nssm 'set' $svcName 'AppStdout' $wrapperStdOut 2>&1 | ForEach-Object { Log-Install $_ }
        & $nssm 'set' $svcName 'AppStderr' $wrapperStdErr 2>&1 | ForEach-Object { Log-Install $_ }

        return $true
    } catch {
        Log-Install "NSSM install failed: $_"
        return $false
    }
}

function Install-Service-With-NewService {
    try {
        Log-Install "Creating service '$ServiceName' via New-Service..."
        switch ($StartMode) {
            'auto' { $startup = 'Automatic' }
            'demand' { $startup = 'Manual' }
            'disabled' { $startup = 'Disabled' }
            default { $startup = 'Automatic' }
        }
        Log-Install "New-Service -Name $ServiceName -BinaryPathName '$binPathRaw' -DisplayName '$DisplayName' -StartupType $startup"
        New-Service -Name $ServiceName -BinaryPathName $binPathRaw -DisplayName $DisplayName -StartupType $startup -ErrorAction Stop
        Log-Install "Created service $ServiceName"
        return $true
    } catch {
        Log-Install "Service create failed: $_"
        return $false
    }
}

$created = $false
$usedNssm = $false
if ($nssmPath) {
    $created = Install-Service-With-Nssm -nssm $nssmPath -svcName $ServiceName -exePath $psExe -wrapper $wrapperPath
    if ($created) { $usedNssm = $true }
}
if (-not $created) {
    # Fall back to New-Service if NSSM not available or failed
    $created = Install-Service-With-NewService
}
if (-not $created) {
    Log-Install "Failed to create service using both NSSM and New-Service. Please ensure you have Administrator rights and, if possible, place 'nssm.exe' next to this script and re-run."
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
    # Multi-stage restart: 1st failure -> restart after 5s, 2nd -> 10s, 3rd -> 60s. Reset failure count after 24h.
    $scActions = "restart/5000/restart/10000/restart/60000"
    Log-Install "Running: sc.exe failure $ServiceName reset= 86400 actions= $scActions"
    $failureOutput = & sc.exe failure $ServiceName "reset= 86400" "actions= $scActions" 2>&1
    if ($failureOutput) { $failureOutput | ForEach-Object { Log-Install $_ } }
} catch {
    Write-Warning "Could not configure failure actions: $_"
}

# If NSSM was used to install the service, also configure NSSM's restart delay (defensive)
if ($usedNssm -and (Test-Path $nssmPath)) {
    try {
        Log-Install "Configuring NSSM restart behavior (AppRestartDelay)..."
        & $nssmPath 'set' $ServiceName 'AppRestartDelay' 5000 2>&1 | ForEach-Object { Log-Install $_ }
        # You can tune additional NSSM settings here (AppThrottle, AppStopMethod, etc.) if desired.
    } catch {
        Log-Install "Failed to configure NSSM restart options: $_"
    }
}

# Start the service using Start-Service (unless NoStart requested)
if (-not $NoStart) {
    try {
        Log-Install "Starting service $ServiceName via Start-Service"
        Start-Service -Name $ServiceName -ErrorAction Stop
        Log-Install "Service '$ServiceName' start command issued."
    } catch {
        Log-Install "Could not start service: $_"
    }
} else {
    Log-Install "NoStart requested; skipping starting the service."
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
