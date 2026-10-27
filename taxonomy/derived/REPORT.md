# Phase 1 report: data foundation

Status, 2026-10-27: **partly blocked.**

**Blocked:** the O\*NET database, the ESCO–O\*NET crosswalk and the BLS crosswalks couldn't be downloaded. The network policy of this build environment refused `www.onetcenter.org`, `esco.ec.europa.eu` and `www.bls.gov` (HTTP 403). These parts depend on that data and are not done:

- coverage tables (1.3, 1.4);
- top/bottom career paths per dimension;
- face-validity checks;
- the Work Styles content model.

Nothing has been substituted, estimated or mocked in their place.

**Done:**
- the Corsi fix and its dev migration;
- `VISION.md`;
- the Work Design model (both sides defined);
- person-side scoring with standard errors;
- shadow mode for the research scales;
- the build script, with tests;
- the estimated-profile choices.

## 1. Coverage (1.3, 1.4): blocked

`taxonomy/build/build_onet_profiles.py` writes these into `lane_onet_profiles.json` under `coverage`, once the sources are in place (`taxonomy/reference/onet/SOURCES.md` lists them):
- ESCO occupations linked by route (crosswalk exact, close, narrow or broad; ISCO→SOC fallback; unlinked);
- ESCO URIs in our mapping that are missing from the crosswalk, and crosswalk URIs missing from our mapping (version mismatches);
- O\*NET codes that don't exist in the release;
- career paths by provenance (O\*NET, estimated, unlinked);
- per career path, the linked occupations with weights and routes, and a coverage-confidence score.

What is known from Lane's own data:
- 3,039 ESCO occupations are mapped to the 205 career paths;
- **10 career paths have no ESCO occupation**, so they can't be linked by any route: CRM and lifecycle marketing, Product marketing, Quantitative finance, Payments and fintech, Independent consulting, Organisational psychology, Esports, Courses and digital products, Startup founding, Agency ownership;
- 26 more have only 1–2 ESCO occupations, so their coverage confidence will be low.

The 10, plus Content creation (forced: its single ESCO occupation can't represent it), have estimated profiles defined in `taxonomy/reference/onet/estimated_profiles.csv`. Each lists its analog O\*NET occupations with weights, explicit adjustments and a rationale.

## 2. Top and bottom career paths per dimension: blocked

These need the career-side profiles. The face-validity checks to run once they're built:
- Freedom to Make Decisions high for founders and consultants, low for assembly work;
- Time Pressure high for emergency services and air-traffic control;
- Care high for nursing and childcare;
- Build high for trades;
- Protect high for inspection and compliance.

## 3. Person-side Work Design profile

**Your account, LN-20261023-H2C:** not computed. Your account lives in the hosted (Neon) database, which this environment has no access to; the local database has 46 accounts, all test accounts. To produce it, run this read-only command (it writes nothing):

```
DATABASE_URL=<Neon URL> npx tsx --conditions=react-server scripts/workdesign-profile.mts LN-20261023-H2C --force
```

**A complete dev test account**, to show the output (`workdesign_profile_dev_example.txt`). This is the e2e test persona: it answers questionnaires with a script and rapid-guesses the reasoning items, so its reasoning is "not measured". It is not a real person.

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
- **Influence and Lead** pass the reliability rule as strengths and **Build** as a weakness; the other six modes can't be told apart.
- Influence and Lead share most of their inputs, so for this person they say the same thing twice. Phase 2 must not count them as two separate findings.

## 4. Corsi fix (1.1)

What changed:
- **Board size:** `CORSI_PROTOCOL.maxLength` is 9, the number of blocks. Digit span keeps its own `SPAN_PROTOCOL` maximum of 10.
- **Generator:** `generateCorsi` throws a `RangeError` for a length below 1 or above 9.
- **Task flow:** it uses the Corsi protocol, so after passing length 9 the task ends.
- **Scoring:** the span is capped at 9 when scoring (`scoreSpan(history, max)`) and again when reading stored scores, so a stored 10 is shown as 9 before any migration.
- **Tests:** a new test covers the throw, the stop at 9 and the cap.
- **Percentiles:** displayed upper bounds were already capped at 99 (previous pass).

Migration, `scripts/migrate-corsi-span.mts`: a dry run by default; it writes only with `--apply`.

**Dev, dry run:**
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

All 8 are e2e test accounts, whose scripted persona answers every span trial correctly, so each one reached the "length 10" trial.

**Dev, applied, then checked:** 8 rows updated; a rerun reports 0 above 9 (`corsi_migration_dev_after.txt`). Raw trials are kept as recorded; scoring caps them.

**Production:** not touched. I deliberately did **not** bump `SCORING_VERSION`, because that would make the app re-score production sessions on the next load. Run the dry run against production when you're ready, then decide on `--apply`:

```
DATABASE_URL=<Neon URL> npx tsx --conditions=react-server scripts/migrate-corsi-span.mts --force
```

## 5. Judgment calls

1. **Person-side scale.** No IPIP-NEO-120 or Interest Profiler norms are transcribed: the sources couldn't be fetched here, and numbers are never invented.
   - Interests and personality are anchored with the scale midpoint at 50.
   - SE = planning SD × √(1 − r): SD 15 points for personality and 20 for interests; r .75 or .70 (BLUEPRINT planning values).
   - Johnson (2014) is public domain and the obvious source; transcribing it switches these inputs to `normed` automatically.
2. **Work values** are ipsative (a forced sort), placed on 0–100 within the person.
3. **Behaviour tasks** are anchored to their own ranges (pumps / 64, AUC × 100, learning 0% = 50, with ±50% at the ends).
4. **Influence** uses the risk task at a low weight (.2) for the brief's "competition-related scores". The competitiveness items are experimental and can't be used.
5. **Dimension SEs** assume independent input errors (an approximation; noted in the docs).
6. **Link weights:** exact 1.0, close .7, narrow .5, broad .4, ISCO fallback .25, career-path-level ISCO fallback .15. Configurable in `onet_config.json`.
7. **Coverage confidence** = min(1, total link weight / 3) × share of weight from exact or close links.
8. **Estimated profiles** use analog O\*NET-SOC codes from the 2019 taxonomy, from my knowledge. The build fails if any code isn't in the downloaded release. Content creation is forced to estimated.
9. **Income variance** uses Lane's taxonomy payoff curve on 0–100: high-floor 10, linear 20, steep 55, convex 70, winner-take-all 95.
10. **Shadow mode:** the research scales stay in `SessionScores.hidden` (stored, never shown), and are logged next to the dimensions only with `SHADOW_LOG=1`.
11. **Corsi:** the migration rewrites only the stored span, not `correctTrials`, which counts trials, not length.

## 6. Open questions for you

1. **Network access:** allow these hosts in the environment's settings, then I run the build and finish sections 1–2:
   - `www.onetcenter.org`
   - `esco.ec.europa.eu`
   - `www.bls.gov`

   If downloads come from other hosts (some ESCO files are served from `ec.europa.eu`), those too.
2. **Your account's profile:** run the read-only command in section 3, or give this session a read-only `DATABASE_URL`.
3. **Production Corsi migration:** run the dry run, check the count, then `--apply`.
4. **O\*NET attribution:** the exact text must be copied from onetcenter.org/license_db.html. A draft is in `SOURCES.md`; it goes into the report and the Career map footer when O\*NET data first appears (Phase 2/3).
5. **ESCO version:** our ESCO copy (3,039 occupations) came from a bundled package without ISCO codes per occupation. The ISCO→SOC fallback needs the official ESCO occupations CSV, matching the crosswalk's ESCO version.
