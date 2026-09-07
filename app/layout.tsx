import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Spitball",
  description: "Turn your public GitHub portfolio into your next hackathon idea.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="wordmark" href="/">
            Spitball
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/">New ideas</Link>
            <Link href="/starred">Starred ideas</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
