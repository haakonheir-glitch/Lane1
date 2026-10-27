#!/usr/bin/env python3
"""
Fetch each ESCO occupation's code and preferred label from the official ESCO API, by URI, in two
versions: the one the ESCO-O*NET crosswalk was built on (codes match v1.1.x and v1.2.0) and the
current one. The first lets build_onet_profiles.py join our URIs to the crosswalk exactly (URI ->
code -> O*NET-SOC); the second lists every occupation whose code or label changed since.

Writes taxonomy/reference/crosswalks/esco_uri_codes.json. Resumable: occupations already in the
file are skipped. Polite: a few requests at a time, with retries and back-off.

Usage: python3 -I taxonomy/build/fetch_esco_codes.py [--workers 4]
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reference" / "crosswalks" / "esco_uri_codes.json"
API = "https://ec.europa.eu/esco/api/resource/occupation"
CROSSWALK_VERSION = "v1.2.0"


def get(uri: str, version: str | None) -> dict | None:
    q = {"uri": uri, "language": "en"}
    if version:
        q["selectedVersion"] = version
    url = f"{API}?{urllib.parse.urlencode(q)}"
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=30) as r:
                d = json.load(r)
            return {"code": d.get("code"), "label": (d.get("preferredLabel") or {}).get("en"), "status": d.get("status")}
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2**attempt)
        except Exception:
            time.sleep(2**attempt)
    raise RuntimeError(f"Failed after retries: {url}")


def fetch(uri: str) -> tuple[str, dict]:
    return uri, {"crosswalk_version": get(uri, CROSSWALK_VERSION), "latest": get(uri, None)}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args(argv)
    with open(ROOT / "esco_mapping.csv", encoding="utf-8", newline="") as f:
        uris = [r["esco_uri"] for r in csv.DictReader(f)]
    data = json.loads(OUT.read_text()) if OUT.exists() else {"crosswalk_version": CROSSWALK_VERSION, "fetched": None, "occupations": {}}
    todo = [u for u in uris if u not in data["occupations"]]
    print(f"{len(uris)} occupations, {len(todo)} to fetch", flush=True)
    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for fut in as_completed([pool.submit(fetch, u) for u in todo]):
            uri, rec = fut.result()
            data["occupations"][uri] = rec
            done += 1
            if done % 200 == 0:
                OUT.write_text(json.dumps(data, indent=1, sort_keys=True))
                print(f"{done}/{len(todo)}", flush=True)
    data["fetched"] = time.strftime("%Y-%m-%d")
    OUT.write_text(json.dumps(data, indent=1, sort_keys=True))
    missing = sum(1 for v in data["occupations"].values() if not v["crosswalk_version"])
    print(f"done: {len(data['occupations'])} occupations; {missing} not found in {CROSSWALK_VERSION}")


if __name__ == "__main__":
    sys.exit(main())
