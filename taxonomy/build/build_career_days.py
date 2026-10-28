#!/usr/bin/env python3
"""
Build taxonomy/derived/career_days.json: "A typical day in this career" for each of Lane's 205
career paths, from the career's O*NET Work Activities and Work Context (Phase 3, Career map detail).
Element names and O*NET's descriptions are stored once, under "elements"; career paths refer to them by id.

Inputs (all generated or unedited sources, recorded in taxonomy/reference/onet/SOURCES.md):
  taxonomy/derived/lane_onet_profiles.json     per-career link-weighted O*NET descriptors (raw + percentile)
  taxonomy/derived/workdesign_elements.json    the elements the Work Design model already reads
  taxonomy/reference/onet/db_31_0_text.zip     Content Model Reference (element ids and descriptions)
                                               and Work Context Categories (category wording)

Selection rule (provisional, documented in docs/WORK_DESIGN.md):
  activities: Work Activities rated Important or above (IM raw >= 3.5 on O*NET's 1-5 scale), ranked
              by percentile across occupations (what is distinctive, not what every job does), top 5;
              when fewer than 3 qualify, the highest-rated ones fill up to 3.
  context:    Work Context elements at or above the 75th percentile across occupations, ranked by
              percentile, top 4, leaving out the elements the Work Design environment dimensions
              already read (the detail panel shows those in the overlay). Each carries the wording of
              its nearest O*NET response category (e.g. "Every day") when O*NET defines one.
Fails loudly on an element the reference files don't have, instead of guessing.

Usage: python3 -I taxonomy/build/build_career_days.py
"""
from __future__ import annotations

import csv
import io
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DERIVED = ROOT / "derived"
ZIP = ROOT / "reference" / "onet" / "db_31_0_text.zip"

RULE = {
    "activities": {"min_importance": 3.5, "top": 5, "min_shown": 3},
    "context": {"min_pct": 75.0, "top": 4},
}


def read_zip_tsv(z: zipfile.ZipFile, member: str) -> list[dict]:
    with z.open(member) as f:
        return list(csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", newline=""), delimiter="\t"))


def reference(zip_path: Path = ZIP) -> tuple[dict[str, tuple[str, str]], dict[str, dict[int, str]]]:
    """(element name -> (element id, description)), (work context element id -> {category: wording})."""
    with zipfile.ZipFile(zip_path) as z:
        root = next(n.split("/")[0] for n in z.namelist() if n.endswith("Content Model Reference.txt"))
        model = read_zip_tsv(z, f"{root}/Content Model Reference.txt")
        cats = read_zip_tsv(z, f"{root}/Work Context Categories.txt")
    for rows, cols in ((model, ("Element ID", "Element Name", "Description")), (cats, ("Element ID", "Scale ID", "Category", "Category Description"))):
        if rows and any(c not in rows[0] for c in cols):
            raise SystemExit(f"Missing column(s) {cols}; found {list(rows[0])}")
    # Only Work Activities (4.A) and Work Context (4.C) names; names repeat across the content model.
    elements = {r["Element Name"]: (r["Element ID"], r["Description"].strip()) for r in model if r["Element ID"].startswith(("4.A.", "4.C."))}
    categories: dict[str, dict[int, str]] = {}
    for r in cats:
        if r["Scale ID"] == "CXP":
            categories.setdefault(r["Element ID"], {})[int(r["Category"])] = r["Category Description"].strip()
    return elements, categories


def lookup(elements: dict, name: str) -> tuple[str, str]:
    if name not in elements:
        raise SystemExit(f"O*NET element {name!r} is not in the Content Model Reference")
    return elements[name]


def career_day(descriptors: dict, elements: dict, categories: dict, used_context: set[str], rule: dict = RULE) -> dict:
    """The typical-day activities and context for one career path's descriptors, by element id. Pure."""
    ra, rc = rule["activities"], rule["context"]
    acts = [(name, v["IM"]) for name, v in descriptors.get("Work Activities", {}).items() if "IM" in v]
    important = sorted((a for a in acts if a[1]["raw"] >= ra["min_importance"]), key=lambda a: (-a[1]["pct"], -a[1]["raw"], a[0]))[: ra["top"]]
    if len(important) < ra["min_shown"]:
        rest = sorted((a for a in acts if a not in important), key=lambda a: (-a[1]["raw"], a[0]))
        important += rest[: ra["min_shown"] - len(important)]
    activities = []
    for name, v in important:
        eid = lookup(elements, name)[0]
        activities.append({"id": eid, "importance": round(v["raw"], 2), "pct": round(v["pct"], 1)})
    ctx = [(name, v["CX"]) for name, v in descriptors.get("Work Context", {}).items() if "CX" in v and name not in used_context]
    top = sorted((c for c in ctx if c[1]["pct"] >= rc["min_pct"]), key=lambda c: (-c[1]["pct"], c[0]))[: rc["top"]]
    context = []
    for name, v in top:
        eid = lookup(elements, name)[0]
        cat = categories.get(eid, {})
        label = cat.get(min(max(round(v["raw"]), min(cat)), max(cat))) if cat else None
        context.append({"id": eid, "label": label, "value": round(v["raw"], 2), "pct": round(v["pct"], 1)})
    return {"activities": activities, "context": context}


def build(derived: Path = DERIVED, zip_path: Path = ZIP) -> dict:
    profiles = json.loads((derived / "lane_onet_profiles.json").read_text())
    wd = json.loads((derived / "workdesign_elements.json").read_text())
    used = {e["element"] for e in wd["elements"] if e["file"] == "Work Context"}
    elements, categories = reference(zip_path)
    lanes = {}
    for lane_id, p in sorted(profiles["lanes"].items()):
        if p["provenance"] == "unlinked":
            continue
        lanes[lane_id] = {"provenance": p["provenance"], **career_day(p["descriptors"], elements, categories, used)}
    ids = {x["id"] for v in lanes.values() for x in v["activities"] + v["context"]}
    names = {eid: (name, desc) for name, (eid, desc) in elements.items() if eid in ids}
    return {"release": profiles["release"], "workDesign": wd["version"], "rule": RULE, "elements": {eid: {"name": n, "description": d} for eid, (n, d) in sorted(names.items())}, "lanes": lanes}


def main(argv=None):
    out = build()
    path = DERIVED / "career_days.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    thin = [k for k, v in out["lanes"].items() if len(v["activities"]) < 3]
    print(f"wrote {path.relative_to(ROOT.parent)}: {len(out['lanes'])} career paths; fewer than 3 activities: {thin or 'none'}", file=sys.stderr)


if __name__ == "__main__":
    main()
