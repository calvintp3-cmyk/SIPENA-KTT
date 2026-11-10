interface BrandMarkProps {
  size?: "sm" | "md";
  tone?: "navy" | "adaptive";
}

export function BrandMark({
  size = "md",
  tone = "navy",
}: BrandMarkProps) {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const wrapperClass =
    tone === "navy"
      ? "border-sky-400/30 bg-[#103860] text-sky-300"
      : "border-[var(--border-strong)] bg-[#0A2540] text-sky-300 dark:border-sky-500/30 dark:bg-[#0E243D]";

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg border ${dim} ${wrapperClass}`}
    >
      <svg
        viewBox="0 0 28 28"
        fill="none"
        className={size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5"}
      >
        {/* Geometric statistical balance / Neraca columns + cross-account fulcrum */}
        <path
          d="M5 21.5H23"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect
          x="6.5"
          y="13"
          width="3.5"
          height="6"
          rx="0.75"
          fill="currentColor"
          fillOpacity="0.65"
        />
        <rect
          x="12.25"
          y="8.5"
          width="3.5"
          height="10.5"
          rx="0.75"
          fill="currentColor"
          fillOpacity="0.9"
        />
        <rect
          x="18"
          y="5.5"
          width="3.5"
          height="13.5"
          rx="0.75"
          fill="#38BDF8"
        />
      </svg>
    </div>
  );
}
