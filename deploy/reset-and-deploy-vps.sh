#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SIPENA KTT — Full Reset & Production Deploy Script (Ubuntu 24.04 VPS)
# Menjalankan:
#   1) Validasi file .env (DATABASE_URL, NUXT_SESSION_PASSWORD, CRON_SECRET, SUPERADMIN_EMAIL)
#   2) Backup database & direktori aplikasi lama (bila ada)
#   3) Reset database PostgreSQL 16 (`sipena_ktt`) + role `sipena_user` + `pg_trgm`
#   4) Clone fresh branch `main` ke `/var/www/sipena-ktt/current`
#   5) `npm ci`, `npm run db:migrate`, index GIN `pg_trgm`, `npm run db:seed`, `npm run build`
#   6) Start PM2 (`ecosystem.config.cjs`, port 3002) & update Nginx (`/_nuxt/`)
# ==============================================================================

APP_BASE="/var/www/sipena-ktt"
APP_DIR="${APP_BASE}/current"
LOG_DIR="/var/log/sipena"
REPO_URL="https://github.com/calvintp3-cmyk/SIPENA-KTT.git"
NGINX_SITE_NAME="sipena-ktt"
SSL_CERT_PATH="/etc/letsencrypt/live/sipena6503.caplinlab.my.id/fullchain.pem"
BACKUP_ROOT="/root/sipena-legacy-backups/$(date +%Y%m%d-%H%M%S)"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js tidak ditemukan. Instal Node.js >= 20 terlebih dahulu." >&2
  exit 1
fi

# 1. Temukan dan amankan file .env sebelum direktori target direset
ENV_CANDIDATE=""
for candidate in "${ENV_SOURCE_FILE:-}" "/tmp/sipena.env" "${APP_BASE}/.env" "${APP_DIR}/.env" "$(pwd)/.env"; do
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    ENV_CANDIDATE="$candidate"
    break
  fi
done

if [ -z "$ENV_CANDIDATE" ]; then
  echo "[ERROR] File .env tidak ditemukan di /tmp/sipena.env, ${APP_BASE}/.env, maupun ${APP_DIR}/.env." >&2
  echo "        Unggah file .env Anda ke VPS terlebih dahulu: scp .env <user>@<ip-vps>:/tmp/sipena.env" >&2
  exit 1
fi

STAGED_ENV="$(mktemp /tmp/sipena-env.XXXXXX)"
trap 'rm -f "$STAGED_ENV"' EXIT
cp "$ENV_CANDIDATE" "$STAGED_ENV"
chmod 600 "$STAGED_ENV"

echo "[1/8] Memvalidasi isi .env dari ${ENV_CANDIDATE}..."
ENV_EXPORTS="$(node - "$STAGED_ENV" <<'NODE'
const fs = require('node:fs');
const filePath = process.argv[2];
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
const env = {};

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) continue;
  const key = line.slice(0, eqIdx).trim();
  let val = line.slice(eqIdx + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

function fail(msg) {
  console.error(`[ERROR] ${msg}`);
  process.exit(1);
}

if (!env.DATABASE_URL) fail('DATABASE_URL kosong di .env');
if (env.DATABASE_URL.includes('PASSWORD_DB_ANDA')) {
  fail('DATABASE_URL masih memakai placeholder PASSWORD_DB_ANDA');
}

let dbUrl;
try {
  dbUrl = new URL(env.DATABASE_URL);
} catch {
  fail('Format DATABASE_URL tidak valid');
}

const dbUser = decodeURIComponent(dbUrl.username || '');
const dbPass = decodeURIComponent(dbUrl.password || '');
const dbName = (dbUrl.pathname || '').replace(/^\//, '');

if (!/^[a-zA-Z0-9_]+$/.test(dbUser)) fail('Username DATABASE_URL harus alfanumerik/underscore');
if (!/^[a-zA-Z0-9_]+$/.test(dbName)) fail('Nama database DATABASE_URL harus alfanumerik/underscore');
if (!dbPass || dbPass.length < 12) fail('Password database di DATABASE_URL minimal 12 karakter');
if (!env.NUXT_SESSION_PASSWORD || env.NUXT_SESSION_PASSWORD.length < 32) {
  fail('NUXT_SESSION_PASSWORD wajib minimal 32 karakter');
}
if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) {
  fail('CRON_SECRET wajib minimal 16 karakter');
}
if (!env.SUPERADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SUPERADMIN_EMAIL.trim())) {
  fail('SUPERADMIN_EMAIL wajib diisi dengan alamat Gmail / email Super Admin yang valid');
}

if (!env.GEMINI_API_KEY) {
  console.error('[WARN] GEMINI_API_KEY belum diisi — scraper AI tidak akan bisa mengklasifikasi berita sampai diisi.');
}
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.error('[WARN] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum diisi — tombol Login with Google nonaktif sampai diisi.');
}

const sq = (s) => "'" + String(s).replace(/'/g, "'\"'\"'") + "'";
console.log(`DB_USER=${sq(dbUser)}`);
console.log(`DB_PASS=${sq(dbPass)}`);
console.log(`DB_NAME=${sq(dbName)}`);
NODE
)"
eval "$ENV_EXPORTS"

echo "[2/8] Menghentikan proses PM2 lama (jika ada)..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop sipena-ktt >/dev/null 2>&1 || true
  pm2 delete sipena-ktt >/dev/null 2>&1 || true
  pm2 save --force >/dev/null 2>&1 || true
fi

echo "[3/8] Mencadangkan database & direktori lama (jika ada) ke ${BACKUP_ROOT}..."
sudo mkdir -p "$BACKUP_ROOT"
if (cd /tmp && sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'") | grep -q 1; then
  (cd /tmp && sudo -u postgres pg_dump -Fc -d "$DB_NAME") | sudo tee "${BACKUP_ROOT}/${DB_NAME}_legacy.dump" >/dev/null
  echo "       Backup DB tersimpan di ${BACKUP_ROOT}/${DB_NAME}_legacy.dump"
fi
if [ -d "$APP_DIR" ] && [ "$(ls -A "$APP_DIR" 2>/dev/null || true)" != "" ]; then
  sudo tar -czf "${BACKUP_ROOT}/sipena-ktt-app-legacy.tar.gz" -C "$APP_BASE" current
  echo "       Backup direktori app tersimpan di ${BACKUP_ROOT}/sipena-ktt-app-legacy.tar.gz"
fi
if sudo test -f "/etc/nginx/sites-available/${NGINX_SITE_NAME}"; then
  sudo cp "/etc/nginx/sites-available/${NGINX_SITE_NAME}" "${BACKUP_ROOT}/nginx-${NGINX_SITE_NAME}.legacy.conf"
fi

echo "[4/8] Mereset bersih PostgreSQL database (${DB_NAME}), role (${DB_USER}), & ekstensi pg_trgm..."
(
  cd /tmp
  sudo -u postgres psql -v ON_ERROR_STOP=1 -v db_user="$DB_USER" -v db_pass="$DB_PASS" -v db_name="$DB_NAME" <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'db_name' AND pid <> pg_backend_pid();

SELECT format('DROP DATABASE IF EXISTS %I', :'db_name') \gexec

SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user') \gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_pass') \gexec

SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8''', :'db_name', :'db_user') \gexec
SQL

  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -v db_user="$DB_USER" -v db_name="$DB_NAME" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db_name', :'db_user') \gexec
SELECT format('ALTER SCHEMA public OWNER TO %I', :'db_user') \gexec
SQL
)

echo "[5/8] Mereset bersih ${APP_DIR} & meng-clone branch main..."
sudo rm -rf "$APP_DIR"
sudo mkdir -p "$APP_DIR" "$LOG_DIR"
sudo chown -R "$(id -un):$(id -gn)" "$APP_BASE" "$LOG_DIR"

git clone --branch main "$REPO_URL" "$APP_DIR"
cp "$STAGED_ENV" "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"
if [ "$ENV_CANDIDATE" = "/tmp/sipena.env" ]; then
  rm -f /tmp/sipena.env
fi

cd "$APP_DIR"

echo "[6/8] Menginstal dependensi, migrasi Drizzle, index pg_trgm, & seed Super Admin..."
npm ci
npm run db:migrate

(
  cd /tmp
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx
  ON articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_summary_trgm_idx
  ON articles USING gin (summary gin_trgm_ops);
SQL
)

npm run db:seed

echo "[7/8] Membangun bundle produksi Nuxt 3 (Nitro node-server)..."
npm run build

echo "[8/8] Menjalankan PM2 (port 3002) & memperbarui Nginx..."
pm2 start ecosystem.config.cjs --update-env
pm2 save

if sudo test -f "$SSL_CERT_PATH"; then
  sudo cp "${APP_DIR}/deploy/nginx-sipena.conf" "/etc/nginx/sites-available/${NGINX_SITE_NAME}"
  sudo ln -sf "/etc/nginx/sites-available/${NGINX_SITE_NAME}" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
  sudo nginx -t
  sudo systemctl reload nginx
  echo "       Konfigurasi Nginx diperbarui & di-reload."
else
  echo "[WARN] Sertifikat SSL tidak ditemukan di ${SSL_CERT_PATH}; pembaruan Nginx dilewati."
  echo "       Sesuaikan path sertifikat pada ${APP_DIR}/deploy/nginx-sipena.conf secara manual."
fi

echo "Menunggu Nitro siap..."
sleep 2
curl -fsS http://127.0.0.1:3002/api/health
echo ""
echo "=============================================================================="
echo "[SELESAI] Deployment SIPENA KTT (Nuxt 3 + PostgreSQL 16 + PM2) berhasil!"
echo "Pastikan Authorized Redirect URI di Google Cloud Console terdaftar sesuai .env:"
echo "https://sipena6503.caplinlab.my.id/api/auth/google/callback"
echo "=============================================================================="

