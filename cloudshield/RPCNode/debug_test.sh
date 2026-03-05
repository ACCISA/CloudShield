#!/bin/bash
# Quick debug script: start server, run one test, show server log
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${BUILD_DIR:="$SCRIPT_DIR/build"}"
: "${PROTO_DIR:="$SCRIPT_DIR/protos/infra_service"}"
: "${HOST:="localhost:50055"}"
: "${LOG:="/tmp/rpcsrv_debug.log"}"

# Kill any old instances
killall cs-rpcsrv 2>/dev/null || true
sleep 1

# Start server
echo "[*] Starting server..."
"$BUILD_DIR/cs-rpcsrv" -samba > "$LOG" 2>&1 &
SERVER_PID=$!
sleep 2

# Check if server is still alive
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "[!] Server crashed on startup!"
  echo "--- SERVER LOG ---"
  cat "$LOG"
  exit 1
fi

# Quick connectivity check
echo "[*] Checking connectivity..."
if grpcurl -plaintext -import-path "$PROTO_DIR" -proto infra_service.proto "$HOST" list; then
  echo "[*] Server is up"
else
  echo "[!] Server not responding"
  echo "--- SERVER LOG ---"
  cat "$LOG"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

echo ""
echo "[*] Test 1: Valid group name (should pass through to samba layer)"
grpcurl -plaintext -import-path "$PROTO_DIR" -proto infra_service.proto \
  -d '{"group_name":"engineering"}' \
  "$HOST" infra_service.v1.InfraService/AddDomainGroup 2>&1 || true

echo ""

# Check if server survived
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "[!] Server crashed after test 1!"
  echo "--- SERVER LOG ---"
  cat "$LOG"
  exit 1
fi

echo "[*] Test 2: Injection in group name (should return INVALID_ARGUMENT)"
grpcurl -plaintext -import-path "$PROTO_DIR" -proto infra_service.proto \
  -d '{"group_name":"admin;whoami"}' \
  "$HOST" infra_service.v1.InfraService/AddDomainGroup 2>&1 || true

echo ""

# Check if server survived
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "[!] Server crashed after test 2!"
  echo "--- SERVER LOG ---"
  cat "$LOG"
  exit 1
fi

echo "[*] Test 3: Injection in username (should return INVALID_ARGUMENT)"
grpcurl -plaintext -import-path "$PROTO_DIR" -proto infra_service.proto \
  -d '{"username":"john;rm -rf /","password":"Str0ngP@ssw0rd"}' \
  "$HOST" infra_service.v1.InfraService/AddDomainUser 2>&1 || true

echo ""

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "[!] Server crashed after test 3!"
  echo "--- SERVER LOG ---"
  cat "$LOG"
  exit 1
fi

echo "[*] All tests completed. Server still alive."
echo "--- SERVER LOG ---"
cat "$LOG"

kill $SERVER_PID 2>/dev/null
