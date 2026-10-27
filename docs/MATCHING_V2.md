# Matching v2

Version `v2-0.1`. Code: `src/lib/matching/v2/` (pure, deterministic, no LLM calls). Settings: `src/lib/matching/v2/config.ts`. Career data: `taxonomy/derived/lane_profiles_v2.json`, built by `taxonomy/build/build_v2_lane_profiles.mts` from the O\*NET profiles (see `taxonomy/derived/REPORT.md`). Person data: the Work Design inputs, each a 0–100 value with a standard error (`docs/WORK_DESIGN.md`).

**Selecting it:**
- `MATCHING_VERSION=v2` makes the app use v2.
- Anything else keeps **v1**, which stays the default until v2 is approved.
- v1 is unchanged and still selectable.
- The current Career map reads v2 through an adapter (`src/lib/matching/v2/adapter.ts`), until Phase 3 builds the v2 views.

**Status: provisional.** Every weight and threshold below is a reasoned starting point, to be fitted to outcome data later.

## What it computes

`computeFit(person, lane)` (and `matchAllV2` for all 205 career paths at once) returns:
- `fulfilmentFit`: needs–supplies fit, the headline;
- `abilityFit`: demands–abilities fit, secondary;
- `components`;
- `drivers` and `frictions`, each carrying the person's source score ids.

### 1. Fulfilment fit (needs–supplies), 0–100

| Component | Weight | How |
|---|---|---|
| Interests | .35 | Pearson r between the person's RIASEC profile and the career's O\*NET interest profile (OI). Only the shape counts, not the level. |
| Work values | .15 | r between the person's ranked work values (card sort, ipsative) and the career's O\*NET Work Values extents (EX) |
| Value modes | .20 | r across the nine modes, person against career |
| Environment | .20 | Per dimension, the model's penalty shape: deficit, excess or two-sided. Fit per dimension = 1 − penalty / 100. Dimensions are weighted by how far the person sits from the middle, 0.05 + \|p − 50\| / 50, because strong needs matter more. |
| Challenge | .10 | Under-challenge only: 1 − max(0, your reasoning − the career's challenge) / 100 |

- **Combining:** correlations are mapped to 0–1 as (1 + r) / 2, and the components are combined with the weights above.
- **Missing person data:** a component the *person* has no data for is left out, and the weights renormalise.
- **Missing career data:** a component the *career* has no data for (5 career paths have no O\*NET Work Values) gets the person's average for that component across the other career paths. Unknown counts as neutral.
  - Dropping it instead made missing data a bonus: PR & communications was the enterprising test profile's #1 only because its values were missing. After the fix it is #25.
- **Interests are required:** without them there is no fulfilment fit, and the career paths show as "not enough data".

### 2. Ability fit (demands–abilities), 0–100

- **Demand per reasoning area** (reasoning, quantitative, spatial, memory, speed): the importance-weighted mean of the Level percentiles of its O\*NET abilities. The mapping is in `ABILITY_DEMANDS` in `docs/WORK_DESIGN.md`.
- **Ability fit** = 100 − the importance-weighted mean shortfall, where shortfall = max(0, demand − your percentile).
- **Surplus doesn't count;** under-challenge belongs to fulfilment.
- **Coverage:** it needs at least half the career's ability importance measured, otherwise it is empty.
- **Caveat:** the person's reasoning percentiles are population percentiles, while the career demands are percentiles across occupations. Comparing them is an approximation.

### 3. Uncertainty

- **Monte Carlo:** 500 draws of every input from N(value, SE), clamped to 0–100. Every career path is rescored per draw.
- **Determinism:** the seed comes from the profile, so the same profile always gets the same result.
- **Distributions:** each fit is given as mean, SD, 10th, 50th and 90th percentile.

### 4. Bands, from rank stability

| Band | Rule |
|---|---|
| Strong fit | P(in your top 10%, i.e. top 21 of 205) ≥ **0.5** |
| Unlikely | P(in your bottom 40%) ≥ **0.7** |
| Possible fit | everything else |

The thresholds are tuned on the simulated population so that a typical profile gets about 8–20 strong fits (`taxonomy/derived/MATCHING_V2_REPORT.md`).

### 5. Guards

- **No personality facet may carry more than 15% of a fit.**
  - `facetShareBound()` computes, for every facet, the most it could ever carry: its share of the value-mode correlation, plus all of the environment weight on the dimension where it weighs most, over the smallest possible weight total.
  - The worst case is orderliness (C2) at 11.4%, then assertiveness (E3) at 9.2%.
  - `checkConfig()` refuses any configuration that would break the cap, and a test checks it.
- **A flat profile gets few strong fits and is told why.**
  - Rank stability does the first part on its own: the flat test profile gets 0 strong fits.
  - A note explains it when both the interests SD (< 8) and the value-mode SD (< 6) are small.

### 6. Presentation data

- **Top five:** strong band first, then by expected fulfilment fit, each with its ability fit.
- **Best in each direction:** for each value mode, the best career path whose own leading mode it is.
- **Where you'd start:** unchanged; the v1 role and seniority logic.

### 7. Archetype blend

- **The blend:** a softmax over the nine mode scores with temperature 8 points. The top two are shown with percentages.
- **"Tentative"** when either:
  - the top two are a pair built from the same inputs (Influence + Lead, Organise + Protect, Care + Teach); or
  - the leader beats the second in fewer than 90% of draws.

### Drivers and frictions

- **What they are:** each component is split into named parts (one per RIASEC letter, work value, mode and environment dimension). Each part is compared with the same part averaged over all 205 career paths.
  - **Drivers** are the parts that make this career path fit better than your typical one.
  - **Frictions** are the parts that make it fit worse.
- **Labels** say which side carries a part:
  - "Enterprising interests": you and the career are both high;
  - "Little Realistic work, which suits you": both low;
  - "Little use of your Social interests": you're high, the career is low.
- **Order:** shared strengths lead.
- **Sources:** every driver lists the person's score ids it rests on.

## Not done in Phase 2

The Career map's 2×2 view and detail overlays, the report's "How you work best" chapter, and the outcome check-in are Phase 3.
