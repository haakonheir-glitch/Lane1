import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A real report component shown as an object: laid out at its natural width, scaled down, and
 * cropped to a height. It is a picture of the product, so it is inert and hidden from assistive
 * tech; `label` describes it instead.
 */
export function Scaled({ width, height, scale, label, className, children }: { width: number; height: number; scale: number; label: string; className?: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className={cn("overflow-hidden", !/\babsolute\b/.test(className ?? "") && "relative", className)} style={{ width: width * scale, height: height * scale }}>
      <div inert aria-hidden className="pointer-events-none absolute top-0 left-0 origin-top-left select-none" style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
