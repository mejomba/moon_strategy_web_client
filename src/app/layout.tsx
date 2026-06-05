import type { Metadata } from "next";
import "./globals.css";

import { Nav } from "@/components/Nav";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP_NAME} — backtest & build trading strategies`,
  description:
    "No-code platform to build, backtest, and optimize crypto trading strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <LegalDisclaimer variant="footer" />
          </div>
        </footer>
      </body>
    </html>
  );
}
