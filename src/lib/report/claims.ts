/**
 * Claims the written prose may never make (VISION.md non-negotiables; Phase 3 prompt rules), as
 * checks the code runs on every draft before it is saved:
 * - no brain, neurochemistry, genetics, biology or ancestry claims ("how you're wired" stays a
 *   metaphor, so "wired" alone is allowed; "Neuroticism", a measured scale, is not matched);
 * - no predictions of success;
 * - no pay, income or earnings (the facts contain none); money words only, so "pay attention" or
 *   "earn their trust" pass;
 * - never the word "lane" (lower case): careers are "career paths". The brand name "Lane" is fine.
 * `allowed` strings (the person's own job titles, career path names and labels from the facts) are
 * removed first, so quoting the facts never fails the check. Pure.
 */
const BRAIN =
  /\b(brains?|neuro(?:chemi\w*|science\w*|transmitter\w*|logic\w*|biolog\w*|ns?)|neural\w*|dopamine|serotonin|oxytocin|cortisol|adrenaline|hormon\w*|DNA|genes?|genetic\w*|biologic\w*|innate\w*|hard-?wired|born (?:to|with)|ancest\w*|caveman|cavemen|tribal|evolution\w*|evolved to|in your (?:DNA|genes|blood))\b/i;
/** Positive predictions only: "not a prediction of success" and "predictable work" pass. */
const PREDICT =
  /\b((?:predicts?|guarantees?) (?:your |that you )?(?:success|will)|you(?:'re| are| will be) (?:guaranteed|destined|bound) to|destined (?:to|for)|bound to (?:succeed|thrive|excel)|(?:will|'ll|’ll|'d|would) (?:\w+ )?(?:succeed|thrive|excel|flourish|be successful|do well|go far|be promoted)|(?:likely|sure|certain) to (?:succeed|thrive|excel|flourish|be successful|do well|go far))\b/i;
const MONEY =
  /\b(income|incomes|salary|salaries|wages?|earnings|commission(?!s? (?:a|an|the|some)\b)|lucrative|bonus(?:es)?|compensation|money|winner-take-all|pay ?(?:rise|cut|grade|level|scale|check|cheque)|paychecks?|(?:well|badly|poorly|highly|better|best|worst|under|over)[- ]paid|pays? (?:well|badly|poorly|more|less|little|a lot)|earn(?:s|ing|ed)? (?:money|a living|more|less|well|a lot|little))\b/i;
const LANE = /\blanes?\b/;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Each rule a piece of prose breaks, in words a rewrite request can quote. */
export function claimProblems(text: string, allowed: string[] = []): string[] {
  let t = text;
  // Only whole occurrences, and only of strings longer than one short word, so a title like "income" can't switch a check off.
  for (const a of [...allowed].filter((x) => x.trim().length > 3 && x.trim().includes(" ")).sort((p, q) => q.length - p.length)) t = t.replace(new RegExp(`\\b${esc(a)}\\b`, "gi"), " ");
  const out: string[] = [];
  const hit = (re: RegExp, why: string) => {
    const m = t.match(re);
    if (m) out.push(`${why} ("${m[0]}")`);
  };
  hit(BRAIN, "claims about the brain, biology or ancestry");
  hit(PREDICT, "a prediction of success");
  hit(MONEY, "pay, income or earnings");
  hit(LANE, 'the word "lane" (say "career path")');
  return out;
}
