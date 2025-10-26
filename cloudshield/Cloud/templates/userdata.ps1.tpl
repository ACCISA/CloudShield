<powershell>
# Ensure folder exists
$installDir = "C:\CloudShield"
New-Item -Path $installDir -ItemType Directory -Force | Out-Null

$Global:AwsCliPath = $null

$logPath = Join-Path $installDir "image_build.log"
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = (Get-Date).ToString("s")
    $line = "[$Level] $timestamp : $Message"
    Write-Host $line
    Add-Content -Path $logPath -Value $line
}

# Ensure modern TLS protocols are enabled for web requests (TLS 1.2 required by AWS endpoints)
try {
    Write-Log "Entering TLS configuration block"
    Write-Log ("Current SecurityProtocol: {0}" -f [Net.ServicePointManager]::SecurityProtocol)
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Write-Log ("Updated SecurityProtocol: {0}" -f [Net.ServicePointManager]::SecurityProtocol)
    Write-Log "Enabled TLS 1.2/1.3 for outbound web requests"
} catch {
    Write-Log ("WARNING: Unable to enable TLS 1.2/1.3 explicitly: {0}" -f $_)
}

function Get-EC2LaunchInstaller {
    param(
        [string]$DestinationPath
    )

    Write-Log ("Preparing to download EC2Launch MSI to {0}" -f $DestinationPath)

    if (Test-Path -LiteralPath $DestinationPath) {
        Write-Log ("Existing file found at {0}; removing before download" -f $DestinationPath)
        Remove-Item -LiteralPath $DestinationPath -Force -ErrorAction SilentlyContinue
    }

    $downloaded = $false

    $s3Sources = @(
        "s3://ec2-downloads-windows/EC2Launch/latest/EC2LaunchV2.msi",
        "s3://aws-windows-downloads/EC2Launch/latest/EC2LaunchV2.msi"
    )

    $awsCmd = Get-Command aws -ErrorAction SilentlyContinue
    if ($awsCmd) {
        foreach ($s3Source in $s3Sources) {
            Write-Log ("Attempting to download EC2Launch via aws s3 cp from {0}" -f $s3Source)
            $arguments = "s3 cp `"$s3Source`" `"$DestinationPath`""
            $rc = Start-Process -FilePath "aws" -ArgumentList $arguments -NoNewWindow -Wait -PassThru
            if ($rc.ExitCode -eq 0 -and (Test-Path -LiteralPath $DestinationPath)) {
                Write-Log ("Successfully downloaded EC2Launch via aws s3 cp from {0}" -f $s3Source)
                Write-Log ("Downloaded file size (aws s3 cp): {0} bytes" -f ((Get-Item -LiteralPath $DestinationPath).Length))
                $downloaded = $true
                break
            }
            Write-Log ("WARNING: aws s3 cp from {0} failed with exit code {1}" -f $s3Source, $rc.ExitCode)
        }
    } else {
        Write-Log "AWS CLI not available for S3 download of EC2Launch"
    }

    $httpSources = @(
        "https://ec2-downloads-windows.s3.us-east-1.amazonaws.com/EC2Launch/latest/EC2LaunchV2.msi",
        "https://ec2-downloads-windows.s3.amazonaws.com/EC2Launch/latest/EC2LaunchV2.msi",
        "https://s3.us-east-1.amazonaws.com/ec2-downloads-windows/EC2Launch/latest/EC2LaunchV2.msi",
        "https://s3.us-west-2.amazonaws.com/ec2-downloads-windows/EC2Launch/latest/EC2LaunchV2.msi",
        "https://aws-windows-downloads.s3.amazonaws.com/EC2Launch/latest/EC2LaunchV2.msi"
    )

    if (-not $downloaded) {
        foreach ($url in $httpSources) {
            for ($attempt = 1; $attempt -le 3; $attempt++) {
                Write-Log ("Attempting HTTP download of EC2Launch from {0} (attempt {1})" -f $url, $attempt)
                try {
                    Invoke-WebRequest -Uri $url -OutFile $DestinationPath -UseBasicParsing -ErrorAction Stop -MaximumRedirection 5 -TimeoutSec 60
                    if (Test-Path -LiteralPath $DestinationPath) {
                        Write-Log ("HTTP download succeeded from {0}" -f $url)
                        Write-Log ("Downloaded file size (HTTP): {0} bytes" -f ((Get-Item -LiteralPath $DestinationPath).Length))
                        $downloaded = $true
                        break
                    }
                } catch {
                    $errorRecord = $_
                    Write-Log ("WARNING: HTTP download failed. Exception type: {0}" -f $errorRecord.Exception.GetType().FullName)
                    Write-Log ("WARNING: HTTP download failed. HResult: {0}" -f $errorRecord.Exception.HResult)
                    Write-Log ("WARNING: HTTP download failed. Message: {0}" -f $errorRecord.Exception.Message)
                    if ($errorRecord.Exception.Response -and $errorRecord.Exception.Response.Headers) {
                        foreach ($headerKey in $errorRecord.Exception.Response.Headers.Keys) {
                            Write-Log ("WARNING: HTTP response header {0}: {1}" -f $headerKey, ($errorRecord.Exception.Response.Headers[$headerKey] -join "; "))
                        }
                    }
                    Start-Sleep -Seconds (5 * $attempt)
                }
            }
            if ($downloaded) { break }
        }
    }

    if (-not $downloaded) {
        Write-Log "Attempting BITS transfer for EC2Launch MSI"
        foreach ($url in $httpSources) {
            try {
                Write-Log ("Starting BITS transfer from {0}" -f $url)
                Start-BitsTransfer -Source $url -Destination $DestinationPath -TransferType Download -ErrorAction Stop
                if (Test-Path -LiteralPath $DestinationPath) {
                    Write-Log ("BITS transfer succeeded from {0}" -f $url)
                    Write-Log ("Downloaded file size (BITS): {0} bytes" -f ((Get-Item -LiteralPath $DestinationPath).Length))
                    $downloaded = $true
                    break
                }
            } catch {
                Write-Log ("WARNING: BITS transfer failed from {0}: {1}" -f $url, $_)
            }
        }
    }

    if (-not $downloaded) {
        Write-Log "ERROR: All EC2Launch download attempts failed."
        return $false
    }

    return $true
}

# Ensure EC2Launch exists so userdata runs and administrator password resets
function EnsureEC2Launch {
    Write-Log "Entering EnsureEC2Launch"
    $launchScripts = @(
        "C:\\ProgramData\\Amazon\\EC2-Windows\\Launch\\Scripts\\InitializeInstance.ps1",
        "C:\\ProgramData\\Amazon\\EC2Launch\\Scripts\\InitializeInstance.ps1"
    )
    Write-Log ("Launch script candidates: {0}" -f ($launchScripts -join ", "))

    foreach ($candidate in $launchScripts) {
        if (Test-Path -LiteralPath $candidate) {
            Write-Log "Found existing EC2Launch script at $candidate"
            return $candidate
        }
    }

    Write-Log "No EC2Launch scripts found; proceeding to download installer"

    $msiPath = Join-Path $env:TEMP "EC2LaunchV2.msi"
    Write-Log ("MSI download path: {0}" -f $msiPath)

    if (-not (Get-EC2LaunchInstaller -DestinationPath $msiPath)) {
        Write-Log "ERROR: EC2Launch MSI could not be retrieved. Userdata cannot continue."
        throw "Unable to download EC2Launch V2 from known locations."
    }

    Write-Log "Starting EC2Launch MSI installation"
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msiPath`" /qn" -Wait
    Write-Log "EC2Launch MSI installation completed"
    Write-Log "EC2Launch installer completed"

    Write-Log "Configuring Amazon EC2Launch service"
    try {
        Set-Service -Name "Amazon EC2Launch" -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service -Name "Amazon EC2Launch" -ErrorAction SilentlyContinue
        $svc = Get-Service -Name "Amazon EC2Launch" -ErrorAction SilentlyContinue
        if ($svc) {
            Write-Log "Amazon EC2Launch service status after start attempt: $($svc.Status)"
        } else {
            Write-Log "Amazon EC2Launch service not found after installation"
        }
    } catch {
    Write-Log "WARNING: Unable to start Amazon EC2Launch service automatically."
    }

    foreach ($candidate in $launchScripts) {
        if (Test-Path -LiteralPath $candidate) {
            Write-Log "EC2Launch script located after installation at $candidate"
            return $candidate
        }
    }

    Write-Log "WARNING: EC2Launch installation attempted but InitializeInstance.ps1 still missing."
    return $null
}

function Schedule-EC2LaunchReset {
    param(
        [string]$LaunchScriptPath
    )

    $scheduled = $false
    if ($LaunchScriptPath) {
        Write-Log ("Attempting to schedule EC2Launch using script {0}" -f $LaunchScriptPath)
        $scheduleCmd = "& `"$LaunchScriptPath`" -Schedule"
        Write-Log ("Schedule command: {0}" -f $scheduleCmd)
        try {
            & $LaunchScriptPath -Schedule
            $scheduled = $true
            Write-Log "Scheduled EC2Launch initialization via $LaunchScriptPath"
        } catch {
            Write-Log ("WARNING: InitializeInstance.ps1 scheduling failed: {0}" -f $_)
        }
    }

    $ec2LaunchExe = "C:\\Program Files\\Amazon\\EC2Launch\\EC2Launch.exe"
    if (-not (Test-Path -LiteralPath $ec2LaunchExe)) {
        $ec2LaunchExe = (
            Get-ChildItem -Path "C:\\Program Files\\Amazon\\" -Filter "EC2Launch.exe" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        )
    }
    if (-not $scheduled -and (Test-Path -LiteralPath $ec2LaunchExe)) {
        try {
            Start-Process -FilePath $ec2LaunchExe -ArgumentList "reset --only-enable" -NoNewWindow -Wait
            $scheduled = $true
            Write-Log "Scheduled EC2Launch reset via EC2Launch.exe reset --only-enable"
        } catch {
            Write-Log ("WARNING: EC2Launch.exe reset --only-enable failed: {0}" -f $_)
        }
    }

    if (-not $scheduled -and (Test-Path -LiteralPath $ec2LaunchExe)) {
        try {
            Start-Process -FilePath $ec2LaunchExe -ArgumentList "schedule --all" -NoNewWindow -Wait
            $scheduled = $true
            Write-Log "Scheduled EC2Launch tasks via EC2Launch.exe schedule --all"
        } catch {
            Write-Log ("WARNING: EC2Launch.exe schedule --all failed: {0}" -f $_)
        }
    }

    if (-not $scheduled) {
        $service = Get-Service -Name "Amazon EC2Launch" -ErrorAction SilentlyContinue
        if ($service -and $service.Status -ne 'Running') {
            try {
                Write-Log "Attempting to start Amazon EC2Launch service manually"
                Start-Service -Name "Amazon EC2Launch"
                $service = Get-Service -Name "Amazon EC2Launch"
                Write-Log "Amazon EC2Launch service status: $($service.Status)"
            } catch {
                Write-Log ("WARNING: Unable to start Amazon EC2Launch service manually: {0}" -f $_)
            }
        }

        try {
            $agentCli = "C:\\Program Files\\Amazon\\EC2Launch\\agent.exe"
            if (Test-Path -LiteralPath $agentCli) {
                Write-Log "Attempting password reset via agent.exe"  
                Start-Process -FilePath $agentCli -ArgumentList "resetPassword" -NoNewWindow -Wait
                $scheduled = $true
                Write-Log "agent.exe resetPassword executed"
            }
        } catch {
            Write-Log ("WARNING: agent.exe resetPassword failed: {0}" -f $_)
        }

        if (-not $scheduled -and (Test-Path -LiteralPath $ec2LaunchExe)) {
            try {
                Start-Process -FilePath $ec2LaunchExe -ArgumentList "run --all" -NoNewWindow -Wait
                $scheduled = $true
                Write-Log "Executed EC2Launch.exe run --all to force initialization"
            } catch {
                Write-Log ("WARNING: EC2Launch.exe run --all failed: {0}" -f $_)
            }
        }

        if (-not $scheduled) {
            Write-Log "WARNING: Unable to schedule EC2Launch password reset; Administrator password may not reset automatically."
        }
    }

    return $scheduled
}

# Ensure AWS CLI exists; if not, download installer and install silently
function Ensure-AWSCLI {
    $aws = $null
    try {
        $aws = Get-Command aws -ErrorAction SilentlyContinue
    } catch {}

    if ($null -ne $aws) {
        $Global:AwsCliPath = $aws.Source
        Write-Log ("AWS CLI already present at {0}" -f $Global:AwsCliPath)
        return $Global:AwsCliPath
    }

    Write-Log "AWS CLI not found - installing AWS CLI v2"
    $msi = Join-Path $env:TEMP "AWSCLIV2.msi"
    Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile $msi -UseBasicParsing -ErrorAction Stop
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msi`" /qn" -Wait
    Write-Log "AWS CLI installed successfully"

    $defaultPathCandidates = @(
        Join-Path ${env:ProgramFiles} "Amazon\AWSCLIV2\aws.exe",
        Join-Path ${env:ProgramFiles} "Amazon\AWSCLIV2\aws.cmd"
    )

    foreach ($candidate in $defaultPathCandidates) {
        if (Test-Path -LiteralPath $candidate) {
            $Global:AwsCliPath = $candidate
            Write-Log ("AWS CLI executable located at {0}" -f $Global:AwsCliPath)
            return $Global:AwsCliPath
        }
    }

    $aws = $null
    try {
        $aws = Get-Command aws -ErrorAction SilentlyContinue
    } catch {}

    if ($aws) {
        $Global:AwsCliPath = $aws.Source
        Write-Log ("AWS CLI discovered on PATH at {0}" -f $Global:AwsCliPath)
        return $Global:AwsCliPath
    }

    Write-Log "WARNING: AWS CLI installation completed but executable not found."
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
    Write-Log ("Preparing to download {0} from {1} to {2}" -f $Label, $s3uri, $Destination)

    if (Test-Path -LiteralPath $Destination) {
        Write-Log ("Existing destination file for {0} detected; removing" -f $Label)
        Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
    }

    if (-not $Global:AwsCliPath) {
        Write-Log "ERROR: AWS CLI path not available; cannot download from S3."
        return $false
    }

    $maxAttempts = 3
    for ($i=1; $i -le $maxAttempts; $i++) {
        Write-Log ("aws s3 cp attempt {0} for {1} starting" -f $i, $Label)
        $rc = Start-Process -FilePath $Global:AwsCliPath -ArgumentList "s3 cp `"$s3uri`" `"$Destination`"" -NoNewWindow -Wait -PassThru
        if ($rc.ExitCode -eq 0 -and (Test-Path -LiteralPath $Destination)) {
            Write-Log ("Download of {0} succeeded on attempt {1}" -f $Label, $i)
            Write-Log ("Downloaded {0} size: {1} bytes" -f $Label, (Get-Item -LiteralPath $Destination).Length)
            return $true
        }
        Write-Log ("aws s3 cp attempt {0} for {1} failed with exitcode {2}. Retrying..." -f $i, $Label, $rc.ExitCode)
        Start-Sleep -Seconds (5 * $i)
    }
    Write-Log ("All attempts to download {0} from {1} failed" -f $Label, $s3uri)
    return $false
}

# Run steps
try {
    Write-Log "Starting CloudShield AMI build"
    $null = Ensure-AWSCLI
    if (-not $Global:AwsCliPath) {
        Write-Log "ERROR: AWS CLI executable path not resolved after installation. Aborting."
        exit 1
    }
    $installerPath = Join-Path $installDir "install_agent_service.ps1"
    if (-not (Download-S3Object -Bucket "${s3_bucket_name}" -Key "${install_script_s3_key}" -Destination $installerPath -Label "install script")) {
        Write-Log "Failed to download install_agent_service.ps1 from S3. Exiting with error."
        exit 1
    }

    $launchScript = EnsureEC2Launch

    $ec2LaunchScheduled = Schedule-EC2LaunchReset -LaunchScriptPath $launchScript

    $bucket = "${s3_bucket_name}"
    $key    = "${agent_s3_key}"
    $agentLocal = Join-Path $installDir "main.exe"

    if (-not (Download-S3Object -Bucket $bucket -Key $key -Destination $agentLocal -Label "agent binary")) {
        Write-Log "Failed to download agent from S3. Exiting with error."
        exit 1
    }
    Write-Log "Agent download successful"

    # Run installer: pass -AgentPath and let it auto-download NSSM if needed
    Write-Log "Invoking installer: $installerPath -AgentPath $agentLocal"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$installerPath`" -AgentPath `"$agentLocal`"" -Wait
    Write-Log "Installer execution finished"

    if (-not $ec2LaunchScheduled) {
        Write-Log "WARNING: EC2Launch scheduling failed; consider validating password reset manually."
    }

    # Marker file
    New-Item -Path (Join-Path $installDir "image_build_complete.txt") -ItemType File -Force | Out-Null
    Write-Log "CloudShield AMI build complete"
} catch {
    Write-Log ("User-data exception: {0}" -f $_)
    exit 1
}
</powershell>
