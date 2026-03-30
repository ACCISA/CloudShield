#!/bin/sh
set -eu

cd /app

if [ ! -x node_modules/.bin/vite ]; then
  npm ci
fi

exec npm run dev -- --host 0.0.0.0 --port "${VITE_PORT:-5173}"
