# Panduan Deployment Produksi & Operasional SIPENA-KTT

Dokumen ini menjadi rujukan resmi deployment **SIPENA-KTT** pada VPS **Ubuntu 24.04 LTS (Biznet GIO)** menggunakan **PostgreSQL 16**, **PM2** (port terisolasi `3002`), **Nginx**, dan **Linux Crontab**.

---

## 1. Isolasi Lingkungan VPS

Untuk menjaga layanan lain pada VPS tetap berjalan tanpa gangguan, SIPENA-KTT menggunakan sumber daya yang sepenuhnya terisolasi:

| Komponen | Nilai SIPENA-KTT | Catatan Isolasi |
| :--- | :--- | :--- |
| Direktori Aplikasi | `/var/www/sipena-ktt/current` | Terpisah dari `/var/www/` layanan lain |
| Port Node.js (PM2) | `127.0.0.1:3002` | Tidak menyentuh port `3000`, `3001`, `8080`, `8001` |
| Nama Proses PM2 | `sipena-ktt` | `instances: 1`, `exec_mode: "fork"` |
| Database PostgreSQL | `sipena_ktt` (user `sipena_app`) | Terpisah dari database aplikasi lain |
| Direktori Log | `/var/log/sipena/` | Log aplikasi & cron terpisah |

---

## 2. Akun Awal Staf BPS Kabupaten Tana Tidung (`65.04`)

Setelah skrip seed dijalankan (`npm run db:seed`), akun berikut tersedia:

| Email | Peran (`role`) | Hak Akses |
| :--- | :--- | :--- |
| `admin@bps6504.go.id` | `admin` | Penuh (kelola sistem, verifikasi, picu cron, ekspor) |
| `analis@bps6504.go.id` | `editor` | Kurasi, edit KBLI/Pengeluaran, approve/reject, picu cron, ekspor |
| `viewer@bps6504.go.id` | `viewer` | Lihat dashboard, tabel baca-saja, dan unduh Excel |

> **Penting Keamanan:** Password bawaan seed adalah `BpsKtt6504!`. Segera perbarui password seluruh akun produksi setelah deployment perdana dan jangan pernah membagikan `.env.production`.

---

## 3. Persiapan `.env.production` di VPS

Buat berkas `/var/www/sipena-ktt/current/.env.production` dengan izin akses `chmod 600 .env.production`:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://sipena_app:<PASSWORD_DB_AMAN>@127.0.0.1:5432/sipena_ktt"
GOOGLE_GENERATIVE_AI_API_KEY="<GEMINI_API_KEY_AKTIF>"
GEMINI_MODEL="gemini-3.8-flash"
CRON_SECRET="<MIN_32_KARAKTER_HEX_ACAK>"
AUTH_SECRET="<MIN_32_KARAKTER_HEX_ACAK>"
NEXT_PUBLIC_APP_URL="https://sipena.domainanda.go.id"
```

Cara membuat token acak 32-byte di Linux:
```bash
openssl rand -hex 32
```

---

## 4. Langkah Deployment di VPS Ubuntu 24.04

1. Clone repositori ke VPS:
   ```bash
   sudo mkdir -p /var/www/sipena-ktt /var/log/sipena
   sudo chown -R $USER:$USER /var/www/sipena-ktt /var/log/sipena
   git clone https://github.com/calvintp3-cmyk/SIPENA-KTT.git /var/www/sipena-ktt/current
   ```
2. Salin & isi `.env.production` di `/var/www/sipena-ktt/current/.env.production`.
3. Jalankan skrip deployment otomatis (pertama kali aktifkan `RUN_SEED=1` bila database masih kosong):
   ```bash
   cd /var/www/sipena-ktt/current
   chmod +x deploy/setup-vps.sh
   RUN_SEED=1 ./deploy/setup-vps.sh
   ```
4. Verifikasi kesehatan aplikasi:
   ```bash
   pm2 status
   curl -fsS http://127.0.0.1:3002/api/health
   ```

---

## 5. Konfigurasi Nginx & SSL (Certbot)

1. Salin `deploy/nginx-sipena.conf` ke Nginx dan sesuaikan `server_name`:
   ```bash
   sudo cp /var/www/sipena-ktt/current/deploy/nginx-sipena.conf /etc/nginx/sites-available/sipena-ktt
   sudo nano /etc/nginx/sites-available/sipena-ktt
   sudo ln -s /etc/nginx/sites-available/sipena-ktt /etc/nginx/sites-enabled/sipena-ktt
   sudo nginx -t && sudo systemctl reload nginx
   ```
2. Terbitkan sertifikat HTTPS gratis via Let's Encrypt:
   ```bash
   sudo certbot --nginx -d <DOMAIN_SIPENA_ANDA>
   ```

---

## 6. Penjadwalan Otomatis Harian (`crontab -e`)

Jadwal berikut mengeksekusi penarikan berita pukul **05:00 WITA** (`21:00 UTC` hari sebelumnya) dan ekstraksi Gemini Flash pukul **05:30 WITA** (`21:30 UTC`):

```cron
# Server time zone note: sesuaikan jam dengan timezone host VPS (`timedatectl`).
# Pada host WIB (+0700): 04:00 WIB = 05:00 WITA, 04:30 WIB = 05:30 WITA.
# Pada host UTC (+0000): 21:00 UTC = 05:00 WITA, 21:30 UTC = 05:30 WITA.

# SIPENA-KTT — Scraping Berita Kaltara & Nasional (05:00 WITA pada host WIB)
0 4 * * * cd /var/www/sipena-ktt/current && /usr/bin/env NODE_ENV=production /usr/bin/npm run cron:ingest >> /var/log/sipena/ingest.log 2>&1

# SIPENA-KTT — Ekstraksi AI Taksonomi KBLI & Pengeluaran (05:30 WITA pada host WIB)
30 4 * * * cd /var/www/sipena-ktt/current && /usr/bin/env NODE_ENV=production /usr/bin/npm run cron:extract >> /var/log/sipena/extract.log 2>&1
```

### Pemecahan Masalah Cron & Log
- Lihat log penarikan berita: `tail -n 100 /var/log/sipena/ingest.log`
- Lihat log AI Gemini: `tail -n 100 /var/log/sipena/extract.log`
- Lihat log aplikasi Next.js: `pm2 logs sipena-ktt --lines 100`
- Jalankan manual dari SSH:
  ```bash
  cd /var/www/sipena-ktt/current
  NODE_ENV=production npm run cron:ingest
  NODE_ENV=production npm run cron:extract
  ```

