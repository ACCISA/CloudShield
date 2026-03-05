#!/bin/bash
# Test script for gRPC input sanitization
# Run with: wsl bash cloudshield/RPCNode/test_sanitization.sh

PROTO_DIR="/mnt/c/Users/ricob/Desktop/CloudShield/cloudshield/RPCNode/protos/infra_service"
HOST="localhost:50055"
PASS=0
FAIL=0

grpc() {
  local proto="$1"; shift
  local method="${@: -1}"
  local args=("${@:1:$#-1}")
  grpcurl -plaintext -import-path "$PROTO_DIR" -proto "$proto" "${args[@]}" "$HOST" "$method" 2>&1
}

expect_invalid() {
  local desc="$1"; shift
  local output
  output=$(grpc "$@")
  if echo "$output" | grep -q "InvalidArgument"; then
    echo "  PASS: $desc"
    ((PASS++))
  else
    echo "  FAIL: $desc"
    echo "        Got: $output"
    ((FAIL++))
  fi
}

expect_ok() {
  local desc="$1"; shift
  local output
  output=$(grpc "$@")
  if echo "$output" | grep -q "InvalidArgument"; then
    echo "  FAIL: $desc (got InvalidArgument unexpectedly)"
    echo "        Got: $output"
    ((FAIL++))
  elif echo "$output" | grep -q "Failed to dial"; then
    echo "  FAIL: $desc (connection error)"
    echo "        Got: $output"
    ((FAIL++))
  else
    echo "  PASS: $desc"
    ((PASS++))
  fi
}

BUILD_DIR="/mnt/c/Users/ricob/Desktop/CloudShield/cloudshield/RPCNode/build"

echo "========================================"
echo " CloudShield RPC Sanitization Tests"
echo "========================================"
echo ""

# ── Kill old server and start fresh ──
killall cs-rpcsrv 2>/dev/null || true
sleep 1

echo "[*] Starting cs-rpcsrv -samba ..."
"$BUILD_DIR/cs-rpcsrv" -samba > /tmp/rpcsrv.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT
sleep 2

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "  ERROR: Server crashed on startup"
  cat /tmp/rpcsrv.log
  exit 1
fi

if ! grpcurl -plaintext -import-path "$PROTO_DIR" -proto infra_service.proto "$HOST" list >/dev/null 2>&1; then
  echo "  ERROR: Server not responding on $HOST"
  cat /tmp/rpcsrv.log
  exit 1
fi
echo "  Server running (PID $SERVER_PID)"
echo ""

# ── InfraService Injection Tests ──
echo "=== InfraService: Injection Tests (expect INVALID_ARGUMENT) ==="

expect_invalid "Command injection in username (semicolon)" \
  infra_service.proto -d '{"username":"john;rm -rf /","password":"Str0ngP@ssw0rd"}'  \
  infra_service.v1.InfraService/AddDomainUser

expect_invalid "Shell substitution in username (\$(...))" \
  infra_service.proto -d '{"username":"john$(whoami)","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDomainUser

expect_invalid "Backtick injection in username" \
  infra_service.proto -d '{"username":"john`id`","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDomainUser

expect_invalid "Pipe in username" \
  infra_service.proto -d '{"username":"john|cat /etc/passwd","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDomainUser

expect_invalid "Ampersand in username" \
  infra_service.proto -d '{"username":"john&&whoami","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDomainUser

expect_invalid "Path traversal in share name" \
  infra_service.proto -d '{"share_name":"../../../etc/passwd","share_size":"100"}' \
  infra_service.v1.InfraService/CreateSambaFileShare

expect_invalid "Semicolon in share name" \
  infra_service.proto -d '{"share_name":"data;rm -rf /","share_size":"100"}' \
  infra_service.v1.InfraService/CreateSambaFileShare

expect_invalid "Pipe in group name" \
  infra_service.proto -d '{"group_name":"admin|cat /etc/shadow"}' \
  infra_service.v1.InfraService/AddDomainGroup

expect_invalid "Semicolon in group name" \
  infra_service.proto -d '{"group_name":"admin;whoami"}' \
  infra_service.v1.InfraService/AddDomainGroup

expect_invalid "Semicolon injection in DNS zone" \
  infra_service.proto -d '{"zone":"x;cat /etc/shadow","name":"web","target":"10.0.0.1","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDNSRecord

expect_invalid "Invalid IP in DNS target" \
  infra_service.proto -d '{"zone":"corp.local","name":"web","target":"999.999.999.999","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDNSRecord

expect_invalid "Overlong username (300 chars)" \
  infra_service.proto -d "{\"username\":\"$(printf 'A%.0s' {1..300})\",\"password\":\"Str0ngP@ssw0rd\"}" \
  infra_service.v1.InfraService/AddDomainUser

echo ""

# ── InfraService Valid Request Tests ──
echo "=== InfraService: Valid Requests (expect OK / domain error, NOT INVALID_ARGUMENT) ==="

expect_ok "Valid username + password" \
  infra_service.proto -d '{"username":"john.doe","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDomainUser

expect_ok "Valid group name" \
  infra_service.proto -d '{"group_name":"engineering"}' \
  infra_service.v1.InfraService/AddDomainGroup

expect_ok "Valid share creation" \
  infra_service.proto -d '{"share_name":"projects","share_size":"1024"}' \
  infra_service.v1.InfraService/CreateSambaFileShare

expect_ok "Valid DNS record" \
  infra_service.proto -d '{"zone":"corp.local","name":"webserver","target":"192.168.1.50","password":"Str0ngP@ssw0rd"}' \
  infra_service.v1.InfraService/AddDNSRecord

expect_ok "GetUserList (no input)" \
  infra_service.proto -d '{}' \
  infra_service.v1.InfraService/GetUserList

expect_ok "RestartSambaService (no input)" \
  infra_service.proto -d '{}' \
  infra_service.v1.InfraService/RestartSambaService

echo ""

# ── VPNService Tests (need separate -vpn server) ──
echo "=== VPNService: Injection Tests (expect INVALID_ARGUMENT) ==="

# Start VPN server on a different port
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
sleep 1

export GRPC_PORT=50056
"$BUILD_DIR/cs-rpcsrv" -vpn >> /tmp/rpcsrv.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT
sleep 2

VPN_HOST="localhost:50056"

vpn_grpc() {
  local proto="$1"; shift
  local method="${@: -1}"
  local args=("${@:1:$#-1}")
  grpcurl -plaintext -import-path "$PROTO_DIR" -proto "$proto" "${args[@]}" "$VPN_HOST" "$method" 2>&1
}

vpn_expect_invalid() {
  local desc="$1"; shift
  local output
  output=$(vpn_grpc "$@")
  if echo "$output" | grep -q "InvalidArgument"; then
    echo "  PASS: $desc"
    ((PASS++))
  else
    echo "  FAIL: $desc"
    echo "        Got: $output"
    ((FAIL++))
  fi
}

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "  SKIP: VPN server failed to start"
else

vpn_expect_invalid "Injection in VPN client name" \
  vpn_service.proto -d '{"client_name":"x;cat /etc/passwd"}' \
  vpn_service.v1.VPNService/CreateVPNClient

vpn_expect_invalid "Invalid IPv4 in OpenSSHTunnel" \
  vpn_service.proto -d '{"ipv4":"999.999.999.999","port":"22","key":"/tmp/key"}' \
  vpn_service.v1.VPNService/OpenSSHTunnel

vpn_expect_invalid "Injection in SSH key path" \
  vpn_service.proto -d '{"ipv4":"10.0.0.5","port":"22","key":"/tmp/key;rm -rf /"}' \
  vpn_service.v1.VPNService/OpenSSHTunnel

vpn_expect_invalid "Port out of range" \
  vpn_service.proto -d '{"ipv4":"10.0.0.5","port":"99999","key":"/tmp/key"}' \
  vpn_service.v1.VPNService/OpenSSHTunnel

fi

echo ""
echo "========================================"
echo " Results: $PASS passed, $FAIL failed"
echo "========================================"
