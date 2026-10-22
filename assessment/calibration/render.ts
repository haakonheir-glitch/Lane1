/**
 * Turns generated items into plain text for the calibration prompt: what a test-taker sees,
 * the correct answer and the time limit. Pure.
 */
import * as g from "../generators/generators";
import { CONFIGURATIONS, ITEMS_PER_CONFIG, itemSeed, type Configuration, type TaskId } from "./config";

export type CalibrationItem = { id: string; task: TaskId; level: number; c: number; text: string };

const FILL = ["empty (outline only)", "striped", "solid"];

/** "2 solid triangles rotated 45°" */
export function describeCell(c: g.Cell): string {
  const shape = g.SHAPES[c.shape]!;
  const n = c.count + 1; // count is an index: 0 → 1 figure
  const noun = n === 1 ? shape : shape === "arrow" ? "arrows" : `${shape}s`;
  const rotation = c.rotation === 0 ? "upright" : `rotated ${c.rotation * 45}°`;
  return `${n} ${FILL[c.fill]} ${noun} ${rotation}`;
}

const letter = (i: number) => String.fromCharCode(65 + i);

function renderMatrix(m: g.MatrixItem): string {
  const rows = [0, 1, 2].map((r) =>
    [0, 1, 2]
      .map((col) => {
        const cell = m.grid[r * 3 + col];
        return `  Row ${r + 1}, column ${col + 1}: ${cell ? describeCell(cell) : "?  (missing)"}`;
      })
      .join("\n"),
  );
  return [
    "Task: a 3×3 grid of figures follows rules across rows and columns; the bottom-right cell is missing. Choose which of 8 options completes the grid.",
    "Shapes are drawn in black: 'empty' is an outline, 'striped' is diagonal hatching, 'solid' is filled. Several figures in one cell are laid out side by side.",
    "",
    "Grid:",
    ...rows,
    "",
    "Options:",
    ...m.options.map((o, i) => `  ${letter(i)}. ${describeCell(o)}`),
    "",
    `Correct answer: ${letter(m.answerIndex)}`,
  ].join("\n");
}

function renderSeries(s: g.SeriesItem): string {
  const what = s.task === "number_series" ? "numbers" : "letters";
  return [
    `Task: a series of ${what} follows a rule. Choose the next term from 5 options.`,
    "",
    `Series: ${s.shown.join(", ")}, ?`,
    "Options:",
    ...s.options.map((o, i) => `  ${letter(i)}. ${o}`),
    "",
    `Correct answer: ${letter(s.options.indexOf(s.answer))} (${s.answer})`,
  ].join("\n");
}

function renderQuant(q: g.QuantItem): string {
  return [
    "Task: a word problem, solved in the head or on paper (no calculator). Choose the answer from 4 options.",
    "",
    q.text,
    "Options:",
    ...q.options.map((o, i) => `  ${letter(i)}. ${o}`),
    "",
    `Correct answer: ${letter(q.options.indexOf(q.answer))} (${q.answer})`,
  ].join("\n");
}

/** ASCII grid of a polyomino: '#' filled, '.' empty; x to the right, y downwards. */
export function asciiGrid(p: g.Poly): string {
  const w = Math.max(...p.map(([x]) => x)) + 1;
  const h = Math.max(...p.map(([, y]) => y)) + 1;
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (p.some(([px, py]) => px === x && py === y) ? "#" : ".")).join(" "),
  ).join("\n");
}

const indent = (s: string) => s.split("\n").map((l) => `     ${l}`).join("\n");

function renderRotation(r: g.RotationItem): string {
  return [
    `Task: a target shape made of ${r.cellsN} squares and 4 options. Exactly 2 options are the target turned around its centre; the other 2 are its mirror image turned. Select both correct options (the item counts as correct only if both are selected).`,
    "On screen, each option's grid below is displayed rotated clockwise by the angle given (angles include diagonal 45° steps). The test-taker sees only the rotated pictures, not the angles.",
    "",
    "Target (upright):",
    indent(asciiGrid(r.target)),
    "",
    "Options:",
    ...r.options.map((o, i) => `  ${letter(i)}. displayed rotated ${o.angleDeg}°\n${indent(asciiGrid(o.cells))}`),
    "",
    `Correct answer: ${r.answerIndices.map(letter).join(" and ")}`,
  ].join("\n");
}

function generate(cfg: Configuration, seed: number): { id: string; body: string; timeLimitSec: number } {
  switch (cfg.task) {
    case "matrix": {
      const m = g.generateMatrix(seed, cfg.level as 1 | 2 | 3 | 4);
      return { id: m.id, body: renderMatrix(m), timeLimitSec: m.timeLimitSec };
    }
    case "number_series": {
      const s = g.generateNumberSeries(seed, cfg.level as 1 | 2 | 3 | 4);
      return { id: s.id, body: renderSeries(s), timeLimitSec: s.timeLimitSec };
    }
    case "letter_series": {
      const s = g.generateLetterSeries(seed, cfg.level as 1 | 2 | 3);
      return { id: s.id, body: renderSeries(s), timeLimitSec: s.timeLimitSec };
    }
    case "quant": {
      const q = g.generateQuant(seed, cfg.level as 1 | 2 | 3 | 4);
      return { id: q.id, body: renderQuant(q), timeLimitSec: q.timeLimitSec };
    }
    case "rotation2d": {
      const r = g.generateRotation2D(seed, cfg.level as 5 | 6 | 7 | 8);
      return { id: r.id, body: renderRotation(r), timeLimitSec: r.timeLimitSec };
    }
  }
}

/** The fixed sample: 6 items per configuration, from fixed seeds. */
export function calibrationItems(configs: Configuration[] = CONFIGURATIONS, perConfig = ITEMS_PER_CONFIG): CalibrationItem[] {
  return configs.flatMap((cfg) =>
    Array.from({ length: perConfig }, (_, i) => {
      const { id, body, timeLimitSec } = generate(cfg, itemSeed(cfg.task, cfg.level, i));
      return { id, task: cfg.task, level: cfg.level, c: cfg.c, text: `${body}\nTime limit: ${timeLimitSec} seconds (a countdown is visible; unanswered items count as wrong).` };
    }),
  );
}
