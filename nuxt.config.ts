// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/icon'],

  css: ['~/assets/css/main.css'],

  ui: {
    colorMode: false,
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'id',
      },
      title: 'SIPENA KTT — Sistem Informasi Pencari Fenomena Ekonomi Kab. Tana Tidung',
      meta: [
        {
          name: 'description',
          content:
            'Pemantauan harian fenomena ekonomi Kabupaten Tana Tidung berbasis pemetaan dua sisi PDRB (KBLI & Pengeluaran).',
        },
      ],
    },
  },

  typescript: {
    strict: true,
    tsConfig: {
      exclude: ['../000 - SKILLS_cleaned', '../.agents'],
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // 20:00 UTC = 04:00 WITA (Asia/Makassar) setiap dini hari
      '0 20 * * *': ['crawler:daily'],
      // 22:30 UTC = 06:30 WITA: sapuan ulang otomatis artikel llm_status = 'FAILED'
      '30 22 * * *': ['crawler:retry-llm'],
    },
    typescript: {
      tsConfig: {
        exclude: ['../app', '../000 - SKILLS_cleaned', '../.agents', '../nuxt.config.ts', '../vitest.config.ts'],
      },
    },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',
    cronSecret: process.env.CRON_SECRET || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    enableNitroCron: process.env.ENABLE_NITRO_CRON !== 'false',
    scraperMaxLlmCallsPerRun: Number(process.env.SCRAPER_MAX_LLM_CALLS_PER_RUN || 150),
    public: {
      appName: 'SIPENA KTT',
      timezone: 'Asia/Makassar',
    },
  },
});

