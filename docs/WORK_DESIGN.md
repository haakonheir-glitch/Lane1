# Work Design: "How you work best" (layer 2)

Version `wd-0.2` (wd-0.1 had a ninth environment dimension, Income variance, removed on 2026-10-27: its career side came only from the taxonomy's payoff labels, which the product owner ruled out). Config: `src/lib/workdesign/model.ts`. Person side: `src/lib/workdesign/person.ts`. Career side: `taxonomy/build/build_onet_profiles.py` → `taxonomy/derived/lane_onet_profiles.json`.

**Status: provisional.**
- **Person side:** every formula is **Lane's own model**, not a published scoring. The input weights are reasoned starting points, to be fitted to outcome data later.
- **Career side:** it uses O\*NET's published descriptors: O\*NET 31.0 (August 2026), plus Work Values from 30.2, because 31.0 dropped them. The build checks every element name against the release and fails on any it can't find. All 46 were verified on 2026-10-27 (`ONET_ELEMENTS_VERIFIED`). Five Work Context elements were renamed in 31.0; the tables below use the new names.

## Why this layer exists

It answers the second question in `VISION.md`, *How do I work best?* It follows person–environment fit:

- **Needs–supplies fit** (does the work give me what I need?) comes from the value modes and environment dimensions below. It's the headline in Phase 2.
- **Demands–abilities fit** (can I meet what the work demands?) comes from section C. It's secondary.

Both sides are defined on the same dimensions, so a person and a career path can be compared directly.

## Person-side scale

Every person-side input is a 0–100 estimate with a standard error (SE) and a provenance:

| Provenance | Inputs | How | Why |
|---|---|---|---|
| `normed` | Reasoning (general and the five areas) | The provisional population percentile. Value is the middle of the 90% band; SE = band width / (2 × 1.645) | These are the only population norms Lane has (provisional, from the offline calibration). |
| `anchored` | Interests (O\*NET IP, raw 10–50), personality domains and facets (IPIP-NEO-120, mean 1–5) | Raw score placed on 0–100 with the **scale midpoint at 50**. SE = planning SD × √(1 − r): planning SD 20 points for interests and 15 for personality; r = .75 for scales and .70 for facets (BLUEPRINT §7 planning values, as in `scoring/self.ts`) | No population norms are transcribed. The published IPIP-NEO-120 norms (Johnson, 2014) are public-domain, but couldn't be fetched here, and numbers are never invented. When they're transcribed into `scoring/psychometrics.ts`, these inputs switch to `normed` automatically. |
| `ipsative` | Work values (O\*NET WIL card sort) | The six value scores placed on 0–100 within the person (lowest 0, highest 100); SE from a planning SD of 20 | A forced sort only ranks values against each other. |
| `task` | Risk (balloon task adjusted pumps / 64), patience (delay-discounting AUC), learning (improvement vs own start: 0% → 50, ±50% → 100/0) | Anchored to the task's own range; SE from a planning SD of 20 | No norms yet. |

The planning SDs are assumptions, flagged here and in code (`PLANNING_SD`). They set the width of the error bars until norms exist. They do not change the point estimates.

**A dimension** is the weighted mean of its measured inputs. "Low X" inputs use 100 − X. Weights are renormalised over the inputs that were measured, and a dimension with less than half its input weight measured is left empty, never guessed. SE = √Σ(wᵢ² · seᵢ²) with normalised weights. This assumes independent errors, an approximation: inputs from the same instrument are correlated, which would widen it a little.

**Strengths among value modes** use BLUEPRINT §7's rule. A mode is a strength (or weakness) only when its gap from the person's own mean beats 1.96 × the error of that gap.

Error of the gap (xᵢ − mean) = √(seᵢ²(1 − 1/n)² + Σⱼ≠ᵢ seⱼ²/n²)

**Modes built on the same inputs won't separate**, and the report says so instead of forcing a distinction. `overlappingModes()` lists pairs that share at least half their input weight: today Influence + Lead, Organise + Protect, and Care + Teach.

**Experimental research scales** (the S1, S2 and S5 research items) are never used. They are scored into `SessionScores.hidden` as before, and `lib/workdesign/shadow.ts` logs them next to the dimensions (only with `SHADOW_LOG=1`) for later validation. A unit test checks that no dimension reads an experimental scale.

## Career-side scale

Each career path's profile is the weighted mean of its linked O\*NET occupations.

**How links are made.** Each career path has its ESCO occupations (`taxonomy/esco_mapping.csv`).

1. **Crosswalk (primary).** The ESCO URI is looked up in the official ESCO API at the crosswalk's ESCO version (v1.2.0) to get its code. That code is then looked up in the O\*NET-hosted ESCO → O\*NET-SOC crosswalk. The join is exact by URI; labels aren't matched.
2. **ISCO fallback.** If the crosswalk has no row for the code, its ISCO-08 unit group (the code's first four digits) is looked up in the same crosswalk's ISCO rows.
3. **Lane-ISCO fallback.** If none of a career path's occupations link, the career path's own ISCO groups are used.

**Weights by link quality** (`taxonomy/build/onet_config.json`, provisional):

| Link | Weight |
|---|---|
| Crosswalk | 1.0, split evenly over the O\*NET codes listed for that ESCO occupation |
| ISCO fallback (per ESCO occupation) | 0.25 |
| Lane-ISCO fallback (career path level) | 0.15 |

The O\*NET-hosted crosswalk has **no match-type column** (exact, close, broad and so on), so every crosswalk link gets the same weight. The brief asked to keep the crosswalk's match type; there is none to keep. If a version with match types turns up, the config takes per-type weights.

**Coverage confidence** = min(1, ESCO occupations linked by the crosswalk / 5) × the crosswalk's share of the link weight. It is a plain signal of how much of the profile rests on direct links, not a statistical confidence.

Every descriptor is kept raw and as a 0–100 **percentile across all O\*NET occupations**, so files with different scales (Importance 1–5, Level 0–7, Context 1–5, Extent 1–7, Job Zone 1–5) share one scale. A dimension's career score is the weighted mean of its elements' percentiles ("reverse" uses 100 − percentile).

**Unrated occupations.** About 100 of O\*NET's 1,016 codes carry no ratings ("All Other" codes, Legislators, some 2019 codes). They are dropped per descriptor and the rest renormalised; a descriptor needs at least half the link weight rated. Each profile records its `data_share`, and coverage confidence is multiplied by the Work Activities share.

**Estimated profiles** (18; `taxonomy/reference/onet/estimated_profiles.csv`) are built from 2–5 named, rated analog occupations, plus explicit percentile adjustments, each with a written rationale. They are marked `"provenance": "estimated"` in the data and must be marked in the UI. A career path gets one when:
- it has no ESCO occupation (10);
- its one ESCO occupation can't represent it (content creation);
- less than half its link weight is rated (risk management, vocational instruction, politics). The build fails without an estimate here;
- its crosswalk links describe a different job (management consulting, partnerships, professional strategy games, tattoo).

## A. Value modes: how you add value

The person side is a profile across nine modes; the career side is that career path's profile across the same nine. Phase 2 compares them as shapes. Each mode is shown as a nature archetype: a metaphor for a measured pattern, never a claim about ancestry.

| Mode (archetype) | Person side (weights) | Career side: O\*NET Work Activities, Importance (weights) | Rationale |
|---|---|---|---|
| Influence (Hunter) | Enterprising .4, assertiveness (E3) .2, Extraversion .2, risk task .2 | Selling or Influencing Others ×2; Communicating with People Outside the Organization | Enterprising interest is the core of persuasive work; assertiveness and extraversion carry it. The brief's "competition-related scores" have no validated scale yet, so the risk task stands in at a low weight. |
| Analyse (Scout) | Investigative .45, general reasoning .3, intellect (O5) .25 | Analyzing Data or Information ×2; Getting Information; Processing Information | Interest in investigating, plus the reasoning to do it and the appetite for ideas. |
| Build (Maker) | Realistic .6, spatial reasoning .4 | Handling and Moving Objects; Repairing and Maintaining Mechanical / Electronic Equipment; Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment | Hands-on interest and spatial ability. |
| Organise (Gatherer) | Conventional .5, orderliness (C2) .25, dutifulness (C3) .25 | Organizing, Planning, and Prioritizing Work ×2; Documenting/Recording Information; Scheduling Work and Activities | Interest in order plus the conscientiousness facets that keep it. |
| Care (Healer) | Social .5, sympathy (A6) .25, altruism (A3) .25 | Assisting and Caring for Others | Helping interest plus the warmth facets. |
| Teach (Teacher) | Social .5, Extraversion .25, Openness .25 | Training and Teaching Others ×2; Coaching and Developing Others | Helping interest, delivered to groups, about ideas. |
| Create (Storyteller) | Artistic .5, imagination (O1) .25, artistic interests (O2) .25 | Thinking Creatively | Artistic interest plus the openness facets most tied to creating. |
| Lead (Chief) | Enterprising .4, assertiveness .2, low Neuroticism .2, achievement-striving (C4) .2 | Guiding, Directing, and Motivating Subordinates ×2; Coordinating the Work and Activities of Others; Making Decisions and Solving Problems | Directing others asks for drive and steadiness under pressure. |
| Protect (Guardian) | Conventional .4, dutifulness .2, cautiousness (C6) .2, low risk-taking .2 | Monitoring Processes, Materials, or Surroundings; Evaluating Information to Determine Compliance with Standards; Inspecting Equipment, Structures, or Materials | Checking and safeguarding fits rule-keeping and caution. |

## B. Environment dimensions: what your best day feels like

Penalty shapes (used in Phase 2; person score p, career score c):
- **deficit:** only c < p hurts (the work gives less than you need);
- **excess:** only c > p hurts (the work asks more than suits you);
- **two-sided:** any distance hurts.

| Dimension | Person side | Career side (O\*NET; Work Context = CX) | Penalty |
|---|---|---|---|
| Autonomy | Independence value .6, low orderliness .4 | Freedom to Make Decisions ×2; Determine Tasks, Priorities and Goals; Work Values: Independence | deficit |
| Social contact | Extraversion .4, Social interest .3, Relationships value .3 | Contact With Others ×2; Work With or Contribute to a Work Group or Team; Deal With External Customers or the Public in General | two-sided |
| Pace and time pressure | Processing speed .5, low Neuroticism .5 | Time Pressure | excess |
| Conflict and friction | Low Neuroticism .4, assertiveness .3, low Agreeableness .3 | Conflict Situations; Dealing With Unpleasant, Angry, or Discourteous People | excess |
| Competition | Enterprising .6, risk task .4 | Level of Competition | two-sided |
| Precision and consequence of error | Conscientiousness .6, low Neuroticism .4 | Importance of Being Exact or Accurate; Consequence of Error | excess |
| Variety vs. routine | Openness .6, learning rate .4 | Importance of Repeating Same Tasks (reversed); Thinking Creatively (Work Activity) | deficit |
| Cognitive challenge | General reasoning percentile | Job Zone ×2; Level of Deductive Reasoning, Inductive Reasoning, Mathematical Reasoning, Problem Sensitivity | deficit (under-challenge) |

Notes:
- **"Determine Tasks, Priorities and Goals"** (4.C.3.b.8, called "Structured versus Unstructured Work" before 31.0): the 31.0 categories run from 1 "No freedom" to 5 "A lot of freedom", so the high end is self-directed work. It is used unreversed. Checked in `Work Context Categories.txt`.
- **Cognitive challenge:** this is about under-challenge only. Work that demands more than your measured range is ability fit (C), not fulfilment.

## C. Ability demands (Phase 2 ability fit)

| Reasoning area | O\*NET abilities (Level; weighted by Importance) |
|---|---|
| Reasoning | Deductive Reasoning, Inductive Reasoning, Problem Sensitivity |
| Quantitative | Mathematical Reasoning, Number Facility |
| Spatial | Spatial Orientation, Visualization |
| Memory | Memorization |
| Speed | Perceptual Speed, Speed of Closure |

Only a shortfall counts against ability fit; surplus capability doesn't.

## D. How you work best and a typical day (Phase 3)

- **How you work best** (`src/lib/workdesign/best.ts`): the value modes and working conditions with their 90% ranges (value ± 1.645·SE, on the anchored 0–100 scale), the archetype blend from matching v2, the inseparable mode pairs, and the drains. Every dimension has a stable id (`mode.<id>`, `env.<id>`).
- **What drains you:** the working conditions with the strongest reliable need on the side that can hurt. The need strength is matching v2's need weight without its floor (deficit max(0, p − 50)/50, excess max(0, 50 − p)/50, two-sided |p − 50|/50), so it is exactly the weight a point of mismatch carries in fulfilment fit. A need counts only when the score is clear of 50 by more than its 90% half-range, and is at least 0.2. Up to three, strongest first, each named by the pole that drains and the share of career paths that miss it by more than 15 points. Provisional.
- **A typical day** (`taxonomy/build/build_career_days.py` → `taxonomy/derived/career_days.json`): the five O*NET Work Activities rated important (IM ≥ 3.5) that are most distinctive (highest percentile across occupations), filled up to three by rating when fewer qualify; and up to four Work Context elements at or above the 75th percentile, leaving out the elements the environment dimensions already read, each with O*NET's nearest response wording. Names and descriptions are O*NET's own; estimated career paths say so. Provisional.

## Open questions

1. **Work Styles:** O\*NET 31.0 replaced the old 16 with 21 styles on a new impact scale (WI, −3 to +3); the names are listed in `taxonomy/derived/REPORT.md`. The profiles carry them, but no dimension uses them yet. They are candidates for Phase 2, with validation.
2. **Planning SDs:** they set the error bars of anchored inputs. Transcribing Johnson (2014) and the O\*NET Interest Profiler norms replaces them.
3. **Correlated errors:** they are ignored in dimension SEs (an approximation, noted above).

## Decisions for Phase 2 (product owner, 2026-10-27)

Recorded here; nothing below is implemented in Phase 1.

1. **Pace and time pressure:** O\*NET's Time Pressure is deadline frequency, so emergency work rates low (firefighters 15th percentile, air traffic controllers 18th). Blend in urgency-related Work Context (for example Consequence of Error, Frequency of Decision Making, Impact of Decisions on Co-workers or Company Results) so emergency work rises; re-run the face-validity check.
2. **Model weighting:** fix the issues in REPORT.md §2 ("The model") in Phase 2 rather than leaving them to calibration:
   - Protect's missing people-safety element;
   - Social contact for teaching and childcare;
   - Variety for assembly work;
   - Organise for administration;
   - Analyse's weight on Getting Information.
3. **Norms:** transcribe the IPIP-NEO-120 norms (Johnson, 2014) and the O\*NET Interest Profiler norms, so personality and interests switch from `anchored` to `normed`.
4. **Income labels:** not part of Work Design.
