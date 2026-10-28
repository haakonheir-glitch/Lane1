"""
Unit tests for build_career_days.py on synthetic descriptors (made-up values; no real O*NET data
is needed for the selection rule). Run:
    python3 -I taxonomy/build/test_build_career_days.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_career_days as b  # noqa: E402

ELEMENTS = {
    "Selling": ("4.A.1", "Selling things."),
    "Getting Information": ("4.A.2", "Getting information."),
    "Caring": ("4.A.3", "Caring for people."),
    "Drafting": ("4.A.4", "Drafting plans."),
    "Telephone": ("4.C.1", "Phone."),
    "Time Pressure": ("4.C.2", "Deadlines."),
    "Sitting": ("4.C.3", "Sitting."),
}
CATEGORIES = {"4.C.1": {1: "Never", 3: "Once a month", 5: "Every day"}}


def acts(**v):
    return {name.replace("_", " "): {"IM": {"raw": raw, "pct": pct}} for name, (raw, pct) in v.items()}


class CareerDay(unittest.TestCase):
    def test_ranks_important_activities_by_how_distinctive_they_are(self):
        d = {"Work Activities": acts(Selling=(4.6, 99.0), Getting_Information=(4.9, 50.0), Caring=(3.6, 80.0), Drafting=(2.0, 99.5))}
        day = b.career_day(d, ELEMENTS, CATEGORIES, set())
        # Drafting is the most distinctive but not rated important (< 3.5), so it is left out.
        self.assertEqual([a["id"] for a in day["activities"]], ["4.A.1", "4.A.3", "4.A.2"])

    def test_fills_up_to_three_activities_by_rating_when_few_are_important(self):
        d = {"Work Activities": acts(Selling=(3.9, 60.0), Caring=(2.1, 90.0), Drafting=(3.0, 10.0), Getting_Information=(1.5, 99.0))}
        day = b.career_day(d, ELEMENTS, CATEGORIES, set())
        self.assertEqual([a["id"] for a in day["activities"]], ["4.A.1", "4.A.4", "4.A.3"])

    def test_context_keeps_distinctive_elements_skips_used_ones_and_labels_the_nearest_category(self):
        d = {"Work Context": {"Telephone": {"CX": {"raw": 4.7, "pct": 96.0}}, "Time Pressure": {"CX": {"raw": 4.0, "pct": 99.0}}, "Sitting": {"CX": {"raw": 3.0, "pct": 60.0}}}}
        day = b.career_day(d, ELEMENTS, CATEGORIES, {"Time Pressure"})
        self.assertEqual(day["context"], [{"id": "4.C.1", "label": "Every day", "value": 4.7, "pct": 96.0}])

    def test_context_without_categories_has_no_label(self):
        d = {"Work Context": {"Sitting": {"CX": {"raw": 4.2, "pct": 90.0}}}}
        self.assertIsNone(b.career_day(d, ELEMENTS, CATEGORIES, set())["context"][0]["label"])

    def test_fails_loudly_on_an_unknown_element(self):
        with self.assertRaises(SystemExit):
            b.career_day({"Work Activities": acts(Juggling=(4.0, 90.0))}, ELEMENTS, CATEGORIES, set())


if __name__ == "__main__":
    unittest.main()
