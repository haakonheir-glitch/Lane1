import { describe, expect, it } from "vitest";
import esco from "@/lib/taxonomy/esco.generated.json";
import { buildSearchIndex, normalize, searchTitles } from "@/lib/taxonomy/search";
import { findJobTitles, getLane, getRole } from "@/lib/taxonomy";
import type { Lane } from "@/lib/taxonomy/generated";

const lanes = [
  { id: "sales", roles: [{ id: "sales.sdr", title: "Sales development representative", aka: ["SDR", "salgsrepresentant"] }, { id: "sales.mgr", title: "Sales manager", aka: ["salgssjef"] }] },
  { id: "trades", roles: [{ id: "trades.plumber", title: "Plumber", aka: ["rørlegger"] }] },
] as unknown as Pick<Lane, "id" | "roles">[];
const index = buildSearchIndex(lanes, [
  ["plumbing and heating fitter", "trades", "trades.plumber"],
  ["sales manager", "sales", "sales.mgr"],
  ["door-to-door seller", "sales", "sales.sdr"],
]);

describe("normalize", () => {
  it("folds Norwegian letters, accents, case and punctuation", () => {
    expect(normalize("Rørlegger-Lærling")).toBe("rorlegger laerling");
    expect(normalize("Café  Manager!")).toBe("cafe manager");
    expect(normalize("Gårdbruker")).toBe("gardbruker");
  });
});

describe("searchTitles", () => {
  it("matches aliases, including Norwegian ones typed without special letters", () => {
    expect(searchTitles(index, "rorlegger")[0]).toMatchObject({ laneId: "trades", roleId: "trades.plumber", source: "alias" });
    expect(searchTitles(index, "salgssjef")[0]).toMatchObject({ roleId: "sales.mgr" });
  });

  it("prefers a curated role over an ESCO label of the same match quality", () => {
    const hits = searchTitles(index, "sales manager");
    expect(hits[0]).toMatchObject({ source: "role", roleId: "sales.mgr" });
    expect(hits.filter((h) => h.roleId === "sales.mgr")).toHaveLength(1); // deduplicated
  });

  it("falls back to ESCO labels for titles the taxonomy doesn't list", () => {
    expect(searchTitles(index, "door to door")[0]).toMatchObject({ laneId: "sales", source: "esco" });
  });

  it("matches word prefixes in any order, and ignores one-letter queries", () => {
    expect(searchTitles(index, "dev sales")[0]).toMatchObject({ roleId: "sales.sdr" });
    expect(searchTitles(index, "s")).toEqual([]);
  });
});

describe("real taxonomy search", () => {
  it("every ESCO row points at a real lane and role", () => {
    for (const [label, laneId, roleId] of esco as [string, string, string | null][]) {
      expect(getLane(laneId), label).toBeDefined();
      if (roleId) expect(getRole(roleId)?.lane.id, label).toBe(laneId);
    }
  });

  it("resolves common titles to the right lane", () => {
    expect(findJobTitles("salgssjef")[0]).toMatchObject({ laneId: "b2b_sales", roleTitle: "Sales manager" });
    expect(findJobTitles("junior developer")[0]).toMatchObject({ laneId: "software_engineering" });
  });

  it("treats ESCO roles as approximate: lane only, nearest role as a hint", () => {
    const h = findJobTitles("astronaut")[0]!;
    expect(h.source).toBe("esco");
    expect(h.roleId).toBeNull();
    expect(h.nearestRole).not.toBeNull();
  });
});
