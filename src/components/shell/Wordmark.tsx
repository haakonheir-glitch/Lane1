import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

/** The brand's set name: a hairline bar and the name in spaced mono caps. Renamed via BRAND. */
export function Wordmark({ href = "/", className }: { href?: string | null; className?: string }) {
  const body = (
    <>
      <span aria-hidden className="inline-block h-3 w-px bg-ink" />
      {BRAND.upper}
    </>
  );
  const cls = cn("inline-flex items-center gap-2 font-mono text-small font-medium tracking-mark text-ink", className);
  return href === null ? <span className={cls}>{body}</span> : <Link href={href} className={cls} aria-label={`${BRAND.name}, home`}>{body}</Link>;
}
