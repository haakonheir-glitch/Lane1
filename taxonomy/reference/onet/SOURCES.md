# Sources for the career-side O\*NET profiles

Every downloaded source goes in this folder (`taxonomy/reference/onet/`) or `taxonomy/reference/crosswalks/`, unedited. Each one is recorded below with its version and download date. Derived data is written only by scripts in `taxonomy/build/` into `taxonomy/derived/`.

## Downloaded sources

All downloaded on 2026-10-27.

| Source | From | Version | File here | SHA-256 |
|---|---|---|---|---|
| O\*NET database, text format (all files) | onetcenter.org/database.html | **O\*NET 31.0, August 2026** (the latest release) | `db_31_0_text.zip` | `6883548adf5fde64cf6f801b35d15519c9225f2732c3cab0e281c652d16b23a9` |
| O\*NET database, text format, for Work Values only | onetcenter.org/db_releases.html | **O\*NET 30.2, February 2026** | `db_30_2_text.zip` | `b5479271931796b838f7173dc0f673a9ec961b7833ac87168fd11e92e7453741` |
| ESCO → O\*NET-SOC crosswalk (built with the European Commission, hosted by O\*NET) | onetcenter.org/crosswalks/esco/ESCO_to_ONET-SOC.xlsx | O\*NET-SOC 2019; ESCO codes as in ESCO v1.1/v1.2.0 | `../crosswalks/ESCO_to_ONET-SOC.xlsx` | `bf6c854f7ffc935eba67a296d6d7fa4d40b70fb26bcdb5ecb5621374bca6f35b` |
| O\*NET-SOC 2019 → SOC 2018 crosswalk | onetcenter.org/taxonomy/2019/soc.html | O\*NET-SOC 2019 | `../crosswalks/2019_to_SOC_Crosswalk.xlsx` | `bfc6722a92c2d607e5a99dee88b7826cf5aa91f7c0453182e0c8268e32a20a19` |
| ESCO occupation code and label for each URI in `taxonomy/esco_mapping.csv` | ESCO API, `ec.europa.eu/esco/api/resource/occupation`, fetched by `taxonomy/build/fetch_esco_codes.py` | `v1.2.0` (the crosswalk's codes) and the latest ESCO version | `../crosswalks/esco_uri_codes.json` | written by the script; the fetch date is inside |

The extracted `db_*_text/` folders are gitignored. `build_onet_profiles.py` extracts the files it needs from the zips.

### Why two O\*NET releases

O\*NET 31.0 dropped two files:

- **Work Values.txt.** No replacement in 31.0, so Work Values (EX scale) come from 30.2, the last release that has them. The 30.2 and 31.0 occupation lists were checked against each other in the build.
- **Interests.txt.** Interests come from 31.0's `Career Interest Types.txt` (OI scale, the same RIASEC elements).

31.0 also **revised Work Styles**. The old 16 styles on an Importance scale are replaced by 21 styles on the WI scale ("Work Styles Impact", −3 to +3), plus a DR (distinctiveness rank) scale. `taxonomy/derived/REPORT.md` lists the 21 names.

### What was tried and not used

These were not used, and nothing was substituted for them silently:

- **ESCO portal downloads** (`esco.ec.europa.eu`) and the **BLS ISCO-08 → SOC crosswalk** (`bls.gov`). Both sites refused automated downloads (HTTP 403 from the sites themselves).
  - Instead of the ESCO bulk CSV, the build uses the official ESCO API on `ec.europa.eu`.
  - Instead of the BLS crosswalk, the ISCO fallback uses the ISCO-08 unit-group rows of the O\*NET-hosted ESCO crosswalk (913 rows; same file).

## Lane's own corrections (not downloaded sources)

- `taxonomy/reference/crosswalks/lane_link_overrides.csv`: 27 ESCO occupations whose official crosswalk links misrepresent the job, each with replacement O\*NET codes (rated in 31.0) and a rationale. They show as route "override" in the profiles.
- `taxonomy/reference/esco_overrides.csv`: manual career-path assignments for `taxonomy/build/map_esco.py`. The 2026-10-27 review added or edited 46 lines (41 moves, 5 role fixes).
- `taxonomy/reference/onet/estimated_profiles.csv`: the 18 estimated profiles.

## Licence and attribution

The O\*NET database is licensed under **CC BY 4.0**. The text below is taken word for word from onetcenter.org/license_db.html (checked 2026-10-27), in the form for "If you make edits or additions to O\*NET information". Lane fills in the release numbers and its own name.

> This page includes information from the O\*NET 31.0 Database and the O\*NET 30.2 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O\*NET® is a trademark of USDOL/ETA. Lane has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.

The licence page's other requirements:

- **Name the version.** Say "O\*NET 31.0 Database", not "O\*NET Database".
- **Link to the licence:** https://creativecommons.org/licenses/by/4.0/
- **Show what changed.** The page recommends linking to a file that lists all changes. Lane's changes are:
  - weighted means over several O\*NET occupations per career path;
  - conversion to percentiles;
  - estimated profiles built from analog occupations, with adjustments.

  They are all documented in `taxonomy/build/build_onet_profiles.py`, `taxonomy/reference/onet/estimated_profiles.csv` and `docs/WORK_DESIGN.md`.
- **Trademark use.** Use "O\*NET" as an adjective with the ® symbol ("includes information from the O\*NET database").

In code, the text is `ONET_DB_ATTRIBUTION` in `src/lib/workdesign/attribution.ts`. It goes in:

- this file;
- the report's Method and limits chapter, and its "Where this work exists" chapter;
- the Career map footer (the map, the career path detail and its typical day use O\*NET data);
- the public method page (`/method`).

It is rendered by `src/components/report/OnetDbAttribution.tsx`, with a line on what Lane changed.

The existing O\*NET *Tools* attribution, for the Interest Profiler and Work Importance Locator items, is a separate licence and stays as it is.

The ESCO classification is reused under the European Commission's reuse policy (Decision 2011/833/EU).

## How to rebuild

```
npx tsx scripts/export-workdesign-elements.mts       # element names the model reads
python3 -I taxonomy/build/fetch_esco_codes.py        # only when esco_mapping.csv changes; resumable
python3 -I taxonomy/build/build_onet_profiles.py     # -> taxonomy/derived/lane_onet_profiles.json
npx tsx scripts/workdesign-careers.mts               # -> taxonomy/derived/workdesign_careers.{json,md}
python3 -I taxonomy/build/test_build_onet_profiles.py
```

`taxonomy/build/onet_config.json` sets the releases, files, link weights and the confidence rule.

The build fails, rather than guessing, if any of these is missing from the release:

- an expected column;
- a Work Design element name;
- an analog O\*NET-SOC code;
- an adjustment's target element.
