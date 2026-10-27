# Phase 1 report: data foundation

Status, 2026-10-27: **Phase 1 is complete (revision 2, after your answers). Phase 2 has not been started.**

**What changed in revision 2:**
- **ESCO assignments:** 41 clear misassignments moved to the right career path, plus 5 role fixes inside career paths. They go through the mapper's own override file, so `esco_mapping.csv` is regenerated, not hand-edited.
- **Crosswalk links:** 27 official links that misrepresent the occupation are replaced through a documented override file.
- **Income variance:** removed from Work Design, along with its payoff labels. The model is now `wd-0.2`, with 9 value modes and 8 environment dimensions.
- **ESCO labels:** 263 that were cut off at the first comma are repaired.
- **Phase 2 decisions:** recorded in `docs/WORK_DESIGN.md`.

Every career path has an O\*NET-based profile:
- 187 of 205 from O\*NET links;
- 18 estimated from documented analogs, marked `"provenance": "estimated"`;
- none unlinked.

Two of the brief's named checks **still don't fully pass**, and I didn't tune anything to force them. Both are O\*NET's own ratings, explained in §2:
- **Time Pressure for emergency work:** O\*NET's element measures deadlines, and firefighters and air-traffic controllers rate low on it. The fix is your Phase 2 decision 1.
- **Freedom to Make Decisions for management consulting:** the median.

Sources, versions, checksums and the licence text are in `taxonomy/reference/onet/SOURCES.md`.

## 1. Coverage (1.2–1.4)

### Sources used

| Source | Version |
|---|---|
| O\*NET database | **31.0, August 2026** (latest). Work Values from **30.2, February 2026**, because 31.0 dropped them. |
| ESCO → O\*NET-SOC crosswalk | Official, hosted by O\*NET; O\*NET-SOC 2019, ESCO codes as in ESCO v1.1/v1.2.0 |
| ESCO codes and labels for our URIs | ESCO API, `v1.2.0` and the latest version, fetched 2026-10-27 |
| Lane's corrections | `taxonomy/reference/esco_overrides.csv` (career-path assignments) and `taxonomy/reference/crosswalks/lane_link_overrides.csv` (crosswalk links), each change with a reason |

### Content model as found (1.2)

- **Interests:** 31.0 has no `Interests.txt`. It has `Career Interest Types.txt` with the same six RIASEC elements on the OI scale, sourced "Machine Learning/Expert" (2023–2026), for 923 occupations.
- **Work Values:** only in 30.2 and earlier: analyst ratings from 2008–2012, for 874 occupations.
  - All 874 codes exist in 31.0.
  - 49 occupations that have interest ratings have no Work Values.
- **Work Styles, fully revised in 31.0.** 21 styles in 4 groups, on a new **WI** scale ("Work Styles Impact", −3 to +3) plus a **DR** distinctiveness rank. Sourced "AI/Expert" (12/2025), for 891 occupations:
  - **Proactive and Growth Oriented:** Innovation, Achievement Orientation, Intellectual Curiosity, Tolerance for Ambiguity, Initiative, Adaptability, Self-Confidence, Perseverance, Leadership Orientation.
  - **Interpersonally Oriented:** Humility, Sincerity, Empathy, Cooperation, Optimism, Social Orientation.
  - **Conscientious and Rule Oriented:** Cautiousness, Attention to Detail, Dependability, Integrity.
  - **Emotionally Resilient:** Stress Tolerance, Self-Control.

  They are in the profiles (WI) but not used by any dimension yet.
- **Work Context, five elements renamed in 31.0:** "Structured versus Unstructured Work" became "Determine Tasks, Priorities and Goals", and four others changed. The model uses the new names.
  - The build fails if any of the model's 46 elements is missing from the release.
  - "Determine Tasks, Priorities and Goals" runs from 1 "No freedom" to 5 "A lot of freedom", so it is used unreversed.
- **Rated occupations:** O\*NET-SOC 2019 has 1,016 codes, but only about 910 have ratings. The rest are "All Other" codes, Legislators, and some 2019 codes such as Financial Risk Specialists and Financial and Investment Analysts. See "Data share" below.

### ESCO occupations by route (1.3)

Lane maps 3,039 ESCO occupations to the 205 career paths.

| Route | ESCO occupations | Share | Link weight |
|---|---|---|---|
| Official crosswalk, joined by URI → v1.2.0 code | **2,935** | 96.6% | 1.0, split evenly over the O\*NET codes listed |
| Lane override of the official links (reviewed; see below) | 27 | 0.9% | 1.0 |
| ISCO-08 fallback: the code's unit group → the crosswalk's ISCO rows | 58 | 1.9% | 0.25 |
| Unlinked | 19 | 0.6% | — |

- **Match type:** the crosswalk file has none (no exact/close/broad column), so every crosswalk link has the same weight. The config accepts per-type weights if a typed version appears.
- **Unlinked (19):**
  - Armed-forces ranks (ISCO 0110, 0210, 0310): air force officer, navy officer, squadron leader, army captain, army major, colonel, fleet commander, army corporal, infantry soldier, military engineer. The crosswalk has no armed-forces rows, and O\*NET's military codes carry no ratings.
  - ISCO 1213 policy and planning managers: business manager, branch manager, EU funds manager, sustainability manager, two directors of compliance and information security, and the health, safety and environmental manager, now in HSE.
  - Tent installer (7119.5) and tanner (7535.2).

  Their career paths are covered by their other occupations.
- **Crosswalk overrides (27, `lane_link_overrides.csv`).** Each replaces one ESCO occupation's official links with the O\*NET occupation that O\*NET itself uses for that job (cited from O\*NET's reported job titles):
  - **Pharmacy:** pharmacists → Pharmacists only, instead of two-thirds technicians and aides.
  - **Investment banking:** M&A analyst (was Title Examiners) and securities underwriter (was Brokerage Clerks) → securities sales agents and financial quantitative analysts.
  - **Legal practice:** lawyer, corporate lawyer and legal consultant → Lawyers, without the judges and paralegals.
  - **Fire & rescue:** paramedic → Paramedics; emergency ambulance driver → Ambulance Drivers; dispatcher → Public Safety Telecommunicators.
  - **Others:**
    - landscape architect → Landscape Architects;
    - central bank governor → Chief Executives (was Tellers);
    - employment agent → HR Specialists (was Rehabilitation Counselors);
    - talent-acquisition and employer-branding managers (were Online Merchants);
    - personal trust officer and financial planner (were New Accounts Clerks);
    - online community and web content managers;
    - environmental health inspector;
    - race track operator;
    - sport administrator;
    - patent engineer (was the unrated Engineers, All Other).

  The build fails if a replacement code is missing or unrated.

### Career-path assignments (Q1, applied)

- **What changed:** 41 ESCO occupations were moved to another career path and 5 had their role corrected, through `reference/esco_overrides.csv`.
- **Process:**
  1. Five auditors proposed every change.
  2. A separate reviewer re-checked each one against the ESCO description, its ISCO code and the target career path's roles.
  3. 6 borderline proposals were rejected, and 1 accepted move was reverted (below).
  4. The mapper regenerated `esco_mapping.csv`, and nothing else changed.
- **Examples:**
  - casino and lottery managers out of professional strategy games (dealers, the gaming inspector and pit boss stay; the taxonomy has a croupier role);
  - road managers and the road maintenance technician out of aviation;
  - the rail "ground steward" to rail;
  - the device assembler, surgical-instrument maker and optical engineer out of biomedical engineering;
  - lifeguards to fire & rescue and vocational instruction;
  - conservatory teachers from tutoring to university teaching, and secondary-school music and drama teachers to school teaching;
  - graders and inspectors from machine operation to quality inspection, and food-machine operators to food production;
  - social-security officials to public administration;
  - foreign and political affairs officers to diplomacy;
  - the alternative animal therapist to animal care;
  - the software seller to store retail.
- **Reverted:** moving "commercial sales representative" to field sales left B2B sales resting on sales managers alone, which put B2B sales top of Teach and Lead. It stays in B2B sales, and field sales stays thin (two energy sales reps). See Q1 in §6.
- **v1:** these changes also change v1 matching inputs and the job-title search (`src/lib/taxonomy/esco.generated.json` is regenerated).

### Version and URI checks

| Check | Count |
|---|---|
| URIs missing from ESCO v1.2.0 | **0** (all 3,039 resolve) |
| Code or label changed between v1.2.0 and the latest ESCO | **515** (486 codes renumbered, e.g. technical director 2654.1.7 → 2166.4.7; 29 relabelled). The join uses the v1.2.0 code, so this doesn't affect linking. All are listed in `lane_onet_profiles.json` → `changed_since_crosswalk_version`. |
| v1.2.0 label ≠ crosswalk title for the same code | 20, mostly punctuation or renames (e.g. "cyber incident responder" vs "ICT security engineer", same code 2529.7); listed |
| O\*NET codes in the crosswalk missing from 31.0 | 0 |
| ESCO API lookups that failed | 4, all on the *latest* version, with a server error (HTTP 500). Their v1.2.0 codes resolved, so linking is unaffected. |

- **Labels fixed:** the bundled ESCO copy cut 263 labels at the first comma. `map_esco.py` now writes the official v1.2.0 label; it still matches on the original text, so no assignment changed.

### Career paths by provenance

| Provenance | Career paths |
|---|---|
| O\*NET links (crosswalk, plus overrides where reviewed) | **187** |
| Estimated (documented analogs) | **18** |
| Unlinked | 0 |

Coverage confidence = min(1, ESCO occupations linked directly / 5) × direct share of link weight × data share. "Directly" means by the crosswalk or a reviewed override.

| Confidence | Career paths |
|---|---|
| ≥ 0.8 | 140 |
| 0.4–0.8 | 34 |
| < 0.4 (shown as *low cov.*) | 13 |

The 13 low-confidence paths are:
- Private equity, venture & principal investing;
- Product & UX/UI design;
- Hosting & broadcasting;
- Media, advertising & sponsorship sales;
- UX research;
- Tax advisory;
- In-house legal;
- Comedy;
- Professional sport;
- Newsletters, blogs & niche publishing;
- Creator services;
- Strategy & business operations;
- Medicine.

Most have one or two ESCO occupations. Medicine has two, though each links to many O\*NET physician codes; the formula counts ESCO occupations, which understates it.

**Data share (a rule I added).** Many crosswalk links point to O\*NET codes that have no ratings. Those codes are dropped per descriptor and the rest renormalised.
- Each profile records its data share: the share of link weight on rated occupations, per file.
- Confidence is multiplied by the Work Activities share.
- **Under 50%, the build fails unless the career path has a documented estimate.** That caught risk management, vocational instruction and politics, which first came out with *no score at all*.
- **Work Values coverage is weaker.** Five career paths have less than half their weight with Work Values ratings: field sales, PR, product design, graphic design and cybersecurity. Newer codes such as Software Developers have none. Dimensions using Work Values renormalise over what is there.

### The 18 estimated profiles (`taxonomy/reference/onet/estimated_profiles.csv`)

| Why | Career paths |
|---|---|
| No ESCO occupation (expected ~10) | startup founding, agency ownership, courses & digital products, esports, quantitative finance, payments & fintech, product marketing, CRM & lifecycle marketing, independent consulting, organisational psychology |
| One ESCO occupation can't represent it (forced) | content creation |
| Links rest mostly on unrated O\*NET occupations (rule above) | risk management, vocational instruction, politics |
| Crosswalk links describe a different job (forced) | management consulting and partnerships (both linked only to Project Management Specialists), professional strategy games (its ESCO occupations are the casino-floor ladder, not professional players), tattoo (linked to Models) |

- Every row lists 2–5 rated analog occupations with weights, any adjustments in percentile points, and a written rationale.
- The build fails if an analog is missing or unrated, or if an adjustment target doesn't exist.
- Estimates that replace links keep them in `linked_but_replaced`.

## 2. Top and bottom career paths per dimension (1.6)

Values are 0–100: the weighted mean of the linked occupations' percentiles among all O\*NET occupations. *(est.)* marks an estimated profile; *(low cov.)* marks coverage confidence under 0.4. The full table for all 205 career paths is in `workdesign_careers.json`; this list is `workdesign_careers.md`, generated by `scripts/workdesign-careers.mts`.

<!-- LISTS:START -->
#### Influence (Hunter)

Top 8: Field & territory sales 98 · PR & communications 98 · B2B sales 96 · Media, advertising & sponsorship sales *(low cov.)* 96 · Real estate brokerage 94 · Consumer & direct sales 92 · Intellectual property 92 · Events & experiential 92

Bottom 8: Modelling 12 · Process plant operation 27 · Welding & metal fabrication 27 · Food & seafood production 27 · Machine operation & assembly 29 · Power grid & utilities 29 · Software testing & quality assurance 29 · Culinary 30

#### Analyse (Scout)

Top 8: Private equity, venture & principal investing *(low cov.)* 97 · Organisational & work psychology *(est.)* 94 · CRM, lifecycle & marketing operations *(est.)* 92 · Quantitative finance *(est.)* 91 · Data science & statistics 89 · Data analysis & business intelligence 89 · Risk management *(est.)* 88 · Wealth management & financial advice 87

Bottom 8: Modelling 0 · Dance 5 · Variety & live entertainment 12 · Tattoo & body art *(est.)* 13 · Ceramics, glass & instrument making 13 · Comedy *(low cov.)* 14 · Hair, beauty & cosmetics 14 · Childcare 16

#### Build (Maker)

Top 8: Electrician 87 · Carpentry & building 84 · Industrial maintenance & technical service 82 · Vehicle & machinery mechanics 82 · Plumbing, heating & refrigeration 78 · Biomedical engineering 78 · Welding & metal fabrication 78 · Heavy equipment & civil works 77

Bottom 8: Organisational & work psychology *(est.)* 2 · Private equity, venture & principal investing *(low cov.)* 2 · Quantitative finance *(est.)* 6 · Wealth management & financial advice 6 · Investment banking & M&A advisory 6 · Asset management & investment research 6 · Trading & markets 8 · CRM, lifecycle & marketing operations *(est.)* 8

#### Organise (Gatherer)

Top 8: Project & programme management 88 · In-house legal *(low cov.)* 88 · Newsletters, blogs & niche publishing *(low cov.)* 83 · Product management 82 · Recruiting & talent acquisition 79 · Journalism 79 · Learning & development 79 · Independent consulting & interim leadership *(est.)* 79

Bottom 8: Variety & live entertainment 7 · Comedy *(low cov.)* 9 · Modelling 10 · Textiles, leather & upholstery 21 · Acting 23 · Furniture & woodcraft 23 · Culinary 25 · Restaurant, bar & café service 25

#### Care (Healer)

Top 8: Nursing & midwifery 95 · Medicine (doctors) *(low cov.)* 94 · Complementary therapies 93 · Dentistry 91 · Elder & disability care 91 · Diagnostics & medical technology 91 · Mental health & psychology 91 · Rehabilitation & allied health 91

Bottom 8: CRM, lifecycle & marketing operations *(est.)* 2 · Newsletters, blogs & niche publishing *(low cov.)* 2 · Quantitative finance *(est.)* 2 · Content, copy & social media 2 · Private equity, venture & principal investing *(low cov.)* 4 · Investment banking & M&A advisory 6 · Modelling 6 · Writing & authorship 7

#### Teach (Teacher)

Top 8: Learning & development 96 · Organisational & work psychology *(est.)* 93 · Vocational & specialist instruction *(est.)* 92 · Tutoring & language teaching 90 · Academic research & university teaching 88 · School teaching 87 · Early childhood education 86 · In-house legal *(low cov.)* 84

Bottom 8: Modelling 0 · Comedy *(low cov.)* 2 · Acting 5 · Variety & live entertainment 5 · Newsletters, blogs & niche publishing *(low cov.)* 6 · Product & UX/UI design *(low cov.)* 11 · Real estate brokerage 12 · Writing & authorship 12

#### Create (Storyteller)

Top 8: Newsletters, blogs & niche publishing *(low cov.)* 98 · Animation, VFX & 3D 98 · Tattoo & body art *(est.)* 98 · Comedy *(low cov.)* 97 · Content creation *(est.)* 97 · Hosting & broadcasting *(low cov.)* 97 · Journalism 96 · PR & communications 95

Bottom 8: Tax advisory *(low cov.)* 18 · Accounting & audit 21 · Food & seafood production 23 · Culinary 23 · Banking, lending & credit 23 · Pharmacy 25 · Store retail 27 · Paralegal & legal support 29

#### Lead (Chief)

Top 8: Project & programme management 88 · General management & executive leadership 87 · PR & communications 87 · Organisational & work psychology *(est.)* 86 · Operations & process improvement 86 · Architecture 82 · In-house legal *(low cov.)* 82 · Agency & studio ownership *(est.)* 82

Bottom 8: Modelling 1 · Comedy *(low cov.)* 5 · Variety & live entertainment 8 · Acting 13 · Newsletters, blogs & niche publishing *(low cov.)* 17 · Writing & authorship 17 · Ceramics, glass & instrument making 18 · Translation & interpreting 23

#### Protect (Guardian)

Top 8: HSE, quality & inspection 81 · Biomedical engineering 78 · Electrician 76 · Aviation 74 · Diagnostics & medical technology 72 · Corrections 72 · Chemical & process engineering 72 · Inspection & regulation 71

Bottom 8: Creator services *(low cov.)* 1 · Modelling 1 · Comedy *(low cov.)* 3 · Dance 5 · Variety & live entertainment 5 · Newsletters, blogs & niche publishing *(low cov.)* 6 · Writing & authorship 9 · Music performance 9

#### Autonomy

Top 8: Startup founding *(est.)* 98 · Intellectual property 93 · Courses, digital products & communities *(est.)* 89 · Agency & studio ownership *(est.)* 89 · Real estate brokerage 86 · Medicine (doctors) *(low cov.)* 86 · Independent consulting & interim leadership *(est.)* 86 · Brand marketing 85

Bottom 8: Modelling 10 · Variety & live entertainment 15 · Comedy *(low cov.)* 19 · Acting 25 · Food & seafood production 26 · Textile, print & packaging production 26 · Furniture & woodcraft 26 · Culinary 27

#### Social contact

Top 8: Field & territory sales 90 · B2B sales 88 · Events & experiential 86 · Store retail 84 · Dentistry 81 · Medicine (doctors) *(low cov.)* 79 · Nursing & midwifery 78 · Sports business 78

Bottom 8: Newsletters, blogs & niche publishing *(low cov.)* 7 · Content, copy & social media 12 · CRM, lifecycle & marketing operations *(est.)* 12 · Furniture & woodcraft 15 · Writing & authorship 16 · Quantitative finance *(est.)* 19 · Data analysis & business intelligence 19 · Ceramics, glass & instrument making 20

#### Pace and time pressure

Top 8: Hosting & broadcasting *(low cov.)* 96 · Newsletters, blogs & niche publishing *(low cov.)* 94 · PR & communications 92 · Advertising & creative agencies 87 · Events & experiential 86 · Animation, VFX & 3D 86 · Content creation *(est.)* 84 · Supply chain & planning 84

Bottom 8: Modelling 0 · Field & territory sales 12 · Hair, beauty & cosmetics 14 · Outdoor guiding & instruction 18 · Data engineering & databases 20 · Childcare 20 · Sports business 21 · Small business ownership 23

#### Conflict and friction

Top 8: Corrections 96 · Pharmacy 93 · Private security 85 · Social work & welfare 83 · B2B sales 82 · Account management & customer success 82 · Nursing & midwifery 81 · Intellectual property 81

Bottom 8: Modelling 1 · Newsletters, blogs & niche publishing *(low cov.)* 5 · CRM, lifecycle & marketing operations *(est.)* 9 · Content, copy & social media 10 · Tattoo & body art *(est.)* 13 · Writing & authorship 13 · Ceramics, glass & instrument making 15 · Animation, VFX & 3D 16

#### Competition

Top 8: Content creation *(est.)* 100 · Comedy *(low cov.)* 100 · Politics & elected office *(est.)* 100 · Private equity, venture & principal investing *(low cov.)* 100 · Dance 99 · Professional strategy games *(est.)* 98 · Esports *(est.)* 98 · Newsletters, blogs & niche publishing *(low cov.)* 97

Bottom 8: Modelling 1 · Religious & spiritual work 6 · Outdoor guiding & instruction 12 · Childcare 16 · Early childhood education 20 · Restaurant, bar & café service 21 · Social work & welfare 21 · Rail 23

#### Precision and consequence of error

Top 8: Pharmacy 95 · Medicine (doctors) *(low cov.)* 86 · Diagnostics & medical technology 85 · Nursing & midwifery 81 · Dentistry 78 · Biomedical engineering 77 · Veterinary medicine 75 · Translation & interpreting 74

Bottom 8: Learning & development 6 · Comedy *(low cov.)* 7 · Modelling 7 · Tutoring & language teaching 11 · Retail buying & merchandising 12 · B2B sales 15 · Dance 17 · Religious & spiritual work 18

#### Variety vs. routine

Top 8: Comedy *(low cov.)* 96 · PR & communications 93 · Tutoring & language teaching 88 · Tattoo & body art *(est.)* 88 · Interior design 84 · Acting 83 · Creator services *(low cov.)* 83 · Animation, VFX & 3D 83

Bottom 8: Tax advisory *(low cov.)* 13 · Pharmacy 17 · Accounting & audit 20 · Banking, lending & credit 20 · Administration & office support 26 · FP&A, controlling & corporate finance 28 · Paralegal & legal support 29 · Process plant operation 29

#### Cognitive challenge

Top 8: Medicine (doctors) *(low cov.)* 91 · Organisational & work psychology *(est.)* 89 · Private equity, venture & principal investing *(low cov.)* 89 · Quantitative finance *(est.)* 88 · Payments, fintech & crypto operations *(est.)* 82 · Intellectual property 81 · Data science & statistics 81 · Politics & elected office *(est.)* 81

Bottom 8: Modelling 7 · Masonry, concrete & tiling 18 · Facilities, cleaning & property services 18 · Textiles, leather & upholstery 20 · Comedy *(low cov.)* 21 · Variety & live entertainment 22 · Textile, print & packaging production 22 · Furniture & woodcraft 22

#### Element checks named in the brief (raw O*NET elements)

#### Element check: Freedom to Make Decisions (Work Context)

Top 8: Startup founding *(est.)* 100 · Real estate brokerage 95 · Courses, digital products & communities *(est.)* 93 · Medicine (doctors) *(low cov.)* 91 · Agency & studio ownership *(est.)* 91 · Intellectual property 91 · Property investment & development 87 · Religious & spiritual work 84

Bottom 8: Comedy *(low cov.)* 8 · Variety & live entertainment 9 · Modelling 19 · Acting 23 · Culinary 24 · Architecture 25 · Furniture & woodcraft 26 · Industrial & product design 26

#### Element check: Time Pressure (Work Context)

Top 8: Hosting & broadcasting *(low cov.)* 96 · Newsletters, blogs & niche publishing *(low cov.)* 94 · PR & communications 92 · Advertising & creative agencies 87 · Events & experiential 86 · Animation, VFX & 3D 86 · Content creation *(est.)* 84 · Supply chain & planning 84

Bottom 8: Modelling 0 · Field & territory sales 12 · Hair, beauty & cosmetics 14 · Outdoor guiding & instruction 18 · Data engineering & databases 20 · Childcare 20 · Sports business 21 · Small business ownership 23

#### Element check: Assisting and Caring for Others (Work Activity, Importance)

Top 8: Nursing & midwifery 95 · Medicine (doctors) *(low cov.)* 94 · Complementary therapies 93 · Dentistry 91 · Elder & disability care 91 · Diagnostics & medical technology 91 · Mental health & psychology 91 · Rehabilitation & allied health 91

Bottom 8: CRM, lifecycle & marketing operations *(est.)* 2 · Newsletters, blogs & niche publishing *(low cov.)* 2 · Quantitative finance *(est.)* 2 · Content, copy & social media 2 · Private equity, venture & principal investing *(low cov.)* 4 · Investment banking & M&A advisory 6 · Modelling 6 · Writing & authorship 7
<!-- LISTS:END -->

### Face-validity checks named in the brief

| Check | Result | Evidence |
|---|---|---|
| Freedom to Make Decisions high for **founders** | **Pass** | Startup founding is #1 (100, est.). It is about 88 without its +15 adjustment. Agency ownership #5, small business #19. |
| … high for **consultants** | **Partial** | Independent consulting is #9 (84, est.), but its unadjusted value would be 69. Management consulting is #105 (54): O\*NET's Management Analysts rate 4.14 (51st percentile), because employed consultants work inside client engagements. I didn't adjust it to pass. |
| … low for **assembly** | **Pass, not extreme** | Machine operation & assembly #186 of 205 (34); food production #195, textile & print production #196. The bottom 8 are performers (comedy, variety, acting, modelling), whose ratings reflect working to a director, plus culinary, architecture (O\*NET's Architects rate at the 16th percentile), woodcraft and industrial design. Pharmacy left the bottom 8 (now #192) after the pharmacist links were corrected. |
| Time Pressure high for **emergency** work and **air-traffic** control | **Fail: O\*NET's own ratings** | O\*NET's element asks "how often does this job require the worker to meet strict deadlines?". Firefighters rate 3.35 (15th percentile), Air Traffic Controllers 3.41 (18th), Paramedics 3.52 (25th) and Emergency Medicine Physicians 4.20 (76th), against Broadcast Announcers 4.85 (99th). So fire & rescue is #148 (42), police #100, aviation #60 and medicine #33. Urgency in emergency work isn't deadline pressure. Phase 2 decision 1 blends urgency elements into the pace dimension; the raw element itself will stay as it is. |
| Assisting and Caring high for **nursing** and **childcare** | **Pass** | Nursing #1 (95), childcare #11 (90), early childhood education #13 (86). The cut-off for the top 8 is 91. Ranked above childcare are medicine, therapies, dentistry, elder care, diagnostics, mental health, allied health, faith work and funeral services (Embalmers rate 4.55 on caring). |

### Anomalies and why they happened

Two rounds of review traced every surprising extreme to its occupations with `taxonomy/build/inspect_lane.py`:
1. Investigators, one per group of dimensions.
2. Skeptics, who re-ran the evidence and tried to refute each cause.

The fixes in revision 2 addressed the assignment and crosswalk causes. What remains is listed by cause.

**Fixed in revision 2 (ranks after the fix)**

- **Precision:**
  - Investment banking fell from #7 to #28 once its M&A and underwriting links were corrected.
  - Aviation rose from #16 to #12 once the road roles left.
- **Protect:** inspection & regulation entered the top 8 (#8).
- **Organise:** partnerships is no longer #1, and the casino managers are no longer scored as players.
- **Pharmacy's low freedom:** this was a crosswalk artefact and is gone.
- **Recruiting, legal practice and wealth advice:** these no longer rest on clerical or counselling codes.

**O\*NET's own ratings (genuine; not changed)**
- **Modelling** is at or near the bottom of most lists. Its only occupation, Models (41-9012), rates low on almost every activity (Time Pressure 1.67, selling 1.82).
- **Pharmacy** has high conflict (#2, 93), top precision (#1) and low variety (#204): pharmacists rate high on dealing with unpleasant people, on exactness and on repetition.
- **Architecture** has low Freedom to Make Decisions (#200): Architects rate at the 16th percentile.
- **Hosting & broadcasting, newsletters, and PR top Time Pressure:** broadcasters and editors work to hard deadlines.
- **Content, copy & social** is low on Social contact (#204), even with corrected links: marketing specialists rate low on contact with others.
- **Journalism** is high on Organise; **PR** is high on Lead (PR Managers); **B2B sales** and **account management** are high on Conflict. All are genuine ratings.
- **Funeral services and faith work** rank above childcare on Caring (above).
- **Accounting & audit** is only mid on Precision (#74): Consequence of Error is moderate for Accountants.

**Thin coverage (one or two occupations dominate; flagged *low cov.* where under 0.4)**
- **In-house legal** is high on Organise (#2), Teach (#8) and Lead.
  - Its only occupation is data protection officer, which links to Compliance Managers.
  - ESCO has no in-house counsel or company secretary occupation. The reviewer rejected moving "legal consultant" or "corporate lawyer" in, because ESCO describes both as external advisers.
  - Candidate for an estimated profile (Q1 in §6).
- **Field & territory sales** is #204 on Time Pressure: it has two energy sales reps (Q1).
- **Intellectual property** is high on Influence, Autonomy and Conflict: it is now O\*NET's Lawyers (patent engineer corrected to Lawyers as well).
- **Newsletters/blogs:** one editorial occupation.
- **Comedy** is top on Variety and Competition and bottom on Organise and Lead: Actors only.
- **Private equity** is top on Analyse and Competition: Investment Fund Managers is its only rated link. The direction is right; the exact ranks are fragile.

**The model (decided for Phase 2, not changed in Phase 1)**
- **Protect** measures quality and safety checking, so police, security and armed forces are mid (police #50).
- **Social contact** is mid for school teaching (#75) and childcare (#92): contact with pupils and children isn't counted as "the public".
- **Variety** rests on one repetition element, so assembly is only #182.
- **Organise** is built from planning activities, so administration is mid (#139).
- **Analyse** weights Getting Information heavily, so physical sciences is only #52.
- **Tutoring** is #3 on Variety: private art, dance and photography teachers rate high on creative thinking. This is genuine, but the dimension can't tell teaching variety from creative variety.

**Estimates driving an extreme (by design; flagged *est.*)**
- **CRM & lifecycle marketing** is #3 on Analyse, above data science. Its main analog is Market Research Analysts.
- **Startup founding** is only #30 on Lead and #40 on Influence: its Software Developer analog dilutes it.
- **Content creation** tops Competition through its +10 adjustment.
- **Payments & fintech** is #5 on Challenge.
- **Vocational instruction** is #3 on Teach.

## 3. Person-side Work Design profile

**Your account, LN-20261023-H2C** (production, read-only run by you on 2026-10-27, `wd-0.2`, sessions S1–S5):

```
Value modes (0–100, SE, 90% range; relative = BLUEPRINT reliability rule)
  Influence (Hunter)        59 ± 5.0 (90%: 51–68)  none  coverage 100%
  Analyse (Scout)           57 ± 5.7 (90%: 47–66)  none  coverage 100%
  Build (Maker)             48 ± 7.4 (90%: 36–60)  none  coverage 100%
  Organise (Gatherer)       30 ± 5.8 (90%: 20–39)  weakness  coverage 100%
  Care (Healer)             59 ± 5.8 (90%: 49–68)  none  coverage 100%
  Teach (Teacher)           61 ± 5.7 (90%: 52–70)  none  coverage 100%
  Create (Storyteller)      50 ± 5.8 (90%: 41–60)  none  coverage 100%
  Lead (Chief)              63 ± 4.9 (90%: 55–71)  strength  coverage 100%
  Protect (Guardian)        48 ± 5.0 (90%: 40–56)  none  coverage 100%

Environment dimensions
  Autonomy                              93 ± 6.8 (90%: 81–100)  coverage 100%
  Social contact                        49 ± 5.2 (90%: 40–57)  coverage 100%
  Pace and time pressure                37 ± 5.3 (90%: 29–46)  coverage 100%
  Conflict and friction                 69 ± 4.5 (90%: 62–77)  coverage 100%
  Competition                           43 ± 7.2 (90%: 31–55)  coverage 100%
  Precision and consequence of error    51 ± 5.4 (90%: 43–60)  coverage 100%
  Variety vs. routine                   80 ± 6.0 (90%: 70–90)  coverage 100%
  Cognitive challenge                   80 ± 9.1 (90%: 65–95)  coverage 100%

Inseparable by design (shared inputs): influence + lead, organise + protect, care + teach
```

How to read it:
- **Strengths and weaknesses:** only two value modes pass the reliability rule:
  - **Lead** is a relative strength (63, against your own mean of about 53).
  - **Organise** is a relative weakness (30).
  - The other seven overlap within their error bars, so they shouldn't be ranked against each other.
- **Inseparable pairs:** Organise and Protect share inputs, as do Lead and Influence. "Low Organise" therefore partly means low Protect (48), and "Lead" partly means Influence (59).
- **The strongest environment signals:**
  - **Autonomy 93** (90% range 81–100);
  - **Variety 80**;
  - **Cognitive challenge 80**: your reasoning percentile, the only normed input, so the widest SE here (±9.1) still comes from real norms;
  - **Pace 37:** a lower preferred deadline pressure.

  Conflict tolerance (69) is above the midpoint. Social contact, competition and precision sit near 50.
- **Provisional:** personality and interests are anchored at the scale midpoint until the norms are transcribed (Phase 2 decision 3). Absolute levels like "Autonomy 93" can move when norms arrive; the ordering within the profile is the more stable part.

**A complete dev test account, to show the output** (`workdesign_profile_dev_example.txt`, regenerated with `wd-0.2`). This is the e2e persona: a script answers its questionnaires and rapid-guesses its reasoning items, so reasoning is "not measured". It is not a real person.

```
Value modes (0–100, SE, 90% range; relative = BLUEPRINT reliability rule)
  Influence (Hunter)        69 ± 5.0 (90%: 61–77)  strength  coverage 100%
  Analyse (Scout)           54 ± 7.1 (90%: 42–65)  none  coverage 70%
  Build (Maker)             13 ± 10.0 (90%: 0–29)  weakness  coverage 60%
  Organise (Gatherer)       53 ± 5.8 (90%: 44–63)  none  coverage 100%
  Care (Healer)             53 ± 5.8 (90%: 44–63)  none  coverage 100%
  Teach (Teacher)           63 ± 5.7 (90%: 54–73)  none  coverage 100%
  Create (Storyteller)      56 ± 5.8 (90%: 47–66)  none  coverage 100%
  Lead (Chief)              71 ± 4.9 (90%: 63–79)  strength  coverage 100%
  Protect (Guardian)        56 ± 5.0 (90%: 48–64)  none  coverage 100%

Environment dimensions
  Autonomy                              55 ± 6.8 (90%: 44–66)  coverage 100%
  Social contact                        49 ± 5.2 (90%: 41–58)  coverage 100%
  Pace and time pressure                76 ± 3.8 (90%: 69–82)  coverage 100%
  Conflict and friction                 63 ± 4.5 (90%: 56–71)  coverage 100%
  Competition                           55 ± 7.2 (90%: 43–67)  coverage 100%
  Precision and consequence of error    49 ± 5.4 (90%: 40–57)  coverage 100%
  Variety vs. routine                   52 ± 6.0 (90%: 42–62)  coverage 100%
  Cognitive challenge                  not measured  coverage 0%

Inseparable by design (shared inputs): influence + lead, organise + protect, care + teach
```

How to read it:
- **Influence and Lead** pass the reliability rule as strengths, and **Build** as a weakness. The other six modes can't be told apart.
- Influence and Lead share most of their inputs, so for this person they say the same thing twice. Phase 2 must not count them as two findings.
- **Personality and interests are anchored at the scale midpoint (50)**, with planning SDs, because no usable norms are transcribed yet (Phase 2 decision 3). They are flagged provisional.

## 4. Corsi fix (1.1)

What changed:
- **Board size:** `CORSI_PROTOCOL.maxLength` is 9, the number of blocks. Digit span keeps its own maximum of 10.
- **Generator:** `generateCorsi` throws a `RangeError` for a length below 1 or above 9.
- **Task flow:** it uses the Corsi protocol, so the task ends after length 9.
- **Scoring:** the span is capped at 9 when scoring and again when reading stored scores.
- **Tests:** a new test covers all of the above.
- **Percentiles:** displayed upper bounds were already capped at 99.

Migration, `scripts/migrate-corsi-span.mts` (a dry run by default; it writes only with `--apply`). **Dev, dry run:**

```
Corsi span migration (dry run), max length 9
S4 score rows: 8 · with a Corsi span: 8 · stored span above 9: 8
Stored Corsi trials at a length above 9: 22 of 187
  f5a4bbc0-c68f-49af-9bb7-40cd3c81549b (completed): span 10 → 9
  5e8b4a36-7f0d-41e0-a29f-886efa206b3e (completed): span 10 → 9
  06f62340-c4a0-4f21-aee3-087ffa9f3353 (completed): span 10 → 9
  fefa840c-a87d-4217-9d41-9d3a255a5e80 (completed): span 10 → 9
  7b2584a6-de6d-42af-8af3-19bb801a4056 (completed): span 10 → 9
  6fe87533-9b48-4e2a-a7bf-08ef9de7897a (completed): span 10 → 9
  468422d9-653e-475b-9c5e-40f75fa07472 (completed): span 10 → 9
  22ae3219-b04d-4844-94a6-eba1ac771ff6 (completed): span 10 → 9
```

- All 8 rows are e2e test accounts.
- **Dev, applied, then checked:** 8 rows updated; a rerun reports 0 above 9 (`corsi_migration_dev_after.txt`). Raw trials are kept as recorded.
- **Production, dry run (run by you on 2026-10-27):** 2 S4 score rows, both with a Corsi span; **1 stored above 9** (`7a3cc155-fbfd-4261-a73e-1ddb5c54c065`, completed: span 10 → 9). 2 of 47 stored non-practice trials are at a length above 9.
  - **Applied by you on 2026-10-27:** "Updated 1 row(s)." A re-run shows `stored span above 9: 0`. The 2 raw trials stay as recorded, by design; scoring caps them.
  - `SCORING_VERSION` was deliberately not bumped, because that would re-score production sessions on the next load.

To run it on production, do the dry run first, then decide on `--apply`:

```
DATABASE_URL=<Neon URL> npx tsx --conditions=react-server scripts/migrate-corsi-span.mts --force
```

## 5. Judgment calls

1. **Two O\*NET releases:** 31.0 for everything except Work Values, which come from 30.2 (the last release that has them, rated 2008–2012). Interests come from 31.0's Career Interest Types.
2. **URI join through the ESCO API.** The crosswalk has codes and titles but no URIs, so each URI's v1.2.0 code is fetched from the official API. This is an exact join; no labels are matched.
3. **ISCO fallback from the same crosswalk file** (its 913 unit-group rows), because bls.gov refused automated downloads. The weight is 0.25.
4. **No match types exist**, so all crosswalk links weigh 1.0, split evenly over each ESCO occupation's O\*NET codes.
5. **Unrated O\*NET codes** are dropped per descriptor and the rest renormalised. A descriptor needs at least 50% of the link weight rated. Under 50% on Work Activities, the career path must have an estimate.
6. **Overrides count like crosswalk links in coverage confidence.** They point at the exact O\*NET occupation O\*NET uses for the job, but they show as route "override" in the data.
7. **Assignment changes go through the mapper's override file.** I didn't hand-edit `esco_mapping.csv` or `taxonomy.json`. The mapper regenerates the mapping, and the regeneration was checked to change nothing beyond the intended rows.
8. **Percentiles** are mid-rank, across all occupations that have the descriptor, in that release. Raw values are kept next to them.
9. **Coverage confidence** counts ESCO occupations, not O\*NET codes, so it understates career paths such as medicine.
10. **Income variance removed** (your decision). Its person-side inputs (the risk and patience tasks) are still scored and stored; nothing in Work Design reads the payoff labels now.
11. **Person side:**
    - midpoint anchoring and planning SDs for personality and interests, until norms are transcribed;
    - ipsative work values;
    - task-range anchoring for behaviour tasks;
    - dimension SEs that assume independent errors.
12. **Attribution:** the exact licence text is in `SOURCES.md` and `src/lib/workdesign/attribution.ts`. It isn't shown in the report or on the Career map yet, because neither shows O\*NET data until Phase 2/3.

## 6. Decisions recorded, and what's still open

**Decided (in `docs/WORK_DESIGN.md`, "Decisions for Phase 2"):**
1. Pace: blend urgency-related Work Context into the dimension.
2. Fix the model-weighting issues in Phase 2.
3. Transcribe the IPIP-NEO-120 and Interest Profiler norms.
4. Income labels are not part of Work Design.

**Answered after revision 2:**
1. **Thin career paths:** decided. No estimated profiles. Field sales, in-house legal, sports business and B2B sales keep their real links and are flagged where coverage confidence is low.
2. **Income labels in the live product:** decided and done. Income labels don't exist anywhere in Lane now (taxonomy, v1 matching, Career map, report, copy); see `design/REMOVED.md`.
3. **Production Corsi fix:** done (1 row, confirmed 0 above 9).
