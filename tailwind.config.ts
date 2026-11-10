import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      colors: {
        obsidian: "#0F172A",
        emeraldBrand: {
          DEFAULT: "#059669",
          deep: "#047857",
          soft: "#ECFDF5",
          border: "#A7F3D0",
        },
        bps: {
          navy: "#0F172A",
          blue: "#059669",
          lightBlue: "#10B981",
        },
        canvas: "var(--bg-canvas)",
        surface: "var(--bg-surface)",
        subtle: "var(--bg-subtle)",
        hover: "var(--bg-hover)",
        selected: "var(--bg-selected)",
        rail: "var(--bg-surface)",
        ink: "var(--text-primary)",
        "ink-secondary": "var(--text-secondary)",
        "ink-muted": "var(--text-muted)",
        hairline: "var(--border-hairline)",
        line: "var(--border-subtle)",
        "line-strong": "var(--border-input)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        card: "var(--shadow-card)",
        elevated: "var(--shadow-floating)",
        floating: "var(--shadow-floating)",
      },
    },
  },
  plugins: [],
};

export default config;
