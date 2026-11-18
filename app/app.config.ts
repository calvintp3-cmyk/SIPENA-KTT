// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      secondary: 'teal',
      neutral: 'stone',
      success: 'emerald',
      warning: 'amber',
      error: 'rose',
      info: 'sky',
    },
    card: {
      slots: {
        root: 'rounded-2xl ring-1 ring-[rgba(20,25,23,0.08)] bg-white shadow-[0_1px_2px_rgba(20,25,23,0.03),0_8px_24px_-12px_rgba(20,25,23,0.06)]',
      },
    },
    button: {
      slots: {
        base: 'rounded-xl font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 cursor-pointer',
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
        content: 'rounded-xl shadow-xl ring-1 ring-[rgba(20,25,23,0.1)] bg-white',
      },
    },
    selectMenu: {
      slots: {
        base: 'rounded-xl cursor-pointer',
        content: 'rounded-xl shadow-xl ring-1 ring-[rgba(20,25,23,0.1)] bg-white',
      },
    },
    modal: {
      slots: {
        overlay: 'bg-[#141917]/40 backdrop-blur-xs',
        content: 'rounded-2xl ring-1 ring-[rgba(20,25,23,0.08)] bg-white shadow-2xl',
      },
    },
    slideover: {
      slots: {
        overlay: 'bg-[#141917]/40 backdrop-blur-xs',
        content: 'bg-[#F6F5F1] shadow-2xl ring-1 ring-[rgba(20,25,23,0.08)]',
      },
    },
    table: {
      slots: {
        th: 'text-[11px] font-semibold uppercase tracking-wider text-[#4A524E] bg-[#F0EFE9] py-3 px-3.5 border-b border-[rgba(20,25,23,0.08)] whitespace-nowrap',
        td: 'py-3.5 px-3.5 text-[13px] text-[#141917] align-top',
      },
    },
  },
});
