"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "sipena-theme-v3";

interface ThemeContextValue {
  theme: ThemeMode;
  mounted: boolean;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  mounted: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.theme = mode;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute("content", mode);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const initial: ThemeMode = stored === "dark" ? "dark" : "light";
      setThemeState(initial);
      applyThemeToDocument(initial);
    } catch {
      applyThemeToDocument("light");
    }
    setMounted(true);

    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const synced: ThemeMode = e.newValue === "dark" ? "dark" : "light";
      setThemeState(synced);
      applyThemeToDocument(synced);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyThemeToDocument(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage quota / privacy mode errors cleanly
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, mounted, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = "" }: ThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && theme === "dark";
  const label = isDark ? "Mode Terang" : "Mode Gelap";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ubah tampilan ke mode terang" : "Ubah tampilan ke mode gelap"}
      aria-pressed={isDark}
      title={label}
      className={`btn-secondary inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-[36px] ${className}`}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
      )}
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
