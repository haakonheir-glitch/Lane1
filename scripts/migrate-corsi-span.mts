/**
 * One-off: Corsi spans recorded before the fix could be 10 on a 9-block board (a "length 10"
 * trial was really 9 taps). The true span is min(recorded, 9). Reports every stored S4 score;
 * changes nothing unless run with --apply.
 *
 *   npx tsx --conditions=react-server scripts/migrate-corsi-span.mts            dry run (local)
 *   npx tsx --conditions=react-server scripts/migrate-corsi-span.mts --apply    write (local)
 *   DATABASE_URL=… … --force [--apply]                                          a hosted database
 */
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db";
import { CORSI_PROTOCOL } from "../assessment/generators/generators";
import type { SessionScores } from "../src/lib/scoring/profile";

const apply = process.argv.includes("--apply");
if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
  console.error("DATABASE_URL is set. Re-run with --force to read a hosted database (add --apply to write).");
  process.exit(1);
}
const MAX = CORSI_PROTOCOL.maxLength;
const db = await getDb();
const rows = await db
  .select({ row: schema.sessionScores.sessionRowId, scores: schema.sessionScores.scores, status: schema.assessmentSessions.status })
  .from(schema.sessionScores)
  .innerJoin(schema.assessmentSessions, eq(schema.assessmentSessions.id, schema.sessionScores.sessionRowId))
  .where(eq(schema.assessmentSessions.sessionId, "S4"));

let withCorsi = 0;
const changed: { row: string; status: string; from: number; to: number }[] = [];
for (const r of rows) {
  const s = r.scores as SessionScores;
  const span = s.cognitive?.span?.corsi?.span;
  if (span === undefined) continue;
  withCorsi++;
  if (span > MAX) changed.push({ row: r.row, status: r.status, from: span, to: MAX });
}
// Also count stored trials at an impossible length, for the record.
const trials = await db
  .select({ length: schema.taskTrials.payload })
  .from(schema.taskTrials)
  .where(and(eq(schema.taskTrials.taskId, "corsi"), eq(schema.taskTrials.practice, false)));
const longTrials = trials.filter((t) => typeof t.length?.length === "number" && (t.length.length as number) > MAX).length;

console.log(`Corsi span migration (${apply ? "APPLY" : "dry run"}), max length ${MAX}`);
console.log(`S4 score rows: ${rows.length} · with a Corsi span: ${withCorsi} · stored span above ${MAX}: ${changed.length}`);
console.log(`Stored Corsi trials at a length above ${MAX}: ${longTrials} of ${trials.length}`);
for (const c of changed) console.log(`  ${c.row} (${c.status}): span ${c.from} → ${c.to}`);

if (apply && changed.length) {
  for (const c of changed) {
    const [r] = await db.select({ scores: schema.sessionScores.scores }).from(schema.sessionScores).where(eq(schema.sessionScores.sessionRowId, c.row));
    const s = r!.scores as SessionScores;
    s.cognitive!.span.corsi!.span = c.to;
    await db.update(schema.sessionScores).set({ scores: s, scoredAt: new Date() }).where(eq(schema.sessionScores.sessionRowId, c.row));
  }
  console.log(`Updated ${changed.length} row(s).`);
} else if (changed.length) {
  console.log("Nothing written. Re-run with --apply to update these rows.");
}
process.exit(0);
