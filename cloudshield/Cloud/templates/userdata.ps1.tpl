<powershell>
# Ensure folder exists
$installDir = "C:\CloudShield"
New-Item -Path $installDir -ItemType Directory -Force | Out-Null

$markerPath = Join-Path $installDir "image_build_complete.txt"
if (Test-Path -LiteralPath $markerPath) {
    exit 0
}

$Global:AwsCliPath = $null

$logPath = Join-Path $installDir "image_build.log"
function Log {
    param([string]$Message)
    $line = "$(Get-Date -Format s) : $Message"
    Write-Host $line
    Add-Content -Path $logPath -Value $line
}

# Ensure modern TLS protocols are enabled for web requests (TLS 1.2 required by AWS endpoints)
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Log "TLS ready"
} catch {
    Log ("WARN TLS: {0}" -f $_)
}

function Get-EC2LaunchInstaller {
    param(
        [string]$DestinationPath
    )

    if (Test-Path -LiteralPath $DestinationPath) {
        Remove-Item -LiteralPath $DestinationPath -Force -ErrorAction SilentlyContinue
    }

    $downloaded = $false

    $s3Sources = @(
        "s3://ec2-downloads-windows/EC2Launch/latest/EC2LaunchV2.msi",
        "s3://aws-windows-downloads/EC2Launch/latest/EC2LaunchV2.msi"
    )

    $awsCmd = $Global:AwsCliPath
    if (-not $awsCmd) {
        try {
            $awsCmd = (Get-Command aws -ErrorAction SilentlyContinue).Source
        } catch {
            $awsCmd = $null
        }
    }
    if ($awsCmd) {
        foreach ($s3Source in $s3Sources) {
            Write-Log ("aws cp EC2Launch from {0}" -f $s3Source)
            $arguments = "s3 cp `"$s3Source`" `"$DestinationPath`""
            $rc = Start-Process -FilePath $awsCmd -ArgumentList $arguments -NoNewWindow -Wait -PassThru
            if ($rc.ExitCode -eq 0 -and (Test-Path -LiteralPath $DestinationPath)) {
                Write-Log ("EC2Launch aws cp ok ({0} bytes)" -f ((Get-Item -LiteralPath $DestinationPath).Length))
                $downloaded = $true
                break
            }
            Write-Log ("WARN aws s3 cp {0} exit {1}" -f $s3Source, $rc.ExitCode)
        }
    } else {
    Log "WARN no AWS CLI for EC2Launch"
    }

    $httpSources = @(
        "https://ec2-downloads-windows.s3.us-east-1.amazonaws.com/EC2Launch/latest/EC2LaunchV2.msi",
        "https://s3.us-west-2.amazonaws.com/ec2-downloads-windows/EC2Launch/latest/EC2LaunchV2.msi",
        "https://aws-windows-downloads.s3.amazonaws.com/EC2Launch/latest/EC2LaunchV2.msi"
    )

    if (-not $downloaded) {
        foreach ($url in $httpSources) {
            for ($attempt = 1; $attempt -le 3; $attempt++) {
                Write-Log ("HTTP download {0} attempt {1}" -f $url, $attempt)
                try {
                    Invoke-WebRequest -Uri $url -OutFile $DestinationPath -UseBasicParsing -ErrorAction Stop -MaximumRedirection 5 -TimeoutSec 60
                    if (Test-Path -LiteralPath $DestinationPath) {
                        Log ("HTTP ok {0}" -f ((Get-Item -LiteralPath $DestinationPath).Length))
                        $downloaded = $true
                        break
                    }
                } catch {
                    Log ("WARN HTTP {0}: {1}" -f $url, $_)
                    Start-Sleep -Seconds (3 * $attempt)
                }
            }
            if ($downloaded) { break }
        }
    }

    if (-not $downloaded) {
        if (Test-Path -LiteralPath "C:\\Program Files\\Amazon\\EC2Launch\\EC2Launch.exe") {
    Log "EC2Launch exe present"
            return $true
        }
    Log "ERROR EC2Launch download"
        return $false
    }

    return $true
}

# Ensure EC2Launch exists so userdata runs and administrator password resets
function EnsureEC2Launch {
    Log "Check EC2L"
    $launchScripts = @(
        "C:\\ProgramData\\Amazon\\EC2-Windows\\Launch\\Scripts\\InitializeInstance.ps1"
        "C:\\ProgramData\\Amazon\\EC2Launch\\Scripts\\InitializeInstance.ps1"
        "C:\\ProgramData\\Amazon\\EC2Launch\\launch-config\\LaunchScripts\\InitializeInstance.ps1"
    )

    foreach ($candidate in $launchScripts) {
        if (Test-Path -LiteralPath $candidate) {
            Log "Found EC2L script"
            return $candidate
        }
    }

    $discovered = $null
    try {
        $discovered = Get-ChildItem -Path "C:\\ProgramData\\Amazon" -Filter "InitializeInstance.ps1" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
    } catch {}
    if ($discovered -and (Test-Path -LiteralPath $discovered)) {
    Log ("Found EC2L via search: {0}" -f $discovered)
        return $discovered
    }

    if (Test-Path -LiteralPath "C:\\Program Files\\Amazon\\EC2Launch\\EC2Launch.exe") {
    Log "EC2L exe missing script"
        return $null
    }

    Log "Install EC2L"

    $msiPath = Join-Path $env:TEMP "EC2LaunchV2.msi"

    if (-not (Get-EC2LaunchInstaller -DestinationPath $msiPath)) {
    Log "ERROR EC2L MSI download"
        throw "Unable to download EC2Launch V2 from known locations."
    }

    Log "Install EC2L MSI"
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msiPath`" /qn" -Wait
    Log "EC2L MSI done"

    Log "Config EC2L svc"
    try {
        Set-Service -Name "Amazon EC2Launch" -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service -Name "Amazon EC2Launch" -ErrorAction SilentlyContinue
        $svc = Get-Service -Name "Amazon EC2Launch" -ErrorAction SilentlyContinue
        if ($svc) {
            Log ("EC2L svc {0}" -f $svc.Status)
        } else {
            Log "WARN EC2L svc missing"
        }
    } catch {
    Log "WARN start EC2L svc"
    }

    foreach ($candidate in $launchScripts) {
        if (Test-Path -LiteralPath $candidate) {
            Log "Found EC2L script post install"
            return $candidate
        }
    }

    Log "WARN EC2L install missing script"
    return $null
}

function Schedule-EC2LaunchReset {
    param(
        [string]$LaunchScriptPath
    )

    $scheduled = $false
    if ($LaunchScriptPath) {
    Log ("Schedule EC2L via {0}" -f $LaunchScriptPath)
        try {
            & $LaunchScriptPath -Schedule
            $scheduled = $true
            Log "Init script scheduled"
        } catch {
            Log ("WARN init schedule: {0}" -f $_)
        }
    }

    $ec2LaunchExe = "C:\\Program Files\\Amazon\\EC2Launch\\EC2Launch.exe"
    if (-not (Test-Path -LiteralPath $ec2LaunchExe)) {
        $ec2LaunchExe = (
            Get-ChildItem -Path "C:\\Program Files\\Amazon\\" -Filter "EC2Launch.exe" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        )
    }
    $resetSucceeded = $false
    if (Test-Path -LiteralPath $ec2LaunchExe) {
        try {
            Start-Process -FilePath $ec2LaunchExe -ArgumentList "reset" -NoNewWindow -Wait
            $resetSucceeded = $true
            Log "EC2L reset"
        } catch {
            Log ("WARN EC2L reset: {0}" -f $_)
        }
    }

    if ($resetSucceeded -and (Test-Path -LiteralPath $ec2LaunchExe)) {
        try {
            Start-Process -FilePath $ec2LaunchExe -ArgumentList "run" -NoNewWindow -Wait
            $scheduled = $true
            Log "EC2L run"
        } catch {
            Log ("WARN EC2L run: {0}" -f $_)
        }
    }

    if (-not $scheduled) {
        $service = Get-Service -Name "Amazon EC2Launch" -ErrorAction SilentlyContinue
        if ($service -and $service.Status -ne 'Running') {
            try {
                Log "Start EC2L svc"
                Start-Service -Name "Amazon EC2Launch"
                $service = Get-Service -Name "Amazon EC2Launch"
                Log ("EC2L svc now {0}" -f $service.Status)
            } catch {
                Log ("WARN start EC2L svc manually: {0}" -f $_)
            }
        }

        try {
            $agentCli = "C:\\Program Files\\Amazon\\EC2Launch\\agent.exe"
            if (Test-Path -LiteralPath $agentCli) {
                Log "agent.exe reset"
                Start-Process -FilePath $agentCli -ArgumentList "resetPassword" -NoNewWindow -Wait
                $scheduled = $true
                Log "agent.exe resetPassword"
            }
        } catch {
            Log ("WARN agent.exe reset: {0}" -f $_)
        }

        if (-not $scheduled) {
            Log "WARN EC2L reset not scheduled"
        }
    }

    return $scheduled
}

# Ensure AWS CLI exists; if not, download installer and install silently
function Ensure-AWSCLI {
    $aws = $Global:AwsCliPath
    if (-not $aws) {
        try {
            $aws = (Get-Command aws -ErrorAction SilentlyContinue).Source
        } catch {
            $aws = $null
        }
    }

    if ($aws) {
        $Global:AwsCliPath = $aws
    Log ("AWS CLI at {0}" -f $Global:AwsCliPath)
        return $Global:AwsCliPath
    }

    Log "Install AWS CLI"
    $msi = Join-Path $env:TEMP "AWSCLIV2.msi"
    Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile $msi -UseBasicParsing -ErrorAction Stop
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msi`" /qn" -Wait
    Log "AWS CLI installed"

    $defaultPathCandidates = @(
        (Join-Path $env:ProgramFiles "Amazon\AWSCLIV2\aws.exe")
        (Join-Path $env:ProgramFiles "Amazon\AWSCLIV2\aws.cmd")
    )

    foreach ($candidate in $defaultPathCandidates) {
        if (Test-Path -LiteralPath $candidate) {
            $Global:AwsCliPath = $candidate
            Log ("AWS CLI exe {0}" -f $Global:AwsCliPath)
            return $Global:AwsCliPath
        }
    }

    $aws = $null
    try {
        $aws = Get-Command aws -ErrorAction SilentlyContinue
    } catch {}

    if ($aws) {
        $Global:AwsCliPath = $aws.Source
    Log ("AWS CLI PATH {0}" -f $Global:AwsCliPath)
        return $Global:AwsCliPath
    }

    Log "WARN AWS CLI install missing exe"
    return $null
}

# Download arbitrary S3 object using AWS CLI with retries
function Download-S3Object {
    param(
        [string]$Bucket,
        [string]$Key,
        [string]$Destination,
        [string]$Label
    )

    $s3uri = "s3://$Bucket/$Key"
    Log ("Download {0} from {1}" -f $Label, $s3uri)

    if (Test-Path -LiteralPath $Destination) {
        Log ("Removing old {0}" -f $Label)
        Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
    }

    if (-not $Global:AwsCliPath) {
        Log "ERROR: AWS CLI path unavailable for S3"
        return $false
    }

    $maxAttempts = 3
    for ($i=1; $i -le $maxAttempts; $i++) {
        Log ("aws cp {0} {1}" -f $Label, $i)
        $rc = Start-Process -FilePath $Global:AwsCliPath -ArgumentList "s3 cp `"$s3uri`" `"$Destination`"" -NoNewWindow -Wait -PassThru
        if ($rc.ExitCode -eq 0 -and (Test-Path -LiteralPath $Destination)) {
    Log ("{0} ok {1} ({2})" -f $Label, $i, (Get-Item -LiteralPath $Destination).Length)
            return $true
        }
    Log ("WARN aws cp try {0} exit {1}" -f $i, $rc.ExitCode)
        Start-Sleep -Seconds (5 * $i)
    }
    Log ("ERROR {0} from {1}" -f $Label, $s3uri)
    return $false
}

# Ensure AWS Systems Manager (SSM) agent is present so workstation registers with Fleet Manager
function Ensure-SSMAgent {
    Log "SSM ensure"

    $service = Get-Service -Name "AmazonSSMAgent" -ErrorAction SilentlyContinue
    if ($service) {
        try {
            Set-Service -Name "AmazonSSMAgent" -StartupType Automatic -ErrorAction SilentlyContinue
            if ($service.Status -ne "Running") {
                Start-Service -Name "AmazonSSMAgent" -ErrorAction SilentlyContinue
            }
            Log ("SSM running {0}" -f (Get-Service -Name "AmazonSSMAgent" -ErrorAction SilentlyContinue).Status)
            return $true
        } catch {
            Log ("WARN SSM ensure: {0}" -f $_)
            return $false
        }
    }

    $downloadPath = Join-Path $env:TEMP "AmazonSSMAgentSetup.exe"
    $urls = @(
        "https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/windows_amd64/AmazonSSMAgentSetup.exe",
        "https://s3.us-west-2.amazonaws.com/amazon-ssm-windows/SSMAgent/latest/windows_amd64/AmazonSSMAgentSetup.exe"
    )

    foreach ($url in $urls) {
    Log ("Download SSM from {0}" -f $url)
        try {
            Invoke-WebRequest -Uri $url -OutFile $downloadPath -UseBasicParsing -ErrorAction Stop -TimeoutSec 60
            if (Test-Path -LiteralPath $downloadPath) {
            Log ("SSM installer {0}" -f (Get-Item -LiteralPath $downloadPath).Length)
                break
            }
        } catch {
            Log ("WARN SSM download: {0}" -f $_)
        }
    }

    if (-not (Test-Path -LiteralPath $downloadPath)) {
    Log "ERROR SSM download"
        return $false
    }

    try {
    Log "Install SSM"
        Start-Process -FilePath $downloadPath -ArgumentList "/install /quiet" -NoNewWindow -Wait
        Set-Service -Name "AmazonSSMAgent" -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service -Name "AmazonSSMAgent" -ErrorAction SilentlyContinue
    Log ("SSM status {0}" -f (Get-Service -Name "AmazonSSMAgent" -ErrorAction SilentlyContinue).Status)
        return $true
    } catch {
        Log ("ERROR install SSM: {0}" -f $_)
        return $false
    }
}

function Reset-SSM {
    try { Stop-Service -Name "AmazonSSMAgent" -Force -ErrorAction SilentlyContinue } catch {}
    $folders = @(
        "C:\ProgramData\Amazon\SSM\InstanceData",
        "C:\ProgramData\Amazon\SSM\Data",
        "C:\ProgramData\Amazon\SSM\Update"
    )
    foreach ($f in $folders) {
        try { Remove-Item -LiteralPath $f -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
    try { Set-Service -Name "AmazonSSMAgent" -StartupType Automatic -ErrorAction SilentlyContinue } catch {}
}

# Run steps
try {
    Log "Start CloudShield build"
    $null = Ensure-AWSCLI
    if (-not $Global:AwsCliPath) {
        Log "ERROR no AWS CLI path"
        exit 1
    }
    if (-not (Ensure-SSMAgent)) {
        Log "WARN SSM install failed"
    }
    $installerPath = Join-Path $installDir "install_agent_service.ps1"
    if (-not (Download-S3Object -Bucket "${s3_bucket_name}" -Key "${install_script_s3_key}" -Destination $installerPath -Label "install script")) {
        Log "ERROR install script download"
        exit 1
    }

    $launchScript = EnsureEC2Launch

    $ec2LaunchScheduled = Schedule-EC2LaunchReset -LaunchScriptPath $launchScript

    $bucket = "${s3_bucket_name}"
    $key    = "${agent_s3_key}"
    $agentLocal = Join-Path $installDir "main.exe"

    if (-not (Download-S3Object -Bucket $bucket -Key $key -Destination $agentLocal -Label "agent binary")) {
        Log "ERROR agent download"
        exit 1
    }
    Log "Agent download ok"

    # Run installer: pass -AgentPath and let it auto-download NSSM if needed
    Log "Run installer"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$installerPath`" -AgentPath `"$agentLocal`"" -Wait
    Log "Installer execution finished"

    if (-not $ec2LaunchScheduled) {
        Log "WARN EC2L scheduling failed"
    }

    Reset-SSM

    # Marker file
    New-Item -Path $markerPath -ItemType File -Force | Out-Null
    Log "CloudShield build complete"
} catch {
    Log ("ERROR userdata: {0}" -f $_)
    exit 1
}
</powershell>
