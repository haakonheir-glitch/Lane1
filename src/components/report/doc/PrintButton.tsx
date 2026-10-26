import { ButtonLink } from "@/components/ui/Button";

/** Opens the A4 print view, which offers the browser's "Save as PDF". */
export function PrintButton({ href = "/profile/print" }: { href?: string }) {
  return (
    <ButtonLink href={href} variant="secondary" size="sm">
      Download PDF
    </ButtonLink>
  );
}
