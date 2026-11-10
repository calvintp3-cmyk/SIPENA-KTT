import type { Metadata } from "next";
import { Geist, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIPENA-KTT — Sistem Informasi Fenomena Ekonomi & Neraca Tana Tidung",
  description:
    "Platform kurasi fenomena ekonomi daerah untuk kompilasi PDRB Kabupaten Tana Tidung (BPS 65.04).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`dark ${inter.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#080C14] font-sans text-slate-100 antialiased selection:bg-sky-500/20 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
