import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";

/** Page title + one context action. On mobile it also carries the wordmark and a settings link. */
export function TopBar({ title, action, meta }: { title: string; action?: ReactNode; meta?: string }) {
  return (
    <div className="sticky top-0 z-20 border-b border-rule bg-bg">
      <div className="flex h-12 items-center justify-between px-4 lg:hidden">
        <Wordmark href="/" />
        <Link href="/settings" className="label text-ink-3 transition-quiet hover:text-ink">
          Settings
        </Link>
      </div>
      <div className="flex min-h-14 items-center justify-between gap-4 border-t border-rule px-4 py-2 sm:px-8 lg:border-t-0 lg:px-12">
        <div className="flex min-w-0 items-baseline gap-4">
          <p className="truncate text-body font-medium text-ink">{title}</p>
          {meta ? <span className="hidden truncate label text-ink-3 sm:inline">{meta}</span> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
