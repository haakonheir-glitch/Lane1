# Phase 1 report: data foundation

Status, 2026-10-27: **Phase 1 is complete. Phase 2 has not been started.**

Every career path now has an O\*NET-based profile:
- **187 of 205** are built from official crosswalk links;
- **18** are estimated from documented analogs, each marked `"provenance": "estimated"`;
- **none** is unlinked.

Most extremes in the top and bottom lists are face-valid. The ones that aren't are explained in §2, and each is classified as one of:
- O\*NET's own ratings;
- Lane's ESCO assignment;
- the official crosswalk;
- thin coverage;
- the model.

Two of the brief's named checks **don't fully pass**, and I haven't tuned anything to force them:
- **Time Pressure:** emergency work and air-traffic control are not high, because O\*NET's element measures strict deadlines.
- **Consultants on Freedom to Make Decisions:** management consulting sits at the median.

Sources, versions, checksums and the licence text are in `taxonomy/reference/onet/SOURCES.md`.

## 1. Coverage (1.2–1.4)

### Sources used

| Source | Version |
|---|---|
| O\*NET database | **31.0, August 2026** (latest). Work Values from **30.2, February 2026**, because 31.0 dropped them. |
| ESCO → O\*NET-SOC crosswalk | Official, hosted by O\*NET; O\*NET-SOC 2019, ESCO codes as in ESCO v1.1/v1.2.0 |
| ESCO codes for our URIs | ESCO API, `v1.2.0` and the latest version, fetched 2026-10-27 |

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
- **Rated occupations:** O\*NET-SOC 2019 has 1,016 codes, but only about 910 have ratings. The rest are "All Other" codes, Legislators and some new 2019 codes such as Financial Risk Specialists and Financial and Investment Analysts. This matters: see "Data share" below.

### ESCO occupations by route (1.3)

Lane maps 3,039 ESCO occupations to the 205 career paths.

| Route | ESCO occupations | Share | Link weight |
|---|---|---|---|
| Official crosswalk, joined by URI → v1.2.0 code | **2,959** | 97.4% | 1.0, split evenly over the O\*NET codes listed |
| ISCO-08 fallback: the code's unit group → the crosswalk's ISCO rows | 61 | 2.0% | 0.25 |
| Unlinked | 19 | 0.6% | — |

- **Match type:** the crosswalk file has none (no exact/close/broad column), so every crosswalk link has the same weight. The config accepts per-type weights if a typed version appears.
- **Unlinked (19):**
  - Armed-forces ranks (ISCO 0110, 0210, 0310): air force officer, navy officer, squadron leader, army captain, army major, colonel, fleet commander, army corporal, infantry soldier, military engineer. The crosswalk has no armed-forces rows, and O\*NET's military codes carry no ratings.
  - ISCO 1213 policy and planning managers: business manager, branch manager, EU funds manager, health safety and environmental manager, sustainability manager, two directors of compliance and information security.
  - Tent installer (7119.5) and tanner (7535.2).

  Their career paths are covered by their other occupations.

### Version and URI checks

| Check | Count |
|---|---|
| URIs missing from ESCO v1.2.0 | **0** (all 3,039 resolve) |
| Code or label changed between v1.2.0 and the latest ESCO | **515** (486 codes renumbered, e.g. technical director 2654.1.7 → 2166.4.7; 29 relabelled). The join uses the v1.2.0 code, so this doesn't affect linking. All are listed in `lane_onet_profiles.json` → `changed_since_crosswalk_version`. |
| v1.2.0 label ≠ crosswalk title for the same code | 20, mostly punctuation or renames (e.g. "cyber incident responder" vs "ICT security engineer", same code 2529.7); listed |
| O\*NET codes in the crosswalk missing from 31.0 | 0 |
| ESCO API lookups that failed | 4, all on the *latest* version, with a server error (HTTP 500 "More than one value found for field 'hasSkillType'"). Their v1.2.0 codes resolved, so linking is unaffected. |

**Data bug found in Lane's own files (not fixed):** `taxonomy/esco_mapping.csv` (and the bundled ESCO copy) truncates labels at the first comma:
- "health safety and" for "health, safety and environmental manager";
- "ICT buyer ICT".

URIs are intact, and linking is by URI, so profiles are unaffected. Only labels in lists and reports are wrong.

### Career paths by provenance

| Provenance | Career paths |
|---|---|
| O\*NET, from crosswalk links | **187** |
| Estimated (documented analogs) | **18** |
| Unlinked | 0 |

Coverage confidence for the 187 = min(1, ESCO occupations linked by the crosswalk / 5) × crosswalk share of link weight × data share.

| Confidence | Career paths |
|---|---|
| ≥ 0.8 | 140 |
| 0.4–0.8 | 32 |
| < 0.4 (shown as *low cov.*) | 15 |

The 15 low-confidence paths are:
- Private equity, venture & principal investing;
- Hosting & broadcasting;
- Product & UX/UI design;
- Comedy;
- Creator services;
- In-house legal;
- Intellectual property;
- Media, advertising & sponsorship sales;
- Newsletters, blogs & niche publishing;
- Professional sport;
- Tax advisory;
- UX research;
- Recruiting;
- Strategy & business operations;
- Medicine.

Most have only one or two ESCO occupations. Medicine has two, though each links to many O\*NET physician codes; the formula counts ESCO occupations, which understates it.

**Data share (a rule I added).** Many crosswalk links point to O\*NET codes that have no ratings. Those codes are dropped per descriptor and the rest renormalised.
- Each profile records its data share: the share of link weight on rated occupations, per file.
- Confidence is multiplied by the Work Activities share.
- **Under 50%, the build fails unless the career path has a documented estimate.** That rule caught three career paths, which first came out with *no score at all*:
  - Risk management: 42% rated, because Financial Risk Specialists is unrated;
  - Vocational instruction: 11%, because Teachers and Instructors, All Other is unrated;
  - Politics: 43%, because Legislators has no ratings in 31.0.
- **Work Values coverage is weaker.** Six career paths have less than half their weight with Work Values ratings: field sales, partnerships, PR, product design, graphic design and cybersecurity. Newer codes such as Software Developers and Data Scientists have none. Dimensions using Work Values renormalise over what is there.

### The 18 estimated profiles (`taxonomy/reference/onet/estimated_profiles.csv`)

| Why | Career paths |
|---|---|
| No ESCO occupation (expected ~10) | startup founding, agency ownership, courses & digital products, esports, quantitative finance, payments & fintech, product marketing, CRM & lifecycle marketing, independent consulting, organisational psychology |
| One ESCO occupation can't represent it (forced) | content creation |
| Links rest mostly on unrated O\*NET occupations (rule above) | risk management, vocational instruction, politics |
| Crosswalk links describe a different job (found in the face-validity review; forced) | management consulting and partnerships (both linked only to Project Management Specialists), professional strategy games (all casino staff), tattoo (linked to Models) |

- Every row lists 2–5 rated analog occupations with weights, any adjustments in percentile points, and a written rationale.
- The build fails if an analog is missing or unrated, or if an adjustment target doesn't exist. The unrated-analog check was added after the review found that quantitative finance's analog 13-2051 had no ratings; it is now replaced with Investment Fund Managers.
- Estimates that replace crosswalk links keep the replaced links in `linked_but_replaced`.

## 2. Top and bottom career paths per dimension (1.6)

Values are 0–100: the weighted mean of the linked occupations' percentiles among all O\*NET occupations. *(est.)* marks an estimated profile; *(low cov.)* marks coverage confidence under 0.4. The full table for all 205 career paths is in `workdesign_careers.json`; this list is `workdesign_careers.md`, generated by `scripts/workdesign-careers.mts`.

<!-- LISTS:START -->
#### Influence (Hunter)

Top 8: Field & territory sales 98 · PR & communications 98 · B2B sales 96 · Media, advertising & sponsorship sales *(low cov.)* 96 · Diplomacy & international organisations 95 · Real estate brokerage 94 · Consumer & direct sales 92 · Intellectual property *(low cov.)* 92

Bottom 8: Modelling 12 · Process plant operation 27 · Food & seafood production 27 · Welding & metal fabrication 27 · Power grid & utilities 29 · Software testing & quality assurance 29 · Machine operation & assembly 29 · Culinary 30

#### Analyse (Scout)

Top 8: Private equity, venture & principal investing *(low cov.)* 97 · Organisational & work psychology *(est.)* 94 · CRM, lifecycle & marketing operations *(est.)* 92 · Quantitative finance *(est.)* 91 · Data science & statistics 89 · Data analysis & business intelligence 89 · Risk management *(est.)* 88 · Management consulting *(est.)* 86

Bottom 8: Modelling 0 · Dance 5 · Variety & live entertainment 12 · Tattoo & body art *(est.)* 13 · Ceramics, glass & instrument making 13 · Comedy *(low cov.)* 14 · Hair, beauty & cosmetics 14 · Textiles, leather & upholstery 17

#### Build (Maker)

Top 8: Electrician 87 · Carpentry & building 84 · Vehicle & machinery mechanics 82 · Industrial maintenance & technical service 82 · Plumbing, heating & refrigeration 78 · Biomedical engineering 78 · Welding & metal fabrication 78 · Heavy equipment & civil works 77

Bottom 8: Organisational & work psychology *(est.)* 2 · Private equity, venture & principal investing *(low cov.)* 2 · Quantitative finance *(est.)* 6 · Asset management & investment research 6 · Trading & markets 8 · CRM, lifecycle & marketing operations *(est.)* 8 · FP&A, controlling & corporate finance 8 · Wealth management & financial advice 9

#### Organise (Gatherer)

Top 8: Project & programme management 88 · In-house legal *(low cov.)* 88 · Newsletters, blogs & niche publishing *(low cov.)* 83 · Product management 82 · Journalism 79 · Learning & development 79 · Diplomacy & international organisations 79 · Independent consulting & interim leadership *(est.)* 79

Bottom 8: Variety & live entertainment 7 · Comedy *(low cov.)* 9 · Modelling 10 · Textiles, leather & upholstery 21 · Acting 23 · Furniture & woodcraft 23 · Culinary 25 · Restaurant, bar & café service 25

#### Care (Healer)

Top 8: Nursing & midwifery 95 · Medicine (doctors) *(low cov.)* 94 · Complementary therapies 92 · Dentistry 91 · Elder & disability care 91 · Diagnostics & medical technology 91 · Mental health & psychology 91 · Rehabilitation & allied health 91

Bottom 8: CRM, lifecycle & marketing operations *(est.)* 2 · Newsletters, blogs & niche publishing *(low cov.)* 2 · Quantitative finance *(est.)* 2 · Private equity, venture & principal investing *(low cov.)* 4 · Modelling 6 · Content, copy & social media 7 · Writing & authorship 7 · GIS & geospatial analysis 10

#### Teach (Teacher)

Top 8: Learning & development 96 · Organisational & work psychology *(est.)* 93 · Vocational & specialist instruction *(est.)* 92 · Academic research & university teaching 90 · Tutoring & language teaching 87 · School teaching 86 · Early childhood education 86 · In-house legal *(low cov.)* 84

Bottom 8: Modelling 0 · Comedy *(low cov.)* 2 · Acting 5 · Variety & live entertainment 5 · Newsletters, blogs & niche publishing *(low cov.)* 6 · Product & UX/UI design *(low cov.)* 11 · Real estate brokerage 12 · Writing & authorship 12

#### Create (Storyteller)

Top 8: Newsletters, blogs & niche publishing *(low cov.)* 98 · Animation, VFX & 3D 98 · Tattoo & body art *(est.)* 98 · Comedy *(low cov.)* 97 · Content creation *(est.)* 97 · Hosting & broadcasting *(low cov.)* 97 · Journalism 96 · PR & communications 95

Bottom 8: Tax advisory *(low cov.)* 18 · Accounting & audit 21 · Pharmacy 22 · Food & seafood production 22 · Culinary 23 · Banking, lending & credit 23 · Store retail 27 · Wealth management & financial advice 28

#### Lead (Chief)

Top 8: Project & programme management 88 · PR & communications 87 · Organisational & work psychology *(est.)* 86 · Operations & process improvement 86 · In-house legal *(low cov.)* 82 · Agency & studio ownership *(est.)* 82 · Politics & elected office *(est.)* 82 · Supply chain & planning 81

Bottom 8: Modelling 1 · Comedy *(low cov.)* 5 · Variety & live entertainment 8 · Acting 13 · Newsletters, blogs & niche publishing *(low cov.)* 17 · Writing & authorship 17 · Ceramics, glass & instrument making 18 · Translation & interpreting 23

#### Protect (Guardian)

Top 8: HSE, quality & inspection 82 · Biomedical engineering 77 · Electrician 76 · Aviation 74 · Diagnostics & medical technology 72 · Corrections 72 · Chemical & process engineering 72 · Process plant operation 71

Bottom 8: Creator services *(low cov.)* 1 · Modelling 1 · Comedy *(low cov.)* 3 · Dance 5 · Variety & live entertainment 5 · Newsletters, blogs & niche publishing *(low cov.)* 6 · Writing & authorship 9 · Music performance 9

#### Autonomy

Top 8: Startup founding *(est.)* 98 · Intellectual property *(low cov.)* 93 · Courses, digital products & communities *(est.)* 89 · Agency & studio ownership *(est.)* 89 · Real estate brokerage 86 · Medicine (doctors) *(low cov.)* 86 · Independent consulting & interim leadership *(est.)* 86 · Brand marketing 85

Bottom 8: Modelling 10 · Variety & live entertainment 15 · Comedy *(low cov.)* 19 · Pharmacy 21 · Acting 25 · Food & seafood production 26 · Textile, print & packaging production 26 · Furniture & woodcraft 26

#### Social contact

Top 8: Field & territory sales 90 · B2B sales 88 · Events & experiential 86 · Store retail 84 · Dentistry 81 · Pharmacy 80 · Medicine (doctors) *(low cov.)* 79 · Nursing & midwifery 78

Bottom 8: Newsletters, blogs & niche publishing *(low cov.)* 7 · CRM, lifecycle & marketing operations *(est.)* 12 · Furniture & woodcraft 15 · Writing & authorship 16 · Quantitative finance *(est.)* 19 · Content, copy & social media 19 · Data analysis & business intelligence 19 · Ceramics, glass & instrument making 20

#### Pace and time pressure

Top 8: Hosting & broadcasting *(low cov.)* 96 · Newsletters, blogs & niche publishing *(low cov.)* 94 · PR & communications 92 · Advertising & creative agencies 87 · Events & experiential 86 · Animation, VFX & 3D 86 · Content creation *(est.)* 84 · Supply chain & planning 84

Bottom 8: Modelling 0 · Field & territory sales 12 · Hair, beauty & cosmetics 14 · Data engineering & databases 20 · Outdoor guiding & instruction 22 · Sports business 23 · Small business ownership 23 · Fitness & wellness coaching 23

#### Conflict and friction

Top 8: Corrections 96 · Pharmacy 94 · Private security 85 · B2B sales 82 · Account management & customer success 82 · Social work & welfare 81 · Nursing & midwifery 81 · Intellectual property *(low cov.)* 81

Bottom 8: Modelling 1 · Newsletters, blogs & niche publishing *(low cov.)* 5 · CRM, lifecycle & marketing operations *(est.)* 9 · Tattoo & body art *(est.)* 13 · Writing & authorship 13 · Ceramics, glass & instrument making 15 · Animation, VFX & 3D 16 · Fine art & illustration 16

#### Competition

Top 8: Content creation *(est.)* 100 · Comedy *(low cov.)* 100 · Politics & elected office *(est.)* 100 · Private equity, venture & principal investing *(low cov.)* 100 · Dance 99 · Professional strategy games *(est.)* 98 · Esports *(est.)* 98 · Newsletters, blogs & niche publishing *(low cov.)* 97

Bottom 8: Modelling 1 · Religious & spiritual work 6 · Childcare 16 · Outdoor guiding & instruction 16 · Early childhood education 20 · Restaurant, bar & café service 21 · Social work & welfare 22 · Facilities, cleaning & property services 23

#### Precision and consequence of error

Top 8: Pharmacy 90 · Medicine (doctors) *(low cov.)* 86 · Diagnostics & medical technology 85 · Nursing & midwifery 81 · Dentistry 78 · Biomedical engineering 76 · Investment banking & M&A advisory 75 · Veterinary medicine 75

Bottom 8: Learning & development 6 · Comedy *(low cov.)* 7 · Modelling 7 · Tutoring & language teaching 12 · Retail buying & merchandising 12 · B2B sales 15 · Dance 17 · Religious & spiritual work 18

#### Variety vs. routine

Top 8: Comedy *(low cov.)* 96 · PR & communications 93 · Tattoo & body art *(est.)* 88 · Tutoring & language teaching 86 · Interior design 84 · Acting 83 · Creator services *(low cov.)* 83 · Animation, VFX & 3D 83

Bottom 8: Tax advisory *(low cov.)* 13 · Pharmacy 17 · Accounting & audit 20 · Banking, lending & credit 20 · Wealth management & financial advice 26 · Administration & office support 27 · FP&A, controlling & corporate finance 28 · Paralegal & legal support 29

#### Income variance

Top 8: Game development 95 · Trading & markets 95 · Politics & elected office *(est.)* 95 · Writing & authorship 95 · Film & TV production 95 · Fine art & illustration 95 · Fashion & styling 95 · Music production & industry 95

Bottom 8: Veterinary medicine 10 · Pharmacy 10 · Dentistry 10 · Nursing & midwifery 10 · Medicine (doctors) *(low cov.)* 10 · Fisheries & aquaculture 10 · Power grid & utilities 10 · Offshore & oil and gas 10

#### Cognitive challenge

Top 8: Medicine (doctors) *(low cov.)* 91 · Organisational & work psychology *(est.)* 89 · Private equity, venture & principal investing *(low cov.)* 89 · Quantitative finance *(est.)* 88 · Diplomacy & international organisations 82 · Payments, fintech & crypto operations *(est.)* 82 · Intellectual property *(low cov.)* 81 · Data science & statistics 81

Bottom 8: Modelling 7 · Masonry, concrete & tiling 18 · Facilities, cleaning & property services 19 · Textiles, leather & upholstery 20 · Comedy *(low cov.)* 21 · Variety & live entertainment 22 · Furniture & woodcraft 22 · Textile, print & packaging production 22

#### Element checks named in the brief (raw O*NET elements)

#### Element check: Freedom to Make Decisions (Work Context)

Top 8: Startup founding *(est.)* 100 · Real estate brokerage 95 · Courses, digital products & communities *(est.)* 93 · Medicine (doctors) *(low cov.)* 91 · Agency & studio ownership *(est.)* 91 · Intellectual property *(low cov.)* 91 · Property investment & development 87 · Complementary therapies 84

Bottom 8: Comedy *(low cov.)* 8 · Variety & live entertainment 9 · Pharmacy 18 · Modelling 19 · Acting 23 · Culinary 24 · Architecture 25 · Furniture & woodcraft 26

#### Element check: Time Pressure (Work Context)

Top 8: Hosting & broadcasting *(low cov.)* 96 · Newsletters, blogs & niche publishing *(low cov.)* 94 · PR & communications 92 · Advertising & creative agencies 87 · Events & experiential 86 · Animation, VFX & 3D 86 · Content creation *(est.)* 84 · Supply chain & planning 84

Bottom 8: Modelling 0 · Field & territory sales 12 · Hair, beauty & cosmetics 14 · Data engineering & databases 20 · Outdoor guiding & instruction 22 · Sports business 23 · Small business ownership 23 · Fitness & wellness coaching 23

#### Element check: Assisting and Caring for Others (Work Activity, Importance)

Top 8: Nursing & midwifery 95 · Medicine (doctors) *(low cov.)* 94 · Complementary therapies 92 · Dentistry 91 · Elder & disability care 91 · Diagnostics & medical technology 91 · Mental health & psychology 91 · Rehabilitation & allied health 91

Bottom 8: CRM, lifecycle & marketing operations *(est.)* 2 · Newsletters, blogs & niche publishing *(low cov.)* 2 · Quantitative finance *(est.)* 2 · Private equity, venture & principal investing *(low cov.)* 4 · Modelling 6 · Content, copy & social media 7 · Writing & authorship 7 · GIS & geospatial analysis 10
<!-- LISTS:END -->

### Face-validity checks named in the brief

| Check | Result | Evidence |
|---|---|---|
| Freedom to Make Decisions high for **founders** | **Pass** | Startup founding is #1 (100, est.). It is about 88 without its +15 adjustment. Agency ownership #5, small business #19. |
| … high for **consultants** | **Partial** | Independent consulting is #10 (84, est.), but its unadjusted value would be 69. Management consulting is #103 (54): O\*NET's Management Analysts rate 4.14 (51st percentile), because employed consultants work inside client engagements. I didn't adjust it to pass. |
| … low for **assembly** | **Pass, not extreme** | Machine operation & assembly #184 of 205 (34); food production #194, textile & print production #195. The bottom 8 are performers (comedy, variety, acting, modelling), whose O\*NET ratings reflect working to a director, plus pharmacy and architecture (see below). |
| Time Pressure high for **emergency** work and **air-traffic** control | **Fail: O\*NET's own ratings** | O\*NET's element asks "how often does this job require the worker to meet strict deadlines?". Firefighters rate 3.35 (15th percentile), Air Traffic Controllers 3.41 (18th), Paramedics 3.52 (25th) and Emergency Medicine Physicians 4.20 (76th), against Broadcast Announcers 4.85 (99th). So fire & rescue is #156 (41), police #101, aviation #62 and medicine #33. Urgency in emergency work isn't deadline pressure; this is a construct mismatch, not a linking error. See Q4. |
| Assisting and Caring high for **nursing** and **childcare** | **Pass** | Nursing #1 (95), childcare #11 (88), early childhood education #13 (86). The cut-off for the top 8 is 90. Ranked above childcare are medicine, therapies, dentistry, elder care, diagnostics, mental health, allied health, faith work (90) and funeral services (90: Embalmers rate 4.55 on caring). |

### Anomalies and why they happened

Two rounds of review traced every surprising extreme to its occupations with `taxonomy/build/inspect_lane.py`:
1. Five investigators, one per group of dimensions.
2. Five skeptics, who re-ran the evidence and tried to refute each cause.

Below, only causes that survived the skeptics, or that the skeptics corrected, are listed. Four were fixed by estimates (above); the rest are explained and left as they are.

**O\*NET's own ratings (genuine; not changed)**
- **Modelling** is at or near the bottom of most lists: one occupation, Models (41-9012), rated low on almost every activity (Time Pressure 1.67, selling 1.82). A careers expert would accept the direction; the extremes come from a single occupation.
- **Pharmacy** has high conflict (#2, 94) and low variety (#204): pharmacists, technicians and aides all rate high on dealing with unpleasant people and on repetition.
  - Its low **Freedom to Make Decisions** (#203) is partly the crosswalk: pharmacist ESCO occupations put 64% of their weight on Pharmacy Technicians and Aides.
- **Architecture** has low Freedom to Make Decisions (#199): O\*NET's Architects rate at the 16th percentile. The landscape-architect links to grounds-maintenance codes push it lower still.
- **Hosting & broadcasting, newsletters, and PR top Time Pressure:** broadcasters and editors work to hard deadlines (Broadcast Announcers 4.85).
- **Journalism** is high on Organise; **PR** is high on Lead, from the PR Managers link; **B2B sales** and **account management** are high on Conflict. All are genuine ratings.
- **Funeral services and faith work** rank above childcare on Caring (above).
- **Accounting & audit** is only mid on Precision (#73): Consequence of Error is moderate for Accountants.

**Lane's ESCO assignment (`esco_mapping.csv`; taxonomy data, not edited; see Q1)**
- **In-house legal** is high on Organise (#2) and Teach (#8). Its only link is Compliance Managers, because no in-house-lawyer ESCO occupation is assigned to it.
- **Biomedical engineering** is in Build's top 8 because medical-device assembler, surgical-instrument maker and orthopaedic-footwear technician are assigned to it.
- **Aviation** is only #16 on Precision, although Air Traffic Controllers and Airline Pilots would rank first. Road operations managers, road maintenance technicians and cabin and airport hospitality roles dilute it.
- **Field & territory sales** is near the bottom on Time Pressure (#204). Its two rated links are services and technical sales reps (3.27 and 3.22), and general commercial sales reps aren't assigned.
- **Fitness** includes lifeguards and locker-room attendants; **outdoor guiding** includes a carriage driver; **culinary** includes kitchen porters and food-service crew; **tutoring** includes performing-arts instructors; **software engineering** includes a software seller; **retail buying** includes visual merchandisers; **social work** includes social-security administrators.
- **Professional strategy games** had only casino staff assigned. Its profile is now estimated, but the assignment itself is still wrong.

**The official crosswalk (links that misrepresent the occupation)**
- **Investment banking** is #7 on Precision and low on Variety: "M&A analyst" crosswalks only to Title Examiners and "securities underwriter" only to Brokerage Clerks.
- **Content, copy & social** is low on Social contact: "online community manager" crosswalks to non-social codes.
- **Recruiting** is mid on Influence: employment agents link to Rehabilitation Counselors.
- **Legal practice** is mid on Challenge: notary and similar crosswalk to clerical codes.
- **Military** is mid on Lead: officer ranks are unlinked (above) and the remaining links are non-command codes.
- **Tax advisory** is last on Variety, **wealth advice** low on Variety (personal trust officer → a clerk code), and **inspection** only #14 on Protect.
- **Management consulting, partnerships and tattoo** were fixed by estimates.

**Thin coverage (one or two occupations dominate; flagged *low cov.*)**
- **Intellectual property** is high on Influence, Autonomy and Conflict. It is O\*NET's Lawyers alone, because the patent-engineer link (Engineers, All Other) is unrated.
- **Newsletters/blogs:** one editorial occupation.
- **Comedy** is top on Variety and Competition and bottom on Organise and Lead: Actors only.
- **Private equity** is top on Analyse and Competition: Investment Fund Managers is its only rated link. The direction is right; the exact ranks are fragile.

**The model (Phase 2 candidates; not changed in Phase 1)**
- **Protect** measures quality and safety checking (monitoring, compliance, inspection). Police, security and armed forces are therefore mid (#50 and below). It needs either a people-safety element or a narrower description.
- **Social contact** is mid for school teaching and childcare (58): its elements are contact, teamwork and dealing with the public. Contact with pupils is not counted as "the public".
- **Variety** rests on one repetition element, so assembly is only #182.
- **Organise** is built from planning and prioritising activities, so administration is mid (#124) and partnerships was first before the fix.
- **Analyse** weights Getting Information heavily, so physical sciences is only #51 while marketing estimates rank higher.
- **Income variance** comes from Lane's payoff curve, so it has only five distinct values and the top and bottom 8 are ties. Some payoff labels look wrong: fisheries is "linear, high floor", private capital "steep". These are taxonomy data (Q1).

**Estimates driving an extreme (by design; flagged *est.*)**
- **CRM & lifecycle marketing** is #3 on Analyse, above data science. Its main analog is Market Research Analysts, which rates very high on getting information.
- **Startup founding** is only #30 on Lead and #38 on Influence: its Software Developer analog dilutes it.
- **Content creation** tops Competition through its +10 adjustment.
- **Payments & fintech** is #6 on Challenge.

## 3. Person-side Work Design profile

**Your account, LN-20261023-H2C: not computed.** It lives in the hosted (Neon) database, which this environment can't reach; the local database has only test accounts. To produce it, run this read-only command (it writes nothing):

```
DATABASE_URL=<Neon URL> npx tsx --conditions=react-server scripts/workdesign-profile.mts LN-20261023-H2C --force
```

**A complete dev test account, to show the output** (`workdesign_profile_dev_example.txt`). This is the e2e persona: a script answers its questionnaires and rapid-guesses its reasoning items, so reasoning is "not measured". It is not a real person.

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
  Income variance                        5 ± 7.1 (90%: 0–16)  coverage 100%
  Cognitive challenge                  not measured  coverage 0%

Inseparable by design (shared inputs): influence + lead, organise + protect, care + teach
```

How to read it:
- **Influence and Lead** pass the reliability rule as strengths, and **Build** as a weakness. The other six modes can't be told apart.
- Influence and Lead share most of their inputs, so for this person they say the same thing twice. Phase 2 must not count them as two findings.
- **Personality and interests are anchored at the scale midpoint (50)**, with planning SDs, because no usable norms are transcribed (`PSYCHOMETRICS` is null). They are flagged provisional in data and docs.

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
- **Production: not touched.** `SCORING_VERSION` was deliberately not bumped, because that would re-score production sessions on the next load.

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
6. **Fixed by estimates, not by editing mappings:**
   - Four career paths whose crosswalk links describe another job: management consulting, partnerships, strategy games and tattoo.
   - Three career paths that rest on unrated codes: risk management, vocational instruction and politics.

   I didn't edit `esco_mapping.csv` or `taxonomy.json`. Those changes are yours to approve (Q1).
7. **Percentiles** are mid-rank, across all occupations that have the descriptor, in that release. Raw values are kept next to them.
8. **Coverage confidence** counts ESCO occupations, not O\*NET codes, so it understates career paths such as medicine, which has two ESCO occupations but many physician codes.
9. **Person side** (unchanged from the earlier pass):
   - midpoint anchoring and planning SDs for personality and interests, until norms are transcribed;
   - ipsative work values;
   - task-range anchoring for behaviour tasks;
   - dimension SEs that assume independent errors.
10. **Attribution:** the exact licence text is in `SOURCES.md` and `src/lib/workdesign/attribution.ts`. It isn't shown in the report or on the Career map yet, because neither shows O\*NET data until Phase 2/3. Showing it now would claim they do.

## 6. Open questions for you

1. **ESCO assignment fixes** (`esco_mapping.csv`, taxonomy data). Do you want me to apply the misassignments listed in §2?
   - casino staff out of strategy games;
   - road and hospitality roles out of aviation;
   - device assemblers out of biomedical engineering;
   - in-house-lawyer occupations into in-house legal;
   - general sales reps into field sales;
   - lifeguards and attendants out of fitness;
   - and the rest in §2.

   This also affects v1 matching and the job-title search, so it needs your approval. The comma-truncated labels should be repaired at the same time.
2. **Crosswalk overrides.** Some official links misrepresent the occupation:
   - M&A analyst → Title Examiners;
   - securities underwriter → Brokerage Clerks;
   - pharmacist → Pharmacy Aides;
   - employment agent → Rehabilitation Counselors.

   Should I add a small, documented override file (`reference/crosswalks/lane_link_overrides.csv`, each row with a rationale and shown as route "override")? Or should I keep the official crosswalk untouched and rely on estimates?
3. **Taxonomy payoff labels** for income variance: fisheries "linear, high floor", private capital "steep", game development. Should they be reviewed?
4. **Pace and time pressure.** O\*NET's Time Pressure is deadline frequency, so emergency work rates low. For Phase 2, the options are:
   - (a) rename the dimension "Deadline pressure" and keep the element;
   - (b) blend in urgency-related Work Context, such as Consequence of Error, Frequency of Decision Making and Impact of Decisions, so emergency work rises;
   - (c) keep it as it is.
5. **Model tweaks for Phase 2** (§2, "The model"): Protect's people-safety gap, Social contact for teaching, Variety for assembly, Organise for administration, and the Analyse weights. Should these be fixed in Phase 2 or left for calibration?
6. **Your account's profile:** run the read-only command in §3, or give this session a read-only `DATABASE_URL`.
7. **Production Corsi migration:** run the dry run, check the count, then `--apply`.
8. **Norms:** transcribing Johnson (2014) IPIP-NEO-120 norms and the Interest Profiler norms would move personality and interests from "anchored" to "normed". Should I do this in Phase 2?
