import Link from "next/link";
import { ThemeCycle } from "@/components/shell/ThemeToggle";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-rule">
      <div className="page flex flex-col gap-6 py-10 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="label text-ink-3">Lane · v0.1 · Oslo</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/method" className="label text-ink-3 transition-quiet hover:text-ink">Method</Link>
          <Link href="/system" className="label text-ink-3 transition-quiet hover:text-ink">Design system</Link>
          <Link href="/settings" className="label text-ink-3 transition-quiet hover:text-ink">Privacy &amp; data</Link>
          <ThemeCycle />
        </nav>
      </div>
    </footer>
  );
}
