#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/cedric/CloudShield"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BRANCH="production"
VPC_NETWORK="${VPC_NET_NAME:-vpc_net}"
VPC_SUBNET="${VPC_SUBNET:-172.23.1.0/24}"
CLOUDSHIELD_NETWORK="${CLOUDSHIELD_NET_NAME:-cloudshield_cloudshield_net}"
CLOUDSHIELD_SUBNET="${CLOUDSHIELD_SUBNET:-172.28.0.0/16}"

wait_for_url() {
  local url="$1"
  local name="$2"
  local retries="${3:-60}"
  local delay="${4:-2}"

  for ((i=1; i<=retries; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$name is healthy"
      return 0
    fi
    sleep "$delay"
  done

  echo "$name did not become healthy in time"
  docker compose -f "$COMPOSE_FILE" ps
  exit 1
}

cd "$PROJECT_DIR"

echo "Fetching latest code"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Ensuring required host paths exist"
mkdir -p /opt/workstations
mkdir -p /opt/cloudshield/data

echo "Ensuring external Docker network exists"
if ! docker network inspect "$VPC_NETWORK" >/dev/null 2>&1; then
  docker network create --driver bridge --subnet "$VPC_SUBNET" "$VPC_NETWORK"
fi

if ! docker network inspect "$CLOUDSHIELD_NETWORK" >/dev/null 2>&1; then
  docker network create --driver bridge --subnet "$CLOUDSHIELD_SUBNET" "$CLOUDSHIELD_NETWORK"
fi

echo "Validating production compose"
docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Pulling base images"
docker compose -f "$COMPOSE_FILE" pull redis elasticsearch || true

echo "Building production images"
docker compose -f "$COMPOSE_FILE" build --pull api-test ui

echo "Starting production services"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans redis elasticsearch api-test api-worker workstations-worker ui

echo "Checking health"
wait_for_url "http://127.0.0.1:9200/_cluster/health" "Elasticsearch"
wait_for_url "http://127.0.0.1:5050/healthz" "API"
wait_for_url "http://127.0.0.1:5173" "UI"

echo "Current container status"
docker compose -f "$COMPOSE_FILE" ps

echo "Production deploy successful"