<#
.SYNOPSIS
    Build the CloudShield Agent as a standalone Windows .exe using PyInstaller,
    then copy it into the workstation OEM folder so it gets baked into the
    Windows image at provisioning time.

.DESCRIPTION
    Run this script from inside the cloudshield/Agent directory on a Windows
    machine that has Python 3.10+ and the Agent's requirements installed.

    Output:
      - dist/cloudshield_agent.exe   (standalone executable)
      - ../../docker/workstation/oem/cloudshield_agent.exe  (copy for OEM)

.EXAMPLE
    cd cloudshield\Agent
    .\build_agent.ps1
#>

$ErrorActionPreference = "Stop"

$AgentDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$OemDir     = Join-Path $AgentDir "..\..\docker\workstation\oem"

Push-Location $AgentDir
try {
    Write-Host "[1/4] Installing build dependencies..."
    pip install -q pyinstaller

    Write-Host "[2/4] Running PyInstaller..."
    pyinstaller --clean --noconfirm main.spec

    $ExePath = Join-Path $AgentDir "dist\cloudshield_agent.exe"
    if (-not (Test-Path $ExePath)) {
        throw "Build failed — $ExePath not found."
    }
    Write-Host "[3/4] Build succeeded: $ExePath"

    # Resolve the OEM directory (create if missing)
    $OemDir = (Resolve-Path $OemDir -ErrorAction SilentlyContinue).Path
    if (-not $OemDir) {
        $OemDir = Join-Path $AgentDir "..\..\docker\workstation\oem"
        New-Item -ItemType Directory -Path $OemDir -Force | Out-Null
        $OemDir = (Resolve-Path $OemDir).Path
    }

    Copy-Item -Path $ExePath -Destination $OemDir -Force
    Write-Host "[4/4] Copied .exe to $OemDir\cloudshield_agent.exe"
    Write-Host ""
    Write-Host "Done. Rebuild the workstation Docker image to include the new agent binary."
} finally {
    Pop-Location
}
