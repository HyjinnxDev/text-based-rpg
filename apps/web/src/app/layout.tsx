import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Text-Based RPG",
  description: "Persistent AI-driven text RPG campaigns",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
