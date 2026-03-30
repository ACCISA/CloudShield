#!/usr/bin/env bash
# Build the CloudShield Agent as a standalone binary using PyInstaller.
#
# Usage (from any directory):
#   bash cloudshield/Agent/build_agent.sh
# Or:
#   cd cloudshield/Agent && ./build_agent.sh
#
# Output:
#   dist/cloudshield_agent   (native binary for the current OS)

set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$AGENT_DIR/../.." && pwd)"
VENV_PYTHON="$REPO_ROOT/.venv/bin/python"

if [ -x "$VENV_PYTHON" ]; then
    PYTHON="$VENV_PYTHON"
else
    PYTHON="python3"
fi

cd "$AGENT_DIR"

echo "[1/3] Installing build dependencies..."
"$PYTHON" -m pip install -q pyinstaller

echo "[2/3] Running PyInstaller..."
"$PYTHON" -m PyInstaller --clean --noconfirm main.spec

EXE="$AGENT_DIR/dist/cloudshield_agent"
if [ ! -f "$EXE" ]; then
    echo "Build failed - $EXE not found." >&2
    exit 1
fi

echo "[3/3] Build succeeded: $EXE"
echo ""
echo "Done."
