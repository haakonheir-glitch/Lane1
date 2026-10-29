# Phase 2 report: matching v2

> **Update, 2026-10-29: v2-0.4 adds reasoning strengths** (PLAN D58, `docs/MATCHING_V2.md`). The validation in §3 has been rerun on v2-0.4 with 1,000 people:
> - **Strong fits per person:** mean 14.4 (was 14.3), with 83.7% of people at 8–20 (was 82.2%).
> - **Popularity:** no career is strong for more than 30% of people (the most common is 20.5%), and none is never strong.
> - **Expected-family hits:** the six profiles' hits are unchanged or better.
>
> **Update, 2026-10-28:** v2 is live and matching v1 has been deleted, together with the `MATCHING_VERSION` flag and `scripts/compare-matching.mts`. Below is the report as it stood at Phase 2; the v1-vs-v2 comparisons in §4 stay on record.

Status, 2026-10-28: **Phase 2 is complete and v2 is approved. Phase 3 has not been started.**

**Your decisions (2026-10-28):**
1. **v2 is approved.** Phase 3 builds the native v2 views.
   - v1 stays in the code until you approve deleting it.
   - v2 was made the default on 2026-10-28, at your request. `MATCHING_VERSION=v1` switches back.
2. **Tentative archetype blends** keep the 90% rule. They are phrased "You sit between X and Y", not as a warning. This is done in `v2-0.3`.
3. **"Fit × payoff" is dropped** from Phase 3, because income labels no longer exist.
4. **Niche career paths at the top are left as the data puts them.** There is no interest minimum and no hiding.

- **v1 is unchanged and still the default.** v2 runs only with `MATCHING_VERSION=v2`. With the flag unset, v1's output is byte-identical to before Phase 2 (checked in review).
- **Nothing was deleted.** v1 stays until you approve v2.
- **No test items, item order, instruments, session structure or scoring changed** in Phase 2.
- **Matching is deterministic code.** There are no LLM calls in it. The Monte Carlo seed comes from the profile, so the same profile always gets the same result.
- **Method:** `docs/MATCHING_V2.md` describes it in full. Settings are in `src/lib/matching/v2/config.ts` (version `v2-0.3`). Every weight and threshold is provisional.
- **Tests:** every new module has unit tests (`tests/matching-v2.test.ts`), and the full suite passes (174 tests), as do typecheck and lint.

## 1. What was built (brief steps 1–8)

| Step | Where | Notes |
|---|---|---|
| `computeFit(person, lane)` | `src/lib/matching/v2/index.ts`, `fit.ts` | Takes an id or a profile and scores it against the full field of 205 career paths, because fits are standardised across that field |
| 1. Fulfilment fit | `fit.ts` | Interests .35, value modes .20, environment .20, work values .15, challenge .10, each on a fixed reference scale |
| 2. Ability fit | `fit.ts` | 100 minus the importance-weighted shortfall against O\*NET ability levels; empty when less than half the demand is measured |
| 3. Monte Carlo | `fit.ts` | 500 draws from each input's standard error |
| 4. Bands | `config.ts` | Strong: P(top 10%) ≥ .5. Unlikely: P(bottom 40%) ≥ .7. Tuned with the sweep in §3 |
| 5. Guards | `fit.ts` | No facet carries over 15% of any fit (measured and enforced per person). A note explains having fewer than 8 strong fits |
| 6. Presentation | `present.ts` | Top five, best career path in each direction; "where you'd start" reuses v1 |
| 7. Archetype blend | `fit.ts` | Softmax blend with the top two; marked tentative when unstable; caveat for overlapping pairs |
| 8. Validation | `scripts/validate-matching-v2.mts`, `scripts/compare-matching.mts`, `synthetic.ts` | Results in §3 and §4 |

**Data:**
- `taxonomy/derived/lane_profiles_v2.json`, built by `taxonomy/build/build_v2_lane_profiles.mts`.
- `taxonomy/derived/lane_offsets_v2.json`, built by `taxonomy/build/build_v2_offsets.mts`.

Nothing in `taxonomy.json` was edited.

**App wiring (until Phase 3):**
- With the flag on, the current Career map reads v2 through an adapter (`adapter.ts`).
- Cache keys include the matching version, so switching recomputes.

## 2. Review history and what it changed

v2 went through **two independent adversarial review rounds**. Each finding below was reproduced before it was fixed.

**Round 1 (v2-0.1 → v2-0.2):**
- The facet guard's analytic "bound" wasn't one: the correlation is non-linear, and a facet could swing a fit by 19 points. It is now measured per person.
- Environment and challenge (30% nominal weight) barely moved rankings, because interests dominated on raw scales. Components are now standardised.
- Archetypes were "tentative" for 91% of people, because the test double-counted shared inputs. Draws now redraw shared inputs together.
- The flat-profile note triggered on the wrong condition.
- Driver labels misstated direction.
- Cache key, memo and adapter fixes.
- `computeFit` didn't match `matchAllV2`.

**Round 2 (v2-0.2 → v2-0.3):**
- **The guard didn't converge.** One pass of shrinking left other facets over the cap (up to 82% on contrived profiles), and it reported stale shares.
  - Now: repeated passes until every facet is ≤ 15%.
  - Total effects are floored at 10 fit points, so a tiny effect can't count as "100% of the fit".
  - On the same adversarial profiles, every facet ends at 15.0%.
- **Standardising per person undid the regularisation on near-flat profiles:** a 1-point change in one interest moved fits by up to 4.3. Now each component is divided by a fixed reference spread, and a 1-point change moves no fit by more than 0.7.
- **Labels overclaimed:**
  - mixed parts were shown as strengths;
  - "enough challenge" appeared where the career was under-challenging;
  - "as much as you need" appeared when a gap remained.

  The rules are now explicit (`docs/MATCHING_V2.md`, Drivers and frictions).
- **Popularity bias:** environment and challenge only penalise one way, so demanding, autonomous careers suited nearly everyone. Electrical engineering was strong for 31% of people.
  - Now each career's general advantage on those two components, from a separate reference population, is subtracted.
  - The worst case is now about 22%.
- **Smaller fixes:**
  - Careers missing Work Values got a bonus. Missing now counts as neutral.
  - Ability fit was "100" from two measured abilities. There is now a coverage rule.
  - Driver ordering now puts strengths first.

## 3. Validation

The section below is generated by `npx tsx scripts/report-matching-v2.mts` from `taxonomy/derived/matching_v2_validation.json`. That JSON is written by `npx tsx --conditions=react-server scripts/validate-matching-v2.mts`.

**How it was generated:**
- The six profiles come from `src/lib/matching/v2/synthetic.ts`.
- The population is 1,000 people from a three-factor latent model (seed 20261027). Its inputs are correlated the way the real constructs are, with realistic standard errors.
- The population is **synthetic**. It checks that the machinery behaves as intended. It does not show that the matches are right.

<!-- GENERATED:START -->
Generated 2026-10-29 from `taxonomy/derived/matching_v2_validation.json` (matching v2-0.4, 500 draws per person).

### The six test profiles

| Profile | Strong / possible / unlikely | Top 10 in expected families | Archetype blend (top two) | Note |
|---|---|---|---|---|
| Investigative / conventional analyst | 21 / 114 / 70 | 10 of 10 | Scout 65.7%, Gatherer 19.2% (tentative) |  |
| Social / artistic carer | 21 / 118 / 66 | 9 of 10 | Healer 73.4%, Teacher 17.4% |  |
| Realistic maker | 18 / 115 / 72 | 8 of 10 | Maker 95.1%, Scout 1.4% |  |
| Enterprising hunter | 21 / 111 / 73 | 8 of 10 | Hunter 52.4%, Chief 42.9% (tentative) |  |
| Artistic storyteller | 22 / 112 / 71 | 10 of 10 | Storyteller 94.4%, Teacher 2.4% |  |
| Flat profile | 0 / 205 / 0 | n/a | Hunter 11.1%, Scout 11.1% (tentative) | flat-profile note shown |

**Investigative / conventional analyst**: 1. Data science & statistics (S, fulfilment 65, ability 96.6) · 2. Data analysis & business intelligence (S, fulfilment 64.8, ability 97.4) · 3. Physics, chemistry & mathematics (S, fulfilment 64.7, ability 96.8) · 4. GIS & geospatial analysis (S, fulfilment 64.6, ability 98.3) · 5. Data engineering & databases (S, fulfilment 64.3, ability 98.5) · 6. Earth, ocean & climate sciences (S, fulfilment 63.7, ability 97) · 7. Software engineering (S, fulfilment 63.5, ability 99) · 8. Embedded & hardware-near software (S, fulfilment 63.4, ability 96.6) · 9. Quantitative finance (S, fulfilment 63.4, ability 94.8) · 10. DevOps, cloud & site reliability (S, fulfilment 63.2, ability 98.9)

**Social / artistic carer**: 1. Early childhood education (S, fulfilment 69.2, ability 86.8) · 2. Outdoor guiding & instruction (S, fulfilment 67.2, ability 98.3) · 3. Social work & welfare (S, fulfilment 67.2, ability 90.2) · 4. Childcare (S, fulfilment 66, ability 94.8) · 5. Coaching (S, fulfilment 65.1, ability 91.3) · 6. Elder & disability care (S, fulfilment 65, ability 97.5) · 7. Mental health & psychology (S, fulfilment 64.4, ability 85.5) · 8. School teaching (S, fulfilment 64.2, ability 85.2) · 9. Nursing & midwifery (S, fulfilment 64, ability 78.3) · 10. Vocational & specialist instruction (S, fulfilment 63.6, ability 91.8)

**Realistic maker**: 1. Ceramics, glass & instrument making (S, fulfilment 64.9, ability 98.8) · 2. Electrical & electronics engineering (S, fulfilment 64.4, ability 90.8) · 3. Renewable energy (S, fulfilment 63.4, ability 89.2) · 4. Restoration & decorative crafts (S, fulfilment 63.4, ability 99.4) · 5. Vehicle & machinery mechanics (S, fulfilment 63.4, ability 96.4) · 6. Industrial maintenance & technical service (S, fulfilment 63.3, ability 96.6) · 7. GIS & geospatial analysis (S, fulfilment 63, ability 89.4) · 8. Mechanical engineering (S, fulfilment 62.7, ability 88.1) · 9. Farming & horticulture (S, fulfilment 62.6, ability 98.9) · 10. Embedded & hardware-near software (S, fulfilment 62.4, ability 83.1)

**Enterprising hunter**: 1. Politics & elected office (S, fulfilment 65.2, ability 79.7) · 2. Events & experiential (S, fulfilment 65.1, ability 91.6) · 3. Brand marketing (S, fulfilment 65, ability 81.3) · 4. Intellectual property (S, fulfilment 64.9, ability 76.4) · 5. Agency & studio ownership (S, fulfilment 64.8, ability 85.8) · 6. PR & communications (S, fulfilment 64.6, ability 91.1) · 7. Startup founding (S, fulfilment 64.6, ability 78.5) · 8. B2B sales (S, fulfilment 64.5, ability 81.2) · 9. Project & programme management (S, fulfilment 64.5, ability 85.8) · 10. Advertising & creative agencies (S, fulfilment 64.4, ability 88.8)

**Artistic storyteller**: 1. Content creation (S, fulfilment 67.3, ability 91.8) · 2. Courses, digital products & communities (S, fulfilment 67, ability 93.4) · 3. Animation, VFX & 3D (S, fulfilment 66.5, ability 89.3) · 4. Music performance (S, fulfilment 66.2, ability 85.8) · 5. Journalism (S, fulfilment 65.5, ability 92.4) · 6. Writing & authorship (S, fulfilment 65.1, ability 97.5) · 7. Comedy (S, fulfilment 64.8, ability 82.2) · 8. Dance (S, fulfilment 64.4, ability 84.3) · 9. Hosting & broadcasting (S, fulfilment 64.4, ability 86.1) · 10. Tattoo & body art (S, fulfilment 64.4, ability 93.2)

**Flat profile**: 1. Fisheries & aquaculture (P, fulfilment 51.2, ability 89.6) · 2. Industrial maintenance & technical service (P, fulfilment 51.1, ability 88.9) · 3. Renewable energy (P, fulfilment 51.1, ability 79.2) · 4. Seafaring & ship operations (P, fulfilment 51.1, ability 83.4) · 5. Civil & structural engineering (P, fulfilment 50.9, ability 74.6) · 6. Farming & horticulture (P, fulfilment 50.9, ability 95) · 7. Food & drink craft (P, fulfilment 50.9, ability 96.8) · 8. HSE, quality & inspection (P, fulfilment 50.9, ability 85.5) · 9. IT support & infrastructure (P, fulfilment 50.9, ability 88.4) · 10. Landscaping & grounds (P, fulfilment 50.9, ability 94)

### Simulated population (1000 people)

- **Strong fits per person:** mean **14.4**, median 15, 10th–90th percentile 7–20, range 0–24. **83.7%** of people get 8–20.
- **Band distribution (average per person):** strong 14.4, possible 132.7, unlikely 57.9, not enough data 0.
- **Popularity bias (strong for more than 30% of people):** **none**.
- **Strong most often:** Early childhood education 20.5%, Social work & welfare 19.3%, Coaching 18.9%, Ceramics, glass & instrument making 18.8%, Embedded & hardware-near software 18.6%, Outdoor guiding & instruction 18.4%, Restoration & decorative crafts 18.3%, GIS & geospatial analysis 18.2%, Electrical & electronics engineering 17.9%, Furniture & woodcraft 17.8%.
- **Never strong for anyone:** none.
- **Few-strong-fit notes:** 92 of 1000 people got a flat-profile note.
- **Tentative archetype blends:** 830 of 1000 (83%).
- **Runtime:** 724 s for 1000 people (about 724 ms each).

### Strong-fit threshold sweep (P(top 10%) ≥ threshold)

| Threshold | Mean strong fits | 10th pct | Median | 90th pct | Share with 8–20 |
|---|---|---|---|---|---|
| 0.3 | 25.2 | 22 | 26 | 29 | 6.8% |
| 0.4 | 19 | 13 | 20 | 23 | 56.3% |
| 0.5 (chosen) | 14.4 | 7 | 15 | 20 | 83.7% |
| 0.6 | 10.6 | 3 | 11 | 17 | 72.1% |
| 0.7 | 7.5 | 1 | 7 | 14 | 49.7% |
| 0.8 | 4.8 | 0 | 4 | 11 | 26.8% |
| 0.9 | 2.5 | 0 | 1 | 8 | 10.1% |
<!-- GENERATED:END -->

**Reading it:**
- **Strong-fit count.** The brief asks for 8–20 strong fits for a typical profile. At the chosen threshold, the mean and median sit inside that range for most people.
  - Profiles with sharper interests get more, near 20.
  - Flatter ones get fewer, and are told why.
- **Expected families.** "Top 10 in expected families" counts how many of a test profile's top 10 fall in the career families that profile was written to point at. It is a sanity check, not a target: neighbouring families are often reasonable.
- **The flat profile** gets no strong fits and the flat-profile note. That is the brief's requirement.

## 4. v1 against v2 for a real account

`scripts/compare-matching.mts` prints both rankings side by side. It reads only.

### Local dev database (demo account, sessions S1 and S2 only, no reasoning tasks)

```
Band counts   v1: strong 45 · possible 116 · unlikely 44 · not enough data 0
              v2: strong 19 · possible 111 · unlikely 75 · not enough data 0

 #  v1 (relative fit)                            v2 (fulfilment fit, 90% range · ability fit · P(top 10%))
 1  S B2B sales                                  S Politics & elected office (est.) · 70.6 (66–75.4) · — · 1
 2  S Consumer & direct sales                    S PR & communications · 70.3 (66.1–73.4) · — · 0.998
 3  S Media, advertising & sponsorship sales     S Intellectual property · 69.7 (66.9–72) · — · 1
 4  S Real estate brokerage                      S Brand marketing · 67.8 (63.6–70.9) · — · 0.954
 5  S Sports business                            S Startup founding (est.) · 67.1 (64.2–69.2) · — · 0.974
 6  S Politics & elected office                  S Private equity, venture & principal investing · 67 (62–72.1) · — · 0.82
 7  S Recruiting & talent acquisition            S Advertising & creative agencies · 66.9 (62.7–70.1) · — · 0.898
 8  S General management & executive leadership  S B2B sales · 66.6 (62–70.3) · — · 0.794
 9  S Partnerships, channel & business developm… S Project & programme management · 66.6 (64.3–68.5) · — · 0.964
10  S Account management & customer success      S Agency & studio ownership (est.) · 66.5 (61.9–70) · — · 0.83
11  S Agency & studio ownership                  S Creator services · 65.8 (62.8–68.4) · — · 0.784
12  S Wealth management & financial advice       S Partnerships, channel & business development (est.) · 65.7 (62–68.3) · — · 0.772
13  S Startup founding                           S Diplomacy & international organisations · 65.6 (64.1–67.1) · — · 0.758
14  S Product management                         S Independent consulting & interim leadership (est.) · 64.9 (63.3–66.4) · — · 0.628
15  S Courses, digital products & communities    S Events & experiential · 64.7 (61.9–67.2) · — · 0.546

Overlap of the two top 15s: 5 career paths.
Archetype blend (v2): Hunter 73.5% · Chief 14.2%
Why Politics & elected office fits: Enterprising interests (+3.6); Competition: a smaller gap than most of your options (+3.4);
  Work value: Recognition (+1); Social contact: as much as you need (+0.9)
```

**What changed for this persona:**
- **Fewer strong fits.** v1 gave 45 strong fits, which is a quarter of all career paths. v2 gives 19.
- **Fewer sales roles at the top.** v1's top 15 is almost all sales and commercial roles. v2 keeps the Enterprising core but adds communication, brand, IP, policy and investing. The value modes and environment now carry real weight, not just interests.
- **"(est.)"** marks career paths whose O\*NET profile is estimated from documented analogs (Phase 1). Provenance is visible.

### Your account (production, LN-20261023-H2C, all five sessions)

Run by you on 2026-10-28 against the production database (read-only).

```
Band counts   v1: strong 50 · possible 106 · unlikely 49 · not enough data 0
              v2: strong 19 · possible 113 · unlikely 73 · not enough data 0

 #  v1 (relative fit)                            v2 (fulfilment fit, 90% range · ability fit · P(top 10%))
 1  S B2B sales                                  S Religious & spiritual work · 66 (62.8–68.9) · 92.3 · 0.974
 2  S Media, advertising & sponsorship sales     S Politics & elected office (est.) · 65 (60.5–68.6) · 86.4 · 0.988
 3  S Field & territory sales                    S Intellectual property · 63.4 (59.1–67.1) · 83.2 · 0.946
 4  S Sports business                            S Learning & development · 62.7 (59–66) · 85.2 · 0.882
 5  S Real estate brokerage                      S Courses, digital products & communities (est.) · 62.4 (58.2–66.3) · 94.1 · 0.828
 6  S Coaching                                   S Private equity, venture & principal investing · 62.4 (58.2–66.3) · 70.5 · 0.834
 7  S Consumer & direct sales                    S B2B sales · 62 (58.3–64.9) · 85.9 · 0.884
 8  S Partnerships, channel & business developm… S Startup founding (est.) · 61.8 (57.6–65.3) · 83.8 · 0.804
 9  S General management & executive leadership  S Early childhood education · 61.5 (56.9–66.2) · 91 · 0.722
10  S Courses, digital products & communities    S General management & executive leadership · 61.3 (58.3–63.9) · 83.7 · 0.816
11  S Recruiting & talent acquisition            S Outdoor guiding & instruction · 61.3 (57.1–65.1) · 97.5 · 0.714
12  S Nonprofits, NGOs & humanitarian work       S Agency & studio ownership (est.) · 61.1 (56.9–64.6) · 87.8 · 0.718
13  S Politics & elected office                  S Brand marketing · 60.8 (56.7–64) · 85.3 · 0.696
14  S Social work & welfare                      S Advertising & creative agencies · 60.7 (56.5–64.3) · 89.7 · 0.662
15  S Startup founding                           S Academic research & university teaching · 60.5 (56.1–64.7) · 92.5 · 0.624

Overlap of the two top 15s: 5 career paths.

Archetype blend (v2): Chief 24.6% · Teacher 19.7% — tentative: Chief leads Teacher in 52% of draws.
  full blend: Chief 24.6, Teacher 19.7, Hunter 16.2, Healer 14.8, Scout 11.4, Storyteller 5.2, Guardian 3.9, Maker 3.8, Gatherer 0.4

Best in each direction (v2): Care: Religious & spiritual work; Influence: Politics & elected office; Teach: Learning & development;
  Analyse: Private equity, venture & principal investing; Create: Courses, digital products & communities;
  Lead: General management & executive leadership; Organise: Project & programme management; Protect: Aviation; Build: Renewable energy

Why Religious & spiritual work fits: Social interests (+3.7); Autonomy: close to what you need (+3.6);
  Variety vs. routine: as much as you need (+2); Enterprising interests (+1.6)
Where it rubs: Emphasis on Relationships, which matters less to you (-0.5); Little use of your Analyse (Scout) side (-0.5);
  Competition: less than suits you (-0.4)
```

**What changed for you:**
- **Fewer strong fits.** 50 → 19. v1 called a quarter of all career paths strong.
- **v1 is sales-led; v2 is a mix.** v1's top 9 are sales or commercial. v2's top 15 mixes three strands:
  - Enterprising: politics, B2B sales, startup founding, general management, agency ownership, brand, advertising.
  - Social and teaching: learning & development, early childhood education, outdoor guiding, religious & spiritual work.
  - Analytic: intellectual property, private equity, academic research.
- **The archetype blend is genuinely mixed.** Five archetypes sit between 11% and 25%, and Chief leads Teacher in only 52% of draws. This is the "you sit between" case from open question 2.
- **Ability fit now shows**, because all five sessions are complete. Private equity has the lowest (70.5) of the top 15.
- **A face-validity question for you.** Religious & spiritual work at #1 comes from:
  - Social interests;
  - autonomy and variety close to what you need.

  It is a legitimate reading of the O\*NET profile (clergy), but a career path most people would never consider can top the list on work-design fit alone. Whether this is acceptable, or whether some career paths should only appear when the person's interests point at them specifically, is open question 6 below.

## 5. Judgment calls I made

- **Weights are SD shares.** Each component is centred on your average career path and divided by a fixed reference spread. The brief's weights then mean what they say.
  - Without this, interests (35% nominal) decided almost everything.
  - In variance terms, environment now carries about its nominal share. Challenge and values carry less, because they correlate with interests and modes.
- **Career offsets for environment and challenge.** These are one-sided penalties, so without a correction the most demanding, autonomous careers would be strong fits for a large share of everyone. A career is now credited only for fitting you *better than it fits people in general*. Interests, values and modes are symmetric, so they are not offset.
- **Missing career data is neutral, not dropped.** Dropping a missing component made missing data a bonus.
- **Ability fit needs coverage.** It is shown only when at least half of the career's ability demand is measured. Otherwise it is empty and the note says why.
- **"Fit" is relative to you.** 50 is your average career path. That keeps everyone's top list meaningful, but fits can't be compared between people. The bands are rank-based for the same reason.
- **Possible is the adapter's "testing".** In the v1-shaped data the Career map reads today, v2's "possible" maps to v1's "testing" band. Phase 3 replaces this with native v2 views.

## 6. Open questions (answered 2026-10-28, see the top of this report)

1. **Approve v2?** If yes, Phase 3 builds the native views. v1 stays in the code until you also approve deleting it.
2. **Archetype "tentative" rate.** The leader must beat the second in 90% of draws. In the population most blends are still tentative (see §3), because many people genuinely sit between two archetypes.
   - Lowering the bar to 75–80% would mark fewer as tentative.
   - Keeping 90% is more honest.

   My suggestion: keep 90% and phrase it as "you sit between X and Y", not as a warning.
3. **Phase 3 conflict with the income ruling.** The Phase 3 brief says "keep the list views and the fit × payoff option". Income labels no longer exist, by your ruling, so there is no payoff axis. I suggest dropping that option, or replacing it with fit × ability. Please decide before Phase 3.
4. **The validation population is synthetic.** Real thresholds should be refitted once there are outcome check-ins (Phase 3).
5. **Until Phase 3:** the Career map's overlay and trait connections are still computed the v1 way, even when v2 drives the ranking.
6. **Niche career paths at the top.** Your own #1 is Religious & spiritual work. Options:
   - leave it, since it's what the data says;
   - require a minimum interest fit before a career path can be strong;
   - let you hide career paths you rule out.

   My suggestion: leave the ranking honest, and add "not for me" hiding in Phase 3.

## 7. Files

**New:**
- `src/lib/matching/v2/` (types, config, fit, present, synthetic, adapter, index)
- `src/lib/matching/version.ts`
- `taxonomy/build/build_v2_lane_profiles.mts`
- `taxonomy/build/build_v2_offsets.mts`
- `taxonomy/derived/lane_profiles_v2.json`
- `taxonomy/derived/lane_offsets_v2.json`
- `taxonomy/derived/matching_v2_validation.json`
- this report
- `docs/MATCHING_V2.md`
- `scripts/validate-matching-v2.mts`
- `scripts/compare-matching.mts`
- `scripts/report-matching-v2.mts`
- `scripts/lib-account.ts`
- `tests/matching-v2.test.ts`

**Changed:**
- `src/lib/data/lanes.ts` and `src/lib/data/index.ts`: the version switch, the memo and cache keys.
- `src/lib/lanes/types.ts` and `src/components/lanes/LaneDetailPanel.tsx`: the driver footnote comes from the data.
