import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ModuleRow } from "@/components/assess/ModuleRow";
import { SectionHeader } from "@/components/report/SectionHeader";
import { getModules } from "@/lib/data";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessPage() {
  const modules = await getModules();
  const totalItems = modules.reduce((n, m) => n + m.items, 0);
  const answered = modules.reduce((n, m) => n + m.answered, 0);
  const complete = modules.filter((m) => m.status === "complete").length;
  const pct = Math.round((answered / totalItems) * 100);
  const remaining = modules.filter((m) => m.status !== "complete").reduce((n, m) => n + Math.ceil(m.minutes * (1 - m.answered / m.items)), 0);
  const firstOpen = modules.find((m) => m.status !== "complete");

  return (
    <AppPage title="Assessment" meta={`${complete}/${modules.length} modules`}>
      <div className="max-w-content">
        <p className="label text-ink-3">Profile · Assessment</p>
        <h1 className="mt-4 max-w-[18ch] text-h1 font-medium text-ink">Four modules. One profile.</h1>
        <p className="mt-4 max-w-reading text-body-l text-ink-2">
          Each module measures something different. Together they produce your profile and Lane Map. You can stop at any
          point; progress is kept.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-6 border-y border-rule py-6 sm:grid-cols-4">
          {[
            { label: "Overall", value: `${pct}`, unit: "%" },
            { label: "Modules", value: `${complete}/${modules.length}`, unit: "done" },
            { label: "Items", value: `${answered}/${totalItems}`, unit: "answered" },
            { label: "Remaining", value: `~${remaining}`, unit: "min" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="label text-ink-3">{s.label}</span>
              <span className="font-mono text-h2 text-ink">
                {s.value} <span className="text-label text-ink-3">{s.unit}</span>
              </span>
            </div>
          ))}
          <div className="col-span-full h-1 bg-rule" aria-hidden>
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <section className="mt-16" aria-labelledby="modules-h">
          <SectionHeader index="01" label="Modules" title={firstOpen ? "What's left" : "All modules complete"} id="modules-h" />
          <ol className="border-t border-rule">
            {modules.map((m, i) => (
              <ModuleRow key={m.id} module={m} index={i + 1} primary={m.id === firstOpen?.id} />
            ))}
          </ol>
        </section>
      </div>
    </AppPage>
  );
}
