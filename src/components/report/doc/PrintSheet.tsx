import type { ReactNode } from "react";

/** CSS strings must not break out of their quotes. */
const css = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\n\r<>]/g, " ");

/**
 * The print frame: A4 pages with a running header (name and report ID) and page numbers, set by
 * @page margin boxes. On screen it shows the pages on the canvas, one sheet per page.
 */
export function PrintSheet({ name, reportId, children }: { name: string; reportId: string; children: ReactNode }) {
  const head = css(`${name} · ${reportId}`);
  return (
    <>
      <style>{`@page { size: A4; margin: 18mm 16mm 18mm; @top-left { content: "${head}"; font: 8pt var(--font-geist-mono, monospace); color: #63656a; } @top-right { content: "Career Profile"; font: 8pt var(--font-geist-mono, monospace); color: #63656a; } @bottom-right { content: counter(page) " / " counter(pages); font: 8pt var(--font-geist-mono, monospace); color: #63656a; } } @page :first { @top-left { content: none; } @top-right { content: none; } }`}</style>
      <main id="main" className="doc-print mx-auto max-w-[210mm] py-10 print:max-w-none print:py-0">
        {children}
      </main>
    </>
  );
}
