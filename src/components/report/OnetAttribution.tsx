import { ONET_ATTRIBUTION } from "@/lib/bank/bank";
import { cn } from "@/lib/cn";

/**
 * Required wherever O*NET-derived content or results appear (file 03 license, BLUEPRINT §11).
 * The text is taken verbatim from the package; "O*NET®" is used only as an adjective there.
 */
export function OnetAttribution({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-rule pt-4", className)}>
      <p className="max-w-[840px] text-label leading-5 text-ink-3">
        {ONET_ATTRIBUTION}{" "}
        <a href="https://www.onetcenter.org/license_tools.html" className="underline decoration-rule-strong underline-offset-2 hover:text-ink" rel="noreferrer">
          O*NET® Tools license
        </a>
        .
      </p>
    </footer>
  );
}
