// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/icon'],

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
    typescript: {
      tsConfig: {
        exclude: ['../000 - SKILLS_cleaned', '../.agents', '../nuxt.config.ts'],
      },
    },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',
    cronSecret: process.env.CRON_SECRET || '',
    enableNitroCron: process.env.ENABLE_NITRO_CRON !== 'false',
    scraperMaxLlmCallsPerRun: Number(process.env.SCRAPER_MAX_LLM_CALLS_PER_RUN || 150),
    public: {
      appName: 'SIPENA KTT',
      timezone: 'Asia/Makassar',
    },
  },
});

