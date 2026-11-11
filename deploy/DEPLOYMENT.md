# Panduan Deployment VPS Ubuntu 24.04 — SIPENA KTT (Nuxt 3)

## 1. Build & Persiapan Database di VPS

Jalankan di direktori aplikasi VPS (mis. `/var/www/sipena-ktt`):

```bash
# 1. Pastikan file .env sudah terisi sesuai .env.example
#    (DATABASE_URL, GEMINI_API_KEY, NUXT_SESSION_PASSWORD, CRON_SECRET,
#     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD)
cp -n .env.example .env

# 2. Instal dependensi & build output Nitro node-server
npm ci
npm run build

# 3. Jalankan migrasi skema PostgreSQL & seeding awal (admin + keyword)
npx drizzle-kit migrate
npm run db:seed
```

> **Google OAuth Redirect URI:** Daftarkan `https://sipena6503.caplinlab.my.id/api/auth/google/callback` di Google Cloud Console → *Credentials* → *Authorized redirect URIs*. Hanya alamat Gmail/Google yang sudah didaftarkan & aktif pada menu **Kelola Akses Admin** (`/admin/users`) yang dapat masuk.

## 2. Jalankan via PM2 (`ecosystem.config.cjs`, Port `3002`)

```bash
sudo mkdir -p /var/log/sipena
sudo chown -R $USER:$USER /var/log/sipena

pm2 start ecosystem.config.cjs --update-env
pm2 save
```

> **Penting:** Biarkan `exec_mode: 'fork'` dan `instances: 1` di `ecosystem.config.cjs` agar scheduler internal Nitro (`0 20 * * *` / `04:00 WITA` dan `30 22 * * *` / `06:30 WITA`) hanya berjalan satu kali per jadwal.

## 3. Update Konfigurasi Nginx (`/_next/static/` -> `/_nuxt/`)

Salin konfigurasi pada `deploy/nginx-sipena.conf` ke `/etc/nginx/sites-available/sipena-ktt` (perubahan utama dari versi Next.js lama adalah mengganti `location /_next/static/` menjadi `location /_nuxt/` serta `location /_fonts/`):

```bash
sudo cp deploy/nginx-sipena.conf /etc/nginx/sites-available/sipena-ktt
sudo ln -sf /etc/nginx/sites-available/sipena-ktt /etc/nginx/sites-enabled/sipena-ktt
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Verifikasi Pasca-Deploy

```bash
curl -s http://127.0.0.1:3002/api/health
curl -sI https://sipena6503.caplinlab.my.id/
```

