import * as g from "./generators.ts";

let fails = 0;
const check = (cond: boolean, msg: string) => { if (!cond) { fails++; if (fails < 25) console.log("FAIL", msg); } };
const N = 2000;

for (let s = 1; s <= N; s++) {
  for (const lvl of [1, 2, 3, 4] as const) {
    const m = g.generateMatrix(s * 7 + lvl, lvl);
    check(m.options.length === 8, "matrix 8 options");
    const keys = m.options.map((o) => JSON.stringify(o));
    check(new Set(keys).size === 8, `matrix unique options ${m.id}`);
    // recompute the missing cell from the rules using row 3 cells 6,7 and the pattern of rows 1-2
    const ans = m.options[m.answerIndex];
    const attrs = ["shape", "count", "fill", "rotation"] as const;
    for (const a of attrs) {
      const v = m.grid.slice(0, 8).map((c) => c![a]);
      const rule = m.rules[a];
      if (rule === "constant") check(ans[a] === v[0], `${m.id} constant ${a}`);
      if (rule === "progression") check(ans[a] - v[7] === v[7] - v[6], `${m.id} progression ${a}`);
      if (rule === "distribution3") {
        const row1 = new Set([v[0], v[1], v[2]]);
        const row3 = [v[6], v[7], ans[a]];
        check(new Set(row3).size === 3 && row3.every((x) => row1.has(x)), `${m.id} distribution ${a}`);
        const col3 = new Set([v[2], v[5], ans[a]]);
        check(col3.size === 3, `${m.id} dist column ${a}`);
      }
      check(ans[a] >= 0 && ans[a] < g.ATTR_VALUES[a], `${m.id} range ${a}`);
    }
    // no frequency shortcut: for every attribute, the answer's value must not be the unique majority
    for (const a of attrs) {
      const counts = new Map<number, number>();
      m.options.forEach((o) => counts.set(o[a], (counts.get(o[a]) ?? 0) + 1));
      const max = Math.max(...counts.values());
      const ansCount = counts.get(ans[a])!;
      check(counts.size === 1 || !(ansCount === max && [...counts.values()].filter((c) => c === max).length === 1 && max > 4), `${m.id} majority cue ${a}`);
    }
    // uniqueness of solution: only one option satisfies all rules
    let valid = 0;
    for (const o of m.options) {
      let ok = true;
      for (const a of attrs) {
        const v = m.grid.slice(0, 8).map((c) => c![a]);
        const rule = m.rules[a];
        if (rule === "constant" && o[a] !== v[0]) ok = false;
        if (rule === "progression" && o[a] - v[7] !== v[7] - v[6]) ok = false;
        if (rule === "distribution3") { const r1 = new Set([v[0], v[1], v[2]]); const r3 = [v[6], v[7], o[a]]; if (!(new Set(r3).size === 3 && r3.every((x) => r1.has(x)))) ok = false; }
      }
      if (ok) valid++;
    }
    check(valid === 1, `${m.id} exactly one valid option (got ${valid})`);
  }
  for (const lvl of [1, 2, 3, 4] as const) {
    const it = g.generateNumberSeries(s, lvl);
    check(it.options.length === 5 && new Set(it.options).size === 5, `num options ${it.id} ${JSON.stringify(it.options)}`);
    check(it.options.includes(it.answer), `num answer in options ${it.id}`);
    check(it.shown.every((x) => Number.isInteger(x as number)), `num integers ${it.id}`);
  }
  for (const lvl of [1, 2, 3] as const) {
    const it = g.generateLetterSeries(s, lvl);
    check(it.options.length === 5 && new Set(it.options).size === 5, `let options ${it.id} ${JSON.stringify(it.options)}`);
    check(it.options.includes(it.answer), `let answer ${it.id}`);
  }
  for (const n of [5, 6, 7, 8] as const) {
    const it = g.generateRotation2D(s, n);
    check(it.answerIndices.length === 2, `rot answers ${it.id}`);
    check(it.target.length === n, `rot size ${it.id}`);
  }
  for (const lvl of [1, 2, 3, 4] as const) {
    const q = g.generateQuant(s, lvl);
    check(q.options.length === 4 && new Set(q.options).size === 4, `quant options ${q.id} ${JSON.stringify(q.options)} ${q.text}`);
    check(Number.isFinite(q.answer) && q.options.includes(q.answer), `quant answer ${q.id}`);
  }
  const d = g.generateBackwardDigits(s, 6);
  check(d.correctResponse.join() === d.sequence.slice().reverse().join(), "digits");
}
// discounting converges
const h: ("sooner" | "later")[] = [];
let res: ReturnType<typeof g.discountNext> | undefined;
for (let i = 0; i < 6; i++) { res = g.discountNext(1000, 30, h); if ("indifference" in res) break; h.push(i % 2 ? "later" : "sooner"); }
check(res !== undefined && "indifference" in res, "discount converges");
const sym = g.generateSymbolMatchBlock(1);
check(sym.every((t) => (t.left.slice().sort().join() === t.right.slice().sort().join()) === t.same), "symbol same/different");

console.log(fails === 0 ? "ALL PASSED" : `${fails} failures`);
console.log("sample matrix", JSON.stringify(g.generateMatrix(42, 3)).slice(0, 300));
console.log("sample number", JSON.stringify(g.generateNumberSeries(42, 3)));
console.log("sample letter", JSON.stringify(g.generateLetterSeries(42, 3)));
console.log("sample quant", JSON.stringify(g.generateQuant(42, 4)));
// rotation visibility: whenever rotation differs between any two cells/options, every shape used must be rotation-safe
let rotFails = 0;
for (let s = 1; s <= 2000; s++) for (const lvl of [1, 2, 3, 4] as const) {
  const m = g.generateMatrix(s * 7 + lvl, lvl);
  const all = [...m.grid.filter((c): c is g.Cell => c !== null), ...m.options];
  const rots = new Set(all.map((c) => c.rotation));
  if (rots.size > 1 && !all.every((c) => g.ROTATION_SAFE_SHAPES.includes(c.shape))) rotFails++;
}
console.log(rotFails === 0 ? "ROTATION VISIBILITY OK" : `${rotFails} rotation-visibility failures`);
