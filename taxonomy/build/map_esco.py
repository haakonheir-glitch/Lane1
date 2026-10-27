"""
Map every ESCO occupation to its closest Lane role (and so to a lane).

Inputs:  ../taxonomy.json, ESCO occupations JSON ([{uri,label,alt,desc}]), optional overrides CSV
Outputs: ../esco_mapping.csv  (uri, esco_label, lane_id, role_id, score, method)
         printed review lists for low-confidence matches

Method: TF-IDF over word unigrams/bigrams + character 3-5-grams.
  score = 0.65 * similarity(ESCO label+aliases, role title+aliases)
        + 0.35 * similarity(ESCO label+aliases+description, lane document)
Matches below the review threshold are listed for manual review; manual decisions go in
reference/esco_overrides.csv (uri_suffix,lane_id[,role_id]) and win over the model.
"""
import csv, json, os, re, sys
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
from scipy.sparse import hstack

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def clean(t):
    t = t.lower()
    t = re.sub(r"\(.*?\)", " ", t)
    return re.sub(r"[^a-z0-9æøå/ ]+", " ", t)

def load_esco(path):
    """Accepts either the official ESCO occupations CSV (occupations_en.csv from the ESCO download page)
    or a JSON list of {uri, label, alt, desc}. The official CSV also carries the true ISCO group."""
    if path.lower().endswith(".csv"):
        out = []
        for row in csv.DictReader(open(path, encoding="utf-8")):
            if row.get("conceptType", "Occupation") != "Occupation": continue
            out.append({"uri": row["conceptUri"], "label": row["preferredLabel"], "alt": " ".join((row.get("altLabels") or "").split("\n")),
                        "desc": row.get("description") or "", "isco": (row.get("iscoGroup") or "").strip()[:4]})
        return out
    return json.load(open(path, encoding="utf-8"))

def main(esco_path, review_threshold=0.30, isco_text_path=None):
    tax = json.load(open(os.path.join(ROOT, "taxonomy.json"), encoding="utf-8"))
    esco = load_esco(esco_path)
    roles, role_lane, lane_docs, lane_ids, role_levels = [], [], [], [], []
    for fam in tax["families"]:
        for lane in fam["lanes"]:
            lane_ids.append(lane["id"])
            doc = " ".join([lane["name"], lane["description"], " ".join(lane["isco_labels"].values())] +
                           [r["title"] + " " + " ".join(r["aka"]) for r in lane["roles"]])
            lane_docs.append(clean(doc))
            for r in lane["roles"]:
                roles.append((r["id"], clean(r["title"] + " " + " ".join(r["aka"]))))
                role_lane.append(len(lane_ids) - 1)
                role_levels.append(r["level"])
    role_lane = np.array(role_lane)
    # label region (+ first sentence of the description) for role matching; full text for lane matching
    e_short = [clean(o["label"] + " " + o["alt"] + " " + o["desc"].split(". ")[0]) for o in esco]
    e_long = [clean(o["label"] + " " + o["alt"] + " " + o["desc"]) for o in esco]

    def vecs(fit_texts):
        w = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1, stop_words="english").fit(fit_texts)
        c = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=2).fit(fit_texts)
        return lambda xs: normalize(hstack([w.transform(xs), c.transform(xs)]).tocsr())

    v1 = vecs([t for _, t in roles] + e_short)
    R = v1([t for _, t in roles]); E1 = v1(e_short)
    sim_role = (E1 @ R.T).toarray()
    # label-vs-role similarity: best of (title, each alias) so long aliases don't dilute the score
    names, owner, k = [], [], 0
    for fam in tax["families"]:
        for lane in fam["lanes"]:
            for r in lane["roles"]:
                for nm in [r["title"]] + r["aka"]:
                    names.append(clean(nm)); owner.append(k)
                k += 1
    owner = np.array(owner)
    E_label = v1([clean(o["label"]) for o in esco])
    S_names = (E_label @ v1(names).T).toarray()
    sim_label = np.full((len(esco), len(roles)), -1.0)
    np.maximum.at(sim_label.T, owner, S_names.T)
    v2 = vecs(lane_docs + e_long)
    L = v2(lane_docs); E2 = v2(e_long)
    sim_lane = (E2 @ L.T).toarray()

    # ISCO signal: infer each ESCO occupation's likely ISCO unit groups from the official group texts,
    # then reward lanes that cover those groups.
    lane_isco = np.zeros((len(esco), len(lane_ids)))
    if isco_text_path:
        isco_txt = {c: v["text"] for c, v in json.load(open(isco_text_path, encoding="utf-8")).items() if len(c) == 4}
        codes = sorted(isco_txt)
        v3 = vecs([clean(isco_txt[c]) for c in codes] + e_long)
        I = v3([clean(isco_txt[c]) for c in codes]); E3 = v3(e_long)
        sim_isco = (E3 @ I.T).toarray()
        # softmax-like sharpening so the top groups dominate
        top = np.sort(sim_isco, axis=1)[:, -1:]
        sharp = np.exp((sim_isco - top) * 25)
        code_col = {c: k for k, c in enumerate(codes)}
        lane_codes = []
        for fam in tax["families"]:
            for lane in fam["lanes"]:
                lane_codes.append([code_col[c] for c in lane["isco"] if c in code_col])
        for li, cols in enumerate(lane_codes):
            if cols: lane_isco[:, li] = sharp[:, cols].max(axis=1)
    # If the input carries the official ISCO group (official ESCO CSV), use it instead of the inferred one.
    lane_code_sets = [set(l["isco"]) for fam in tax["families"] for l in fam["lanes"]]
    for i, o in enumerate(esco):
        if o.get("isco"):
            lane_isco[i] = np.array([1.0 if o["isco"] in cs else 0.0 for cs in lane_code_sets])

    overrides = {}
    ov_path = os.path.join(ROOT, "reference", "esco_overrides.csv")
    if os.path.exists(ov_path):
        for row in csv.reader(open(ov_path, encoding="utf-8")):
            if row and row[0].strip() and not row[0].startswith("#"):
                overrides[row[0].strip()] = [x.strip() for x in row[1:] if not x.strip().startswith("#")]
    lane_index = {l: i for i, l in enumerate(lane_ids)}
    role_index = {rid: i for i, (rid, _) in enumerate(roles)}

    # Seniority prior: unless the ESCO title signals management/ownership, prefer practitioner roles.
    role_level = np.array([r_level for r_level in role_levels])
    mgmt_mask = np.isin(role_level, ["manager", "director", "exec"])
    owner_mask = role_level == "owner"
    trainee_mask = role_level == "trainee"
    rules = []
    rules_path = os.path.join(ROOT, "reference", "esco_rules.csv")
    if os.path.exists(rules_path):
        for row in csv.reader(open(rules_path, encoding="utf-8")):
            if row and row[0].strip() and not row[0].startswith("#"):
                rules.append((re.compile(row[0].strip()), row[1].strip()))

    def pick_role_in_lane(i, lane_id, label):
        cand = np.where(role_lane == lane_index[lane_id])[0]
        sc = 0.7 * sim_label[i][cand] + 0.3 * sim_role[i][cand]
        mg = bool(re.search(r"\b(manager|supervisor|director|head|chief|superintendent|foreman|leader|coordinator|governor|commander)\b", label))
        ow = bool(re.search(r"\b(owner|entrepreneur|proprietor|operator of)\b", label))
        sr = bool(re.search(r"\b(senior|lead|principal|chief|master|expert|specialist|consultant)\b", label))
        tr = bool(re.search(r"\b(apprentice|trainee|intern|student|assistant|aide|helper)\b", label))
        for k, ci in enumerate(cand):
            lv = role_levels[ci]
            if lv in ("manager", "director", "exec"): sc[k] += 0.08 if mg else -0.12
            elif lv == "owner": sc[k] += 0.08 if ow else -0.15
            elif lv in ("senior", "lead"): sc[k] += 0.03 if sr else -0.06
            elif lv == "trainee": sc[k] += 0.05 if tr else -0.08
            elif mg: sc[k] -= 0.04
        return roles[cand[int(np.argmax(sc))]][0]

    # Output labels: the official ESCO v1.2.0 label per URI (taxonomy/build/fetch_esco_codes.py) where we have it.
    # The bundled ESCO copy truncates labels at the first comma; matching above still uses the input text.
    codes_path = os.path.join(ROOT, "reference", "crosswalks", "esco_uri_codes.json")
    official = {}
    if os.path.exists(codes_path):
        for uri, rec in json.load(open(codes_path, encoding="utf-8"))["occupations"].items():
            label = ((rec.get("crosswalk_version") or {}).get("label") or "").strip()
            if label:
                official[uri] = " ".join(label.split())
    out, low = [], []
    for i, o in enumerate(esco):
        combined = 0.50 * sim_role[i] + 0.20 * sim_lane[i][role_lane] + 0.30 * lane_isco[i][role_lane]
        title = (o["label"] + " " + o["alt"]).lower()
        is_mgmt = re.search(r"\b(manager|supervisor|director|head|chief|superintendent|foreman|leader|coordinator)\b", o["label"].lower())
        is_owner = re.search(r"\b(owner|entrepreneur|proprietor)\b", title)
        if not is_mgmt: combined = combined - 0.06 * mgmt_mask
        else: combined = combined + 0.04 * mgmt_mask
        if not is_owner: combined = combined - 0.06 * owner_mask
        if not re.search(r"\b(apprentice|trainee|intern|student|assistant)\b", o["label"].lower()): combined = combined - 0.03 * trainee_mask
        rule_lane = next((ln for rx, ln in rules if rx.search(o["label"].lower())), None)
        if rule_lane:
            assert rule_lane in lane_index, f"rule lane {rule_lane} unknown"
            combined = combined + 1.0 * (role_lane == lane_index[rule_lane])
        j = int(np.argmax(combined))
        lane_id, role_id, score, method = lane_ids[role_lane[j]], roles[j][0], float(min(combined[j], 1.0) if not rule_lane else combined[j] - 1.0), ("rule" if rule_lane else "model")
        key = o["uri"].rsplit("/", 1)[-1]
        ov = overrides.get(key) or overrides.get(key[:8]) or None
        if ov:
            lane_id = ov[0]
            assert lane_id in lane_index, f"override lane {lane_id} unknown"
            if len(ov) > 1 and ov[1]:
                assert ov[1] in role_index, f"override role {ov[1]} unknown"
                role_id = ov[1]
            else:  # best role inside the chosen lane
                mask = role_lane == lane_index[lane_id]
                cand = np.where(mask)[0]
                role_id = roles[cand[int(np.argmax(combined[cand]))]][0]
            method = "manual"
        if not (method == "manual" and ov and len(ov) > 1 and ov[1]):
            role_id = pick_role_in_lane(i, lane_id, o["label"].lower())
        out.append([o["uri"], official.get(o["uri"], o["label"]), lane_id, role_id, round(score, 3), method])
        if method == "model" and score < review_threshold:
            low.append((score, key, o["label"], lane_id, role_id))
    with open(os.path.join(ROOT, "esco_mapping.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(["esco_uri", "esco_label", "lane_id", "role_id", "score", "method"]); w.writerows(out)
    print(f"mapped {len(out)} ESCO occupations; {len(low)} below review threshold {review_threshold}; manual overrides {sum(1 for r in out if r[5]=='manual')}")
    return out, low

if __name__ == "__main__":
    # Usage: python3 map_esco.py [esco_file] [review_threshold] [--isco-text file] [--dump]
    #   esco_file defaults to reference/esco_occupations.json; the official ESCO CSV (occupations_en.csv) also works.
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--isco-text" in sys.argv: args = [a for a in args if a != sys.argv[sys.argv.index("--isco-text") + 1]]
    esco_file = args[0] if args else os.path.join(ROOT, "reference", "esco_occupations.json")
    threshold = float(args[1]) if len(args) > 1 else 0.40
    isco_arg = sys.argv[sys.argv.index("--isco-text") + 1] if "--isco-text" in sys.argv else os.path.join(ROOT, "reference", "isco08_full.json")
    out, low = main(esco_file, threshold, isco_arg)
    if "--dump" in sys.argv:
        import collections
        by = collections.defaultdict(list)
        for r in out: by[r[2]].append(r)
        for lane in sorted(by):
            print(f"\n## {lane} ({len(by[lane])})")
            for r in sorted(by[lane], key=lambda x: x[4]):
                print(f"  {r[4]:.2f} {r[0].rsplit('/',1)[-1][:8]} {r[1]}  -> {r[3].split('.',1)[1]}")
