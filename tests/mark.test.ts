import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileMark } from "@/components/brand/ProfileMark";
import { sampleProfile } from "@/lib/mock/profile";
import { MARK_DOMAINS, MARK_RIASEC, MARK_VALUES, markGeometry, markInput, type MarkInput } from "@/lib/view/mark";

const svg = (input: MarkInput) => renderToStaticMarkup(createElement(ProfileMark, { input }));

/** A small seeded generator, so the "random" profiles are the same on every run. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
function randomInput(r: () => number): MarkInput {
  const lo = Math.round(r() * 80);
  return {
    riasec: MARK_RIASEC.map(() => Math.round(10 + r() * 40)),
    domains: MARK_DOMAINS.map(() => Math.round((r() * 5 - 2.5) * 10) / 10),
    reasoning: [lo, Math.min(99, lo + 10 + Math.round(r() * 30))],
    topValue: Math.floor(r() * 6),
  };
}

describe("Profile Mark", () => {
  it("is deterministic: the same scores give a byte-identical SVG", () => {
    expect(renderToStaticMarkup(createElement(ProfileMark, { scores: sampleProfile }))).toBe(renderToStaticMarkup(createElement(ProfileMark, { scores: sampleProfile })));
    const r = rng(7);
    for (let i = 0; i < 50; i++) {
      const m = randomInput(r);
      expect(svg(structuredClone(m))).toBe(svg(m));
    }
  });

  it("gives different profiles different SVGs", () => {
    const r = rng(42);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(svg(randomInput(r)));
    expect(seen.size).toBe(200);
  });

  it("changes when any single score changes (every element maps to a score)", () => {
    const base = randomInput(rng(3));
    const ref = svg(base);
    for (let i = 0; i < 6; i++) expect(svg({ ...base, riasec: base.riasec.map((v, j) => (j === i ? (v! >= 40 ? v! - 8 : v! + 8) : v)) })).not.toBe(ref);
    for (let i = 0; i < 5; i++) expect(svg({ ...base, domains: base.domains.map((v, j) => (j === i ? -v! + (v! === 0 ? 1 : 0) : v)) })).not.toBe(ref);
    expect(svg({ ...base, reasoning: [base.reasoning![0] + 5, base.reasoning![1]] })).not.toBe(ref);
    expect(svg({ ...base, topValue: (base.topValue! + 1) % 6 })).not.toBe(ref);
  });

  it("reads its inputs from computed scores only", () => {
    const m = markInput(sampleProfile);
    const raw = (c: string) => sampleProfile.interests!.scales.find((s) => s.code === c)!.raw;
    expect(m.riasec).toEqual(MARK_RIASEC.map(raw));
    const top = sampleProfile.values!.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank)[0]!;
    expect(MARK_VALUES[m.topValue!]).toBe(top.id);
    const [lo, hi] = sampleProfile.reasoning!.generalAbility!.percentileBand;
    expect(m.reasoning).toEqual([Math.min(lo, 99), Math.min(hi, 99)]);
  });

  it("draws unmeasured parts as placeholders", () => {
    const g = markGeometry({ riasec: MARK_RIASEC.map(() => null), domains: MARK_DOMAINS.map(() => null), reasoning: null, topValue: null });
    expect(g.ticks.every((t) => !t.measured)).toBe(true);
    expect(g.pentagon.shape).toBeNull();
    expect(g.gauge.band).toBeNull();
    expect(g.value).toBeNull();
  });
});

describe("share card", () => {
  it("leaves personality and reasoning out, of the text and the mark, unless opted in", async () => {
    const { shareCardFrom } = await import("@/lib/og/share-card");
    const plain = shareCardFrom(sampleProfile, "Ingrid", []);
    expect(plain.personality).toBeUndefined();
    expect(plain.reasoning).toBeUndefined();
    expect(plain.mark.reasoning).toBeNull();
    expect(plain.mark.domains.every((d) => d === null)).toBe(true);
    expect(plain.mark.riasec).toEqual(markInput(sampleProfile).riasec);
    const all = shareCardFrom(sampleProfile, "Ingrid", [], { personality: true, reasoning: true });
    expect(all.personality).toBeTruthy();
    expect(all.reasoning).toMatch(/^P\d+–\d+$/);
    expect(all.mark).toEqual(markInput(sampleProfile));
  });
});
