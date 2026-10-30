# Precision pass report: matching v2-0.5

Status, 2026-10-30: **steps 1–9 and the owner's decisions of 2026-10-30 done on branch `precision-pass`, waiting for your review.** Nothing is deployed: Vercel deploys `functional-backend`, and this branch is not merged.

## Summary

| Step | What changed | Where |
|---|---|---|
| 1 | Published norms for interests (O\*NET Short-IP, Mini-IP report Tables 8–9) and personality (IPIP-NEO-120, Kajonius & Johnson 2019, Table A1). Applied when a profile is read, so existing users switch from anchored to normed. Honesty-Humility stays null | `scoring/psychometrics.ts`, `scoring/norms.ts` |
| 2 | Work values: expected normal order statistics × 0.7, not min–max (top value 81st percentile, not 100) | `workdesign/person.ts` |
| 3 | No working condition (or challenge) above 15% of any fit; shares before and after are reported | `matching/v2/fit.ts` (envGuard) |
| 4 | Weights: interests .45, values .20, modes .15, environment .10, challenge .10 (strengths .08); validation status and multiplier per component | `matching/v2/config.ts` |
| 5 | Ensemble: Dirichlet weights (concentration 40) and flat environment weighting in half the draws; bands must hold under both. Strong-fit threshold .45, from the population sweep | `fit.ts` (matchAllV2), `config.ts` |
| 6 | Starting roles ranked from their own O\*NET profile (906 roles); tags only where a role has no link; note when the role's top interest is one of your two lowest | `matching/roles.ts`, `role_profiles_v2.json` |
| 7 | This report: round trip, congruence, literature check, population | `scripts/validate-precision.mts` |
| 8 | Ground truth: satisfaction in onboarding (current job and up to two previous ones), "Does this resonate?" on the top five. Stored only | migration `0005` (additive) |
| 9 | Step by step for the six profiles: `taxonomy/derived/PRECISION_STEPS.md`; for your account, the command below | `scripts/precision-steps.mts` |

**Selectable.** v2-0.3 and v2-0.4 stay selectable (`MATCHING_CONFIG=v2-0.4`). They were checked against the old code on the same inputs:
- v2-0.4 is byte-identical.
- v2-0.3 has identical fits, bands and drivers. It runs on its frozen release offsets.

**Owner's decisions of 2026-10-30, applied:**
1. **Norms are for matching only.**
   - Age-banded norms (18–24, 25–34) couldn't be built: the raw data's host (pada.psycharchives.org) is still blocked from this environment.
   - The all-ages norms are used for matching only. The profile and report stay relative to the person.
   - The method section names both norm groups in plain words.
2. **Personality wording.** No "compared with people your age" lines are shown, because there are no age-banded norms. The wording table is a draft for your review: `docs/PERSONALITY_WORDING.md` (not used by the app).
3. **Holland code.** It shows only letters clearly above the person's own average (a 90% interval on the raw scale, from published SEMs). A weak third letter is shown as "(R, weak)" or dropped (`src/lib/view/holland.ts`).
4. **Talent-selected career paths are capped at "possible fit"**, with the note "Fits your interests and working style; success depends on talent Lane can't measure." They are professional sport, esports, professional strategy games and the performing careers: acting, music, dance, modelling, hosting & broadcasting, comedy, variety.
5. **Strong-fit threshold: .45** (was .50), chosen from the population sweep below, not from any account. It gives a median of 11 strong fits per person (the target was 10–15), with the most people at exactly 10–15. A threshold of .40 would give a median of 14.
6. **Field & territory sales.**
   - **Cause:** only two ESCO occupations landed in it (electricity and renewable-energy sales representatives, both weak model matches). That gave a utility/solar retail profile with no Work Values, and its own typical incumbent ranked it 36th.
   - **Fix:** it is now estimated from the O\*NET occupations that cover field and territory sales (41-4012.00, 41-4011.00, 11-2022.00, 41-3091.00; `estimated_profiles.csv`). Its incumbent now ranks it 3rd, and no other career path's profile changed.

**What the numbers say** (final config; details below):
- **Precision.** A synthetic typical incumbent lands in its own career path's top 10% in 97.2% of runs with measurement error (v2-0.4: 91.9%; chance: 10%). Median rank is 2 (v2-0.4: 4). Only 3 career paths can't recover themselves (v2-0.4: 12). Every career path except the 10 talent-capped ones is a strong fit for its own typical incumbent.
- **Strong fits.** Mean 10.5 per person, median 11 (v2-0.4: 11.7 and 12), with 66% of people in 8–20 (v2-0.4: 75%).
  - About half of v2-0.3's strong fits stay strong; the rest become possible, none unlikely.
  - There are 4.3 new strong fits per person.
- **Popularity bias is gone.** No career path is strong for more than 30% of people (v2-0.4: 3). The 10 never-strong career paths are exactly the talent-capped ones (v2-0.4: 18 never strong).
- **The environment cap does real work.** Before the cap, the largest single working condition carries a median 15% and a 90th percentile 22% of some fit. Competition and social are shrunk for about a fifth of people each.
- **The interest ranking agrees with Iachan's M.** ρ is .84–.94 for the shaped profiles. It agrees less with the C index, which compares letters by position.
- **The literature check flags two norms** (report only): backward digit span against an older community sample, and Corsi against derived young-adult values. Symbol matching couldn't be checked.
- **Speed.** One person's match takes roughly 1.1–1.6 s under v2-0.5 (v2-0.4: about 0.8 s), mostly the two environment guards. The result is cached per person.

**Your account (LN-20261023-H2C).** It is in the production database, which this environment doesn't have. Run this from the repository with your DATABASE_URL set:

```
npx tsx --conditions=react-server scripts/precision-steps.mts --account LN-20261023-H2C --force
```

Add `--final` for only the final config: the top 15, the band counts and the archetype.

It prints, for each step, the top 15, the band counts, the archetype blend, your inputs anchored against normed, and the interest-ranking congruence check. It also saves them to `.data/precision-steps-LN-20261023-H2C.md`, which is git-ignored. `scripts/validate-precision.mts satisfaction --force` gives the satisfaction agreement once people have answered.

**Before this goes live:**
1. Migration 0005 runs on deploy. It adds the `career_resonance` table and two profile columns, and drops nothing.
2. Every stored written report rewrites itself on its owner's next visit, because the facts change (normed scores, the mixed basis).

**Judgment calls:**
- **Synthetic people as percentiles.** The validation specifies its synthetic people as population percentiles. With norms, the scale midpoint is not the average: Conscientiousness 3.0 is near the 10th percentile. This changes the v2-0.4 baseline numbers here against the earlier MATCHING_V2_REPORT.
- **Openness without O6.** Its SD is derived, and its reliability is the planning value.
- **Norms follow the config.** They are applied only when the running config reads them, so v2-0.4 reproduces.
- **Validation multipliers are all 1.** The weights already carry the evidence.
- **Roles.** Data-ranked roles come before tag-ranked ones.
- **Resonance rank.** It is taken from the server's own top five, never from the client.

<!-- GENERATED:START -->
## Step 1: published norms as transcribed

Each row shows the source's own value, with its table and page, beside the value in `src/lib/scoring/psychometrics.ts` on our metric. Combined-gender columns only.

### O*NET Interest Profiler Short Form (interests)

Rounds, Ming, Cao, Song & Lewis (2016), *Development of an O\*NET Mini Interest Profiler (Mini-IP) for mobile devices*, National Center for O\*NET Development, https://www.onetcenter.org/dl_files/Mini-IP.pdf. Validation sample N = 575 US adults aged 18–65.
- Means and SDs: **Table 8 (p. 36)**, "60-Item Interest Profiler Short Form" rows, Total column.
- Alphas: **Table 9 (p. 37)**, 60-item Short-IP.
- Coding: the table is item means with responses coded 1–5 (p. 11: "1-(Strongly Dislike) to 3-(Unsure)"; the Mini-IPIP means in the same table are on 1–5). Our raw score is the sum of 10 items, so the item mean and SD are ×10. p. 13 describes a 0–4 coding for the online tool's own scoring, which is not the metric of Table 8.

| Scale | Table 8 item mean | Table 8 item SD | Table 9 alpha | Ours: mean (10–50) | Ours: SD |
|---|---|---|---|---|---|
| R | 2.79 | 0.85 | 0.88 | 27.9 | 8.5 |
| I | 3.29 | 0.88 | 0.90 | 32.9 | 8.8 |
| A | 3.39 | 0.94 | 0.90 | 33.9 | 9.4 |
| S | 2.96 | 0.90 | 0.89 | 29.6 | 9.0 |
| E | 2.76 | 0.82 | 0.85 | 27.6 | 8.2 |
| C | 2.93 | 0.89 | 0.90 | 29.3 | 8.9 |

### IPIP-NEO-120 (personality)

Kajonius & Johnson (2019), *Europe's Journal of Psychology* 15(2), 260–275, doi:10.5964/ejop.v15i2.1671.
- **Appendix Table A1**, "Sample Descriptive Statistics of 5 Trait Domains and 30 Facets": Neuroticism and Extraversion on **p. 274**; Openness, Agreeableness and Conscientiousness on **p. 275**.
- Read from the PMC copy (PMC7871748) and checked against the journal's PDF.
- N = 320,128, combined gender (127,695 men, 192,433 women), mean age 28.13 (SD 10.14).
- The table is on the facet-sum metric (4–20): a domain is the mean of its six facet sums (checked: the mean of N1–N6 is 11.105, against 11.10). Ours are item means (1–5), so mean and SD are ÷4. Reliability is the table's alpha.
- **Not 18–35 norms.** The raw data that would allow them (doi:10.23668/psycharchives.2448, 170 MB) is served from pada.psycharchives.org, which this environment can't reach (psycharchives.org itself can be reached).
- **Openness** without O6 (Liberalism, not administered): the mean of the O1–O5 facet means is exact. The SD is derived from the table's six-facet SD (2.06), assuming equal inter-facet correlations (r̄ = 0.236), which gives 2.099 on the facet-sum metric. O6 is the facet that correlates least with the others, so this SD is probably a little low. There is no published alpha for O1–O5, so it keeps the planning .75.

| Scale | Table A1 M | Table A1 SD | Table A1 α | Page | Ours: mean (1–5) | Ours: SD | Ours: reliability |
|---|---|---|---|---|---|---|---|
| **Neuroticism** | 11.10 | 2.66 | 0.90 | 274 | 2.775 | 0.665 | 0.90 |
| N1 | 12.07 | 3.77 | 0.79 | 274 | 3.018 | 0.943 | 0.79 |
| N2 | 11.51 | 4.11 | 0.87 | 274 | 2.878 | 1.028 | 0.87 |
| N3 | 9.35 | 3.87 | 0.85 | 274 | 2.338 | 0.968 | 0.85 |
| N4 | 11.69 | 3.64 | 0.72 | 274 | 2.923 | 0.910 | 0.72 |
| N5 | 11.94 | 3.44 | 0.72 | 274 | 2.985 | 0.860 | 0.72 |
| N6 | 10.07 | 3.63 | 0.78 | 274 | 2.518 | 0.908 | 0.78 |
| **Extraversion** | 13.69 | 2.36 | 0.89 | 274 | 3.423 | 0.590 | 0.89 |
| E1 | 14.48 | 3.60 | 0.81 | 274 | 3.620 | 0.900 | 0.81 |
| E2 | 12.36 | 4.02 | 0.80 | 274 | 3.090 | 1.005 | 0.80 |
| E3 | 14.56 | 3.43 | 0.86 | 274 | 3.640 | 0.858 | 0.86 |
| E4 | 12.84 | 3.15 | 0.71 | 274 | 3.210 | 0.788 | 0.71 |
| E5 | 12.52 | 3.32 | 0.74 | 274 | 3.130 | 0.830 | 0.74 |
| E6 | 15.35 | 3.20 | 0.80 | 274 | 3.838 | 0.800 | 0.80 |
| **Openness** | 13.71 (with O6) | 2.06 (with O6) | 0.82 (with O6) | 275 | 3.563 | 0.525 | 0.75 (planning) |
| O1 | 14.60 | 3.41 | 0.75 | 275 | 3.650 | 0.853 | 0.75 |
| O2 | 14.67 | 3.58 | 0.75 | 275 | 3.668 | 0.895 | 0.75 |
| O3 | 15.20 | 3.01 | 0.66 | 275 | 3.800 | 0.753 | 0.66 |
| O4 | 12.28 | 3.26 | 0.71 | 275 | 3.070 | 0.815 | 0.71 |
| O5 | 14.50 | 3.55 | 0.74 | 275 | 3.625 | 0.888 | 0.74 |
| **Agreeableness** | 14.87 | 2.01 | 0.85 | 275 | 3.718 | 0.503 | 0.85 |
| A1 | 13.43 | 3.54 | 0.86 | 275 | 3.358 | 0.885 | 0.86 |
| A2 | 16.63 | 2.88 | 0.74 | 275 | 4.158 | 0.720 | 0.74 |
| A3 | 16.72 | 2.56 | 0.73 | 275 | 4.180 | 0.640 | 0.73 |
| A4 | 15.10 | 3.49 | 0.69 | 275 | 3.775 | 0.873 | 0.69 |
| A5 | 12.34 | 3.35 | 0.72 | 275 | 3.085 | 0.838 | 0.72 |
| A6 | 15.03 | 3.10 | 0.73 | 275 | 3.758 | 0.775 | 0.73 |
| **Conscientiousness** | 14.95 | 2.34 | 0.90 | 275 | 3.738 | 0.585 | 0.90 |
| C1 | 16.32 | 2.40 | 0.77 | 275 | 4.080 | 0.600 | 0.77 |
| C2 | 13.23 | 4.31 | 0.85 | 275 | 3.308 | 1.078 | 0.85 |
| C3 | 16.32 | 2.57 | 0.67 | 275 | 4.080 | 0.643 | 0.67 |
| C4 | 16.06 | 3.09 | 0.78 | 275 | 4.015 | 0.773 | 0.78 |
| C5 | 14.07 | 3.16 | 0.72 | 275 | 3.518 | 0.790 | 0.72 |
| C6 | 13.68 | 4.09 | 0.88 | 275 | 3.420 | 1.023 | 0.88 |

### Mini-IPIP6 Honesty-Humility: left null

The open-access source for its norms is Sibley et al. (*New Zealand Journal of Psychology*, 2011 validation and 2012 norms papers, on psychology.org.nz). That host can't be reached from this environment, so nothing is transcribed. Honesty-Humility stays without a population comparison: it is shown relative to the person's own scores only, and isn't used in matching.

## (a) Round-trip recovery

Each career path's synthetic typical incumbent is matched against all 205. Interests come from O*NET OI, work values from EX, reasoning areas from the career's ability demands, and personality from O*NET Work Styles. The mapping below is an approximation: Work Styles rate how important a style is for the job, not the incumbents' traits. The incumbent goes in once as built and three times with measurement error added (every input redrawn once from its own standard error). Chance of landing in one's own top 10% is 10%.

| Config | Own top 10%, as built | Median rank, as built | Own top 10%, with error | Median rank, with error | 90th percentile rank, with error | Strong fit for itself | Can't recover itself |
|---|---|---|---|---|---|---|---|
| v2-0.3 | 95.6% | 2 | 91.4% | 4 | 19 | 95.1% | 14 |
| v2-0.4 | 98% | 2 | 91.9% | 4 | 19 | 95.6% | 12 |
| v2-0.5 | 99% | 1 | 97.2% | 2 | 11 | 95.1% | 3 |

**Career paths that can't recover themselves under v2-0.5** (outside their own top 21 as built, or in most replicates with error). Ranks are shown as built, then with error:

Offshore & oil and gas: 23, 29/22/23 · Forestry & hunting: 22, 20/17/22 · Police & investigation: 4, 25/41/6

Work Styles → IPIP-NEO facets used for the incumbents: C1 ← Self-Confidence; C2 ← Attention to Detail; C3 ← Dependability; C4 ← Achievement Orientation; C5 ← Perseverance; C6 ← Cautiousness; E1 ← Social Orientation; E2 ← Social Orientation; E3 ← Leadership Orientation; E4 ← Initiative; E6 ← Optimism; O1 ← Innovation; O4 ← Tolerance for Ambiguity; O5 ← Intellectual Curiosity; A2 ← Sincerity; A4 ← Cooperation; A5 ← Humility; A6 ← Empathy; N2 ← reverse of Self-Control; N5 ← reverse of Self-Control; N6 ← reverse of Stress Tolerance. Domains are the mean of their mapped facets.

## (b) Interest-only ranking against high-point-code congruence

Under v2-0.5, each career path is ranked by the interests component alone: the regularised correlation of the person's six interests with the career's O*NET OI profile. That ranking is compared with the ranking by Brown & Gore's (1994) C index and by Iachan's (1984) M, both computed on three-letter high-point codes. The codes compress six scores into three letters, so many career paths tie (ties take the average rank), and some disagreement is expected. The table lists every career path whose two ranks differ by more than 50.

| Profile | Code | Spearman ρ with the C-index ranking | ρ with the M-index ranking | Career paths more than 50 ranks apart |
|---|---|---|---|---|
| Investigative / conventional analyst | ICR | 0.121 | 0.89 | 122 |
| Social / artistic carer | SAE | 0.717 | 0.902 | 45 |
| Realistic maker | RIC | 0.764 | 0.913 | 39 |
| Enterprising hunter | ESC | 0.829 | 0.938 | 30 |
| Artistic storyteller | ASE | 0.643 | 0.835 | 57 |
| Flat profile | RIA | null | null | 92 |

**Investigative / conventional analyst** (ICR): Data analysis & business intelligence [CIE] ours 3, C 177.5 · Data engineering & databases [CIE] ours 6, C 177.5 · Market research & consumer insights [CIE] ours 8, C 177.5 · Enterprise systems & IT consulting [CIE] ours 9, C 177.5 · Developer relations & technical writing [CIS] ours 28, C 195.5 · Pharmacy [CIS] ours 29, C 195.5 · Armed forces [CIE] ours 15, C 177.5 · Product management [EIC] ours 42, C 201 · Payments, fintech & crypto operations [CIE] ours 20, C 177.5 · Public policy & analysis [EIC] ours 45, C 201 · Management consulting [CIE] ours 27, C 177.5 · Modelling [ARE] ours 202, C 70 · and 110 more

**Social / artistic carer** (SAE): Armed forces [CIE] ours 186, C 42 · DevOps, cloud & site reliability [CIR] ours 193, C 74.5 · Economics & social sciences [ICS] ours 36, C 151 · Product management [EIC] ours 134, C 20 · Enterprise systems & IT consulting [CIE] ours 150, C 42 · Writing & authorship [ACI] ours 22, C 127.5 · Data engineering & databases [CIE] ours 143, C 42 · Software testing & quality assurance [CIR] ours 173, C 74.5 · Warehousing & logistics [CRE] ours 172, C 74.5 · Environmental & energy engineering [IRC] ours 200, C 102.5 · Hair, beauty & cosmetics [RCS] ours 79, C 172.5 · Aviation [CRE] ours 166, C 74.5 · and 33 more

**Realistic maker** (RIC): Management consulting [CIE] ours 137, C 15.5 · Public policy & analysis [EIC] ours 175, C 53.5 · Developer relations & technical writing [CIS] ours 138, C 29 · Complementary therapies [SRI] ours 87, C 193 · Payments, fintech & crypto operations [CIE] ours 120, C 15.5 · Advertising & creative agencies [EAC] ours 196, C 93 · Market research & consumer insights [CIE] ours 113, C 15.5 · Organisational & work psychology [IEC] ours 194, C 105 · Creator services [EAS] ours 202, C 117 · Data analysis & business intelligence [CIE] ours 96, C 15.5 · Jewellery, metal & precision craft [RCA] ours 1, C 79 · Enterprise systems & IT consulting [CIE] ours 93, C 15.5 · and 27 more

**Enterprising hunter** (ESC): CRM, lifecycle & marketing operations [ICE] ours 73, C 195 · GIS & geospatial analysis [CIR] ours 205, C 96.5 · Translation & interpreting [CSA] ours 142, C 34.5 · Health administration & informatics [CSI] ours 104, C 11.5 · Variety & live entertainment [ARS] ours 112, C 195 · Quantitative finance [ICE] ours 114, C 195 · Architecture [RAI] ours 201, C 121 · Biomedical engineering [RIC] ours 198, C 121 · Mechanical engineering [RIC] ours 196, C 121 · Dance [ARS] ours 121, C 195 · Organisational & work psychology [IEC] ours 67, C 137.5 · Hair, beauty & cosmetics [RCS] ours 92, C 162.5 · and 18 more

**Artistic storyteller** (ASE): Publishing & editorial [CAI] ours 27, C 181 · Construction management [RCE] ours 200, C 58.5 · Rail [RCE] ours 195, C 58.5 · Driving & road transport [RCE] ours 192, C 58.5 · Environmental & energy engineering [IRC] ours 185, C 58.5 · Content, copy & social media [CEA] ours 25, C 150 · Developer relations & technical writing [CIS] ours 65, C 181 · Fire, rescue & emergency response [RCS] ours 197, C 83 · Nature & conservation [RIC] ours 193, C 83 · Film & TV production [CAR] ours 40, C 150 · Law firm practice [CEI] ours 74, C 181 · Politics & elected office [ECI] ours 44, C 150 · and 45 more

**Flat profile** (RIA): Dentistry [RIS] ours 103, C 1 · Learning & development [SEC] ours 103, C 204 · Religious & spiritual work [SEC] ours 103, C 204 · Outdoor guiding & instruction [SEC] ours 103, C 204 · Mechanical engineering [RIC] ours 103, C 5.5 · Chemical & process engineering [RIC] ours 103, C 5.5 · Biomedical engineering [RIC] ours 103, C 5.5 · Architecture [RAI] ours 103, C 5.5 · Animal care & training [RIC] ours 103, C 5.5 · Nature & conservation [RIC] ours 103, C 5.5 · Diagnostics & medical technology [RIC] ours 103, C 5.5 · Veterinary medicine [RIC] ours 103, C 5.5 · and 80 more

The account (LN-20261023-H2C): `npx tsx --conditions=react-server scripts/precision-steps.mts --account LN-20261023-H2C --force` prints the same comparison for it.

## (c) Literature check of the reasoning-task norms (report only; the table is unchanged)

Sources: open access only, read in full here. Anything that couldn't be reached open access is marked **not checked**.

**Our metric.** Our span protocol (`assessment/generators/generators.ts`, SPAN_PROTOCOL; scored in `src/lib/scoring/cognitive/span.ts`):
- starts at 3, gives two trials per length, stops when both are wrong, and caps at 10 (Corsi at 9);
- scores the longest length with at least one of two correct.

That is the pass rule of Woods et al.'s "two-error maximum length" (TE-ML). It is not their "maximum length over all trials" (ML).

**Deviation** = (our mean − published mean) / published SD.

| Task | Our table: mean, SD (confidence) | Published adult norm (open access) | Deviation | Comparable? |
|---|---|---|---|---|
| Backward digit span | 5.4, 1.3 (low) | **Woods et al. (2011)**, *J. Clin. Exp. Neuropsychol.* 33(1), 101–111, doi:10.1080/13803395.2010.493149, open access as PMC2978794. Backward span, TE-ML. Experiment 1 (Table 2): 31 adults recruited (aged 18–46, mean 26), 30 analysed, each averaged over three sessions: **5.80 (SD 1.42)**. Experiment 2 (Table 6): 763 community adults in Rotorua, New Zealand, aged 18–65, mean age 46.5: **4.61 (SD 1.22)** | −0.28 SD against Experiment 1; +0.65 SD **(over 0.5 SD: flagged)** against Experiment 2 | Same pass rule, with these differences: (1) they speak the digits through headphones and an examiner transcribes the spoken recall; ours are shown on screen and typed. (2) Their backward lists start at 2 (Experiment 1) and 4 (Experiment 2); ours start at 3. (3) They step up after one correct and continue to 14 or 10 trials, while we always give both trials at a length and cap at 10. (4) Experiment 2 is much older than our 18–35 group: backward TE-ML falls with age (r = −.14, Table 8). (5) Experiment 1 is small and practised over three sessions |
| Corsi block span (forward) | 6.17, 1.27 (moderate) | **Facchin et al. (2024)**, *Neurological Sciences* 45(12), 5707–5718, doi:10.1007/s10072-024-07756-6, open access as PMC11554723. 340 healthy Italian adults aged 21–89 (mean 51.6), Table 1: **4.97 (SD 1.03)**. From their age and education correction (Table 2 caption), the expected raw span with 16 years of education is **5.65** at age 25 and **5.51** at age 30. That is derived from their regression, not a published norm; the 16 years of education are our assumption (their sample mean is 13.1) | +1.17 SD **(over 0.5 SD: flagged)** against the whole sample; +0.505 SD **(over 0.5 SD: flagged)** against the derived age-25 value; +0.64 SD **(over 0.5 SD: flagged)** against age 30 | Partly. (1) Their pass rule is stricter: three sequences per length, passed with two of three correct, against our one of two. That alone gives them lower spans. (2) A physical wooden board with the examiner tapping, against our on-screen blocks. (3) A much older sample. (4) The deviations from the derived values divide by the whole-sample SD (1.03), which includes the age and education spread (r = −.46 and .45, Table 1). The SD at a given age and education is smaller, so those deviations are conservative. Kessels et al. (2000), on which our table rests at weight 0.7, couldn't be read open access here: **not checked** |
| Symbol matching (90 s, same/different triplets, correct − incorrect) | 42, 11 (low) | **Not checked**: no open-access norm for a comparable task was found | — | A task of our own. WAIS Symbol Search and pattern-comparison tasks differ in stimuli, time limit and scoring |

**What this flags (report only; the table is unchanged):**
- **Backward digit span** is 0.65 SD above the community sample. That is over the threshold, but the sample is far older than our 18–35 group (mean age 46.5). It sits 0.28 SD below the small young-adult sample, so it falls between the two published groups. The checkable sources don't suggest a problem, but the modality differs.
- **Corsi span** is far above the 21–89 sample (+1.17 SD). Against the derived young-adult values it is just over to clearly over the threshold (+0.505 to +0.64 SD, conservative). Their stricter pass rule and the board also push their spans down, so part of the gap is method, not norm. Kessels et al. (2000) is the comparable source, and it couldn't be checked here.
- **Symbol matching:** not checked. Its norm is still Claude's expert estimate alone (confidence low).

## (d) Population, the six profiles and popularity bias

### Strong-fit threshold sweep (v2-0.5)

Strong fit = P(top 10%) at least the threshold, under both environment weightings, never for talent-capped career paths. The same 1000 simulated people at each threshold; the unlikely rule (P(bottom 40%) ≥ 0.7) is unchanged. The target is a median of 10–15 strong fits.

| Threshold | Mean | p10 | Median | p90 | Share with 8–20 | Share with 10–15 | Most often strong | Never strong |
|---|---|---|---|---|---|---|---|---|
| 0.30 | 19.7 | 13 | 21 | 26 | 45.6% | 13.6% | Early childhood education 26.1% | 10 |
| 0.35 | 15.9 | 8 | 17 | 22 | 68.6% | 26.2% | Early childhood education 23.3% | 10 |
| 0.40 | 12.9 | 4 | 14 | 20 | 73.9% | 31.5% | Early childhood education 20.5% | 10 |
| 0.45 **(chosen)** | 10.5 | 2 | 11 | 18 | 65.8% | 35.8% | Early childhood education 17.4% | 10 |
| 0.50 | 8.4 | 1 | 8 | 16 | 54.7% | 32.4% | Early childhood education 15.5% | 11 |
| 0.55 | 6.7 | 0 | 6 | 14 | 43.8% | 26.9% | Early childhood education 13.8% | 12 |
| 0.60 | 5.3 | 0 | 4 | 12 | 32.5% | 20.1% | Early childhood education 11.4% | 12 |

| Config | People | Strong fits: mean | p10 / median / p90 | Share with 8–20 | Most often strong | Career paths strong for over 30% | Never strong | Tentative archetypes | Flat-profile notes |
|---|---|---|---|---|---|---|---|---|---|
| v2-0.3 | 1000 | 11.8 | 4 / 12 / 18 | 75.7% | Mental health & psychology 35.6% | 3 | 18 | 909 | 219 |
| v2-0.4 | 1000 | 11.7 | 4 / 12 / 18 | 75.4% | Mental health & psychology 35.4% | 3 | 18 | 909 | 222 |
| v2-0.5 | 1000 | 10.5 | 2 / 11 / 18 | 65.8% | Early childhood education 17.4% | 0 | 10 | 942 | 325 |

**Strong-fit survival, v2-0.3 → v2-0.5** (the same 1000 people. The population's answers are the same, read through each config's own input rules): 52.5% of v2-0.3's strong fits are still strong under v2-0.5, 47.5% became possible and 0% unlikely. v2-0.5 has 4262 strong fits that v2-0.3 didn't (4.3 per person).

**Environment cap under v2-0.5:** before the cap, the largest single-dimension share of any fit had median 14.2% and 90th percentile 20.5%. After it, the maximum is 15.1%. 41.9% of people had at least one dimension shrunk. By dimension: competition 19.5%, social 11.1%, autonomy 6.8%, pace 6.5%, challenge 2.9%, variety 0.9%, conflict 0.3%, precision 0.3%.

## Satisfaction against the current job's band

local dev database: no one has answered "How satisfied are you in this work?" yet. The question is new in this pass, so there is nothing to compare until people answer it.

Agreement means strong with 5–7, unlikely with 1–3, and possible with 3–5. A contradiction is strong with 1–2, or unlikely with 6–7. Run `scripts/validate-precision.mts satisfaction --force` with DATABASE_URL set to compute it for production.

<!-- GENERATED:END -->
