param(
    [Parameter(Mandatory = $true)]
    [string]$AgentPath,

    [string]$PythonPath = "",
    [string]$ServiceName = "CloudShieldAgent",
    [string]$DisplayName = "CloudShield Agent",
    [string]$InstallDir = "$env:ProgramFiles\CloudShield\Agent",
    [ValidateSet('automatic','manual','disabled')]
    [string]$StartMode = 'automatic'
)

function Require-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Administrator privileges required."
    }
}

function Ensure-Folder([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
    return $Path
}

Require-Admin

if ([string]::IsNullOrWhiteSpace($AgentPath)) {
    throw "-AgentPath is required."
}

$agentResolved = (Resolve-Path -Path $AgentPath).ProviderPath
$installDirectory = (Resolve-Path -Path (Ensure-Folder $InstallDir)).ProviderPath
$targetPath = Join-Path $installDirectory (Split-Path $agentResolved -Leaf)
Copy-Item -Path $agentResolved -Destination $targetPath -Force

$logRoot = Join-Path $env:ProgramData 'CloudShield\Agent'
Ensure-Folder $logRoot
$installLog = Join-Path $logRoot 'install.log'

function Write-InstallLog([string]$Message) {
    "$(Get-Date -Format o) $Message" | Out-File -FilePath $installLog -Encoding UTF8 -Append
}

$ext = [IO.Path]::GetExtension($targetPath).ToLowerInvariant()
$pythonResolved = $null
if ($ext -eq '.py') {
    if ([string]::IsNullOrWhiteSpace($PythonPath)) {
        throw "PythonPath must be provided when installing a .py agent."
    }
    $pythonResolved = (Resolve-Path -Path $PythonPath).ProviderPath
}

$wrapperPath = Join-Path $installDirectory 'run_agent_wrapper.ps1'
$stdoutLog = Join-Path $logRoot 'agent_stdout.log'
$stderrLog = Join-Path $logRoot 'agent_stderr.log'
$wrapperDiag = Join-Path $logRoot 'wrapper.log'

$regex = [System.Text.RegularExpressions.Regex]

if ($ext -eq '.py') {
    $wrapperContent = @'
param()
$exe = "{EXECUTABLE}"
$script = "{SCRIPT}"
$stdout = "{STDOUT}"
$stderr = "{STDERR}"
$diag = "{DIAG}"

function Log($msg) { "$(Get-Date -Format o) $msg" | Out-File -FilePath $diag -Encoding UTF8 -Append }

while ($true) {
    try {
    $proc = Start-Process -FilePath $exe -ArgumentList @($script) -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        Log "Started PID $($proc.Id)."
        $proc.WaitForExit()
        Log "Exited with code $($proc.ExitCode)."
    } catch {
        Log "Wrapper error: $_"
    }
    Start-Sleep -Seconds 5
}
'@
    $wrapperContent = $wrapperContent -replace '\{EXECUTABLE\}', $regex::Escape($pythonResolved)
    $escapedScript = $targetPath -replace '"', '""'
    $wrapperContent = $wrapperContent -replace '\{SCRIPT\}', $escapedScript
} else {
    $wrapperContent = @'
param()
$exe = "{EXECUTABLE}"
$stdout = "{STDOUT}"
$stderr = "{STDERR}"
$diag = "{DIAG}"

function Log($msg) { "$(Get-Date -Format o) $msg" | Out-File -FilePath $diag -Encoding UTF8 -Append }

while ($true) {
    try {
        $proc = Start-Process -FilePath $exe -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        Log "Started PID $($proc.Id)."
        $proc.WaitForExit()
        Log "Exited with code $($proc.ExitCode)."
    } catch {
        Log "Wrapper error: $_"
    }
    Start-Sleep -Seconds 5
}
'@
    $wrapperContent = $wrapperContent -replace '\{EXECUTABLE\}', $regex::Escape($targetPath)
}

$wrapperContent = $wrapperContent -replace '\{STDOUT\}', $regex::Escape($stdoutLog)
$wrapperContent = $wrapperContent -replace '\{STDERR\}', $regex::Escape($stderrLog)
$wrapperContent = $wrapperContent -replace '\{DIAG\}', $regex::Escape($wrapperDiag)

Set-Content -Path $wrapperPath -Value $wrapperContent -Encoding UTF8

$psExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$serviceCmd = '"' + $psExe + '" -NoProfile -ExecutionPolicy Bypass -File "' + $wrapperPath + '"'

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-InstallLog "Service exists. Removing old instance."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
}

switch ($StartMode.ToLowerInvariant()) {
    'automatic' { $startup = 'Automatic' }
    'manual'    { $startup = 'Manual' }
    'disabled'  { $startup = 'Disabled' }
}

New-Service -Name $ServiceName -BinaryPathName $serviceCmd -DisplayName $DisplayName -StartupType $startup -ErrorAction Stop
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName" -Name Description -Value "CloudShield agent service" -ErrorAction SilentlyContinue

sc.exe failure $ServiceName "reset= 86400" "actions= restart/5000" | Out-Null

Start-Service -Name $ServiceName
Write-InstallLog "Service '$ServiceName' installed and started."
