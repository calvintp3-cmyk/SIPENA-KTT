#!/usr/bin/env bash
set -euo pipefail

# SIPENA-KTT Idempotent Deployment Script for Ubuntu 24.04 (Biznet GIO)
# Safety rule: Operates exclusively within /var/www/sipena-ktt and port 3002.

APP_DIR="/var/www/sipena-ktt/current"
LOG_DIR="/var/log/sipena"

if [ ! -d "$APP_DIR" ]; then
  echo "[ERROR] Directory $APP_DIR not found. Clone repository there first."
  exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
  echo "[ERROR] .env.production is missing in $APP_DIR."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

if [ -z "${DATABASE_URL:-}" ] || [ -z "${AUTH_SECRET:-}" ] || [ -z "${CRON_SECRET:-}" ]; then
  echo "[ERROR] DATABASE_URL, AUTH_SECRET, or CRON_SECRET missing in .env.production."
  exit 1
fi

echo "[1/6] Ensuring log directory exists ($LOG_DIR)..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R "$USER":"$USER" "$LOG_DIR"

echo "[2/6] Installing Node dependencies (including build/migration tools)..."
npm ci --include=dev

echo "[3/6] Running PostgreSQL schema migrations (sipena_ktt)..."
npm run db:migrate

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "[3b/6] Seeding initial BPS users & KTT sample data..."
  npm run db:seed
fi

echo "[4/6] Building Next.js standalone production bundle..."
npm run build

echo "[5/6] Syncing static assets for standalone server..."
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static
if [ -d "public" ]; then
  rm -rf .next/standalone/public
  cp -r public .next/standalone/public
fi
cp .env.production .next/standalone/.env.production

echo "[6/6] Starting / Reloading PM2 process 'sipena-ktt' on 127.0.0.1:3002..."
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "[OK] SIPENA-KTT deployment complete. Check: curl -fsS http://127.0.0.1:3002/api/health"
