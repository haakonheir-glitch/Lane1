# Matching v2

Version `v2-0.5` (the precision pass, 2026-10-29; on branch `precision-pass` until reviewed). v2-0.3 and v2-0.4 stay selectable: set `MATCHING_CONFIG=v2-0.3` (or `v2-0.4`) to run the app on them, or pass the config to `matchAllV2` (`V2_CONFIGS` in `config.ts`). The precision pass is described in its own section at the end.
- **Code:** `src/lib/matching/v2/` (pure, deterministic, no LLM calls).
- **Settings:** `src/lib/matching/v2/config.ts`.
- **Career data:** `taxonomy/derived/lane_profiles_v2.json`, built by `taxonomy/build/build_v2_lane_profiles.mts` from the O\*NET profiles (`taxonomy/derived/REPORT.md`). Career offsets: `taxonomy/derived/lane_offsets_v2.json`, built by `taxonomy/build/build_v2_offsets.mts`.
- **Person data:** the Work Design inputs, each a 0–100 value with a standard error (`docs/WORK_DESIGN.md`).
- **Validation and tuning:** `taxonomy/derived/MATCHING_V2_REPORT.md`.

**In use:** v2 is the app's only matching (approved and live on 2026-10-28). Matching v1 and the `MATCHING_VERSION` flag were removed the same day at your request (`design/REMOVED.md`). Cached matching results are keyed by the v2 config version and the O\*NET build, so retuning recomputes.

**Status: provisional.** Every weight and threshold below is a reasoned starting point, to be fitted to outcome data later.

## What it computes

`computeFit(person, lane)` gives one career path. `lane` is an id or a profile, and it is scored against all 205 career paths. `matchAllV2` scores all 205 at once. Both return:
- `fulfilmentFit`: needs–supplies fit, the headline;
- `abilityFit`: demands–abilities fit, secondary;
- `components`;
- `drivers` and `frictions`, each with the person's source score ids.

A single fit still needs the whole field, for three reasons:
- each component is standardised across the 205 career paths;
- a career's missing data is filled from the field;
- drivers are relative to the average career path.

### 1. Fulfilment fit (needs–supplies)

| Component | Weight | Score per career path (0–1) |
|---|---|---|
| Interests | .35 | Correlation of the person's RIASEC profile with the career's O\*NET interest profile (OI): the shape, not the level |
| Work values | .15 | The same, for ranked work values (card sort, ipsative) against the career's O\*NET Work Values extents (EX) |
| Value modes | .20 | The same, across the nine modes |
| Environment | .20 | Per dimension, the model's penalty shape, 1 − penalty / 100, weighted by the strength of the need (below) |
| Challenge | .10 | Under-challenge only: 1 − max(0, your reasoning − the career's challenge) / 100 |
| Reasoning strengths | .08 | The regularised correlation of your reasoning areas (reasoning, quantitative, spatial, memory, speed; each against your own average) with the career's ability demands in the same areas (each an O\*NET Level percentile across occupations, centred on the career's own average). Needs at least 3 areas on both sides |

The weights are renormalised over the components you have, so they sum to 1 (with reasoning strengths, the six nominal weights sum to 1.08). Without reasoning results, reasoning strengths drops out and the other five weigh exactly what they did in v2-0.3.

**Reasoning strengths** (v2-0.4, at your request) answers "does this work lean on what I'm relatively best at?". It credits career paths whose ability demands peak where your own reasoning results peak, and (being a correlation) also those that make little call on your least strong area. It looks at the *shape* only: your general level still works through challenge (above) and ability fit (below), so a uniformly high result doesn't lift every demanding career twice. Measurement error counts twice over: it is carried through the draws, and the person's side is regularised by max(10, 2.5 × the areas' RMS standard error) per area, so areas that differ by less than their error count as an even profile (neutral). Real reasoning areas have SEs of 14–22 points, so in practice only large, clear differences move the fit. The career's side is regularised too (8 percentile points per area), so a career whose demands are nearly flat counts as neutral rather than "leaning on" an area.

Measured trade-off (provisional): for simulated people whose true areas are equal, observed with realistic error, the component changes about 1.6 of their roughly 15 strong fits; a clear spatial strength adds about 4 spatial-heavy career paths to the strong band. A stronger shrinkage (factor 3) halves the noise effect but also the signal.

- **Regularised correlations.** r = Σ ĉᵢ(xᵢ − x̄) / max(‖x − x̄‖, 10·√n), with ĉ the career's centred unit profile.
  - It is Pearson r when your profile has spread. When your scores are within about 10 points of each other, it shrinks towards 0 (neutral).
  - Without this, a nearly flat profile let a 2-point change in one facet reorder the whole list.
- **Need strength.** Dimensions are weighted by how strong your need is on the side that can hurt:
  - two-sided: |p − 50| / 50;
  - deficit (only "too little" hurts): max(0, p − 50) / 50;
  - excess (only "too much" hurts): max(0, 50 − p) / 50;
  - each plus a 0.05 floor.

  This is how v2 reads the brief's "how far the person sits from the middle". A low need on a deficit dimension can never be let down, so it gets only the floor.
- **Centred, scaled, then weighted.**
  - Each component is centred on your average career path and divided by a **fixed reference spread**: its typical SD across career paths, the median over 400 simulated people. Interests .195, values .19, value modes .14, environment .065, challenge .095, reasoning strengths .17.
  - The fit is 50 + 10 × Σ weight × z.
  - **Weights are comparable SD shares.** On raw scales, interests dominated and environment and challenge (30% nominal) moved almost nothing. Measured over a population, environment now carries about its nominal share of the ranking variance. Challenge and values carry less than nominal in variance terms, because they correlate with the other components.
  - **A near-flat profile stays near-flat.** The reference spread is fixed rather than your own, so a 1-point change in one interest moves no fit by more than a point.
  - The result is **relative to you**: 50 is your average career path.
- **Career offsets (popularity).** Environment and challenge only penalise in one direction: a career can't give "too much" autonomy or challenge.
  - Left alone, demanding, autonomous, calm careers suited nearly everyone. Electrical & electronics engineering was a strong fit for 31% of simulated people.
  - So each career's general advantage on these two components (its mean over a reference population of 1,000 simulated people, minus the mean over all careers) is subtracted. A career is credited only for fitting *you* better than it fits people in general.
  - The reference population uses a different seed from the validation population.
  - Interests, values, modes and reasoning strengths are symmetric correlations and are not offset.
- **Missing data.**
  - A component the career path lacks (5 have no O\*NET Work Values) counts as your average for it (z = 0): unknown is neutral. Dropping it instead made missing data a bonus.
  - A component you lack is left out, and the weights renormalise.
  - Interests are required.

### 2. Ability fit (demands–abilities), 0–100

- **Demand per reasoning area:** the importance-weighted Level percentile of its O\*NET abilities.
- **Ability fit** = 100 − the importance-weighted mean shortfall, where shortfall = max(0, demand − your percentile). Surplus doesn't count.
- **Coverage:** it needs at least half the career's ability importance measured, else it is empty. A test persona whose only valid reasoning scores were memory and speed otherwise got "100" everywhere.
- **Caveat:** reasoning percentiles are population percentiles, while demands are percentiles across occupations. Comparing them is an approximation.

### 3. Uncertainty

- **Monte Carlo:** 500 draws of every input from N(value, SE), clamped to 0–100. Every career path is rescored per draw.
- **Determinism:** the seed comes from the profile.
- **Distributions:** each fit is given as mean, SD, 10th, 50th and 90th percentile.

### 4. Bands, from rank stability

| Band | Rule (configurable) |
|---|---|
| Strong fit | P(in your top 10%) ≥ **0.5** |
| Unlikely | P(in your bottom 40%) ≥ **0.7** |
| Possible fit | everything else |

The thresholds are tuned on 1,000 simulated people (`MATCHING_V2_REPORT.md`).

### 5. Guards

- **No personality facet carries more than 15% of any fit. This is enforced, not assumed.**
  - For each person, every input's effect on every fit is measured: the fit against the fit with that input set to its reference. A facet's reference is its domain score; anything else's is 50.
  - A facet's share is its effect over all effects.
  - The summed effects are floored at 10 fit points, so a tiny effect on a near-flat profile can't count as "100% of the fit".
  - If a facet passes 15% of any fit, it is shrunk towards its domain score (x' = domain + λ(x − domain), λ found by bisection). The pass repeats until no facet is over, because shrinking one facet changes the others' shares.
  - The same λ applies in every draw.
  - The result lists each facet with its share before and its final share after, and a note says whether it was weighted down or replaced by the domain score.
  - Two earlier versions failed independent review: an analytic bound missed the correlation's non-linearity (a 19-point swing), and a one-pass guard didn't converge (shares up to 82% on contrived profiles). On the same adversarial profiles, every facet now ends at 15.0%.
- **Few strong fits are always explained.**
  - Fewer than 8 strong fits gets a note.
  - "flat_profile" applies when the interests SD < 10 or the value-mode SD < 6.
  - Otherwise "few_strong": several career paths fit about equally well.

### 6. Presentation data

- **Top five:** strong band first, then by expected fulfilment fit, each with its ability fit.
- **Best in each direction:** for each value mode, the best career path whose own leading mode it is.
- **Where you'd start:** unchanged; the v1 role and seniority logic.

### 7. Archetype blend

- **The blend:** softmax over the nine mode scores, temperature 8 points. The top two are shown with percentages.
- **Tentative:** when the leader beats the second in fewer than 90% of draws. It is worded "You sit between X and Y", a reading rather than a warning. The draws redraw shared inputs jointly, so this already accounts for modes built from the same scores.
- **Caveat:** when the top two are a pair built from largely the same inputs (Influence + Lead, Organise + Protect, Care + Teach), a separate caveat says to read them as one pattern.

### Drivers and frictions

- **What they are:** each component is split into named parts (RIASEC letters, work values, modes, environment dimensions, challenge) on the same scale as the fit. Each part is compared with the same part averaged over all 205 career paths.
  - **Drivers** make this career path fit better than your typical one; shared strengths lead.
  - **Frictions** make it fit worse.
- **Reasoning strengths parts** (one per reasoning area) are named only when that area passes the BLUEPRINT §7 test against the person's own other areas (the same rule the profile's reasoning chapter uses). Otherwise they still move the fit, but aren't shown as a driver or friction. Wording: "Spatial: a relative strength of yours, and this work leans on it"; "Little call on memory, a relatively weaker area of yours"; frictions "Little use of spatial, a relative strength of yours" and "Leans on memory, a relatively weaker area of yours". Their ids (`reasoning.spatial`) link to the reasoning traits in the trait connections.
- **Labels** depend on which side is high:
  - "Enterprising interests": both high;
  - "Little Realistic work, which suits you": both low;
  - "Little use of your Social interests": yours high, the career's low;
  - "Less Investigative work than most of your options": a shared strength that is weaker here;
  - "Autonomy: less than you need" (or "less than suits you" when your need is moderate): an environment shortfall.
  - Mixed parts (one side high, the other low) only ever count as frictions.
  - Environment drivers say "as much as you need" only when the gap is small; otherwise "a smaller gap than most of your options".
  - The challenge driver says "enough for your reasoning range" only when the career is not under-challenging.
- **Sources:** every driver lists the source score ids.

## Where it is shown (Phase 3)

- **Career map:** the default view is the fit map, fulfilment fit (vertical) × ability fit (horizontal), split at 50 (your average career path) and at ability fit 80 (`ABILITY_SPLIT` in `src/components/lanes/FitQuadrant.tsx`, provisional), dots styled by band. It is the default only when most career paths have ability fit; otherwise the Family list is. The detail shows both fits as the range 80% of the draws fall in, "Why it fits" (drivers), "Where it rubs" (frictions), and you against the career on the value modes and working conditions.
- **Report:** chapter 02, "Where this work exists", lists the closest career paths with both fits. The facts for the written report carry both fits and the frictions.
- **The adapter** (`adapter.ts`) still feeds the v1-shaped parts (bands in the lists, picks, trait connections); the native result is memoised next to it (`src/lib/data/lanes.ts`, `nativeFor`).

## Precision pass (v2-0.5)

Each change below is behind the config, so v2-0.3 and v2-0.4 reproduce when selected.
- **Checked against the old code.** The same inputs (the sample profile and the six test profiles) went through f5db165 (v2-0.3) and 0b9ef0a (v2-0.4) and through this code with that config selected, at 200 draws.
  - v2-0.4 is byte-identical.
  - v2-0.3 has identical fits, bands, drivers and frictions. It runs on the offsets it was released with, kept frozen in `taxonomy/derived/lane_offsets_v2-0.3.json`. The only differences are the strengths fields added in v2-0.4 (null) and the archetype sentence, which the Phase 3 copy reworded.
- **Norms follow the config.** When the app runs v2-0.4 or earlier, stored scores are read without norms, so the profile, its starting roles and the report are exactly as before. The step-by-step effect on the six test profiles is in `taxonomy/derived/PRECISION_STEPS.md`. The validation is in `taxonomy/derived/PRECISION_REPORT.md`.

1. **Published norms** (`src/lib/scoring/psychometrics.ts`, `src/lib/scoring/norms.ts`). Interests are normed against the O\*NET Interest Profiler Short Form norms:
   - Source: Rounds et al. (2016), Mini-IP report. Means and SDs from Table 8 (p. 36), Short-IP total, N = 575. Alphas from Table 9 (p. 37).
   - Responses are coded 1–5, and the item mean ×10 gives our 10–50 sum.
   - Norms are applied when a profile is read, so stored scores switch from `anchored` to `normed` without a rescore.
   - The IPIP-NEO-120 norms (Kajonius & Johnson, 2019) and Honesty-Humility stay `null`: their source hosts are blocked from this build environment, and Honesty-Humility has no citable source here. Personality stays `anchored` until they are transcribed, then switches automatically.
   - Config: `inputs.norms`.
2. **Work values by expected normal order statistics.** The six card-sort ranks map to ±1.267, ±0.642 and ±0.202 (n = 6; ties average the statistics they span). These are multiplied by a shrinkage of 0.7, then converted to a percentile, so the top value is the 81st percentile, not 100. Config: `inputs.values`.
3. **Environment cap** (`envCap` 0.15). The ensemble's flat-weighted draws get their own cap: the guard is run again under flat weighting. The Dirichlet-drawn weights vary around the capped estimate. No working condition, and not challenge, may carry more than 15% of any fit. It is measured like the facet cap: the dimension's effect on the fit (the fit against the fit without it) over the summed effects of all inputs, floored at `guardMinTotal`. It is enforced by shrinking that dimension's need weight by bisection. Every dimension's largest share before and after is in the result (`envGuard`).
4. **Weights:** interests .45, values .20, value modes .15, environment .10, challenge .10, with reasoning strengths .08 renormalised as before.
   - Why: the validated instruments with the strongest evidence carry most. Interest congruence (the O\*NET Interest Profiler against O\*NET occupational interest profiles) is the best-replicated of these predictors of satisfaction and persistence. Work values come next (the O\*NET Work Importance Locator against O\*NET's occupational reinforcer profiles).
   - Value modes, working conditions and challenge are Lane's own derived constructs, so they carry less.
   - Each component has a `validationStatus` (validated, derived or provisional) and a multiplier per status (`validationMultiplier`). The effective weight is weight × multiplier, renormalised. The multipliers are all 1 today, because the weights above already reflect the evidence. They are the lever for when it changes.
5. **Weight ensemble** (`ensemble`). Each Monte Carlo draw also draws the component weights from a Dirichlet centred on the effective weights (α = 40 × weight), and in half the draws it uses flat environment weighting instead of need-weighting.
   - The ensemble draws come from their own random stream, so the input noise is identical with and without it.
   - A band must hold under both weightings: strong needs P(top 10%) ≥ .5 among the need-weighted draws and among the flat ones.
   - Flat weighting has its own career offsets (`environmentFlat`).
   - The detail panel shows the share the band rests on (`pTopBand`, the smaller of the two), so the band and the share always agree.
6. **Starting roles from data** (`rolesFromData`, `src/lib/matching/roles.ts`).
   - 906 roles have their own ESCO→O\*NET link: the ESCO occupations mapped to the role in `esco_mapping.csv`, through the official crosswalk or a reviewed override (`taxonomy/derived/role_profiles_v2.json`).
   - These roles are ranked by interest fit (.75) and value-mode fit (.25), the same .45 : .15 ratio as above.
   - Roles without a link are ranked by their tags, after the data-ranked ones.
   - A role whose top O\*NET interest is one of the person's two lowest interests carries a note.

**Synthetic people for validation.** v2-0.4 was validated on people whose interest and personality numbers are positions on the questionnaire's scale (50 = the scale midpoint). With norms, the midpoint is not the population average: Conscientiousness 3.0 is near the 10th percentile. So the precision validation specifies its people as population percentiles (`synthetic(spec, inputs, "percentile")`). These are turned into the raw scores a person at that percentile gives, and each config then reads them by its own rule. v2-0.5's career offsets come from that population; v2-0.3 and v2-0.4 keep theirs.

**Ground truth** (stored, never used in matching):
- onboarding asks "How satisfied are you in this work?" (1–7) for the current job and up to two previous jobs;
- the top five Career map cards ask "Does this resonate?", stored with the matching version (migration 0005).

