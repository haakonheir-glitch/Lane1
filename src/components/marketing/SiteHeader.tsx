import Link from "next/link";
import { Wordmark } from "@/components/shell/Wordmark";
import { ButtonLink } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-bg">
      <div className="page flex h-14 items-center justify-between gap-6">
        <Wordmark />
        <nav aria-label="Site" className="flex items-center gap-6">
          <Link href="/method" className="hidden text-small text-ink-2 transition-quiet hover:text-ink sm:inline">
            Method
          </Link>
          <Link href="/#sample" className="hidden text-small text-ink-2 transition-quiet hover:text-ink md:inline">
            Sample report
          </Link>
          <Link href="/assess" className="text-small text-ink-2 transition-quiet hover:text-ink">
            Sign in
          </Link>
          <ButtonLink href="/start" size="sm" variant="secondary">
            Start
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
