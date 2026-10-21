import { describe, expect, test } from "vitest";
import { allSessions, environmentQuestions, itemIndex, sessionPlan, ONET_ATTRIBUTION } from "@/lib/bank/bank";
import { fnv1a, seedFor } from "@/lib/bank/seed";

describe("item bank", () => {
  test("administer:false items never reach a session (IPIP-NEO O6 Liberalism)", () => {
    for (const id of ["NEO028", "NEO058", "NEO088", "NEO118"]) expect(itemIndex.has(id)).toBe(false);
    const neoBlock = sessionPlan("S2").blocks.find((b) => b.module === "01_personality_ipip_neo_120")!;
    expect(neoBlock.items.filter((i) => i.id.startsWith("NEO"))).toHaveLength(116);
  });

  test("validity items are inserted directly after their anchors", () => {
    const after = (sessionId: "S1" | "S2", anchor: string) => {
      const items = sessionPlan(sessionId).blocks.flatMap((b) => b.items);
      return items[items.findIndex((i) => i.id === anchor) + 1]?.id;
    };
    expect(after("S2", "NEO030")).toBe("INFQ1");
    expect(after("S2", "NEO060")).toBe("INST1");
    expect(after("S2", "NEO075")).toBe("INFQ2");
    expect(after("S2", "NEO110")).toBe("INFQ3");
    expect(after("S2", "DSP_long_horizon_4")).toBe("INFQ4");
    expect(after("S1", "IPC05")).toBe("INST2");
  });

  test("inserted validity items use the surrounding block's response scale", () => {
    const inst2 = sessionPlan("S1").blocks.flatMap((b) => b.items).find((i) => i.id === "INST2")!;
    expect(inst2.format.type).toBe("likert5");
    // INST2 asks for 'Like', which must be option 4 on the interests scale.
    expect(inst2.format.type === "likert5" && inst2.format.options[3]!.label).toBe("Like");
  });

  test("sessions follow battery_manifest.json", () => {
    const plans = allSessions();
    expect(plans.map((p) => p.id)).toEqual(["S1", "S2", "S3", "S4", "S5"]);
    expect(plans.map((p) => p.minutes)).toEqual([22, 25, 29, 29, 30]);
    expect(sessionPlan("S3").blocks[0]!.kind).toBe("env_check");
    expect(sessionPlan("S4").blocks.filter((b) => b.kind === "task")).toHaveLength(7);
    expect(sessionPlan("S1").blocks.at(-1)!.kind).toBe("effort");
    expect(sessionPlan("S3").blocks.at(-1)!.kind).toBe("task"); // S3/S4 have no effort check in the manifest
    expect(sessionPlan("S5").blocks.find((b) => b.id === "13_outcomes_followup:baseline")!.items).toHaveLength(11);
  });

  test("experimental modules are flagged", () => {
    const s = (id: "S1" | "S2" | "S5", mod: string) => allSessions().find((p) => p.id === id)!.blocks.find((b) => b.module === mod)!.status;
    expect(s("S1", "03_interests_onet_ip_short_form")).toBe("validated");
    expect(s("S1", "04_interests_lane_extension")).toBe("experimental");
    expect(s("S2", "07_lane_dispositions")).toBe("experimental");
    expect(s("S5", "08_emotional_intelligence_sjt")).toBe("experimental");
  });

  test("environment check questions come from the package text", () => {
    expect(environmentQuestions).toHaveLength(3);
    expect(environmentQuestions.every((q) => q.endsWith("?"))).toBe(true);
  });

  test("O*NET attribution is available verbatim", () => {
    expect(ONET_ATTRIBUTION).toMatch(/O\*NET®/);
    expect(ONET_ATTRIBUTION).toMatch(/has not approved, endorsed, or tested/);
  });
});

describe("seeding", () => {
  test("deterministic for the same user, task, attempt and item", () => {
    expect(seedFor("u1", "matrix", 1, 0)).toBe(seedFor("u1", "matrix", 1, 0));
  });
  test("differs across users, tasks, attempts and items", () => {
    const seeds = new Set([seedFor("u1", "matrix", 1, 0), seedFor("u2", "matrix", 1, 0), seedFor("u1", "corsi", 1, 0), seedFor("u1", "matrix", 2, 0), seedFor("u1", "matrix", 1, 1)]);
    expect(seeds.size).toBe(5);
  });
  test("FNV-1a matches the reference value", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
  });
});
