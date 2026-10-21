import { cn } from "@/lib/cn";

/** Mono label + value + optional unit and interval, e.g. OPENNESS  78 /100  ±6 */
export function DataLabel({
  label,
  value,
  unit,
  pm,
  layout = "inline",
  emphasis,
  small,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  pm?: number;
  layout?: "inline" | "stacked";
  emphasis?: boolean;
  /** Stacked layout only: body-size value instead of H3. */
  small?: boolean;
  className?: string;
}) {
  const figure = (
    <span className="inline-flex items-baseline gap-1.5 font-mono tabular">
      <span className={cn(emphasis ? "text-accent" : "text-ink", layout === "stacked" && !small ? "text-h3" : layout === "stacked" ? "text-body" : "text-small")}>{value}</span>
      {unit ? <span className="text-label text-ink-3">{unit}</span> : null}
      {pm !== undefined ? <span className="text-label text-ink-3">±{pm}</span> : null}
    </span>
  );
  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <span className="label text-ink-3">{label}</span>
        {figure}
      </div>
    );
  }
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <span className="label text-ink-3">{label}</span>
      {figure}
    </div>
  );
}
