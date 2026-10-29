# Precision pass report

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
| **Agreeableness** | 14.87 | 2.01 | 0.85 | 275 | 3.718 | 0.502 | 0.85 |
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

Work Styles → IPIP-NEO facets used for the incumbents: C1 ← Self-Confidence; C2 ← Attention to Detail; C3 ← Dependability; C4 ← Achievement Orientation; C5 ← Perseverance; C6 ← Cautiousness; E1 ← Social Orientation; E2 ← Social Orientation; E3 ← Leadership Orientation; E4 ← Initiative; E6 ← Optimism; O1 ← Innovation; O4 ← Tolerance for Ambiguity; O5 ← Intellectual Curiosity; A2 ← Sincerity; A4 ← Cooperation; A5 ← Humility; A6 ← Empathy; N2 ← reverse of Self-Control; N5 ← reverse of Self-Control; N6 ← reverse of Stress Tolerance. Domains are the mean of their mapped facets.

## (b) Interest-only ranking against high-point-code congruence

Under v2-0.5, each career path is ranked by the interests component alone: the regularised correlation of the person's six interests with the career's O*NET OI profile. That ranking is compared with the ranking by Brown & Gore's (1994) C index and by Iachan's (1984) M, both computed on three-letter high-point codes. The codes compress six scores into three letters, so many career paths tie (ties take the average rank), and some disagreement is expected. The table lists every career path whose two ranks differ by more than 50.

| Profile | Code | Spearman ρ with the C-index ranking | ρ with the M-index ranking | Career paths more than 50 ranks apart |
|---|---|---|---|---|
| Investigative / conventional analyst | ICR | 0.115 | 0.885 | 122 |
| Social / artistic carer | SAE | 0.69 | 0.917 | 48 |
| Realistic maker | RIC | 0.755 | 0.905 | 40 |
| Enterprising hunter | ESC | 0.828 | 0.94 | 28 |
| Artistic storyteller | AES | 0.608 | 0.878 | 65 |
| Flat profile | ERC | 0.263 | 0.702 | 117 |

**Investigative / conventional analyst** (ICR): Data engineering & databases [CIE] ours 3, C 177.5 · Enterprise systems & IT consulting [CIE] ours 6, C 177.5 · Data analysis & business intelligence [CIE] ours 7, C 177.5 · Pharmacy [CIS] ours 26, C 195.5 · Market research & consumer insights [CIE] ours 11, C 177.5 · Armed forces [CIE] ours 13, C 177.5 · Developer relations & technical writing [CIS] ours 36, C 195.5 · Payments, fintech & crypto operations [CIE] ours 18, C 177.5 · Product management [EIC] ours 42, C 201 · Writing & authorship [ACI] ours 176, C 26.5 · Management consulting [CIE] ours 29, C 177.5 · Public policy & analysis [EIC] ours 56, C 201 · and 110 more

**Social / artistic carer** (SAE): Armed forces [CIE] ours 185, C 42 · Enterprise systems & IT consulting [CIE] ours 166, C 42 · DevOps, cloud & site reliability [CIR] ours 193, C 74.5 · Software testing & quality assurance [CIR] ours 190, C 74.5 · Product management [EIC] ours 134, C 20 · Data engineering & databases [CIE] ours 155, C 42 · GIS & geospatial analysis [CIR] ours 187, C 74.5 · Hair, beauty & cosmetics [RCS] ours 66, C 172.5 · Data analysis & business intelligence [CIE] ours 148, C 42 · Cybersecurity [CIR] ours 180, C 74.5 · Writing & authorship [ACI] ours 25, C 127.5 · Economics & social sciences [ICS] ours 50, C 151 · and 36 more

**Realistic maker** (RIC): Management consulting [CIE] ours 138, C 15.5 · Developer relations & technical writing [CIS] ours 151, C 29 · Public policy & analysis [EIC] ours 169, C 53.5 · Complementary therapies [SRI] ours 86, C 193 · Payments, fintech & crypto operations [CIE] ours 121, C 15.5 · Market research & consumer insights [CIE] ours 117, C 15.5 · Advertising & creative agencies [EAC] ours 194, C 93 · Organisational & work psychology [IEC] ours 195, C 105 · Product & UX/UI design [AIC] ours 140, C 53.5 · Data analysis & business intelligence [CIE] ours 102, C 15.5 · Creator services [EAS] ours 203, C 117 · Publishing & editorial [CAI] ours 161, C 79 · and 28 more

**Enterprising hunter** (ESC): Translation & interpreting [CSA] ours 143, C 34.5 · CRM, lifecycle & marketing operations [ICE] ours 89, C 195 · GIS & geospatial analysis [CIR] ours 202, C 96.5 · Health administration & informatics [CSI] ours 98, C 11.5 · Publishing & editorial [CAI] ours 155, C 69 · Architecture [RAI] ours 205, C 121 · Hair, beauty & cosmetics [RCS] ours 82, C 162.5 · Software testing & quality assurance [CIR] ours 171, C 96.5 · Variety & live entertainment [ARS] ours 122, C 195 · Funeral services [RCS] ours 90, C 162.5 · Quantitative finance [ICE] ours 123, C 195 · Film & TV production [CAR] ours 106, C 34.5 · and 16 more

**Artistic storyteller** (AES): Film & TV production [CAR] ours 43, C 195.5 · Advertising & creative agencies [EAC] ours 17, C 162.5 · Publishing & editorial [CAI] ours 42, C 187 · Vocational & specialist instruction [SIC] ours 27, C 146 · Environmental & energy engineering [IRC] ours 200, C 82 · School teaching [SIC] ours 34, C 146 · Fire, rescue & emergency response [RCS] ours 156, C 48.5 · Embedded & hardware-near software [IRC] ours 188, C 82 · Construction management [RCE] ours 187, C 82 · Academic research & university teaching [SIC] ours 41, C 146 · Physics, chemistry & mathematics [IRC] ours 186, C 82 · Translation & interpreting [CSA] ours 59, C 162.5 · and 53 more

**Flat profile** (ERC): Hair, beauty & cosmetics [RCS] ours 7, C 164.5 · Funeral services [RCS] ours 10, C 164.5 · Fire, rescue & emergency response [RCS] ours 16, C 164.5 · Public policy & analysis [EIC] ours 149, C 2 · Academic research & university teaching [SIC] ours 188, C 52 · Mental health & psychology [SIC] ours 180, C 52 · Corrections [CES] ours 3, C 130 · Animation, VFX & 3D [ARC] ours 199, C 72 · Hotels & accommodation [CES] ours 4, C 130 · Facilities, cleaning & property services [RCS] ours 43, C 164.5 · Intellectual property [ECI] ours 147, C 27 · PR & communications [ECS] ours 146, C 27 · and 105 more

The account (LN-20261023-H2C): `npx tsx --conditions=react-server scripts/precision-steps.mts --account LN-20261023-H2C --force` prints the same comparison for it.

## (c) Literature check of the reasoning-task norms (report only; the table is unchanged)

Our span protocol starts at three, gives two trials per length, and stops when both trials at a length are wrong. It scores the longest length repeated correctly (`assessment/generators/generators.ts`, SPAN_PROTOCOL). That is Woods et al.'s "two-error maximum length" (TE-ML). Deviation = (our mean − published mean) / published SD.

| Task | Our table: mean, SD (confidence) | Published adult norm (open access) | Deviation | Comparable? |
|---|---|---|---|---|
| Backward digit span | 5.4, 1.3 (low) | **Woods et al. (2011)**, *J. Clin. Exp. Neuropsychol.* 33(1), 101–111, doi:10.1080/13803395.2010.493149, open access as PMC2978794. Backward span, TE-ML. Experiment 1 (Table 2): 30 young adults aged 18–46, mean 26, averaged over three sessions: **5.80 (SD 1.42)**. Experiment 2 (Table 6): 763 community adults aged 18–65: **4.61 (SD 1.22)** | −0.28 SD against Experiment 1; +0.65 SD **(over 0.5 SD: flagged)** against Experiment 2 | Same scoring rule. Their digits are spoken and recalled aloud; ours are shown on screen and typed. Experiment 2 spans 18–65, and backward span falls a little with age (r = −.14, Table 8). Experiment 1 is small and practised over three sessions |
| Corsi block span (forward) | 6.17, 1.27 (moderate) | **Facchin et al. (2024)**, *Neurological Sciences* 45, 5707–, doi:10.1007/s10072-024-07756-6, open access as PMC11554723. Corsi span, 340 healthy Italian adults aged 21–89, mean age 51.6 (Table 1): **4.97 (SD 1.03)**. From their age and education correction (Table 2), the expected span of a 25-year-old with 16 years of education is **5.65**, and of a 30-year-old **5.51**. That is derived from their regression, not a published norm | +1.17 SD **(over 0.5 SD: flagged)** against the whole sample; +0.50 SD **(over 0.5 SD: flagged)** against the derived age-25 value; +0.64 SD **(over 0.5 SD: flagged)** against age 30 | Partly: a physical wooden board with the examiner tapping, against our on-screen blocks. The sample is much older than our 18–35 norm group. Kessels et al. (2000), on which our table rests at weight 0.7, is not open access: **not checked** |
| Symbol matching (90 s, same/different triplets, correct − incorrect) | 42, 11 (low) | **Not checked**: no open-access norm for a comparable task was found | — | A task of our own. WAIS Symbol Search and pattern-comparison tasks differ in stimuli, time limit and scoring |

**What this flags (report only; the table is unchanged):**
- **Backward digit span** is 0.65 SD above the 18–65 community sample. That is over the threshold, though partly expected, since our norm group is 18–35. It sits 0.28 SD below the small young-adult sample, so it falls between the two published groups.
- **Corsi span** is far above the 21–89 sample (+1.17 SD). Against the derived young-adult values it is +0.50 to +0.64 SD: at or over the threshold. The difference in apparatus (board against screen) also matters.
- **Symbol matching** is not checked. Its norm is still Claude's expert estimate alone (confidence low).
- These comparisons are with groups unlike ours (age, country, apparatus). They say where to look in the pilot data, not that the table is wrong.

## (d) Population, the six profiles and popularity bias

## Satisfaction against the current job's band

Not run.

Agreement means strong with 5–7, unlikely with 1–3, and possible with 3–5. A contradiction is strong with 1–2, or unlikely with 6–7. Run `scripts/validate-precision.mts satisfaction --force` with DATABASE_URL set to compute it for production.

<!-- GENERATED:END -->
