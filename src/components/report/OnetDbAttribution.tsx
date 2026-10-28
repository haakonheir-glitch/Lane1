import { ONET_DB_ATTRIBUTION, ONET_DB_LICENSE_URL } from "@/lib/workdesign/attribution";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * CC BY 4.0 attribution for the O*NET database (taxonomy/reference/onet/SOURCES.md), required
 * wherever O*NET-derived career data appears: the Career map footer and the report's Method and
 * limits chapter. The licence text is verbatim; the second line says what was changed.
 */
export function OnetDbAttribution({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-rule pt-4", className)}>
      <p className="max-w-[840px] text-label leading-5 text-ink-3">
        {ONET_DB_ATTRIBUTION}{" "}
        <a href={ONET_DB_LICENSE_URL} className="underline decoration-rule-strong underline-offset-2 hover:text-ink" rel="noreferrer">
          CC BY 4.0
        </a>
        .
      </p>
      <p className="mt-2 max-w-[840px] text-label leading-5 text-ink-3">
        What {BRAND.name} changed: each career path&apos;s values are weighted means over the O*NET occupations linked to it, converted to percentiles across all
        occupations; career paths without a linked occupation have profiles estimated from analog occupations, marked as estimated.
      </p>
    </footer>
  );
}
