import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLOY & NAN — In Full Bloom",
  description: "Wedding invitation of Ploy & Nan — 22 November 2026",
  icons: {
    icon: "/favicon-heart.svg",
    shortcut: "/favicon-heart.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
