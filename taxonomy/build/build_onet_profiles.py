#!/usr/bin/env python3
"""
Build taxonomy/derived/lane_onet_profiles.json: an O*NET profile for each of Lane's 205 career
paths, on one common scale (0-100 percentile across all O*NET occupations), with provenance.

Sources (unedited, recorded in taxonomy/reference/onet/SOURCES.md):
  taxonomy/reference/onet/db_31_0_text/        O*NET 31.0 (primary release), extracted
  taxonomy/reference/onet/db_30_2_text/        O*NET 30.2, for Work Values only (31.0 dropped them)
  taxonomy/reference/crosswalks/ESCO_to_ONET-SOC.xlsx   the ESCO-O*NET crosswalk, as hosted by O*NET
  taxonomy/reference/crosswalks/esco_uri_codes.json     each ESCO URI's code in the crosswalk's ESCO
                                                        version (fetch_esco_codes.py, ESCO API)
Lane inputs: taxonomy.json, esco_mapping.csv, reference/onet/estimated_profiles.csv,
             build/onet_config.json, derived/workdesign_elements.json.

Routes, best first:
  1. crosswalk: ESCO URI -> ESCO code (in the crosswalk's version) -> O*NET-SOC codes;
  2. fallback_isco: ESCO occupations the crosswalk doesn't list -> their ISCO-08 unit group (the
     first four digits of the code) -> the crosswalk's own ISCO-level rows;
  3. fallback_lane_isco: career paths with nothing linked -> the career path's ISCO codes;
  4. estimated: career paths with no ESCO occupation (or forced) -> named analog occupations
     with explicit adjustments (estimated_profiles.csv), marked "provenance": "estimated".
Fails loudly on a missing column, an unknown O*NET-SOC code or a Work Design element name the
release doesn't have, instead of guessing.

Usage: python3 -I taxonomy/build/build_onet_profiles.py
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference"

# ---------------------------------------------------------------- O*NET reading ----


def read_tsv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def need(row: dict, *cols: str) -> None:
    missing = [c for c in cols if c not in row]
    if missing:
        raise SystemExit(f"Missing column(s) {missing}; found {list(row)}")


def load_long(path: Path, scales: set[str] | None = None) -> dict[tuple[str, str, str], float]:
    """(O*NET-SOC code, element name, scale id) -> data value. 'Not Relevant'=Y levels count as 0."""
    rows = read_tsv(path)
    if not rows:
        return {}
    need(rows[0], "O*NET-SOC Code", "Element Name", "Scale ID", "Data Value")
    out: dict[tuple[str, str, str], float] = {}
    for r in rows:
        scale = r["Scale ID"]
        if scales and scale not in scales:
            continue
        if r.get("Category") not in (None, "", "n/a"):
            continue  # Work Context category percentages (CXP): the CX mean is used instead
        try:
            v = float(r["Data Value"])
        except ValueError:
            continue
        if r.get("Not Relevant") == "Y":
            v = 0.0
        out[(r["O*NET-SOC Code"], r["Element Name"], scale)] = v
    return out


def load_job_zones(path: Path) -> dict[tuple[str, str, str], float]:
    rows = read_tsv(path)
    need(rows[0], "O*NET-SOC Code", "Job Zone")
    return {(r["O*NET-SOC Code"], "Job Zone", "JZ"): float(r["Job Zone"]) for r in rows if r["Job Zone"].strip()}


def percentiles(values: dict[str, float]) -> dict[str, float]:
    """Mid-rank percentile (0-100) of each occupation's value among all occupations that have it."""
    items = sorted(values.items(), key=lambda kv: kv[1])
    n = len(items)
    out: dict[str, float] = {}
    i = 0
    while i < n:
        j = i
        while j + 1 < n and items[j + 1][1] == items[i][1]:
            j += 1
        p = 100.0 * ((i + j) / 2 + 0.5) / n
        for k in range(i, j + 1):
            out[items[k][0]] = p
        i = j + 1
    return out


# Descriptor files: name in the output -> (config key, scales kept)
DESCRIPTORS = {
    "Interests": ("interests", {"OI"}),
    "Work Values": ("work_values", {"EX"}),
    "Work Activities": ("work_activities", {"IM", "LV"}),
    "Work Context": ("work_context", {"CX"}),
    "Abilities": ("abilities", {"IM", "LV"}),
    "Work Styles": ("work_styles", {"WI"}),
}


class Onet:
    """All descriptors, by file, with raw values and percentiles per occupation."""

    def __init__(self, paths: dict[str, Path]):
        occ = read_tsv(paths["occupations"])
        need(occ[0], "O*NET-SOC Code", "Title")
        self.titles = {r["O*NET-SOC Code"]: r["Title"] for r in occ}
        self.raw: dict[str, dict[tuple[str, str, str], float]] = {name: load_long(paths[key], scales) for name, (key, scales) in DESCRIPTORS.items()}
        self.raw["Job Zones"] = load_job_zones(paths["job_zones"])
        self.pct: dict[tuple[str, str, str], dict[str, float]] = {}
        self._rated: dict[str, set[str]] = {}
        for file, data in self.raw.items():
            by: dict[tuple[str, str], dict[str, float]] = defaultdict(dict)
            for (soc, el, sc), v in data.items():
                by[(el, sc)][soc] = v
            for (el, sc), vals in by.items():
                self.pct[(file, el, sc)] = percentiles(vals)

    def elements(self, file: str) -> set[str]:
        return {el for (_, el, _) in self.raw[file]}

    def rated(self, file: str) -> set[str]:
        """Occupations with any rating in this file."""
        if file not in self._rated:
            self._rated[file] = {soc for (soc, _, _) in self.raw[file]}
        return self._rated[file]

    def scales(self, file: str) -> set[str]:
        return {sc for (_, _, sc) in self.raw[file]}


def paths_from_config(cfg: dict, onet_dir: Path) -> dict[str, Path]:
    rel = cfg["releases"]
    return {key: onet_dir / rel[r]["dir"] / name for key, (r, name) in cfg["files"].items()}


def ensure_extracted(paths: dict[str, Path]) -> None:
    """The release zips are the committed sources; extract any file that is missing from <dir>/ out of <dir>.zip."""
    import zipfile

    for path in paths.values():
        if path.exists():
            continue
        zpath = path.parent.with_suffix(".zip")
        if not zpath.exists():
            raise SystemExit(f"Missing {path} and {zpath}")
        with zipfile.ZipFile(zpath) as z:
            member = next((n for n in z.namelist() if n.endswith("/" + path.name) or n == path.name), None)
            if member is None:
                raise SystemExit(f"{path.name} is not in {zpath}")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(z.read(member))


# ---------------------------------------------------------------- crosswalk ----


def load_crosswalk_xlsx(path: Path) -> tuple[dict[str, list[str]], dict[str, list[str]], dict[str, str]]:
    """The O*NET-hosted ESCO crosswalk: (ESCO code -> O*NET codes, ISCO-08 unit group -> O*NET codes, ESCO code -> title)."""
    import openpyxl

    ws = openpyxl.load_workbook(path, read_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    head = next(i for i, r in enumerate(rows) if r and r[0] == "ESCO/ISCO Code")
    cols = rows[head]
    if tuple(cols[:3]) != ("ESCO/ISCO Code", "ESCO/ISCO Title", "O*NET-SOC 2019 Code"):
        raise SystemExit(f"Unexpected crosswalk columns: {cols}")
    esco: dict[str, list[str]] = defaultdict(list)
    isco: dict[str, list[str]] = defaultdict(list)
    titles: dict[str, str] = {}
    for r in rows[head + 1 :]:
        if not r or not r[0] or not r[2]:
            continue
        code, soc = str(r[0]).strip(), str(r[2]).strip()
        if "." in code:
            esco[code].append(soc)
            titles[code] = str(r[1]).strip()
        elif re.fullmatch(r"\d{4}", code):
            isco[code].append(soc)
    return esco, isco, titles


# ---------------------------------------------------------------- profiles ----


def weighted(onet: Onet, links: dict[str, float]) -> dict:
    """Weighted mean of every descriptor over the linked occupations: raw and percentile.
    A descriptor is kept only when occupations carrying at least half the weight have it."""
    total = sum(links.values())
    out: dict = {}
    for (file, el, sc), pct in onet.pct.items():
        num_r = num_p = w = 0.0
        for soc, wt in links.items():
            if soc in pct:
                num_p += wt * pct[soc]
                num_r += wt * onet.raw[file][(soc, el, sc)]
                w += wt
        if w > 0 and w >= 0.5 * total:
            out.setdefault(file, {}).setdefault(el, {})[sc] = {"raw": round(num_r / w, 3), "pct": round(num_p / w, 1)}
    return out


def parse_estimated(path: Path) -> dict[str, dict]:
    out = {}
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            analogs = {}
            for part in r["analogs"].split(";"):
                code, w = part.rsplit(":", 1)
                analogs[code.strip()] = float(w)
            adjustments = []
            for part in filter(None, (r.get("adjustments") or "").split(";")):
                file, scale, element, delta = part.split("|")
                adjustments.append({"file": file, "scale": scale, "element": element, "delta": float(delta)})
            out[r["lane_id"]] = {"analogs": analogs, "adjustments": adjustments, "force": r.get("force", "0").strip() == "1", "rationale": r["rationale"]}
    return out


def use_estimate(est: dict | None, lane_links: dict, data_share: float = 1.0) -> bool:
    """An estimate replaces a career path's linked profile only when it is forced; when the career path has
    nothing better than its own ISCO groups (the weakest route), since documented analogs beat a whole ISCO
    unit group; or when less than half its link weight rests on occupations O*NET has rated."""
    if not est:
        return False
    lane_isco_only = all(e["routes"] == {"fallback_lane_isco"} for e in lane_links.values())
    return est["force"] or not lane_links or lane_isco_only or data_share < MIN_DATA_SHARE


# Many O*NET-SOC codes carry no ratings ("All Other" codes, Legislators, some 2019 codes). A career path whose
# links rest mostly on those has no real profile and must have a documented estimate instead.
MIN_DATA_SHARE = 0.5
CORE_FILE = "Work Activities"


def data_shares(onet: "Onet", weights: dict[str, float]) -> dict[str, float]:
    """Per descriptor file: the share of link weight on occupations that have that file's ratings."""
    total = sum(weights.values())
    out = {}
    for file in onet.raw:
        rated = onet.rated(file)
        out[file] = round(sum(w for c, w in weights.items() if c in rated) / total, 3) if total else 0.0
    return out


def build(args) -> dict:
    cfg = json.loads((ROOT / "build" / "onet_config.json").read_text())
    weights = cfg["match_weights"]
    paths = paths_from_config(cfg, Path(args.onet_dir))
    ensure_extracted(paths)
    onet = Onet(paths)
    codes = set(onet.titles)

    # The Work Design model's element names must all exist in this release.
    wd = json.loads((ROOT / "derived" / "workdesign_elements.json").read_text())
    missing = [f'{e["file"]}: {e["element"]}' for e in wd["elements"] if e["element"] not in onet.elements(e["file"])]
    if missing:
        raise SystemExit("Work Design element names not found in this release:\n  " + "\n  ".join(missing))

    taxonomy = json.loads((ROOT / "taxonomy.json").read_text())
    lanes = {l["id"]: l for f in taxonomy["families"] for l in f["lanes"]}
    with open(ROOT / "esco_mapping.csv", encoding="utf-8", newline="") as f:
        esco_rows = list(csv.DictReader(f))
    xw_esco, xw_isco, xw_titles = load_crosswalk_xlsx(Path(args.crosswalk))
    uri_codes = json.loads(Path(args.uri_codes).read_text())
    occ_codes = uri_codes["occupations"]

    links: dict[str, dict[str, dict]] = defaultdict(dict)  # lane -> soc -> {weight, routes, esco}
    esco_route: dict[str, str] = {}
    unknown_codes: set[str] = set()
    changed_since: list[dict] = []
    lookup_errors: list[dict] = []
    label_differs: list[dict] = []

    def link(lane: str, socs: list[str], w: float, route: str, esco: str | None):
        socs = sorted(set(socs))
        ok = [s for s in socs if s in codes]
        unknown_codes.update(s for s in socs if s not in codes)
        for soc in ok:
            e = links[lane].setdefault(soc, {"weight": 0.0, "routes": set(), "esco": 0})
            e["weight"] += w / len(ok)
            e["routes"].add(route)
            e["esco"] += 1 if esco else 0

    for r in esco_rows:
        uri, lane = r["esco_uri"], r["lane_id"]
        rec = occ_codes.get(uri) or {}
        cv, latest = rec.get("crosswalk_version") or {}, rec.get("latest") or {}
        code = cv.get("code")
        if cv.get("error") or latest.get("error"):
            lookup_errors.append({"uri": uri, "crosswalk_version": cv.get("error"), "latest": latest.get("error")})
        elif cv and latest and (cv.get("code") != latest.get("code") or cv.get("label") != latest.get("label")):
            changed_since.append({"uri": uri, "crosswalk_version": cv, "latest": latest})
        if code and code in xw_esco:
            esco_route[uri] = "crosswalk"
            if (cv.get("label") or "").strip().lower() != xw_titles[code].strip().lower():
                label_differs.append({"uri": uri, "code": code, "esco_api": cv.get("label"), "crosswalk": xw_titles[code]})
            link(lane, xw_esco[code], weights["crosswalk"], "crosswalk", uri)
        elif code and code.split(".")[0] in xw_isco:
            esco_route[uri] = "fallback_isco"
            link(lane, xw_isco[code.split(".")[0]], weights["fallback_isco"], "fallback_isco", uri)
        else:
            esco_route[uri] = "unlinked" if code else "no_code"

    for lane_id, lane in lanes.items():
        if not links.get(lane_id):
            for isco in lane["isco"]:
                if isco in xw_isco:
                    link(lane_id, xw_isco[isco], weights["fallback_lane_isco"], "fallback_lane_isco", None)

    estimated = parse_estimated(REF / "onet" / "estimated_profiles.csv")
    for lane_id, est in estimated.items():
        bad = [c for c in est["analogs"] if c not in codes]
        if bad:
            raise SystemExit(f"{lane_id}: analog O*NET-SOC code(s) not in this release: {bad}")
        for a in est["adjustments"]:
            if a["element"] not in onet.elements(a["file"]):
                raise SystemExit(f"{lane_id}: adjustment element not in this release: {a['file']}: {a['element']}")

    profiles = {}
    needs_estimate: list[str] = []
    for lane_id, lane in lanes.items():
        est = estimated.get(lane_id)
        ls = links.get(lane_id, {})
        shares = data_shares(onet, {c: e["weight"] for c, e in ls.items()})
        if ls and shares[CORE_FILE] < MIN_DATA_SHARE and not est:
            needs_estimate.append(f"{lane_id} ({shares[CORE_FILE]:.0%} of link weight rated)")
        if use_estimate(est, ls, shares.get(CORE_FILE, 0.0) if ls else 1.0):
            desc = weighted(onet, est["analogs"])
            for a in est["adjustments"]:
                cell = desc.get(a["file"], {}).get(a["element"], {}).get(a["scale"])
                if not cell:
                    raise SystemExit(f"{lane_id}: adjustment target missing from the analog profile: {a}")
                cell["pct"] = round(min(100.0, max(0.0, cell["pct"] + a["delta"])), 1)
                cell["adjusted"] = a["delta"]
            profiles[lane_id] = {
                "provenance": "estimated",
                "n_occupations": len(est["analogs"]),
                "occupations": [{"soc": c, "title": onet.titles[c], "weight": w, "route": ["analog"]} for c, w in est["analogs"].items()],
                "coverage_confidence": None,
                "rationale": est["rationale"],
                "linked_but_replaced": sorted(ls) if ls else [],
                "linked_data_share": shares[CORE_FILE] if ls else None,
                "descriptors": desc,
            }
            continue
        if not ls:
            profiles[lane_id] = {"provenance": "unlinked", "n_occupations": 0, "occupations": [], "coverage_confidence": 0.0, "descriptors": {}}
            continue
        total = sum(e["weight"] for e in ls.values())
        via_xw = sum(e["weight"] for e in ls.values() if "crosswalk" in e["routes"])
        n_esco_xw = sum(1 for r in esco_rows if r["lane_id"] == lane_id and esco_route.get(r["esco_uri"]) == "crosswalk")
        conf = min(1.0, n_esco_xw / cfg["confidence"]["full_occupations"]) * (via_xw / total) * shares[CORE_FILE]
        profiles[lane_id] = {
            "provenance": "onet",
            "n_occupations": len(ls),
            "occupations": sorted(
                ({"soc": c, "title": onet.titles[c], "weight": round(e["weight"] / total, 4), "route": sorted(e["routes"])} for c, e in ls.items()),
                key=lambda x: (-x["weight"], x["soc"]),
            ),
            "esco_linked": n_esco_xw,
            "data_share": shares,
            "coverage_confidence": round(conf, 3),
            "descriptors": weighted(onet, {c: e["weight"] for c, e in ls.items()}),
        }

    if needs_estimate:
        raise SystemExit("These career paths rest mostly on O*NET occupations without ratings; add an estimated profile:\n  " + "\n  ".join(needs_estimate))

    payoff = wd["payoffVariance"]
    for lane_id, p in profiles.items():
        p["name"] = lanes[lane_id]["name"]
        p["taxonomy"] = {"payoff": lanes[lane_id]["payoff"], "payoff_variance": payoff.get(lanes[lane_id]["payoff"])}

    route_counts: dict[str, int] = defaultdict(int)
    for v in esco_route.values():
        route_counts[v] += 1
    lane_routes: dict[str, int] = defaultdict(int)
    for p in profiles.values():
        if p["provenance"] != "onet":
            lane_routes[p["provenance"]] += 1
        else:
            rs = {r for o in p["occupations"] for r in o["route"]}
            lane_routes["crosswalk" if "crosswalk" in rs else ("fallback_isco" if "fallback_isco" in rs else "fallback_lane_isco")] += 1
    rel = cfg["releases"]
    return {
        "release": {"onet": rel["primary"]["release"], "work_values": rel["work_values"]["release"], "esco_crosswalk_version": uri_codes["crosswalk_version"]},
        "scale": "Each descriptor: 'raw' on O*NET's own scale; 'pct' = weighted mean of the linked occupations' percentiles (0-100) among all O*NET occupations that have the descriptor.",
        "content_model": {
            "work_styles": sorted(onet.elements("Work Styles")),
            "interests_source": cfg["files"]["interests"][1],
            "o_net_occupations": len(codes),
        },
        # Work Values come from an older release: which codes the two releases disagree on.
        "release_alignment": {
            "work_values_codes_not_in_primary": sorted({soc for (soc, _, _) in onet.raw["Work Values"]} - codes),
            "primary_codes_with_interests_but_no_work_values": len({soc for (soc, _, _) in onet.raw["Interests"]} - {soc for (soc, _, _) in onet.raw["Work Values"]}),
        },
        "coverage": {
            "esco_occupations": len(esco_rows),
            "esco_by_route": dict(route_counts),
            "esco_unlinked": sorted((r["esco_label"], r["lane_id"], esco_route[r["esco_uri"]]) for r in esco_rows if esco_route[r["esco_uri"]] in ("unlinked", "no_code")),
            "esco_changed_since_crosswalk_version": len(changed_since),
            "esco_api_lookup_errors": lookup_errors,
            "esco_label_differs_from_crosswalk": label_differs,
            "unknown_onet_codes_in_crosswalk": sorted(unknown_codes),
            "lanes_by_provenance": {k: sum(1 for p in profiles.values() if p["provenance"] == k) for k in ("onet", "estimated", "unlinked")},
            "lanes_by_best_route": dict(lane_routes),
        },
        "changed_since_crosswalk_version": changed_since,
        "lanes": profiles,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--onet-dir", default=str(REF / "onet"))
    ap.add_argument("--crosswalk", default=str(REF / "crosswalks" / "ESCO_to_ONET-SOC.xlsx"))
    ap.add_argument("--uri-codes", default=str(REF / "crosswalks" / "esco_uri_codes.json"))
    ap.add_argument("--out", default=str(ROOT / "derived" / "lane_onet_profiles.json"))
    args = ap.parse_args(argv)
    result = build(args)
    Path(args.out).write_text(json.dumps(result, indent=1) + "\n")
    c = result["coverage"]
    print(f"Wrote {args.out}")
    print(f"  career paths by provenance: {c['lanes_by_provenance']}; by best route: {c['lanes_by_best_route']}")
    print(f"  ESCO occupations by route: {c['esco_by_route']}")


if __name__ == "__main__":
    sys.exit(main())
