#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SIPENA KTT — Staging Deployment Script (Ubuntu 24.04 VPS)
# ==============================================================================

STAGING_DIR="/var/www/sipena-ktt-staging"
LOG_DIR="/var/log/sipena"
APP_NAME="sipena-ktt-staging"

echo "[1/5] Memastikan direktori dan branch staging..."
cd "$STAGING_DIR"
git fetch origin staging
git checkout staging
git pull origin staging

echo "[2/5] Memeriksa dependensi package..."
npm ci

echo "[3/5] Menjalankan migrasi database staging..."
npm run db:migrate

echo "[4/5] Membangun bundle produksi Nuxt 3 (Nitro node-server)..."
npm run build

echo "[5/5] Memperbarui proses PM2 ${APP_NAME}..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R "$(id -un):$(id -gn)" "$LOG_DIR"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi
pm2 save

echo "Verifikasi respons staging local..."
sleep 2
curl -fsS http://127.0.0.1:3003/api/health || true
echo ""
echo "Deployment staging selesai!"
