#!/usr/bin/env python3
"""
Build taxonomy/derived/lane_onet_profiles.json: an O*NET profile for each of Lane's 205 career
paths, on one common scale (0-100 percentile across all O*NET occupations), with provenance.

Inputs (never edited by hand; recorded in taxonomy/reference/onet/SOURCES.md):
  --onet DIR            an O*NET database release in text format (tab-separated .txt files)
  --esco-crosswalk CSV  the European Commission's ESCO-O*NET crosswalk
  --esco-occupations CSV  (optional) official ESCO occupations CSV with ISCO codes, for the fallback
  --isco-soc CSV        (optional) ISCO-08 -> SOC crosswalk (BLS), for the fallback
  --soc-onet CSV        (optional) SOC -> O*NET-SOC (only needed if --isco-soc gives SOC 2010)
Lane inputs: taxonomy/taxonomy.json, taxonomy/esco_mapping.csv,
             taxonomy/reference/onet/estimated_profiles.csv, taxonomy/build/onet_config.json,
             taxonomy/derived/workdesign_elements.json (from scripts/export-workdesign-elements.mts).

Routes, best first: the ESCO-O*NET crosswalk by ESCO URI (keeping its match type); for ESCO
occupations it doesn't cover, ISCO-08 -> SOC -> O*NET-SOC; for career paths with nothing linked,
an estimated profile from named analog occupations (estimated_profiles.csv), marked
"provenance": "estimated". Fails loudly on any missing input column, unknown O*NET-SOC code or
Work Design element name, instead of guessing.

Usage: python3 -I taxonomy/build/build_onet_profiles.py --onet taxonomy/reference/onet/db_30_0_text \\
           --esco-crosswalk taxonomy/reference/crosswalks/esco_onet_crosswalk.csv [--isco-soc ...]
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

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
        mid = (i + j) / 2
        p = 100.0 * (mid + 0.5) / n
        for k in range(i, j + 1):
            out[items[k][0]] = p
        i = j + 1
    return out


class Onet:
    """All descriptors of one release, by file, with raw values and percentiles per occupation."""

    def __init__(self, root: Path, files: dict[str, str]):
        self.root = root
        occ = read_tsv(root / files["occupations"])
        need(occ[0], "O*NET-SOC Code", "Title")
        self.titles = {r["O*NET-SOC Code"]: r["Title"] for r in occ}
        self.raw: dict[str, dict[tuple[str, str, str], float]] = {
            "Interests": load_long(root / files["interests"], {"OI"}),
            "Work Values": load_long(root / files["work_values"], {"EX"}),
            "Work Activities": load_long(root / files["work_activities"], {"IM", "LV"}),
            "Work Context": load_long(root / files["work_context"], {"CX"}),
            "Abilities": load_long(root / files["abilities"], {"IM", "LV"}),
            "Work Styles": load_long(root / files["work_styles"]),
            "Job Zones": load_job_zones(root / files["job_zones"]),
        }
        # (file, element, scale) -> {soc: percentile}
        self.pct: dict[tuple[str, str, str], dict[str, float]] = {}
        for file, data in self.raw.items():
            by: dict[tuple[str, str], dict[str, float]] = defaultdict(dict)
            for (soc, el, sc), v in data.items():
                by[(el, sc)][soc] = v
            for (el, sc), vals in by.items():
                self.pct[(file, el, sc)] = percentiles(vals)

    def elements(self, file: str) -> set[str]:
        return {el for (_, el, _) in self.raw[file]}

    def scales(self, file: str) -> set[str]:
        return {sc for (_, _, sc) in self.raw[file]}


# ---------------------------------------------------------------- linking ----


def load_crosswalk(path: Path) -> dict[str, list[tuple[str, str]]]:
    """ESCO URI -> [(O*NET-SOC code, match type)]. Column names are detected, not assumed."""
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise SystemExit(f"Empty crosswalk: {path}")
    cols = {c.lower(): c for c in rows[0]}
    uri = next((cols[c] for c in cols if "esco" in c and "uri" in c), None)
    soc = next((cols[c] for c in cols if "o*net" in c or "onet" in c), None)
    kind = next((cols[c] for c in cols if "match" in c or "type" in c or "relation" in c), None)
    if not uri or not soc:
        raise SystemExit(f"Can't find the ESCO URI and O*NET-SOC columns in {path}: {list(rows[0])}")
    out: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for r in rows:
        code = r[soc].strip()
        if not code:
            continue
        t = (r[kind] if kind else "exact").strip().lower()
        t = next((k for k in ("exact", "close", "narrow", "broad") if k in t), t or "exact")
        out[r[uri].strip()].append((code, t))
    return out


def load_isco_soc(path: Path | None, soc_onet: Path | None, onet_codes: set[str]) -> dict[str, list[str]]:
    """ISCO-08 unit group (4 digits) -> O*NET-SOC codes, via SOC. Empty when no crosswalk is given."""
    if not path:
        return {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    cols = {c.lower(): c for c in rows[0]}
    isco = next((cols[c] for c in cols if "isco" in c and "code" in c), None)
    soc = next((cols[c] for c in cols if "soc" in c and "code" in c), None)
    if not isco or not soc:
        raise SystemExit(f"Can't find ISCO and SOC code columns in {path}: {list(rows[0])}")
    soc_map: dict[str, list[str]] = defaultdict(list)
    if soc_onet:
        with open(soc_onet, encoding="utf-8-sig", newline="") as f:
            r2 = list(csv.DictReader(f))
        c2 = {c.lower(): c for c in r2[0]}
        a = next(c2[c] for c in c2 if "soc" in c and "o*net" not in c and "onet" not in c)
        b = next(c2[c] for c in c2 if "o*net" in c or "onet" in c)
        for r in r2:
            soc_map[r[a].strip()].append(r[b].strip())
    out: dict[str, list[str]] = defaultdict(list)
    for r in rows:
        s = r[soc].strip()
        targets = soc_map.get(s) or [c for c in onet_codes if c.startswith(s + ".")]
        out[r[isco].strip()[:4]].extend(targets)
    return out


# ---------------------------------------------------------------- profiles ----


def weighted(onet: Onet, links: dict[str, float]) -> dict:
    """Weighted mean of every descriptor over the linked occupations: raw and percentile."""
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


def build(args) -> dict:
    cfg = json.loads((ROOT / "build" / "onet_config.json").read_text())
    weights = cfg["match_weights"]
    onet = Onet(Path(args.onet), cfg["files"])
    codes = set(onet.titles)

    # Verify the Work Design model's element names against this release before anything else.
    wd = json.loads((ROOT / "derived" / "workdesign_elements.json").read_text())
    missing = [f'{e["file"]}: {e["element"]}' for e in wd["elements"] if e["element"] not in onet.elements(e["file"])]
    if missing:
        raise SystemExit("Work Design element names not found in this release:\n  " + "\n  ".join(missing))

    taxonomy = json.loads((ROOT / "taxonomy.json").read_text())
    lanes = {l["id"]: l for f in taxonomy["families"] for l in f["lanes"]}
    with open(ROOT / "esco_mapping.csv", encoding="utf-8", newline="") as f:
        esco_rows = list(csv.DictReader(f))
    crosswalk = load_crosswalk(Path(args.esco_crosswalk))
    esco_isco: dict[str, str] = {}
    if args.esco_occupations:
        with open(args.esco_occupations, encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                if r.get("conceptUri") and r.get("iscoGroup"):
                    esco_isco[r["conceptUri"]] = r["iscoGroup"][:4]
    isco_onet = load_isco_soc(Path(args.isco_soc) if args.isco_soc else None, Path(args.soc_onet) if args.soc_onet else None, codes)

    links: dict[str, dict[str, dict]] = defaultdict(dict)  # lane -> soc -> {weight, routes}
    esco_routes: dict[str, str] = {}
    unknown_codes: set[str] = set()

    def link(lane: str, soc: str, w: float, route: str):
        if soc not in codes:
            unknown_codes.add(soc)
            return
        e = links[lane].setdefault(soc, {"weight": 0.0, "routes": set()})
        e["weight"] += w
        e["routes"].add(route)

    for r in esco_rows:
        uri, lane = r["esco_uri"], r["lane_id"]
        if uri in crosswalk:
            esco_routes[uri] = "crosswalk"
            for soc, t in crosswalk[uri]:
                link(lane, soc, weights.get(t, weights["broad"]), f"crosswalk:{t}")
        elif uri in esco_isco and esco_isco[uri] in isco_onet:
            esco_routes[uri] = "fallback_isco"
            for soc in isco_onet[esco_isco[uri]]:
                link(lane, soc, weights["fallback_isco"], "fallback_isco")
        else:
            esco_routes[uri] = "unlinked"

    for lane_id, lane in lanes.items():
        if not links.get(lane_id) and isco_onet:
            for isco in lane["isco"]:
                for soc in isco_onet.get(isco, []):
                    link(lane_id, soc, weights["fallback_lane_isco"], "fallback_lane_isco")

    estimated = parse_estimated(ROOT / "reference" / "onet" / "estimated_profiles.csv")
    for lane_id, est in estimated.items():
        bad = [c for c in est["analogs"] if c not in codes]
        if bad:
            raise SystemExit(f"{lane_id}: analog O*NET-SOC code(s) not in this release: {bad}")
        for a in est["adjustments"]:
            if a["element"] not in onet.elements(a["file"]):
                raise SystemExit(f"{lane_id}: adjustment element not in this release: {a['file']}: {a['element']}")

    profiles = {}
    for lane_id, lane in lanes.items():
        est = estimated.get(lane_id)
        if est and (est["force"] or not links.get(lane_id)):
            desc = weighted(onet, est["analogs"])
            for a in est["adjustments"]:
                cell = desc.get(a["file"], {}).get(a["element"], {}).get(a["scale"])
                if cell:
                    cell["pct"] = round(min(100.0, max(0.0, cell["pct"] + a["delta"])), 1)
                    cell["adjusted"] = a["delta"]
            profiles[lane_id] = {
                "provenance": "estimated",
                "n_occupations": len(est["analogs"]),
                "occupations": [{"soc": c, "title": onet.titles[c], "weight": w, "route": "analog"} for c, w in est["analogs"].items()],
                "coverage_confidence": None,
                "rationale": est["rationale"],
                "descriptors": desc,
            }
            continue
        ls = links.get(lane_id, {})
        if not ls:
            profiles[lane_id] = {"provenance": "unlinked", "n_occupations": 0, "occupations": [], "coverage_confidence": 0.0, "descriptors": {}}
            continue
        total = sum(e["weight"] for e in ls.values())
        good = sum(e["weight"] for e in ls.values() if any(r in ("crosswalk:exact", "crosswalk:close") for r in e["routes"]))
        conf = min(1.0, total / cfg["confidence"]["full_weight"]) * (good / total)
        profiles[lane_id] = {
            "provenance": "onet",
            "n_occupations": len(ls),
            "occupations": sorted(
                ({"soc": c, "title": onet.titles[c], "weight": round(e["weight"] / total, 4), "route": sorted(e["routes"])} for c, e in ls.items()),
                key=lambda x: -x["weight"],
            ),
            "coverage_confidence": round(conf, 3),
            "descriptors": weighted(onet, {c: e["weight"] for c, e in ls.items()}),
        }

    payoff = wd["payoffVariance"]
    for lane_id, p in profiles.items():
        p["taxonomy"] = {"payoff": lanes[lane_id]["payoff"], "payoff_variance": payoff.get(lanes[lane_id]["payoff"])}

    route_counts: dict[str, int] = defaultdict(int)
    for v in esco_routes.values():
        route_counts[v] += 1
    return {
        "release": args.release,
        "built_from": {"onet": str(args.onet), "esco_crosswalk": str(args.esco_crosswalk), "isco_soc": args.isco_soc, "esco_occupations": args.esco_occupations},
        "scale": "Each descriptor: 'raw' on O*NET's own scale, 'pct' = weighted mean of the linked occupations' percentiles (0-100) among all O*NET occupations.",
        "content_model": {"work_styles": sorted(onet.elements("Work Styles")), "work_styles_scales": sorted(onet.scales("Work Styles"))},
        "coverage": {
            "esco_occupations": len(esco_rows),
            "esco_by_route": dict(route_counts),
            "esco_uris_not_in_crosswalk": sum(1 for r in esco_rows if r["esco_uri"] not in crosswalk),
            "crosswalk_uris_not_in_lane_mapping": sorted(set(crosswalk) - {r["esco_uri"] for r in esco_rows})[:200],
            "unknown_onet_codes_in_links": sorted(unknown_codes),
            "lanes_by_provenance": {k: sum(1 for p in profiles.values() if p["provenance"] == k) for k in ("onet", "estimated", "unlinked")},
        },
        "lanes": profiles,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--onet", required=True)
    ap.add_argument("--release", required=True, help="O*NET release, e.g. 30.0")
    ap.add_argument("--esco-crosswalk", required=True)
    ap.add_argument("--esco-occupations")
    ap.add_argument("--isco-soc")
    ap.add_argument("--soc-onet")
    ap.add_argument("--out", default=str(ROOT / "derived" / "lane_onet_profiles.json"))
    args = ap.parse_args(argv)
    result = build(args)
    Path(args.out).write_text(json.dumps(result, indent=1, sort_keys=False) + "\n")
    c = result["coverage"]
    print(f"Wrote {args.out}: {c['lanes_by_provenance']}; ESCO by route {c['esco_by_route']}")


if __name__ == "__main__":
    sys.exit(main())
