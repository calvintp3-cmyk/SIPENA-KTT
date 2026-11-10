import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./design/**/*.{html,js}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-geist)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        bps: {
          navy: "#002B49",
          blue: "#0284C7",
          lightBlue: "#38BDF8",
        },
        surface: {
          canvas: "#080C14",
          panel: "#0D131F",
          card: "#131B2B",
          hover: "#1A2438",
          border: "#1E293B",
          borderStrong: "#334155",
        },
      },
    },
  },
  plugins: [],
};

export default config;

