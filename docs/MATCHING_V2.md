# Matching v2

Version `v2-0.3`.
- **Code:** `src/lib/matching/v2/` (pure, deterministic, no LLM calls).
- **Settings:** `src/lib/matching/v2/config.ts`.
- **Career data:** `taxonomy/derived/lane_profiles_v2.json`, built by `taxonomy/build/build_v2_lane_profiles.mts` from the O\*NET profiles (`taxonomy/derived/REPORT.md`). Career offsets: `taxonomy/derived/lane_offsets_v2.json`, built by `taxonomy/build/build_v2_offsets.mts`.
- **Person data:** the Work Design inputs, each a 0–100 value with a standard error (`docs/WORK_DESIGN.md`).
- **Validation and tuning:** `taxonomy/derived/MATCHING_V2_REPORT.md`.

**Selecting it:**
- `MATCHING_VERSION=v2` makes the app use v2; anything else keeps **v1**. v2 was approved on 2026-10-28; v1 stays the default until you choose to switch, and stays in the code until its deletion is approved.
- v1 is unchanged and still selectable.
- Until Phase 3 builds the v2 views, the current Career map reads v2 through an adapter (`src/lib/matching/v2/adapter.ts`).
- Cached matching results are keyed by the version, the v2 config version and the O\*NET build, so switching recomputes.

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
  - Each component is centred on your average career path and divided by a **fixed reference spread**: its typical SD across career paths, the median over 400 simulated people. Interests .195, values .19, value modes .14, environment .065, challenge .095.
  - The fit is 50 + 10 × Σ weight × z.
  - **Weights are comparable SD shares.** On raw scales, interests dominated and environment and challenge (30% nominal) moved almost nothing. Measured over a population, environment now carries about its nominal share of the ranking variance. Challenge and values carry less than nominal in variance terms, because they correlate with the other components.
  - **A near-flat profile stays near-flat.** The reference spread is fixed rather than your own, so a 1-point change in one interest moves no fit by more than a point.
  - The result is **relative to you**: 50 is your average career path.
- **Career offsets (popularity).** Environment and challenge only penalise in one direction: a career can't give "too much" autonomy or challenge.
  - Left alone, demanding, autonomous, calm careers suited nearly everyone. Electrical & electronics engineering was a strong fit for 31% of simulated people.
  - So each career's general advantage on these two components (its mean over a reference population of 1,000 simulated people, minus the mean over all careers) is subtracted. A career is credited only for fitting *you* better than it fits people in general.
  - The reference population uses a different seed from the validation population.
  - Interests, values and modes are symmetric correlations and are not offset.
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

## Not done in Phase 2

The Career map's 2×2 view and detail overlays, the report's "How you work best" chapter, and the outcome check-in are Phase 3.
