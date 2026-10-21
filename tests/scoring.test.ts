// Sanity checks for scoring and the lane model. Run: npm test
import assert from "node:assert/strict";
import { gameItems, likertModules } from "../src/lib/assessment/items";
import { scoreProfile, type Answers, type GameResponse } from "../src/lib/assessment/scoring";
import { canRankLanes, computeLanes } from "../src/lib/assessment/lanes";
import { rankLanes } from "../src/lib/scoring";

/** Answers a persona would give: `like` maps dimension → 1–5 (forward-keyed). */
function persona(like: Record<string, number>): Answers {
  const a: Answers = {};
  for (const items of Object.values(likertModules))
    for (const it of items) {
      const v = like[it.dimension] ?? 3;
      a[it.id] = it.reverse ? 6 - v : v;
    }
  return a;
}

function games(pCorrect: number): GameResponse[] {
  return Object.values(gameItems).flatMap((items) =>
    items.map((it, i) => {
      const correct = i / items.length < pCorrect;
      return { itemId: it.id, choice: correct ? it.answerIndex : (it.answerIndex + 1) % 4, correct, ms: it.seconds * 400 };
    }),
  );
}

// 1. Keying: a consistent extravert scores high on extraversion even with reverse items.
const salesy = persona({ E: 5, S: 4, extraversion: 5, neuroticism: 2, R: 1, C: 2, I: 3, A: 3, income: 5, security: 1, achievement: 5 });
const s1 = scoreProfile(salesy, games(0.75));
assert.equal(s1.traits.extraversion!.value, 100);
assert.equal(s1.traits.neuroticism!.value, 25);
assert.ok(s1.riasec.E!.value > s1.riasec.R!.value);
assert.ok(s1.traits.extraversion!.ci[0] < 100, "interval should never collapse to a point");

// 2. Partial answers: under half answered → no score.
const partial: Answers = {};
likertModules.interests.slice(0, 6).forEach((it) => (partial[it.id] = 4));
assert.equal(Object.keys(scoreProfile(partial, []).riasec).length, 0);

// 3. Games: proportion correct.
assert.equal(s1.aptitudes.verbal!.value, 75);
assert.ok(s1.aptitudes.speed!.value > 50);

// 4. Values: ranked, weights sum to 1.
const w = s1.values!.reduce((a, v) => a + v.weight, 0);
assert.ok(Math.abs(w - 1) < 1e-9);
assert.equal(s1.values![s1.values!.length - 1]!.id, "security");

// 5. Lane model: sales persona → sales near the top, trades near the bottom.
assert.ok(canRankLanes(s1));
const ranked = rankLanes(computeLanes(s1), "fit");
const pos = (id: string) => ranked.findIndex((l) => l.id === id);
console.log("sales persona top 5:", ranked.slice(0, 5).map((l) => `${l.name} ${l.relativeFit.value}±${(l.relativeFit.ci[1] - l.relativeFit.ci[0]) / 2}`).join(" | "));
assert.ok(pos("sales-b2b") < 3);
assert.ok(pos("electrician") > 12);

// 6. A hands-on, conscientious persona → craft lanes rise.
const maker = persona({ R: 5, C: 4, I: 3, E: 2, S: 2, A: 3, conscientiousness: 5, extraversion: 2, security: 5, achievement: 4, income: 2 });
const r2 = rankLanes(computeLanes(scoreProfile(maker, games(0.6))), "fit");
console.log("maker persona top 5:", r2.slice(0, 5).map((l) => l.name).join(" | "));
assert.ok(r2.findIndex((l) => l.id === "electrician") < 4);

// 7. Athlete is always low confidence (physical ability not measured).
assert.equal(ranked.find((l) => l.id === "athlete")!.confidence, "low");

console.log("All scoring checks passed.");
