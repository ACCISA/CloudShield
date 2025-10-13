param(
    [string]$Domain = "WORKGROUP",
    [string]$User = "",
    [string]$Password = "",
    [string]$LogPath = ""
)

function Write-MockLog {
    param(
        [string]$Message
    )

    $timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffK")
    $line = "[$timestamp] $Message"

    Write-Host $line

    if (-not $script:ResolvedLogPath) {
        return
    }

    try {
        Add-Content -Path $script:ResolvedLogPath -Value $line -ErrorAction Stop
    }
    catch {
        Write-Warning "Unable to write to log file '$script:ResolvedLogPath': $_"
    }
}

if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path -Path $PSScriptRoot -ChildPath "mock-domain-bootstrap.log"
}

$script:ResolvedLogPath = Resolve-Path -Path $LogPath -ErrorAction SilentlyContinue
if (-not $script:ResolvedLogPath) {
    $parentDir = Split-Path -Path $LogPath -Parent
    if (-not (Test-Path -Path $parentDir)) {
        New-Item -Path $parentDir -ItemType Directory -Force | Out-Null
    }
    $script:ResolvedLogPath = Resolve-Path -Path (New-Item -Path $LogPath -ItemType File -Force).FullName
}
else {
    $script:ResolvedLogPath = $script:ResolvedLogPath.ProviderPath
}

Write-MockLog "Mock workstation bootstrap starting."
Write-MockLog "Requested domain: '$Domain'"

if ($User) {
    Write-MockLog "Bootstrap invoked with user credential hint for '$User'"
}
else {
    Write-MockLog "No user credentials supplied; running in demonstration mode."
}

Start-Sleep -Seconds 2
Write-MockLog "Skipping real domain join. This script only simulates the workflow."
Start-Sleep -Seconds 1
Write-MockLog "Mock bootstrap completed successfully."

exit 0
