/**
 * Chapter headlines for the report: what is clearly true, in neutral-to-positive words, from the
 * tagged relative strengths only (never invented). Precision is shown by the charts, so the
 * headlines don't hedge. Pure.
 */
import type { ProfileScores } from "../scoring/profile";
import { listWords, relativeOf } from "./profile";
import { reasoningTags } from "./findings";

const s = (xs: unknown[]) => (xs.length === 1 ? "s" : "");
const lower = (xs: string[]) => xs.map((x) => x.toLowerCase());

export type ChapterId = "interests" | "values" | "personality" | "reasoning" | "behaviour";

export function chapterTitles(p: ProfileScores): Record<ChapterId, string> {
  const i = p.interests;
  const ranked = i ? [...i.scales].sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0)) : [];
  const iRel = i ? relativeOf(i.scales) : {};
  const iStrong = ranked.filter((x) => iRel[x.id] === "strength").map((x) => x.label);

  const values = p.values?.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank) ?? [];

  const d = p.personality?.domains ?? [];
  const dRel = relativeOf(d);
  const hi = d.filter((x) => dRel[x.id] === "strength").map((x) => x.label);
  const lo = d.filter((x) => dRel[x.id] === "weakness").map((x) => x.label);

  const { strengths: rs, weaknesses: rw } = reasoningTags(p);

  return {
    interests: !i
      ? "What kind of work draws you"
      : iStrong.length
        ? `${listWords(iStrong)} work draws you most`
        : i.hollandCode
          ? `Your interests lean ${listWords(ranked.slice(0, 3).map((x) => x.label))}`
          : "Broad interests, with no single area leading",
    values: values.length ? `${values[0]!.label} matters most to you at work` : "What you want work to give you",
    personality: !d.length
      ? "How you tend to work"
      : hi.length
        ? `${listWords(hi)} stand${s(hi)} out in how you work`
        : lo.length
          ? `A balanced profile, with ${listWords(lower(lo))} lowest`
          : "A balanced personality profile",
    reasoning: !p.reasoning
      ? "How you reason"
      : rs.length && rw.length
        ? `Strongest in ${listWords(lower(rs))}, with ${listWords(lower(rw))} as the exception`
        : rw.length
          ? `An even reasoning profile, with ${listWords(lower(rw))} as the exception`
          : rs.length
            ? `${listWords(rs)} stand${s(rs)} out in your reasoning`
            : "An even reasoning profile",
    behaviour: "How you learned, took risks and waited",
  };
}
