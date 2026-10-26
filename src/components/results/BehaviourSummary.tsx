import type { ProfileScores } from "@/lib/scoring/profile";
import { DataLabel } from "@/components/data/DataLabel";

/** Learning rate, risk (balloon task) and patience (discounting): behaviour, not self-report. */
export function BehaviourSummary({ behaviour }: { behaviour: NonNullable<ProfileScores["behaviour"]> }) {
  const { learning, risk, patience } = behaviour;
  return (
    <div className="grid gap-px border border-rule bg-rule md:grid-cols-3">
      <div className="bg-paper p-6">
        <p className="label text-ink-3">Learning rate</p>
        <div className="mt-4 flex flex-col gap-2">
          <DataLabel label="Improvement vs start" value={learning?.relativeRate !== null && learning?.relativeRate !== undefined ? `${Math.round(learning.relativeRate * 100)}%` : "—"} />
          <DataLabel label="Accuracy slope" value={learning?.accuracySlope?.toFixed(2) ?? "—"} unit="/log block" />
        </div>
        <p className="mt-4 text-small text-ink-2">How fast you got better at a brand-new task, compared with your own first attempts.</p>
      </div>
      <div className="bg-paper p-6">
        <p className="label text-ink-3">Risk in practice</p>
        <div className="mt-4 flex flex-col gap-2">
          <DataLabel label="Avg pumps kept" value={risk?.adjustedPumps?.toFixed(1) ?? "—"} unit="/64" />
          <DataLabel label="After a loss" value={risk?.lossReactivity !== null && risk?.lossReactivity !== undefined ? risk.lossReactivity.toFixed(1) : "—"} unit="pumps" />
        </div>
        <p className="mt-4 text-small text-ink-2">What you did with real stakes in the balloon task, not what you said. Negative &quot;after a loss&quot; means more careful after a burst.</p>
      </div>
      <div className="bg-paper p-6">
        <p className="label text-ink-3">Patience</p>
        <div className="mt-4 flex flex-col gap-2">
          <DataLabel label="Area under curve" value={patience?.auc?.toFixed(2) ?? "—"} unit="0–1" />
        </div>
        <p className="mt-4 text-small text-ink-2">How much you discount money that arrives later. Higher means more willing to wait.</p>
      </div>
    </div>
  );
}
