import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import raw from "@taxonomy/taxonomy.json";
import { FAMILIES, LANES, LEVELS, getLane, getRole, isManagement, laneModes, taxonomy, validateTaxonomy } from "@/lib/taxonomy";

describe("taxonomy loader", () => {
  it("matches the counts in its own meta block", () => {
    expect(FAMILIES).toHaveLength(taxonomy.meta.counts.families!);
    expect(LANES).toHaveLength(taxonomy.meta.counts.lanes!);
    expect(LANES.flatMap((l) => l.roles)).toHaveLength(taxonomy.meta.counts.roles!);
  });

  it("indexes lanes and roles", () => {
    expect(getLane("b2b_sales")?.family).toBe("sales");
    expect(getRole("b2b_sales.sales_development_representative_sdr")?.role.level).toBe("entry");
    expect(LEVELS[0]).toBe("trainee");
    expect(LEVELS.filter(isManagement)).toEqual(["manager", "director", "exec"]);
  });

  it("includes role modes in a lane's modes", () => {
    expect(laneModes(getLane("b2b_sales")!)).toContain("owner");
  });

  it("every tag used by a lane or role links to assessment constructs", () => {
    const used = new Set(LANES.flatMap((l) => [...l.tags, ...l.roles.flatMap((r) => r.tags)]));
    for (const t of used) expect(taxonomy.tag_to_constructs[t]?.length, t).toBeGreaterThan(0);
  });

  it("rejects a broken rebuild", () => {
    const bad = structuredClone(raw) as typeof raw;
    bad.families[0]!.lanes[0]!.roles[0]!.level = "wizard";
    expect(() => validateTaxonomy(bad)).toThrow();
    const dup = structuredClone(raw) as typeof raw;
    dup.families[0]!.lanes[0]!.roles[1]!.id = dup.families[0]!.lanes[0]!.roles[0]!.id;
    expect(() => validateTaxonomy(dup)).toThrow(/duplicate/);
  });

  it("generated types are up to date with taxonomy.json", () => {
    expect(() => execFileSync("npx", ["tsx", "scripts/gen-taxonomy-types.mts", "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
