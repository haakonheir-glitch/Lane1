import Link from "next/link";
import { cn } from "@/lib/cn";

export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-mono text-small font-medium tracking-mark text-ink", className)}>
      <span aria-hidden className="inline-block h-3 w-px bg-ink" />
      LANE
    </Link>
  );
}
