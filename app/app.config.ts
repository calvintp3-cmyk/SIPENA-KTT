// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      secondary: 'emerald',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'rose',
      info: 'sky',
    },
    card: {
      slots: {
        root: 'rounded-2xl ring-1 ring-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-12px_rgba(37,99,235,0.08)]',
      },
    },
    button: {
      slots: {
        base: 'rounded-xl font-semibold transition-all duration-150 cursor-pointer',
      },
    },
    badge: {
      slots: {
        base: 'rounded-full font-medium tabular-nums',
      },
      defaultVariants: {
        variant: 'subtle',
        size: 'sm',
      },
    },
    input: {
      slots: {
        base: 'rounded-xl',
      },
    },
    select: {
      slots: {
        base: 'rounded-xl cursor-pointer',
        content: 'rounded-xl shadow-xl ring-slate-200/90',
      },
    },
    selectMenu: {
      slots: {
        base: 'rounded-xl cursor-pointer',
        content: 'rounded-xl shadow-xl ring-slate-200/90',
      },
    },
    table: {
      slots: {
        th: 'text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50/95 py-3 px-3.5 border-b border-slate-200 whitespace-nowrap',
        td: 'py-3.5 px-3.5 text-[13px] text-slate-700 align-top',
      },
    },
  },
});
