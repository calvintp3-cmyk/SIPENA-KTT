# System & Pipeline Architecture — SIPENA KTT

**Versi Dokumen:** 2.0.0 (Single Source of Truth — Multi-LLM Router, Smart Scraper & KBLI 2025)  
**Target Stack:** Nuxt 3/4 Compat (`future.compatibilityVersion: 4`, Nitro Engine, Vue 3 `<script setup>`, TypeScript), PostgreSQL 16 (VPS Ubuntu 24.04), Drizzle ORM, Cheerio, `@google/genai` + Groq + OpenRouter (`MultiLlmRouter`), ExcelJS (`exceljs`).

---

## 1. Arsitektur Data End-to-End

SIPENA KTT dibangun sebagai **monolit modular di atas Nuxt + Nitro**. Satu proses aplikasi Node.js melayani antarmuka SSR/SPA Vue 3, REST API endpoint (`/api/**`), mesin *smart scraper*, orkestrator klasifikasi AI multi-penyedia (`MultiLlmRouter`), serta pengekspor berkas Excel. Pendekatan ini menjaga kompleksitas deployment di VPS Ubuntu 24.04 tetap minimal tanpa memerlukan Redis atau broker terpisah.

### 1.1 Diagram Arsitektur Data End-to-End

```mermaid
flowchart TD
    subgraph SOURCES["1. Sumber Berita Eksternal"]
        R1["Tribun Kaltara (tag & regional)"]
        R2["Koran Kaltara (category/tana-tidung)"]
        R3["Benuanta (WordPress RSS feeds + index)"]
        R4["Radar Tarakan (tana-tidung)"]
        N1["Hybrid National Harvester\n1. Bing News RSS ID (direct url=)\n2. Google News RSS ID (CBMi fallback)"]
    end

    subgraph SCHEDULER["2. Scheduler & Trigger Layer (WITA UTC+8)"]
        NT["Nitro Scheduled Task\ncrawler:daily (04:00 WITA / 20:00 UTC)\ncrawler:retry-llm (06:30 WITA / 22:30 UTC)"]
        CRON["VPS Crontab Fallback\ncurl POST /api/cron/trigger\n(Header: x-cron-secret)"]
        ADM["Manual Trigger Button\nPOST /api/admin/scrapers/run & retry-llm"]
    end

    subgraph INGEST["3. Smart Crawler, Dedup, Decoder & Geo-Filter"]
        LOCK["PostgreSQL Advisory Lock (982451)\n& Orphan Recovery"]
        LIST["Phase A: Parallel Harvest (concurrency=5)\nFilter Lookback 7 Hari (WITA)"]
        FILTER_B["Phase B: Hard-Noise National Filter\n+ SHA-256 url_hash Dedup DB\n+ Title Similarity Dedup 10 Hari"]
        FETCH["Phase C: RSS Fast-Path / SSRF Safe Fetch\n+ Google News Fbv4je Decoder (cap 20)\n+ Cheerio Word Extractor (150-450 kata)"]
        GEO["Phase C.5: Deterministic Geo-Filter\nBlokir Kab. Tetangga/Provinsi Lain\n& Berita Harga Statis -> IGNORED (0 token)"]
    end

    subgraph LLM["4. Multi-LLM Router (Zero-Cost 0ms Failover)"]
        PRE["Pre-LLM Compressor\ncompressArticleTextForLlm (<=290 kata)"]
        ROUTER["MultiLlmRouter (Sliding 60s RPM/TPM Buckets)\n1. gemini:gemini-3.8-flash (FULL)\n2. groq:llama-3.3-70b-versatile (COMPACT)\n3. gemini:gemini-3.5-flash-lite (FULL)\n4. groq:llama-3.1-8b-instant (COMPACT)\n5. openrouter:free fallback chain"]
        ZOD["Zod Validator + geographic_scope Check\nKBLI 2025 (A-V) & Pengeluaran (6 Komponen)"]
        FALLBACK["Fallback Persistensi:\nllm_status = FAILED -> Antrean PENDING"]
    end

    subgraph DB["5. PostgreSQL 16 (Drizzle ORM)"]
        PG_ART[("articles")]
        PG_KW[("national_keywords")]
        PG_LOG[("scraper_logs (+ provider_stats)")]
        PG_SYN[("synthesis_drafts")]
        PG_USR[("users")]
    end

    subgraph CLIENT["6. Nuxt Server & Client App"]
        API_PUB["Public API (/api/public/**)\nHanya VERIFIED & is_economic=true"]
        API_ADM["Protected Admin API (/api/admin/**)\nGoogle OAuth Whitelist + RBAC"]
        XLSX["ExcelJS & CSV Streamer (10 Kolom)"]
        UI_PUB["Public Portal (/, /linimasa)"]
        UI_ADM["Admin Workstation (/admin/**)"]
    end

    R1 & R2 & R3 & R4 & N1 --> LIST
    PG_KW -->|"is_active = true"| N1
    NT & CRON & ADM --> LOCK --> LIST
    LIST --> FILTER_B --> FETCH --> GEO
    GEO -->|"DROP_OTHER_REGENCY_LOCAL / STATIC"| PG_ART
    GEO -->|"Lolos (REGIONAL > NATIONAL)"| PRE --> ROUTER
    ROUTER -->|"Sukses"| ZOD --> PG_ART
    ROUTER -->|"Gagal seluruh slot / Circuit Breaker"| FALLBACK --> PG_ART
    ROUTER -->|"Catat Token & provider_stats JSONB"| PG_LOG
    PG_ART & PG_LOG & PG_SYN --> API_PUB & API_ADM
    API_ADM --> XLSX
    API_PUB --> UI_PUB
    API_ADM --> UI_ADM
```

---

## 2. Pipeline Scraper Cerdas & Penjadwalan Cron

### 2.1 Enam Fase Eksekusi Harian (`executeLockedScrapePipeline`)
1. **Acquire Advisory Lock & Recovery:** Memakai `pg_try_advisory_lock(982451)` pada koneksi pool PostgreSQL + `recoverOrphanedRunningLogsInternal` untuk memulihkan log `RUNNING` yatim akibat restart server. Permintaan tumpang tindih ditolak bersih dengan HTTP `409 Conflict`.
2. **Phase A — Parallel Link Discovery:**
   - **Regional Portals (`portals.ts`):** Memanen **4 portal regional** secara paralel (`concurrency = 5`, lookback 7 hari WITA). Portal WordPress (`benuanta.co.id`) mengutamakan jalur cepat **`feedUrls` RSS XML** (`content:encoded` terstruktur) sebelum fallback ke HTML; kontainer sidebar/widget terpopuler dibuang dan URL subkanal kabupaten tetangga (`/nunukan/`, `/tarakan/`, dst. tanpa jangkar KTT) langsung ditolak.
   - **Hybrid National Harvester (`national.ts`):** Untuk setiap kata kunci aktif pada `national_keywords`, menjalankan **`Promise.allSettled` ke Bing News RSS (`bing.com/news/search?format=rss`) dan Google News RSS (`news.google.com/rss/search`)**. Bing diutamakan karena parameter `url=` pada tautan `apiclick.aspx` berisi URL penerbit asli secara langsung; jika berita yang sama muncul di Google wrapper `CBMi...`, `upsertCandidate` menggantinya dengan URL penerbit langsung.
3. **Phase B — Pre-Fetch Noise Filter, Hash Dedup & 10-Day Title Similarity Dedup:**
   - `title-filter.ts` menyaring *hard noise* khusus sumber nasional (jadwal sholat, skor bola, tarif PLN/BBM stagnan, grafik historis). Portal regional tidak pernah di-drop pada tahap judul ini.
   - Normalisasi URL + `SHA-256 url_hash` dicek batch ke tabel `articles`.
   - `dedup.ts` menjalankan deduplikasi kemiripan judul (`computeTitleSimilarity`, kombinasi Jaccard + Containment + *numeric guard* agar angka Rp 2.500 vs Rp 2.980 tidak tergabung keliru) terhadap antrean berjalan **dan** judul terarsip **10 hari terakhir** di DB. Saat bentrok antar sumber, urutan prioritas pemenang selalu `REGIONAL (300) > NATIONAL langsung (200) > Google News wrapper (100)`.
4. **Phase C — SSRF Safe Fetch, Fbv4je Decoder & Word Extractor:**
   - Kandidat RSS WordPress berteks penuh $\ge 30$ kata melewati jalur cepat tanpa *re-fetch* HTML.
   - Kandidat HTML diambil via `safeFetchText` (proteksi DNS/IP privat, HTTP timeout `7s`, batas 2 MB). Jika URL masih mendarat di wrapper JS `news.google.com`, **`google-news-decoder.ts`** mengekstrak `data-n-a-id`/`ts`/`sg` dan memanggil endpoint `batchexecute?rpcids=Fbv4je` (dibatasi `cap = 20/run`, jeda `250ms`, validasi SSRF pada endpoint dan target URL). Jika gagal atau terblokir paywall, `buildNationalFallbackSnippet` membuat cuplikan metadata netral tanpa menyisipkan lokus KTT palsu.
   - `extractor.ts` membersihkan boilerplate HTML, mem-parsing tanggal WITA, dan mengekstrak teks bersih hingga ambang 150–450 kata tersimpan.
5. **Phase C.5 — Deterministic Geographic Relevance Gate (`geo-filter.ts`):**
   - Menilai kombinasi judul, cuplikan teks, URL, dan `sourceType` untuk memblokir berita lokal eksklusif kabupaten/provinsi lain (`Nunukan/Krayan/Sebatik`, `Tarakan`, `Bulungan/Tanjung Selor`, `Malinau`, `Riau/Jambi/...`) maupun berita harga statis tanpa keterkaitan ke Kab. Tana Tidung/Kaltara makro. Artikel yang tertahan dicatat langsung sebagai `verification_status = 'IGNORED'`, `llm_model = 'geo-filter' | 'title-geo-filter'`, **menghabiskan 0 token LLM** sambil mengunci `url_hash` di database.
   - Sisa antrean diurutkan berdasarkan prioritas (`REGIONAL > NATIONAL langsung > fallback`) dan dipotong pada batas `SCRAPER_MAX_ARTICLES_PER_RUN` (default `35`).
6. **Phase D — Multi-LLM Classification Router (`router.ts`):**
   - Teks dikompres oleh `compressArticleTextForLlm` (`<= 290` kata / `<= 1.900` karakter) dan diarahkan oleh **`MultiLlmRouter`** (timeout keras `3 menit`, circuit breaker `5x` kegagalan 429 berturut-turut di seluruh slot). Seluruh telemetri per slot direkam dalam `scraper_logs.provider_stats`.

---

## 3. Orkestrasi `MultiLlmRouter`, Optimasi Token & Failover 0ms

`server/services/llm/router.ts` mengelola rantai prioritas penyedia LLM gratis berikut:
1. **`gemini:gemini-3.8-flash`** (Google AI Studio — `5 RPM / 250k TPM`, menerima `SIPENA_SYSTEM_INSTRUCTION_FULL`)
2. **`groq:llama-3.3-70b-versatile`** (Groq Cloud — `28 RPM / 11k TPM`, `1.000 RPD`, menerima `SIPENA_SYSTEM_INSTRUCTION_COMPACT`)
3. **`gemini:gemini-3.5-flash-lite`** (Google AI Studio — `10 RPM / 250k TPM`, menerima `FULL`)
4. **`groq:llama-3.1-8b-instant`** (Groq Cloud — `28 RPM / 5.6k TPM`, `14.400 RPD`, menerima `COMPACT`)
5. **`openrouter:<OPENROUTER_FREE_MODEL>`** (OpenRouter Free Models — `18 RPM / 60k TPM`, default 4 model otomatis bila `OPENROUTER_FREE_MODEL` dikosongkan: `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `nvidia/nemotron-3.5-super-vl:free`, `openrouter/free`).

Dukungan rotasi **multi-API key** tersedia via `GEMINI_API_KEYS` dan `GROQ_API_KEYS` (dipisah koma). Urutan rantai kustom juga dapat ditimpa melalui `LLM_CLASSIFY_CHAIN` dan `LLM_SYNTHESIS_CHAIN`.

### 3.1 Mekanisme Failover 0ms & Penanganan Error

| Skenario Kegagalan | Respons `MultiLlmRouter` | Status di Database |
|---|---|---|
| **Rate Limit Menit (HTTP `429` RPM / TPM Bucket Penuh)** | Slot masuk cooldown sementara (`>= 5s`, default `20s` atau header `Retry-After`) lalu **langsung lompat 0ms** (`pickNextSlot`) ke slot downstream yang `totalWaitMs === 0` (mis. `gemini-3.8-flash` → `groq:llama-3.3-70b`). | Tercatat di `provider_stats[slotId].rateLimits`; artikel tetap sukses diklasifikasi lewat slot cadangan. |
| **Kuota Harian / TPD Habis (`PerDay`, `TPD`, `RPD`, `free-models-per-day`)** | Menandai slot `disabledForSession = true` permanen untuk sisa batch tersebut dan **langsung lompat 0ms** ke slot berikutnya tanpa menunggu cooldown. | Tidak membuang waktu retry untuk kuota harian yang sudah nol. |
| **Auth Error (`401` / `403` / `API_KEY_INVALID`)** | Menonaktifkan key/slot (`disabledForSession = true`), menyensor key dari log pesan error (`sanitizeSecretFromText`), lalu lanjut ke slot berikutnya. | Pesan error bebas kebocoran secret. |
| **Transient `503` / Timeout (`> 15s`)** | Retry maksimal `1x` pada slot yang sama setelah jeda singkat (`1.5s`), jika gagal slot masuk cooldown `60s` dan berpindah ke slot lain. | Bila seluruh slot gagal, artikel tetap disimpan dengan `llm_status = 'FAILED'`, `verification_status = 'PENDING'`. |
| **JSON Rusak / Gagal Validasi Zod** | Retry `1x` dengan prompt perbaikan skema (`geographic_scope` + aturan `null`); jika masih rusak, beralih ke model lain dalam rantai. | Jika semua gagal, masuk antrean `PENDING` untuk ditinjau/di-retry. |

---

## 4. Arsitektur Keamanan & Kontrol Akses

1. **Google OAuth Whitelist + Dual Session Auth:** Login utama menggunakan Google OAuth 2.0 bagi akun staf terdaftar di tabel `users`, didampingi fallback password (`Scrypt`/`Argon2`) terenkripsi di `nuxt-auth-utils` + verifikasi `user.tokenVersion` dan `isActive = true`.
2. **SSRF & Sanitasi Formula:** `ssrf.ts` memvalidasi skema `http/https`, menolak kredensial URL, melakukan lookup DNS sebelum koneksi, dan memblokir seluruh IP privat/reserved IPv4 & IPv6 (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`). Ekspor `.csv` menetralkan awalan berbahaya (`=`, `+`, `-`, `@`).
3. **Observability & Keamanan Kunci:** Semua secret (`DATABASE_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_SECRET`, `NUXT_SESSION_PASSWORD`, `CRON_SECRET`) hanya dimuat di `runtimeConfig` server; `sanitizeSecretFromText` melindungi log dari kebocoran token.

---

## 5. Struktur Folder Proyek Aktual

```text
sipena-ktt/
├── .env.example                          # Template ENV lengkap (Multi-LLM, Google OAuth, Scraper)
├── ecosystem.config.cjs                  # Konfigurasi PM2 fork single-instance
├── nuxt.config.ts                        # Nuxt 4 compat, Nuxt UI v3, ECharts, Nitro Tasks & runtimeConfig
├── drizzle.config.ts                     # Konfigurasi migrasi Drizzle Kit PostgreSQL
├── docs/                                 # Dokumentasi arsitektur, skema, prompt, desain, & PRD
├── shared/
│   ├── enums/pdrb.ts                     # KBLI 2025 (A-V) -> 17 Sektor PDRB, formatLapusLabel, 6 Pengeluaran
│   ├── schemas/                          # article.schema.ts, auth.schema.ts, keyword.schema.ts, llm-output.schema.ts, synthesis.schema.ts
│   └── utils/                            # pdrb-colors.ts, period.ts
├── app/
│   ├── components/                       # public/*, admin/* (termasuk ScraperLogTable.vue), shared/AppChart.vue
│   ├── composables/                      # usePdrbLabels.ts (+ formatLlmProviderBadge), useExcelExport.ts
│   └── pages/                            # /, /linimasa, /login, /admin/{index,trends,synthesis,review,articles,portals,keywords,taxonomy,scrapers,users}
├── server/
│   ├── db/
│   │   ├── schema.ts, index.ts, seed.ts
│   │   ├── archive-nonktt.ts             # Skrip pengarsipan aman berita non-KTT historis -> IGNORED
│   │   └── migrations/                   # SQL migrations (0000..0002_kbli_2025_and_multi_llm_telemetry.sql)
│   ├── services/
│   │   ├── analytics/pdrb-analytics.ts   # Agregasi dashboard 17x6, tren q-to-q/y-on-y, fallback BRS
│   │   ├── scraper/                      # portals.ts, national.ts, extractor.ts, dedup.ts, google-news-decoder.ts, geo-filter.ts, title-filter.ts, pipeline.ts
│   │   ├── llm/                          # router.ts, openai-compat.ts, gemini-client.ts, classifier.ts
│   │   └── export/                       # excel.ts, csv.ts
│   ├── tasks/crawler/                    # daily.ts (04:00 WITA), retry-llm.ts (06:30 WITA)
│   └── api/                              # auth/*, cron/trigger.post.ts, health.get.ts, public/*, admin/**
└── tests/                                # Vitest suite (pdrb-analytics, pdrb-colors, llm-schema, llm-router, smart-scraper, scraper-pipeline, synthesis-drafts, extractor, period, export-excel)
```

---

## 6. Deployment VPS Ubuntu 24.04

1. **Migrasi Skema & Backfill KBLI 2025:** `npx drizzle-kit migrate` (mengeksekusi `0002_kbli_2025_and_multi_llm_telemetry.sql` yang mengonversi kode lama ke KBLI 2025 `A–V`, memperbarui `synthesis_drafts.target_code`, dan menambah kolom `scraper_logs.provider_stats`).
2. **Audit Berita Non-KTT Lama (Opsional Non-Destruktif):** `npm run db:archive-nonktt -- --dry-run` lalu `npm run db:archive-nonktt -- --apply` untuk mengarsipkan artikel lama non-KTT menjadi `IGNORED` tanpa menghapus `url_hash`.
3. **Build & PM2:** `npm run build` lalu jalankan `ecosystem.config.cjs` dalam mode **`fork` (1 instance)** agar Nitro `scheduledTasks` (`04:00 WITA` & `06:30 WITA`) tidak tereksekusi ganda.
