# Lane Taxonomy v0.1

The complete map of the work Lane recommends: **34 families · 205 lanes · 1,883 roles**, each with seniority, work mode, entry route and sprint feasibility. It is checked against the official occupation classifications so nothing that people are paid to do is missing.

| File | What it is |
|---|---|
| `LANES_OVERVIEW.md` | Every family, lane and role in readable form. Start here. |
| `taxonomy.json` | The full machine-readable taxonomy for the app, plus vocabularies, ladders and tag-to-assessment links. |
| `roles.csv` / `lanes.csv` | Flat tables (open in Excel or Sheets). |
| `esco_mapping.csv` | All 3,039 official ESCO occupations mapped to a lane and nearest role. This is the long tail: any job title a user types can resolve to a lane. |
| `src/*.txt` | The editable source. One line per role. |
| `build/build.py` | Validates the source and regenerates the JSON and CSVs. |
| `build/map_esco.py` | Re-maps ESCO occupations to lanes (model + rules + manual review decisions). |
| `reference/` | ISCO-08 codes, ESCO occupations, mapping rules and 747 manual review decisions. |

## Structure

```
Family (34)        e.g. Sales & business development
└─ Lane (205)      e.g. B2B sales                     <- what the profile matches to
   └─ Role (1,883) e.g. SDR · BDR · AE (SMB, mid-market, enterprise) · Strategic account director ·
                       Founding AE · Sales manager · Head of sales · VP of sales · CRO ·
                       Commission-only sales agent · Fractional head of sales · Lead-gen agency owner
```

**Every role carries:**
- **level**: trainee, entry, mid, senior or lead on the individual-contributor track; manager, director or exec on the management track; or owner.
- **track**: derived from the level.
- **mode**: employed, public, freelance, owner, performer or gig.
- **aliases**: including Norwegian titles where they differ (e.g. *salgssjef*, *eiendomsmegler*, *fagbrev* roles).
- **tags**: what the role demands. A role inherits the lane's tags, plus or minus its own differences.

**Every lane carries:**
- **ISCO-08 codes**: the international standard, which Norway uses as STYRK-08.
- **RIASEC code**.
- **entry route**: open, short course, licence, apprenticeship (fagbrev), degree, advanced degree, or talent selection.
- **sprint feasibility**:
  - *direct*: you can do the real work in a 1-3 week sprint.
  - *simulated*: realistic practice tasks are possible.
  - *shadow*: only observation, for licensed or safety-critical work.
- **ladder template**: the seniority path for that kind of work. There are 12 templates, from the corporate IC/management tracks to the Norwegian trades track (lærling → fagbrev → mesterbrev → own firm), creator, performer/athlete, academic, medical (LIS1 → overlege) and public sector.

## How coverage was verified

1. **ISCO-08:** 435 of 436 unit groups are covered by at least one lane. The one exclusion is "traditional chiefs and heads of village", which doesn't apply in Norway.
2. **ESCO** (the EU's classification, 3,039 occupations): every occupation was mapped to a lane in four stages:
   - a text-similarity model that combines role titles, lane descriptions and the official ISCO group definitions;
   - 9 pattern rules;
   - a full manual review, which produced **747 corrections**;
   - a random audit of 150 automatic matches, which found 2 lane errors (about 98-99% accurate). Both were fixed.

   Matching an ESCO occupation to a specific role inside its lane is approximate. The lane-level assignment is what was reviewed.
3. **Gaps the official lists miss.** 10 lanes have **zero** ESCO occupations and two more families barely register:

   | Area | ESCO occupations mapped |
   |---|---|
   | Creator economy (4 lanes) | 3 |
   | Entrepreneurship (4 lanes) | 8 |
   | Startup founding, agency ownership, course creation, esports, quant finance, fintech, product marketing, lifecycle/CRM marketing, independent advisory, workplace psychology | 0 each |

   This is why Lane can't simply import an official list: the lanes a 19-25-year-old is most drawn to are the ones the classifications are blind to.

## Using it in the app: matching rules

These rules matter more than the size of the list.

1. **Match the profile at lane level, not role level.** The assessment can tell B2B sales from software engineering from content creation. It cannot tell an SDR from an AE from a Head of Sales: those differ by experience, skill and career stage, not by personality. Ranking 1,883 roles directly would be false precision.
2. **Within a lane, rank roles by their tags.** Each role's tags link to assessment constructs through `tag_to_constructs` in `taxonomy.json`. Within B2B sales:
   - SDR is tagged *hunting* and *routine*;
   - enterprise AE is tagged *negotiation* and *relationship*;
   - solutions engineer is tagged *technical* and *analytical*.

   The person's relative strengths on those constructs choose the role, and the reason can be shown ("SDR: your setback resilience is your strongest disposition").
3. **Treat seniority as a path, never a recommendation.** Show the entry point the user can reach today (trainee/entry, or their level if they report experience) and the ladder above it. Never recommend "Head of sales" to someone with no sales experience.
4. *(Removed 2026-10-27.)* Lane shows no income labels: the payoff curves, the "Fit × payoff" ordering and the `variable_pay` tag were taken out of the taxonomy and the product. See `design/REMOVED.md`.
5. **Use sprint feasibility to decide what to offer next.**
   - *direct* lanes get a real sprint;
   - *simulated* lanes get practice tasks;
   - *shadow* lanes (51, including medicine, aviation and the police) get interviews and shadowing instead of a sprint.
6. **Show bands, not ranks.** With 205 lanes, ranks 5 and 25 are often statistically the same. Group lanes into "strong fit / worth testing / unlikely" bands, using the reliability rule in the assessment blueprint.
7. **Resolve free text through ESCO.** When a user types a job title (current job, dream job, past roles), match it against role aliases first, then against ESCO labels in `esco_mapping.csv`, to find the lane.

## Deliberate exclusions (product decisions for you to confirm)

- **Illegal work.**
- **Sex work and adult content creation.** These are legal in parts of the world, but they are left out of recommendations. If you want them in, add a lane.
- **Gambling.** Only skill-based professional play (poker, sports betting as trading) and gambling-industry jobs are included.
- **Subsistence farming, fishing and gathering.** These are folded into the farming and fisheries lanes.

## Editing and rebuilding

```bash
# 1. Edit src/*.txt  (format documented at the top of build/build.py)
python3 build/build.py            # validates everything; fails loudly on bad codes, levels or tags
python3 build/map_esco.py         # re-maps ESCO; manual decisions in reference/esco_overrides.csv win
```

**Updating ESCO to the latest version:** download the official occupations CSV from the ESCO portal and run `python3 build/map_esco.py occupations_en.csv`. The official file includes each occupation's real ISCO code, which the mapper then uses directly. For Norwegian labels, download `occupations_nb.csv` too and join it on `conceptUri`.

## Sources and licences

- **ISCO-08** (ILO): unit group codes and definitions, taken from ESCO's ISCO hierarchy.
- **ESCO** (European Commission): occupation labels and descriptions. Free to reuse under the Commission's reuse policy (Decision 2011/833/EU). The copy used here comes from a public package that bundles ESCO data and contains 3,039 occupations; rerun against the official download before launch.
- **O\*NET**: no O\*NET content is included. To pull O\*NET interest and work-value profiles for each lane, go through the official ESCO–O\*NET crosswalk (published by the European Commission in 2022) using the ESCO URIs in `esco_mapping.csv`.
- **Lane taxonomy, roles, tags and ladders**: original work.
