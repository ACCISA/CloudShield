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

function ConvertTo-CSharpLiteral([string]$Value) {
    if ($null -eq $Value) {
        return 'null'
    }
    $escaped = $Value -replace '"', '""'
    return '@"' + $escaped + '"'
}

Require-Admin

if ([string]::IsNullOrWhiteSpace($AgentPath)) {
    throw "-AgentPath is required."
}

$logRoot = Join-Path $env:ProgramData 'CloudShield\Agent'
Ensure-Folder $logRoot
$installLog = Join-Path $logRoot 'install.log'

function Write-InstallLog([string]$Message) {
    "$(Get-Date -Format o) $Message" | Out-File -FilePath $installLog -Encoding UTF8 -Append
}

$agentResolved = (Resolve-Path -Path $AgentPath).ProviderPath
$installDirectory = (Resolve-Path -Path (Ensure-Folder $InstallDir)).ProviderPath
$targetPath = Join-Path $installDirectory (Split-Path $agentResolved -Leaf)

$serviceHostPath = Join-Path $installDirectory 'CloudShieldAgentServiceHost.exe'

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-InstallLog "Service exists. Removing old instance."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

foreach ($procName in @([IO.Path]::GetFileNameWithoutExtension($targetPath), [IO.Path]::GetFileNameWithoutExtension($serviceHostPath))) {
    if ([string]::IsNullOrWhiteSpace($procName)) { continue }
    try {
        Get-Process -Name $procName -ErrorAction SilentlyContinue | ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch { }
        }
    } catch {
    }
}

for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
        Copy-Item -Path $agentResolved -Destination $targetPath -Force
        break
    }
    catch {
        if ($attempt -eq 4) {
            throw
        }
        Start-Sleep -Seconds 2
    }
}

# Copy supporting config directory if present next to the agent executable
$sourceConfigDir = Join-Path (Split-Path -Path $agentResolved -Parent) 'config'
if (Test-Path -LiteralPath $sourceConfigDir) {
    $destConfigDir = Join-Path $installDirectory 'config'
    if (Test-Path -LiteralPath $destConfigDir) {
        Remove-Item -LiteralPath $destConfigDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Copy-Item -Path $sourceConfigDir -Destination $destConfigDir -Recurse -Force -ErrorAction Stop
}

function ConvertTo-DoubleQuoteLiteral([string]$Value) {
    return ($Value -replace '`', '``') -replace '"', '`"'
}

$ext = [IO.Path]::GetExtension($targetPath).ToLowerInvariant()
$pythonResolved = $null
if ($ext -eq '.py') {
    if ([string]::IsNullOrWhiteSpace($PythonPath)) {
        throw "PythonPath must be provided when installing a .py agent."
    }
    $pythonResolved = (Resolve-Path -Path $PythonPath).ProviderPath
}

$workDir = Split-Path -Path $targetPath -Parent

$wrapperPath = Join-Path $installDirectory 'run_agent_wrapper.ps1'
Ensure-Folder (Split-Path -Path $wrapperPath -Parent)
$stdoutLog = Join-Path $logRoot 'agent_stdout.log'
$stderrLog = Join-Path $logRoot 'agent_stderr.log'
$wrapperDiag = Join-Path $logRoot 'wrapper.log'

if ($ext -eq '.py') {
    $wrapperContent = @'
param()
$exe = "{EXECUTABLE}"
$script = "{SCRIPT}"
$stdout = "{STDOUT}"
$stderr = "{STDERR}"
$diag = "{DIAG}"
$workDir = "{WORKDIR}"
[System.Environment]::CurrentDirectory = $workDir
Set-Location -Path $workDir

function Log($msg) { "$(Get-Date -Format o) $msg" | Out-File -FilePath $diag -Encoding UTF8 -Append }

while ($true) {
    try {
        $proc = Start-Process -FilePath $exe -ArgumentList @($script) -WorkingDirectory $workDir -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        Log "Started PID $($proc.Id)."
        $proc.WaitForExit()
        Log "Exited with code $($proc.ExitCode)."
    } catch {
        Log "Wrapper error: $_"
    }
    Start-Sleep -Seconds 5
}
'@
    $execBinary = $pythonResolved
    $scriptPathForWrapper = $targetPath
} else {
    $wrapperContent = @'
param()
$exe = "{EXECUTABLE}"
$stdout = "{STDOUT}"
$stderr = "{STDERR}"
$diag = "{DIAG}"
$workDir = "{WORKDIR}"
[System.Environment]::CurrentDirectory = $workDir
Set-Location -Path $workDir

function Log($msg) { "$(Get-Date -Format o) $msg" | Out-File -FilePath $diag -Encoding UTF8 -Append }

while ($true) {
    try {
        $proc = Start-Process -FilePath $exe -WorkingDirectory $workDir -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        Log "Started PID $($proc.Id)."
        $proc.WaitForExit()
        Log "Exited with code $($proc.ExitCode)."
    } catch {
        Log "Wrapper error: $_"
    }
    Start-Sleep -Seconds 5
}
'@
    $execBinary = $targetPath
    $scriptPathForWrapper = $null
}

$wrapperContent = $wrapperContent.Replace('{EXECUTABLE}', (ConvertTo-DoubleQuoteLiteral($execBinary)))
$wrapperContent = $wrapperContent.Replace('{STDOUT}', (ConvertTo-DoubleQuoteLiteral($stdoutLog)))
$wrapperContent = $wrapperContent.Replace('{STDERR}', (ConvertTo-DoubleQuoteLiteral($stderrLog)))
$wrapperContent = $wrapperContent.Replace('{DIAG}', (ConvertTo-DoubleQuoteLiteral($wrapperDiag)))
$wrapperContent = $wrapperContent.Replace('{WORKDIR}', (ConvertTo-DoubleQuoteLiteral($workDir)))
if ($scriptPathForWrapper) {
    $wrapperContent = $wrapperContent.Replace('{SCRIPT}', (ConvertTo-DoubleQuoteLiteral($scriptPathForWrapper)))
} else {
    $wrapperContent = $wrapperContent.Replace('$script = "{SCRIPT}"', '')
}

Set-Content -Path $wrapperPath -Value $wrapperContent -Encoding UTF8

$psExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'

if (Test-Path -LiteralPath $serviceHostPath) {
    Remove-Item -LiteralPath $serviceHostPath -Force -ErrorAction SilentlyContinue
}

$serviceSource = @'
using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;

public sealed class AgentService : ServiceBase
{
    private Process _child;
    private static readonly object Sync = new object();
    private const string Executable = {EXECUTABLE};
    private const string Arguments = {ARGUMENTS};
    private const string WorkingDirectory = {WORKDIR};
    private const string DiagPath = {DIAG};
    private const string ServiceIdentity = {SERVICE_NAME};

    public AgentService()
    {
        this.ServiceName = ServiceIdentity;
        this.CanStop = true;
        this.CanShutdown = true;
        this.AutoLog = true;
    }

    protected override void OnStart(string[] args)
    {
        WriteDiag("Service starting.");
        var psi = new ProcessStartInfo
        {
            FileName = Executable,
            Arguments = Arguments ?? string.Empty,
            WorkingDirectory = WorkingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            _child = Process.Start(psi);
        }
        catch (Exception ex)
        {
            WriteDiag("Failed to start child process: " + ex);
            throw;
        }

        if (_child == null)
        {
            throw new InvalidOperationException("Child process was not created.");
        }

        _child.EnableRaisingEvents = true;
        _child.Exited += (sender, eventArgs) =>
        {
            WriteDiag("Child process exited with code " + _child.ExitCode + ".");
            TryStopChild();
            Stop();
        };

        WriteDiag("Child process started with PID " + _child.Id + ".");
    }

    protected override void OnStop()
    {
        WriteDiag("Service stopping.");
        TryStopChild();
    }

    protected override void OnShutdown()
    {
        WriteDiag("Service shutting down.");
        TryStopChild();
    }

    private void TryStopChild()
    {
        if (_child == null)
        {
            return;
        }

        try
        {
            if (!_child.HasExited)
            {
                WriteDiag("Stopping child process.");
                _child.CloseMainWindow();
                if (!_child.WaitForExit(2000))
                {
                    _child.Kill(true);
                }
            }
        }
        catch (Exception ex)
        {
            WriteDiag("Error stopping child process: " + ex);
        }
        finally
        {
            try
            {
                _child.Dispose();
            }
            catch
            {
            }

            _child = null;
        }
    }

    private static void WriteDiag(string message)
    {
        try
        {
            var line = DateTime.UtcNow.ToString("o") + " [host] " + message + Environment.NewLine;
            lock (Sync)
            {
                var directory = Path.GetDirectoryName(DiagPath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.AppendAllText(DiagPath, line);
            }
        }
        catch
        {
        }
    }

    public static void Main()
    {
        Run(new AgentService());
    }
}
'@

$serviceSource = $serviceSource.Replace('{EXECUTABLE}', (ConvertTo-CSharpLiteral($psExe)))
$serviceSource = $serviceSource.Replace('{ARGUMENTS}', (ConvertTo-CSharpLiteral("-NoProfile -ExecutionPolicy Bypass -File `"$wrapperPath`"")))
$serviceSource = $serviceSource.Replace('{WORKDIR}', (ConvertTo-CSharpLiteral($workDir)))
$serviceSource = $serviceSource.Replace('{DIAG}', (ConvertTo-CSharpLiteral($wrapperDiag)))
$serviceSource = $serviceSource.Replace('{SERVICE_NAME}', (ConvertTo-CSharpLiteral($ServiceName)))

Add-Type -TypeDefinition $serviceSource -Language CSharp -ReferencedAssemblies @('System.ServiceProcess.dll', 'System.dll', 'System.Core.dll') -OutputAssembly $serviceHostPath -OutputType ConsoleApplication
Write-InstallLog "Service host compiled to '$serviceHostPath'."

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

New-Service -Name $ServiceName -BinaryPathName ('"' + $serviceHostPath + '"') -DisplayName $DisplayName -StartupType $startup -ErrorAction Stop
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName" -Name Description -Value "CloudShield agent service" -ErrorAction SilentlyContinue

sc.exe failure $ServiceName "reset= 86400" "actions= restart/5000" | Out-Null

Start-Service -Name $ServiceName
Write-InstallLog "Service '$ServiceName' installed and started."
