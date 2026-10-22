import { describe, expect, it } from "vitest";
import { planFor } from "@/lib/lanes/plans";
import { entryPoint, startingRoles } from "@/lib/matching";
import { LANES, taxonomy } from "@/lib/taxonomy";

describe("next-step plans", () => {
  it("offers a real sprint only where the taxonomy says the work can be done directly", () => {
    for (const lane of LANES) {
      const plan = planFor(lane, startingRoles(lane, taxonomy, entryPoint(lane, taxonomy)));
      expect(plan.kind, lane.id).toBe(lane.sprint === "direct" ? "sprint" : lane.sprint === "simulated" ? "practice" : "shadow");
      expect(plan.steps.length, lane.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("names practitioners, not trainees, in shadow plans", () => {
    const law = LANES.find((l) => l.id === "legal_practice")!;
    const plan = planFor(law, startingRoles(law, taxonomy, entryPoint(law, taxonomy)));
    const mid = law.roles.find((r) => r.level === "mid")!;
    expect(plan.steps[0]!.detail).toContain(mid.title);
  });
});
