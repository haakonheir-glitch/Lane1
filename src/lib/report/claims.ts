/**
 * Claims the written prose may never make (VISION.md non-negotiables; Phase 3 prompt rules), as
 * checks the code runs on every draft before it is saved:
 * - no brain, neurochemistry, genetics or ancestry claims ("how you're wired" stays a metaphor, so
 *   "wired" alone is allowed; "Neuroticism", a measured scale, is not matched);
 * - no predictions of success;
 * - no pay, income or earnings (the facts contain none);
 * - never the word "lane": careers are "career paths".
 * Pure.
 */
import { PAY } from "./schema";

const BRAIN = /\b(brains?|neuro(?:chemi\w*|science\w*|transmitter\w*|logic\w*|biolog\w*|ns?)|dopamine|serotonin|oxytocin|cortisol|adrenaline|hormon\w*|DNA|genes?|genetic\w*|hard-?wired|ancest\w*|evolved|caveman|cavemen|tribal)\b/i;
const PREDICT = /\b(predict\w*|guarantee\w*|destined|will (?:definitely |certainly )?(?:succeed|thrive|excel|flourish|be successful|do well))\b/i;
const LANE = /\blanes?\b/i;

/** Each rule a piece of prose breaks, in words a rewrite request can quote. */
export function claimProblems(text: string): string[] {
  const out: string[] = [];
  const hit = (re: RegExp, why: string) => {
    const m = text.match(re);
    if (m) out.push(`${why} ("${m[0]}")`);
  };
  hit(BRAIN, "claims about the brain, biology or ancestry");
  hit(PREDICT, "a prediction of success");
  hit(PAY, "pay, income or earnings");
  hit(LANE, 'the word "lane" (say "career path")');
  return out;
}
