# Sources for the career-side O\*NET profiles

Every downloaded source goes in this folder (`taxonomy/reference/onet/`) or `taxonomy/reference/crosswalks/`, unedited. Each one is recorded below with its version and download date. Derived data is written only by `taxonomy/build/build_onet_profiles.py` into `taxonomy/derived/`.

## Status (2026-10-27): not downloaded

The build environment's network policy refused connections to `www.onetcenter.org`, `esco.ec.europa.eu` and `www.bls.gov` (HTTP 403 from the egress proxy). Nothing below has been downloaded yet, and no O\*NET or crosswalk data is in the repository. Nothing has been substituted or estimated in its place.

| Source | Where | Version | Downloaded | File(s) here |
|---|---|---|---|---|
| O\*NET database, text format: Occupation Data, Interests, Work Values, Work Activities, Work Context, Abilities, Work Styles, Job Zones, plus any bundled crosswalks | onetcenter.org → Database → Download (text files) | latest release, to record | not yet | `db_<release>_text/` |
| ESCO–O\*NET crosswalk (European Commission) | ESCO portal → Use ESCO → crosswalk with O\*NET | to record | not yet | `../crosswalks/esco_onet_crosswalk.csv` |
| ESCO occupations, official CSV (with ISCO-08 per occupation, for the fallback) | ESCO portal → Download → occupations_en.csv, matching the ESCO version of the crosswalk | to record | not yet | `../crosswalks/esco_occupations_en.csv` |
| ISCO-08 → SOC crosswalk | BLS → SOC → crosswalks (ISCO-08 to SOC) | to record | not yet | `../crosswalks/isco08_soc.csv` |
| SOC 2010 → SOC 2018, if the ISCO crosswalk is on SOC 2010 | BLS → SOC 2018 crosswalks | to record | not yet | `../crosswalks/soc2010_soc2018.csv` |

## Licence and attribution

The O\*NET database is licensed under **CC BY 4.0**. The attribution must reproduce the exact text required on onetcenter.org/license_db.html, for the release used, and state that Lane modified the data.

**Draft, to be checked word for word against that page before publishing:**

> This page includes information from the O\*NET [release] Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O\*NET® is a trademark of USDOL/ETA. Lane has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.

Once verified, the text goes:
- here;
- in the report's Method and limits chapter;
- in the Career map footer.

The O\*NET database isn't shown anywhere in the app until Phase 2/3 uses it. The existing O\*NET Tools attribution (Interest Profiler and Work Importance Locator items) is separate and stays as it is.

The ESCO classification is reused under the European Commission's reuse policy (Decision 2011/833/EU). BLS crosswalks are U.S. government works.

## How to build once the files are here

```
npx tsx scripts/export-workdesign-elements.mts           # element names the model reads
python3 -I taxonomy/build/build_onet_profiles.py \
  --onet taxonomy/reference/onet/db_<release>_text --release <release> \
  --esco-crosswalk taxonomy/reference/crosswalks/esco_onet_crosswalk.csv \
  --esco-occupations taxonomy/reference/crosswalks/esco_occupations_en.csv \
  --isco-soc taxonomy/reference/crosswalks/isco08_soc.csv
```

The build fails, rather than guessing, when any of these is missing from the release:
- an expected column;
- a Work Design element name;
- an analog O\*NET-SOC code.
