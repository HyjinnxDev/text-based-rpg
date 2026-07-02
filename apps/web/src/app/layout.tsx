import type { Metadata, Viewport } from "next";
import { DM_Sans, Literata } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Text-Based RPG",
  description: "Persistent AI-driven text RPG campaigns",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090807",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${literata.variable}`}>
      <body className="min-h-dvh antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
