interface BrandMarkProps {
  size?: "sm" | "md";
  tone?: "emerald" | "obsidian" | "navy" | "adaptive";
}

export function BrandMark({
  size = "md",
  tone = "emerald",
}: BrandMarkProps) {
  const dim = size === "sm" ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-xl";
  const wrapperClass =
    tone === "obsidian" || tone === "navy"
      ? "border-slate-800 bg-slate-900 text-emerald-400 shadow-xs"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300";

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border ${dim} ${wrapperClass}`}
    >
      <svg
        viewBox="0 0 28 28"
        fill="none"
        className={size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5"}
      >
        <path
          d="M5 21.5H23"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <rect
          x="6.5"
          y="13.5"
          width="3.6"
          height="5.5"
          rx="1"
          fill="currentColor"
          fillOpacity="0.45"
        />
        <rect
          x="12.2"
          y="9"
          width="3.6"
          height="10"
          rx="1"
          fill="currentColor"
          fillOpacity="0.72"
        />
        <rect
          x="17.9"
          y="5.5"
          width="3.6"
          height="13.5"
          rx="1"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
