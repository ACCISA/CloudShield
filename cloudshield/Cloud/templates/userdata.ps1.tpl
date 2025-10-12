<powershell>
# Ensure folder exists
$installDir = "C:\CloudShield"
New-Item -Path $installDir -ItemType Directory -Force | Out-Null

# Write the embedded installer script to disk
$installer = @"
${installer}
"@
$installerPath = Join-Path $installDir "install_agent_service.ps1"
Set-Content -Path $installerPath -Value $installer -Encoding UTF8

# Ensure AWS CLI exists; if not, download installer and install silently
function Ensure-AWSCLI {
    try {
        $aws = Get-Command aws -ErrorAction SilentlyContinue
        if ($null -ne $aws) {
            Write-Host "AWS CLI already present."
            return
        }
    } catch {}

    Write-Host "AWS CLI not found — installing..."
    $msi = Join-Path $env:TEMP "AWSCLIV2.msi"
    Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile $msi -UseBasicParsing -ErrorAction Stop
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msi`" /qn" -Wait
    Write-Host "AWS CLI installed."
}

# Download the agent binary from S3 using AWS CLI (instance role provides credentials)
function Download-AgentFromS3 {
    param($bucket, $key, $dest)
    $s3uri = "s3://$bucket/$key"
    Write-Host "Downloading $s3uri to $dest"
    $maxAttempts = 3
    for ($i=1; $i -le $maxAttempts; $i++) {
        $rc = Start-Process -FilePath "aws" -ArgumentList "s3 cp `"$s3uri`" `"$dest`"" -NoNewWindow -Wait -PassThru
        if ($rc.ExitCode -eq 0) { return $true }
        Write-Host "aws s3 cp attempt $i failed with exitcode $($rc.ExitCode). Retrying..."
        Start-Sleep -Seconds (5 * $i)
    }
    return $false
}

# Run steps
try {
    Ensure-AWSCLI

    $bucket = "${s3_bucket_name}"
    $key    = "${s3_object_key}"
    $agentLocal = Join-Path $installDir "main.exe"

    if (-not (Download-AgentFromS3 -bucket $bucket -key $key -dest $agentLocal)) {
        Write-Host "Failed to download agent from S3. Exiting with error."
        exit 1
    }

    # Run installer: pass -AgentPath and let it auto-download NSSM if needed
    Write-Host "Invoking installer: $installerPath -AgentPath $agentLocal -AutoDownloadNssm"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$installerPath`" -AgentPath `"$agentLocal`" -AutoDownloadNssm" -Wait

    # Marker file
    New-Item -Path (Join-Path $installDir "image_build_complete.txt") -ItemType File -Force | Out-Null
} catch {
    Write-Host "User-data exception: $_"
    exit 1
}
</powershell>
