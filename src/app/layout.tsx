import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { themeScript } from "@/components/shell/theme-script";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} — ${BRAND.tagline.replace(/\.$/, "")}`, template: `%s · ${BRAND.name}` },
  description: SITE_DESCRIPTION,
  openGraph: { type: "website", siteName: BRAND.name, title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/", locale: "en_GB" },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  // Light is the default whatever the system setting; dark comes only from the toggle.
  themeColor: "#F7F7F5",
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
