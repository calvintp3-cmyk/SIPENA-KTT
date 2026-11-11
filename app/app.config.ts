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
        root: 'rounded-2xl ring-1 ring-slate-900/[0.08] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)]',
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
        th: 'text-[11px] font-bold uppercase tracking-wider text-[#5B677A] bg-[#F8FAFC] py-2.5 px-3 border-b border-[#DCE3EC] whitespace-nowrap',
        td: 'py-3 px-3 text-[13px] text-[#334155] align-top',
      },
    },
  },
});
