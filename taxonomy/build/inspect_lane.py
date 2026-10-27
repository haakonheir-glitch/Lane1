#!/usr/bin/env python3
"""
Trace a career path's O*NET profile back to its sources: ESCO occupations and their routes, the linked
O*NET occupations with weights, and (optionally) one element's value per linked occupation.
Read-only; reads taxonomy/derived/lane_onet_profiles.json and the O*NET release.

Usage:
  python3 -I taxonomy/build/inspect_lane.py <lane_id>
  python3 -I taxonomy/build/inspect_lane.py <lane_id> --element "Work Context|CX|Time Pressure"
  python3 -I taxonomy/build/inspect_lane.py --rank "Work Context|CX|Time Pressure" [--grep emergency]
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_onet_profiles as b  # noqa: E402

ROOT = b.ROOT


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("lane", nargs="?")
    ap.add_argument("--element", help="file|scale|element")
    ap.add_argument("--rank", help="file|scale|element: every career path's percentile, high to low")
    ap.add_argument("--grep", help="with --rank: only career paths whose id or name contains this")
    args = ap.parse_args(argv)
    built = json.loads((ROOT / "derived" / "lane_onet_profiles.json").read_text())
    lanes = built["lanes"]

    if args.rank:
        file, scale, el = args.rank.split("|")
        rows = sorted(((p["descriptors"].get(file, {}).get(el, {}).get(scale, {}).get("pct"), k, p["name"]) for k, p in lanes.items()), key=lambda r: -(r[0] or -1))
        for i, (v, k, n) in enumerate(rows, 1):
            if args.grep and args.grep.lower() not in (k + n).lower():
                continue
            print(f"{i:4d}  {'—' if v is None else f'{v:5.1f}'}  {k}  ({n})")
        return

    p = lanes[args.lane]
    print(f"{args.lane}: {p['name']} · provenance {p['provenance']} · confidence {p.get('coverage_confidence')} · n {p['n_occupations']}")
    if p.get("rationale"):
        print("rationale:", p["rationale"])
    with open(ROOT / "esco_mapping.csv", encoding="utf-8", newline="") as f:
        esco = [r for r in csv.DictReader(f) if r["lane_id"] == args.lane]
    print(f"\nESCO occupations ({len(esco)}): " + "; ".join(r["esco_label"] for r in esco[:40]) + (" …" if len(esco) > 40 else ""))
    onet = None
    if args.element:
        cfg = json.loads((ROOT / "build" / "onet_config.json").read_text())
        paths = b.paths_from_config(cfg, ROOT / "reference" / "onet")
        b.ensure_extracted(paths)
        onet = b.Onet(paths)
        file, scale, el = args.element.split("|")
        cell = p["descriptors"].get(file, {}).get(el, {}).get(scale)
        print(f"\n{args.element}: career path {cell}")
    print("\nO*NET occupations (weight, route):")
    for o in p["occupations"]:
        extra = ""
        if onet:
            raw = onet.raw[file].get((o["soc"], el, scale))
            pct = onet.pct.get((file, el, scale), {}).get(o["soc"])
            extra = f"  raw {raw} pct {pct}"
        print(f"  {o['weight']:.3f}  {o['soc']}  {o['title']}  {o['route']}{extra}")


if __name__ == "__main__":
    sys.exit(main())
