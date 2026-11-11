// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'rose',
      info: 'sky',
    },
    card: {
      slots: {
        root: 'rounded-xl ring-1 ring-slate-200/80 bg-white shadow-xs',
      },
    },
    badge: {
      defaultVariants: {
        variant: 'subtle',
        size: 'sm',
      },
    },
    table: {
      slots: {
        th: 'text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/80 py-2.5 px-3',
        td: 'py-2.5 px-3 text-sm text-slate-700 align-top',
      },
    },
  },
});

