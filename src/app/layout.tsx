import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIPENA-KTT: Sistem Informasi Fenomena Ekonomi & Neraca Tana Tidung",
  description:
    "Platform kurasi fenomena ekonomi daerah dan analitik PDRB Kabupaten Tana Tidung (BPS 65.04).",
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('sipena-theme-v3');var m=s==='dark'?'dark':'light';var r=document.documentElement;r.classList.toggle('dark',m==='dark');r.dataset.theme=m;var meta=document.querySelector('meta[name="color-scheme"]');if(meta)meta.setAttribute('content',m);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-canvas)] font-sans text-[var(--text-primary)] antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--text-primary)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
