"""
Unit tests for build_onet_profiles.py on a tiny synthetic fixture (made-up occupations and
values, written to a temporary folder; no real O*NET data). Run:
    python3 -I taxonomy/build/test_build_onet_profiles.py
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_onet_profiles as b  # noqa: E402

HEAD = "O*NET-SOC Code\tElement ID\tElement Name\tScale ID\tData Value\tNot Relevant\n"


def write(d: Path, name: str, rows: list[str], head: str = HEAD):
    (d / name).write_text(head + "".join(r + "\n" for r in rows))


def paths(d: Path) -> dict:
    return {
        "occupations": d / "Occupation Data.txt",
        "interests": d / "Interests.txt",
        "work_values": d / "Work Values.txt",
        "work_activities": d / "Work Activities.txt",
        "work_context": d / "Work Context.txt",
        "abilities": d / "Abilities.txt",
        "work_styles": d / "Work Styles.txt",
        "job_zones": d / "Job Zones.txt",
    }


def fixture(d: Path):
    write(d, "Occupation Data.txt", ["11-1011.00\tChief Executives", "15-1252.00\tSoftware Developers", "29-1141.00\tRegistered Nurses"], "O*NET-SOC Code\tTitle\n")
    write(d, "Interests.txt", ["11-1011.00\t1\tEnterprising\tOI\t6.5\t", "15-1252.00\t1\tEnterprising\tOI\t2.0\t", "29-1141.00\t1\tEnterprising\tOI\t3.0\t"])
    write(d, "Work Values.txt", ["11-1011.00\t1\tIndependence\tEX\t6.0\t", "15-1252.00\t1\tIndependence\tEX\t4.0\t", "29-1141.00\t1\tIndependence\tEX\t3.0\t"])
    write(d, "Work Activities.txt", ["11-1011.00\t1\tAssisting and Caring for Others\tIM\t2.0\t", "15-1252.00\t1\tAssisting and Caring for Others\tIM\t1.5\t", "29-1141.00\t1\tAssisting and Caring for Others\tIM\t4.9\t",
                                     "29-1141.00\t1\tAssisting and Caring for Others\tLV\t5.0\tN", "15-1252.00\t1\tAssisting and Caring for Others\tLV\t4.0\tY"])
    write(d, "Abilities.txt", ["11-1011.00\t1\tDeductive Reasoning\tLV\t5.0\t", "15-1252.00\t1\tDeductive Reasoning\tLV\t4.6\t", "29-1141.00\t1\tDeductive Reasoning\tLV\t4.0\t"])
    write(d, "Work Styles.txt", ["11-1011.00\t1\tLeadership Orientation\tWI\t2.0\t"])
    # Work Context category rows (CXP) must be ignored in favour of the CX mean.
    write(d, "Work Context.txt", ["11-1011.00\t1\tFreedom to Make Decisions\tCX\tn/a\t4.9\t", "15-1252.00\t1\tFreedom to Make Decisions\tCX\tn/a\t3.5\t", "29-1141.00\t1\tFreedom to Make Decisions\tCX\tn/a\t3.0\t",
                                  "11-1011.00\t1\tFreedom to Make Decisions\tCXP\t1\t0.0\t"], "O*NET-SOC Code\tElement ID\tElement Name\tScale ID\tCategory\tData Value\tNot Relevant\n")
    write(d, "Job Zones.txt", ["11-1011.00\t5", "15-1252.00\t4", "29-1141.00\t3"], "O*NET-SOC Code\tJob Zone\n")


class Unit(unittest.TestCase):
    def test_percentiles_mid_rank_and_ties(self):
        p = b.percentiles({"a": 1, "b": 2, "c": 2, "d": 3})
        self.assertAlmostEqual(p["a"], 12.5)
        self.assertEqual(p["b"], p["c"])
        self.assertAlmostEqual(p["d"], 87.5)

    def test_onet_reading_scales_and_not_relevant(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            fixture(d)
            o = b.Onet(paths(d))
            self.assertEqual(o.raw["Work Activities"][("15-1252.00", "Assisting and Caring for Others", "LV")], 0.0)  # Not Relevant = Y
            pct = o.pct[("Work Activities", "Assisting and Caring for Others", "IM")]
            self.assertGreater(pct["29-1141.00"], pct["11-1011.00"])
            self.assertEqual(o.pct[("Job Zones", "Job Zone", "JZ")]["11-1011.00"], max(o.pct[("Job Zones", "Job Zone", "JZ")].values()))

    def test_weighted_profile(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            fixture(d)
            o = b.Onet(paths(d))
            prof = b.weighted(o, {"11-1011.00": 3.0, "15-1252.00": 1.0})
            raw = prof["Work Context"]["Freedom to Make Decisions"]["CX"]["raw"]
            self.assertAlmostEqual(raw, (3 * 4.9 + 1 * 3.5) / 4, places=3)

    def test_crosswalk_xlsx_splits_esco_and_isco_rows(self):
        import openpyxl

        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "cw.xlsx"
            wb = openpyxl.Workbook()
            ws = wb.active
            for r in [("O*NET-SOC 2019 Crosswalks",), ("title",), (), ("ESCO/ISCO Code", "ESCO/ISCO Title", "O*NET-SOC 2019 Code", "O*NET-SOC 2019 Title"),
                      ("2513.5", "web developer", "15-1254.00", "Web Developers"), ("2513.5", "web developer", "15-1255.00", "x"), ("2513", "Web developers", "15-1254.00", "x"), ("213", "group", "45-1011.00", "x")]:
                ws.append(r)
            wb.save(p)
            esco, isco, titles = b.load_crosswalk_xlsx(p)
            self.assertEqual(esco["2513.5"], ["15-1254.00", "15-1255.00"])
            self.assertEqual(isco["2513"], ["15-1254.00"])
            self.assertNotIn("213", isco)  # 3-digit groups are not used
            self.assertEqual(titles["2513.5"], "web developer")

    def test_crosswalk_with_unexpected_columns_fails(self):
        import openpyxl

        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "cw.xlsx"
            wb = openpyxl.Workbook()
            wb.active.append(("ESCO/ISCO Code", "Something else", "Other"))
            wb.save(p)
            with self.assertRaises(SystemExit):
                b.load_crosswalk_xlsx(p)

    def test_estimated_profiles_file_parses_and_has_rationale(self):
        est = b.parse_estimated(b.ROOT / "reference" / "onet" / "estimated_profiles.csv")
        self.assertGreaterEqual(len(est), 10)
        for lane, e in est.items():
            self.assertTrue(e["rationale"].strip(), lane)
            self.assertAlmostEqual(sum(e["analogs"].values()), 1.0, places=6, msg=lane)
            for a in e["adjustments"]:
                self.assertIn(a["file"], ("Work Context", "Work Activities", "Work Values", "Abilities"), lane)



class UseEstimate(unittest.TestCase):
    def test_rules(self):
        est = {"force": False}
        lane = {"x": {"routes": {"fallback_lane_isco"}}}
        direct = {"x": {"routes": {"crosswalk"}}, "y": {"routes": {"fallback_lane_isco"}}}
        self.assertFalse(b.use_estimate(None, {}))
        self.assertTrue(b.use_estimate(est, {}))
        self.assertTrue(b.use_estimate(est, lane))
        self.assertFalse(b.use_estimate(est, direct))
        self.assertTrue(b.use_estimate({"force": True}, direct))
        self.assertTrue(b.use_estimate(est, direct, data_share=0.4))
        self.assertFalse(b.use_estimate(est, direct, data_share=0.5))
        self.assertFalse(b.use_estimate(None, direct, data_share=0.0))

    def test_data_shares(self):
        class FakeOnet:
            raw = {"Work Activities": {("a", "x", "IM"): 1.0}, "Work Values": {}}

            def rated(self, file):
                return {s for (s, _, _) in self.raw[file]}

        self.assertEqual(b.data_shares(FakeOnet(), {"a": 3.0, "b": 1.0}), {"Work Activities": 0.75, "Work Values": 0.0})
        self.assertEqual(b.data_shares(FakeOnet(), {}), {"Work Activities": 0.0, "Work Values": 0.0})


class LinkOverrides(unittest.TestCase):
    def write(self, text):
        d = Path(tempfile.mkdtemp())
        (d / "o.csv").write_text(text, encoding="utf-8")
        return d / "o.csv"

    def test_parses_and_skips_comments(self):
        p = self.write("# Lane's corrections\nesco_uri,esco_label,onet_codes,rationale\nu1,analyst,13-2099.01; 11-3031.03,\"Because, reasons.\"\n")
        self.assertEqual(b.parse_link_overrides(p), {"u1": {"codes": ["13-2099.01", "11-3031.03"], "rationale": "Because, reasons.", "label": "analyst"}})

    def test_requires_rationale_and_unique_rows(self):
        with self.assertRaises(SystemExit):
            b.parse_link_overrides(self.write("esco_uri,esco_label,onet_codes,rationale\nu1,a,13-2099.01,\n"))
        with self.assertRaises(SystemExit):
            b.parse_link_overrides(self.write("esco_uri,esco_label,onet_codes,rationale\nu1,a,13-2099.01,x\nu1,a,11-1011.00,y\n"))

    def test_missing_file_is_empty(self):
        self.assertEqual(b.parse_link_overrides(Path(tempfile.mkdtemp()) / "none.csv"), {})

class RoleProfiles(unittest.TestCase):
    """The built role profiles (derived/role_onet_profiles.json) against their inputs."""

    def test_roles_link_only_through_their_own_esco_occupations(self):
        import csv

        root = Path(__file__).resolve().parents[1]
        built = json.loads((root / "derived" / "role_onet_profiles.json").read_text())["roles"]
        with open(root / "esco_mapping.csv", encoding="utf-8", newline="") as f:
            role_of = {r["esco_uri"]: r["role_id"] for r in csv.DictReader(f)}
        codes = json.loads((root / "reference" / "crosswalks" / "esco_uri_codes.json").read_text())["occupations"]
        self.assertGreater(len(built), 800)
        for role, p in built.items():
            self.assertTrue(p["esco"], role)
            for uri in p["esco"]:
                self.assertEqual(role_of[uri], role)
                # A link through the crosswalk or a reviewed override: the URI has a crosswalk code or an override.
                self.assertTrue((codes.get(uri) or {}).get("crosswalk_version", {}).get("code") or uri in b.parse_link_overrides(root / "reference" / "crosswalks" / "lane_link_overrides.csv"), uri)
            self.assertAlmostEqual(sum(o["weight"] for o in p["occupations"]), 1.0, places=2)
        # Some link only to O*NET occupations without ratings; the app ranks those by tags.
        rated = sum(1 for p in built.values() if "Interests" in p["descriptors"])
        self.assertGreater(rated / len(built), 0.9)


if __name__ == "__main__":
    unittest.main()
