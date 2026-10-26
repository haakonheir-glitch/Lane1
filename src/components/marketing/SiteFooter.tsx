import Link from "next/link";
import { ThemeCycle } from "@/components/shell/ThemeToggle";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-rule">
      <div className="page flex flex-col gap-6 py-10 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="label text-ink-3">{BRAND.name} · v0.1 · Oslo</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/method" className="label text-ink-3 transition-quiet hover:text-ink">Method</Link>
          {/* The design system is a development tool: no link (and no route) in production. */}
          {process.env.NODE_ENV !== "production" ? (
            <Link href="/system" className="label text-ink-3 transition-quiet hover:text-ink">Design system</Link>
          ) : null}
          <Link href="/settings" className="label text-ink-3 transition-quiet hover:text-ink">Privacy &amp; data</Link>
          <ThemeCycle />
        </nav>
      </div>
    </footer>
  );
}
