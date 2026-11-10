import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getQuarterFromDate(date: Date): "Q1" | "Q2" | "Q3" | "Q4" {
  const month = date.getUTCMonth() + 1;
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

export function formatIndonesianDate(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(d);
}

export function formatShortDate(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(d);
}

export function safeExternalHref(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
