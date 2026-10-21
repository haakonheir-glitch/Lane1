import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { themeScript } from "@/components/shell/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lane — Evidence, not horoscopes", template: "%s · Lane" },
  description:
    "Find the work you're built for, with evidence. A validated profile, short real-world trials and outcome tracking over time.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-surface focus:px-3 focus:py-2 focus:text-small"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
