# System Architecture & Technical Specifications
## SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)
**Document Version:** 1.0.0  
**Target Environment:** Ubuntu 24.04 LTS (Biznet GIO VPS)  
**Classification:** Engineering Architecture & Operational Blueprint  

---

## 1. Complete Technology Stack

| Layer | Component | Version / Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js** | `15.x` (App Router, Server Components & Actions) | Core web application, SSR/SSG rendering, routing |
| **Language** | **TypeScript** | `5.7+` (Strict Type-Checking enabled) | Type-safe enterprise code across frontend, API, and DB |
| **UI & Styling** | **Tailwind CSS** + **shadcn/ui** | Tailwind `v4.x`, Radix UI Primitives, Lucide React | Standardized, accessible, responsive government UI |
| **Table Engine** | **TanStack Table** | `v8.x` (`@tanstack/react-table`) | High-performance data grid with client/server pagination |
| **Database** | **PostgreSQL** | `16.x` (Native on Ubuntu / Managed Biznet GIO) | Primary relational data store with JSONB & full-text search |
| **Database ORM** | **Drizzle ORM** | `drizzle-orm` + `drizzle-kit` | Lightweight TypeScript ORM, type-safe migrations and queries |
| **Connection Pooling**| **pg** (`node-postgres`) | `pg` + `@types/pg` | Connection pooling configured for Node.js long-running services |
| **Scraping Engine** | **Cheerio** & **Puppeteer** | `cheerio 1.0.x`, `puppeteer-core` (Chromium headless) | High-speed static DOM parsing with headless fallback |
| **AI Extraction SDK**| **Vercel AI SDK** | `ai` (`v4.x`), `@ai-sdk/google` | Structured generation (`generateObject`) using Gemini Flash |
| **AI Foundation Model**| **Google Gemini Flash**| `gemini-1.5-flash` / `gemini-2.0-flash` | Ultra-low latency, 1M+ context window, economic taxonomy parser |
| **Spreadsheet Engine**| **ExcelJS** | `exceljs` (`v4.x`) | Multi-sheet styled `.xlsx` generation for BPS standards |
| **Validation** | **Zod** | `zod` (`v3.24+`) | Input validation, API payload validation, and LLM output schemas |
| **Process Manager** | **PM2** | `v5.x` | Production Next.js server runtime supervisor on VPS |
| **Web Server / Proxy**| **Nginx** | `1.24+` with Let's Encrypt SSL (Certbot) | Reverse proxy, SSL termination, HTTP/2, Gzip/Brotli compression |

---

## 2. System Architecture Diagram

```
                                      INTERNET
                                         │
                        [ HTTPS / Port 443 (Let's Encrypt) ]
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │          NGINX REVERSE PROXY (Port 443)       │
                 │  - Rate Limiting / SSL Termination            │
                 │  - Static Asset Caching (/public, /_next)     │
                 └───────────────────────┬───────────────────────┘
                                         │ http://127.0.0.1:3000
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │           NEXT.JS APPLICATION SERVER          │
                 │              (PM2 Managed Instance)           │
                 │                                               │
                 │  ┌─────────────────┐   ┌───────────────────┐  │
                 │  │ App Router Pages│   │ API Route Handlers│  │
                 │  │ (Server/Client) │   │ (/api/phenomena,  │  │
                 │  │ Dashboard, Auth │   │  /api/export, etc)│  │
                 │  └────────┬────────┘   └─────────┬─────────┘  │
                 └───────────┼──────────────────────┼────────────┘
                             │                      │
                             ▼                      ▼
                 ┌───────────────────────────────────────────────┐
                 │                  DATA ACCESS                  │
                 │            Drizzle ORM (PostgreSQL)           │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │           POSTGRESQL 16 DATABASE              │
                 │   - articles (raw ingested data)              │
                 │   - economic_phenomena (extracted data)       │
                 │   - users, audit_logs                         │
                 └───────────────────────────────────────────────┘

===================================================================================
BACKGROUND CRAWLING & AI EXTRACTION SUBSYSTEM (Ubuntu 24.04 VPS)
===================================================================================

  ┌─────────────────────────┐
  │ Linux systemd / crontab │ (Fires Daily at 05:00 WITA)
  └────────────┬────────────┘
               │ Triggers CLI Worker / Secured Route
               ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 WORKER 1: NEWS INGESTION                    │
  │  - Fetch RSS & Web Category Endpoints                       │
  │  - Target: Koran Kaltara, Radar Tarakan, Tribun, Benuanta   │
  │  - Canonical URL SHA-256 deduplication                     │
  │  - Cheerio HTML parsing (Puppeteer fallback)                │
  │  - Writes into PostgreSQL 'articles' table                  │
  └─────────────────────────────┬───────────────────────────────┘
                                │ articles inserted (is_processed = false)
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │               WORKER 2: AI TAXONOMY EXTRACTOR               │
  │  - Query uncurated rows (is_processed = false)              │
  │  - Batch payload sent to Google Gemini Flash via AI SDK     │
  │  - Structured classification into KBLI 2025 & Expenditure   │
  │  - Evaluates Price/Volume transmission & Impact Direction   │
  │  - Inserts rows into 'economic_phenomena' (status: pending) │
  │  - Marks articles 'is_processed = true'                     │
  └─────────────────────────────────────────────────────────────┘
```

---

## 3. Daily Background Job (Cron) Workflow on Ubuntu 24.04 (Biznet GIO VPS)

### 3.1 Architecture of Background Execution
To ensure complete isolation between interactive user sessions and resource-heavy web crawling/AI inference, jobs are executed via independent CLI scripts running in the Node.js runtime, triggered by Linux `crontab` or `systemd.timer`.

#### Directory and Process Structure on Ubuntu:
```text
/var/www/sipena-ktt/               # Application root
├── current/                       # Active deployment (symlinked to release)
│   ├── .env.production            # Secured environment variables
│   ├── scripts/
│   │   ├── cron-ingest.ts         # Ingestion standalone CLI entrypoint
│   │   └── cron-extract.ts        # AI Extraction standalone CLI entrypoint
│   └── dist/ (or .next/standalone)
└── logs/
    ├── ingest.log                 # Rotating scraping logs
    ├── extract.log                # Rotating AI extraction logs
    └── app.log                    # PM2 runtime log
```

### 3.2 Linux Crontab Configuration
Crontab entry on the Biznet GIO Ubuntu server (`crontab -e` for user `deploy` or `root`):

```bash
# SIPENA-KTT Cron Schedules (Timezone: Asia/Makassar / WITA = UTC+8)
# Run Ingestion at 05:00 WITA (21:00 UTC previous day)
0 21 * * * cd /var/www/sipena-ktt/current && /usr/bin/npm run cron:ingest >> /var/www/sipena-ktt/logs/ingest.log 2>&1

# Run AI Extraction Pipeline at 05:30 WITA (21:30 UTC previous day)
30 21 * * * cd /var/www/sipena-ktt/current && /usr/bin/npm run cron:extract >> /var/www/sipena-ktt/logs/extract.log 2>&1
```

### 3.3 Secured HTTP Alternative (Webhook Trigger)
Both jobs are also exposed via protected Next.js API Route Handlers for ad-hoc administrative triggering or remote trigger via GitHub Actions / Cloud Scheduler:
- `POST /api/cron/ingest`
- `POST /api/cron/extract`

Both endpoints require a secure Bearer token configured in `.env.production` (`CRON_SECRET`). Any request lacking header `Authorization: Bearer <CRON_SECRET>` is rejected with HTTP `401 Unauthorized`.

### 3.4 Ingestion Pipeline Step-by-Step Execution
1. **Source Discovery**:
   - Outlets are iterated sequentially or with limited concurrency (`concurrency = 2`).
   - For outlets with RSS feeds (Koran Kaltara, Antara Kaltara), the RSS XML is parsed to collect article links from the last 48 hours.
   - For WordPress-based outlets (Benuanta), queries to `/wp-json/wp/v2/posts?categories=...&per_page=50` are dispatched.
   - For standard HTML category feeds (Radar Tarakan, Tribun Kaltara), HTML pagination pages are parsed using Cheerio selectors.
2. **Deduplication Check**:
   - The canonical URL is normalized (stripped of UTM parameters, session tokens, and anchors).
   - An SHA-256 hash is generated from the normalized URL: `crypto.createHash('sha256').update(canonicalUrl).digest('hex')`.
   - A single bulk SQL query verifies which hashes already exist in the `articles` table:
     ```sql
     SELECT url_hash FROM articles WHERE url_hash = ANY($1);
     ```
3. **Extraction & Sanitization**:
   - Non-existing URLs are fetched with custom timeout (15s) and user-agent headers.
   - Article body, title, author, and published timestamp are extracted using outlet-specific DOM mappings.
   - Fallback: If Cheerio receives an empty body due to client-side JS rendering, the URL is queued for a headless Puppeteer session.
4. **Database Insertion**:
   - Articles are inserted in batch via Drizzle ORM:
     ```typescript
     await db.insert(articles).values(newArticlesBatch).onConflictDoNothing();
     ```

### 3.5 AI Extraction Pipeline Step-by-Step Execution
1. **Queue Retrieval**:
   - Fetches uncurated articles:
     ```sql
     SELECT * FROM articles 
     WHERE is_processed = false AND is_scraped = true 
     ORDER BY published_date DESC 
     LIMIT 50;
     ```
2. **AI Inference Batching**:
   - To respect rate limits and maximize throughput, articles are processed with a concurrency pool of 3 concurrent requests.
   - Uses Vercel AI SDK's `generateObject` with Google Gemini Flash (`gemini-1.5-flash` or `gemini-2.0-flash`).
   - Schema enforcement via Zod guarantees type-safe structure adhering to KBLI 2025 and PDRB Expenditure classifications.
3. **Persist Structured Results**:
   - Inserts generated objects into `economic_phenomena` with default status `'pending'`.
   - Updates the source article record: `is_processed = true, updated_at = NOW()`.
   - If an article is determined to be non-economic (`is_economic_phenomenon = false`), it is saved with `status = 'rejected'` and note `"Auto-classified: Non-economic event"`.

---

## 4. Component Boundaries & Codebase Directory Layout

```text
sipena-ktt/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # BPS SSO / Credentials login page
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Shell with sidebar, breadcrumbs & header
│   │   │   ├── page.tsx                # Analytics Overview (Charts, metrics)
│   │   │   ├── phenomena/
│   │   │   │   ├── page.tsx            # Main Human-in-the-Loop review table
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # Detailed single phenomenon view
│   │   │   ├── articles/
│   │   │   │   └── page.tsx            # Raw articles viewer & manual scrape trigger
│   │   │   ├── export/
│   │   │   │   └── page.tsx            # Excel Export Center configuration UI
│   │   │   └── settings/
│   │   │       └── page.tsx            # Media sources & scraper configuration
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── ingest/
│   │       │   │   └── route.ts        # POST: Background news ingestion handler
│   │       │   └── extract/
│   │       │       └── route.ts        # POST: AI extraction pipeline handler
│   │       ├── phenomena/
│   │       │   ├── route.ts            # GET: Filtered query; POST: Manual create
│   │       │   ├── [id]/
│   │       │   │   └── route.ts        # PATCH: Update/approve/reject; DELETE
│   │       │   └── batch/
│   │       │       └── route.ts        # POST: Batch approval / rejection
│   │       ├── export/
│   │       │   └── excel/
│   │       │       └── route.ts        # GET: Dynamic .xlsx streaming endpoint
│   │       └── stats/
│   │           └── route.ts            # GET: Dashboard KPI metrics
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives (button, dialog, etc.)
│   │   ├── dashboard/
│   │   │   ├── header.tsx              # Navigation header with user info
│   │   │   ├── sidebar.tsx             # Collapsible application sidebar
│   │   │   ├── metrics-cards.tsx       # KPI Summary counters
│   │   │   └── sector-chart.tsx        # Phenomena distribution by KBLI (Recharts)
│   │   ├── phenomena/
│   │   │   ├── columns.tsx             # TanStack Table column definitions
│   │   │   ├── data-table.tsx          # Data table with filtering, search & pagination
│   │   │   ├── review-modal.tsx        # Side-by-side article vs AI extraction editor
│   │   │   ├── status-badge.tsx        # Visual badge for Pending, Approved, Rejected
│   │   │   └── kbli-selector.tsx       # Searchable dropdown for 17 KBLI categories
│   │   └── export/
│   │       ├── export-form.tsx         # Year & Quarter selector with sector toggles
│   │       └── preview-table.tsx       # Pre-download data verification table
│   ├── db/
│   │   ├── index.ts                    # Drizzle client & connection pool
│   │   ├── schema.ts                   # Drizzle PostgreSQL schema definitions
│   │   └── migrations/                 # Drizzle-Kit generated SQL migration files
│   ├── lib/
│   │   ├── scrapers/
│   │   │   ├── index.ts                # Orchestrator & source runner
│   │   │   ├── base-scraper.ts         # Common scraper interface and fetch helper
│   │   │   ├── koran-kaltara.ts        # Koran Kaltara scraper implementation
│   │   │   ├── radar-tarakan.ts        # Radar Tarakan scraper implementation
│   │   │   ├── tribun-kaltara.ts       # Tribun Kaltara scraper implementation
│   │   │   ├── benuanta.ts             # Benuanta scraper implementation
│   │   │   └── national-media.ts       # Keyword-based national scraper
│   │   ├── ai/
│   │   │   ├── gemini.ts               # Google Gemini client config via Vercel AI SDK
│   │   │   ├── prompts.ts              # System prompts & KBLI reference instructions
│   │   │   └── extract-phenomenon.ts   # Core `generateObject` extraction logic
│   │   ├── export/
│   │   │   └── excel-generator.ts      # ExcelJS styling, formula & layout builder
│   │   └── utils.ts                    # Formatting, hashing, string sanitizers
│   └── types/
│       ├── schema.ts                   # Inferred Drizzle database types
│       ├── ai.ts                       # Zod schemas & AI extraction interfaces
│       └── api.ts                      # API request and response payload contracts
├── scripts/
│   ├── cron-ingest.ts                  # Standalone CLI runner for ingestion
│   └── cron-extract.ts                 # Standalone CLI runner for AI extraction
├── drizzle.config.ts                   # Drizzle Kit configuration
├── next.config.ts                      # Next.js server configuration
└── package.json
```

---

## 5. Concrete API Route Specifications

### 5.1 POST `/api/cron/ingest`
- **Description**: Triggers scraping engine across registered news sources.
- **Authentication**: `Bearer <CRON_SECRET>`
- **Request Body** *(Optional)*:
  ```json
  {
    "sources": ["koran_kaltara", "radar_tarakan", "tribun_kaltara", "benuanta", "antara_kaltara"],
    "max_articles_per_source": 30
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "timestamp": "2025-03-29T05:12:44.120Z",
    "stats": {
      "scanned_urls": 84,
      "skipped_duplicates": 71,
      "inserted_articles": 13,
      "errors": 0
    }
  }
  ```

---

### 5.2 POST `/api/cron/extract`
- **Description**: Evaluates uncurated articles using Gemini Flash and populates `economic_phenomena`.
- **Authentication**: `Bearer <CRON_SECRET>`
- **Request Body** *(Optional)*:
  ```json
  {
    "batch_size": 20
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "timestamp": "2025-03-29T05:35:10.841Z",
    "processed_count": 13,
    "results": {
      "economic_phenomena_created": 8,
      "non_economic_rejected": 5,
      "failures": 0
    }
  }
  ```

---

### 5.3 GET `/api/phenomena`
- **Description**: Paginated query of economic phenomena with multi-parameter filtering.
- **Query Parameters**:
  - `status`: `pending` | `approved` | `rejected` (optional, default: `all`)
  - `quarter`: `Q1` | `Q2` | `Q3` | `Q4` (optional)
  - `year`: `2024` | `2025` | `...` (optional)
  - `kbli`: `A` | `B` | `C` | ... (optional)
  - `expenditure`: `PK_RT` | `PK_P` | `PMTB` | ... (optional)
  - `search`: string (matches summary, headline, or commodities)
  - `page`: integer (default: 1)
  - `limit`: integer (default: 20, max: 100)
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "e4b3c9a0-621f-4b0d-9a88-d6e3c8f5012a",
        "article_id": "7f1c9a20-332e-4b2a-89f1-a1b2c3d4e5f6",
        "is_economic_phenomenon": true,
        "summary": "Pemerintah Kabupaten Tana Tidung mengalokasikan Rp 45 Miliar untuk kelanjutan pembangunan jalan poros Tideng Pale - Sebawang pada Triwulan I 2025, mendorong aktivitas sektor konstruksi dan serapan APBD.",
        "kbli_category": "F",
        "kbli_subsector": "Konstruksi Jalan dan Jembatan",
        "expenditure_component": "PMTB",
        "impact_type": "positif",
        "price_volume_effect": "volume",
        "affected_commodities": ["Semen", "Aspal", "Batu Gunung"],
        "key_numerical_data": {
          "nominal_value_idr": 45000000000,
          "length_km": 12.5
        },
        "quarter": "Q1",
        "year": 2025,
        "confidence_score": 0.94,
        "status": "pending",
        "reviewer_notes": null,
        "article": {
          "title": "Pemkab Tana Tidung Kebut Pembangunan Akses Jalan Poros Sebawang",
          "url": "https://korankaltara.com/pemkab-ktt-kebut-akses-jalan-sebawang",
          "source": "koran_kaltara",
          "published_date": "2025-03-28T08:30:00.000Z"
        }
      }
    ],
    "pagination": {
      "total": 142,
      "page": 1,
      "limit": 20,
      "total_pages": 8
    }
  }
  ```

---

### 5.4 PATCH `/api/phenomena/[id]`
- **Description**: Update classification, edit summary, or change approval status of an individual phenomenon.
- **Authentication**: Required (Session-based, `editor` or `admin` role)
- **Request Body**:
  ```json
  {
    "summary": "Pemerintah Kabupaten Tana Tidung mengalokasikan Rp 45 Miliar untuk pembangunan jalan poros Sebawang...",
    "kbli_category": "F",
    "kbli_subsector": "Konstruksi Sipil Jalan",
    "expenditure_component": "PMTB",
    "impact_type": "positif",
    "price_volume_effect": "volume",
    "status": "approved",
    "reviewer_notes": "Telah diverifikasi sesuai DPA Dinas PUPR KTT TA 2025."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "e4b3c9a0-621f-4b0d-9a88-d6e3c8f5012a",
      "status": "approved",
      "verified_by": "usr_99812487123",
      "verified_at": "2025-03-29T06:15:22.401Z",
      "updated_at": "2025-03-29T06:15:22.401Z"
    }
  }
  ```

---

### 5.5 POST `/api/phenomena/batch`
- **Description**: Batch approve or reject multiple phenomena in a single transaction.
- **Request Body**:
  ```json
  {
    "ids": [
      "e4b3c9a0-621f-4b0d-9a88-d6e3c8f5012a",
      "a1c2d3e4-5566-7788-9900-aabbccddeeff"
    ],
    "action": "approved",
    "reviewer_notes": "Bulk approval for Q1 2025 verified media clippings."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "updated_count": 2
  }
  ```

---

### 5.6 GET `/api/export/excel`
- **Description**: Generates and streams a standardized `.xlsx` spreadsheet matching BPS Nerwilis consolidation formats.
- **Query Parameters**:
  - `quarter`: `Q1` | `Q2` | `Q3` | `Q4` (required)
  - `year`: integer (required, e.g. `2025`)
  - `status`: `approved` (default, only verified data is included)
- **Headers Returned**:
  ```http
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="Fenomena_Ekonomi_KTT_Q1_2025.xlsx"
  ```

