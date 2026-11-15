// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/icon', 'motion-v/nuxt', 'nuxt-echarts'],

  css: ['~/assets/css/main.css'],

  ui: {
    colorMode: false,
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },

  echarts: {
    renderer: ['canvas'],
    charts: ['BarChart', 'LineChart', 'PieChart'],
    components: ['GridComponent', 'TooltipComponent', 'LegendComponent', 'TitleComponent'],
    features: ['UniversalTransition', 'LabelLayout'],
  },

  experimental: {
    viewTransition: true,
  },

  icon: {
    provider: 'server',
    fallbackToApi: 'server-only',
  },

  app: {
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    layoutTransition: {
      name: 'layout',
      mode: 'out-in',
    },
    head: {
      htmlAttrs: {
        lang: 'id',
      },
      title: 'SIPENA KTT — Sistem Pemantauan Fenomena Ekonomi Kab. Tana Tidung',
      meta: [
        {
          name: 'description',
          content:
            'Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan.',
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
    geminiApiKeys: process.env.GEMINI_API_KEYS || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqApiKeys: process.env.GROQ_API_KEYS || '',
    cerebrasApiKey: process.env.CEREBRAS_API_KEY || '',
    cerebrasApiKeys: process.env.CEREBRAS_API_KEYS || '',
    mistralApiKey: process.env.MISTRAL_API_KEY || '',
    mistralApiKeys: process.env.MISTRAL_API_KEYS || '',
    nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
    nvidiaApiKeys: process.env.NVIDIA_API_KEYS || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterApiKeys: process.env.OPENROUTER_API_KEYS || '',
    openrouterFreeModel: process.env.OPENROUTER_FREE_MODEL || '',
    llmClassifyChain: process.env.LLM_CLASSIFY_CHAIN || '',
    llmSynthesisChain: process.env.LLM_SYNTHESIS_CHAIN || '',
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',
    cronSecret: process.env.CRON_SECRET || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    enableNitroCron: process.env.ENABLE_NITRO_CRON !== 'false',
    enableGdeltMacro: process.env.ENABLE_GDELT_MACRO !== 'false',
    scraperMaxLlmCallsPerRun: Number(process.env.SCRAPER_MAX_LLM_CALLS_PER_RUN || 150),
    scraperMaxArticlesPerRun: Number(process.env.SCRAPER_MAX_ARTICLES_PER_RUN || 35),
    public: {
      appName: 'SIPENA KTT',
      timezone: 'Asia/Makassar',
    },
  },
});

