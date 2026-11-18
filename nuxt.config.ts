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
      { name: 'Bricolage Grotesque', provider: 'google', weights: [500, 600, 700, 800] },
      { name: 'Manrope', provider: 'google', weights: [400, 500, 600, 700, 800] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600] },
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

  vite: {
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
              return 'echarts';
            }
            if (id.includes('node_modules/exceljs')) {
              return 'exceljs';
            }
          },
        },
      },
    },
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
        { property: 'og:site_name', content: 'SIPENA KTT' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'id_ID' },
        { property: 'og:title', content: 'SIPENA KTT — Sistem Pemantauan Fenomena Ekonomi Kab. Tana Tidung' },
        {
          property: 'og:description',
          content:
            'Portal intelijen pemantauan 17 sektor KBLI dan 6 komponen pengeluaran PDRB Kabupaten Tana Tidung oleh BPS Kab. Tana Tidung.',
        },
        { property: 'og:image', content: 'https://sipena6503.caplinlab.my.id/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'SIPENA KTT — Badan Pusat Statistik Kabupaten Tana Tidung' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'SIPENA KTT — Sistem Pemantauan Fenomena Ekonomi Kab. Tana Tidung' },
        {
          name: 'twitter:description',
          content:
            'Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan.',
        },
        { name: 'twitter:image', content: 'https://sipena6503.caplinlab.my.id/og-image.png' },
        { name: 'theme-color', content: '#0B3D2E' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
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

