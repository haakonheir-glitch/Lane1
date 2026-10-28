# Phase 3 report: output

Status, 2026-10-28: **Phase 3 is complete and waiting for your review. The brand/design brief has not been applied.**

**Before this phase (your decisions):**
- v2 was approved and made the default, and is live. v1 has since been deleted (§6).
- A tentative archetype blend reads "You sit between X and Y".
- "Fit × payoff" is dropped.
- Niche career paths stay where the data puts them.
- The deploy may create the two new check-in tables.

**Global constraints, checked:**
- **Test items:** no item, item order, instrument or session change. `git diff` over `assessment/`, `src/lib/bank`, `src/lib/scoring`, `src/lib/assess` and `src/components/assess` is empty for Phase 3.
- **Scoring and matching:** stay deterministic code. Claude writes prose only, from structured JSON.
- **Taxonomy:** `taxonomy.json` is untouched. The new derived data (`career_days.json`) is built by a script in `taxonomy/build/`.
- **Tests:** every new module has unit tests. The suite is 19 files and 198 tests, all passing. Typecheck, lint and the production build are clean.
- **Provenance:** estimated career data is marked on the fit map, in the lists, in the detail panel, in the report and in the written report's facts.

## 1. What was built

### Report: it opens with the answer

| Chapter | What's in it |
|---|---|
| **01 How you work best** | The archetype blend (one bar; the top two named), described as "a metaphor for a measured pattern, not a personality type or a claim about where you come from". The nine value modes with 90% ranges; a relative strength or weakness is tagged only when it passes the 1.96·SE test. **Your best workday**, with the dimensions each sentence rests on beside it. **What drains you.** The eight working conditions with ranges |
| **02 Where this work exists** | Your closest career paths, each with fulfilment fit (headline) and ability fit, both as the range 80% of the draws fall in. Then the trait-to-career connections and the O\*NET attribution |
| 03–07 | The existing score chapters, now the evidence |
| 08 | The written analysis |
| 09 | Method and limits, with the O\*NET database CC BY 4.0 attribution and a line on what was changed |
| End | The outcome check-in opt-in (your own report only) |

**The best workday** (`src/lib/report/workday.ts`):
- **Input.** It is a separate Claude call that receives the Work Design JSON only (`src/lib/workdesign/best.ts`): no scores, no names, no career paths.
- **Output.** It returns about 150 words as single sentences, each listing the dimension ids it rests on (`mode.analyse`, `env.autonomy`).
- **The check.** A sentence is rejected when it:
  - lists no ids, an id not in the JSON, or a dimension that wasn't measured;
  - uses a value-mode word in any form ("leading", "built"), an archetype name, or a working-condition word ("deadlines", "routine") without listing that dimension's id;
  - names an archetype other than the top two shown;
  - names a career path or job title (checked against all 205 career paths and 1,883 roles);
  - uses a figure not in the JSON (digits, or large numbers and percentages in words);
  - compares you with other people;
  - breaks the claims rules below.
- **Length.** The passage must be 110–190 words.
- **On failure.** It is rewritten once, with the failed draft and the problems quoted back. If it fails again, the report is saved without it and the chapter says so. A failed workday call (a rate limit, say) never loses the checked report.

**What drains you** is computed, not written:
- It covers the working conditions with the strongest reliable need on the side that can hurt. That is exactly the weight a point of mismatch carries in fulfilment fit.
- A need counts only when the score is clear of the middle by more than its 90% half-range.
- It lists up to three, each named by the pole that drains, with the share of career paths that miss the need.

**Claims check on the whole written report** (`src/lib/report/claims.ts`). A draft is rejected for:
- brain, neurochemistry, genetics, biology or ancestry claims;
- predictions of success ("will thrive", "likely to excel");
- pay or income words (money words only, so "pay attention" passes);
- the word "lane".

Your own job titles and the facts' labels may be quoted as they are. The report prompt now asks for the two new sections first, frames archetypes as a metaphor and explains both fits. `REPORT_FORMAT` is 4.

### Career map

- **The default view is the fit map:**
  - fulfilment fit up, ability fit across;
  - split at 50 (your average career path) and at ability fit 80, where the work asks little beyond your measured reasoning range;
  - dots styled by band;
  - your current and considered career paths ringed;
  - estimated career data ringed in a dashed amber line;
  - the five best labelled and keyboard-reachable;
  - hover for both fits and the 80% range.
- **The Family and Fit band lists are kept** and remain the full accessible view. Fit × payoff was dropped.
- **When the lists are the default instead:** the map is the default only when most career paths have an ability fit. Without the reasoning tasks, or when too few reasoning areas have a result, it says so and opens the Family list. Under v1 there is no map.
- **Career path detail (v2):**
  - **A typical day in this career:** O\*NET's five most distinctive important work activities, with O\*NET's descriptions, plus up to four standout work conditions with O\*NET's response wording.
  - **Fit:** both fits with ranges, and "in your top 10% in N% of draws".
  - **Why it fits / Where it rubs:** v2 drivers and frictions, in fulfilment points.
  - **You and this career path:** your value modes and working conditions in blue with their ranges, and the career's O\*NET level as a dark tick. The panel says these are different rulers.
  - **Where you'd start** and the ladder are unchanged.
  - Under v1 the detail is exactly as before, plus the typical day.

### Outcome check-in (data model and consent only, no email)

- **Opt-in:** at the end of your own report, an unticked box: "Ask me two questions in 6 and 12 months…". It is stored only on an explicit yes.
- **`/check-in`** opens when a wave is due, at 6 and 12 calendar months after opting in. A missed 6-month check-in is skipped once the 12-month one opens. The report page shows a banner when a check-in is due.
- **The two questions:**
  - your job title now, through the existing job search (or "I'm not working right now");
  - "All in all, how fulfilled are you by the work you do now?", on a scale from 1 (not at all) to 7 (completely).
- **Settings → Outcome check-in** withdraws consent and deletes the consent and any answers.
- **Storage and data rights:**
  - Tables `outcome_consents` and `outcome_check_ins`, migration `0004` (`CREATE TABLE` only). The next deploy creates them.
  - Both are in the data export and are deleted with the account.

## 2. Review history

**Round 1: five reviewers, each finding checked by a skeptic.** 21 of 22 findings were confirmed and all were fixed.

Medium:
- The best-workday check rejected ordinary wording ("pay attention", "other people", "decision-maker", "your chief concern"). It also let through job titles, numbers in words and unmeasured dimensions.
- The rewrite request didn't include the draft it was correcting.
- A failed workday call threw away a checked report.
- The claims check rejected the person's own job titles and the brand name, and missed "you'll thrive" and "neural".
- Under v1 the archetype blend never showed, and the copy said the value modes weren't measured.
- Estimated career data was nearly invisible on the fit map.

Low:
- Cognitive challenge was ranked as a drain, though fulfilment fit doesn't need-weight it.
- Check-in dates overflowed at the end of a month (31 August + 6 months).
- Dates were formatted in the browser's time zone.
- The method text described v2 under v1.
- The ability-split wording overstated the rule.
- The lists didn't mark estimated data.
- The check-in actions had no tests.
- `SOURCES.md` was out of date.

**Round 2: two reviewers tried to break the fixes.** Eight findings, none high, all fixed:
- **The workday check still rejected good passages over everyday words.** "care about", "leads to", "build on", "a junior colleague" and "set your own pace" all failed it. On 15 realistic passages written for a test profile, 5 were rejected.
  - Now it tracks a mode or condition only where it is *named* ("leadership", "teaching", "autonomy", "deadlines"), not ordinary verbs.
  - A job title counts only when the sentence casts you in the job ("as a senior lawyer", "you'd make a great nurse", "a career in sales", "at a startup", "CEO").
  - The same 15 passages now all pass, and a set of bad sentences is still caught. Both are now tests.
- **The rewrite message pushed the model to cite the wrong dimension.** It now says "reword it, or list the id only if the sentence is about that dimension".
- **"Not a prediction of success" (which the prompt itself asks for), "predictable work" and "guaranteed" were rejected.** Only positive predictions are caught now.
- **The prompt now states every rule the checker enforces,** including the 110–190 word bounds.
- **More caught:** evolution claims, "your peers", "anyone else", money words (bonus, money, compensation) and "you'll go far".
- **Quoting your own job title** can no longer switch a whole check off.
- **Check-in dates** are shown on the same calendar the month maths uses.

## 3. Screenshots (1440×900, light and dark)

All are in `design/after/9-phase3/`:
- **`own-e2e/`:** a local test account with all five sessions done. Its report, detail, Career map, check-in and settings.
  - It has the **placeholder written report** (labelled "[Placeholder]"), because this environment has no Anthropic API key.
  - Its reasoning results cover only memory and speed, so its Career map opens on the lists.
- **`sample-profile/`:** the fit map and detail for the sample profile, which has full reasoning data.
- **`public/`:** `/sample` and `/method`.
- **`parts/`:** crops of each new section.

## 4. Judgment calls

- **Ability split at 80** on the fit map: an average shortfall under 20 percentile points. Provisional, like every v2 threshold.
- **Drains** use v2's own need weight, so "what drains you" and the matching agree. Drains need at least 0.2 strength and a reliable gap. There are at most three.
- **The typical day** shows the most *distinctive* important activities (percentile across occupations), not the highest-rated. By raw rating every job's top activity is "Getting Information".
- **The fulfilment question** uses the brief's wording ("how fulfilled"), not S5's satisfaction item (`OUT_sat`). The two can't be compared directly.
- **The best workday is all or nothing per report.** If it doesn't pass the check after one rewrite, the chapter says it couldn't be written to the standard. It is tried again when the report next updates.
- **Under v1** the archetype blend is computed from the point scores and always marked tentative, because v1 has no draws to test it.

## 5. What to watch after the deploy

- **Every stored written report rewrites itself** on its owner's next visit: `REPORT_FORMAT` changed, plus the v2 facts. That is one report call plus one or two best-workday calls per person.
- **The best workday hasn't run against Claude yet** (there is no API key here). On 15 realistic hand-written passages the checker now rejects none, and the prompt lists every rule it enforces. Please still read the first few real ones. If several come back as "couldn't be written", tell me and I'll check the reason.
- **The fit map needs reasoning results** in enough areas. People with only some areas get the lists.

## 6. Your decisions after this report (2026-10-28)

1. **No email reminders.** Check-ins stay in-app: a due check-in shows on the report page.
2. **The check-in reuses the S5 satisfaction item** ("All in all, how satisfied are you with the work you do?", 1–7 unlabelled as in S5, text read from the item bank), so answers compare with each person's baseline. It is stored in the existing `fulfilment` column (no migration).
3. **Matching v1 is deleted** (`design/REMOVED.md`, PLAN D57). This removes `matchLanes`, the `MATCHING_VERSION` flag, the v1 radar overlay and driver list, and the v1-vs-v2 comparison script. The shared row shape and the role ranking stay.
4. **The brand/design work is next.**
