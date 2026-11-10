import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIPENA-KTT — Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung",
  description: "Platform Kurasi & Klasifikasi Fenomena Ekonomi PDRB Kabupaten Tana Tidung (BPS 65.04)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased bg-[#080C14] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
