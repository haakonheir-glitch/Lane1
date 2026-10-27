"""
Lane taxonomy builder.

Reads the human-editable source files in ../src/*.txt and writes:
  ../taxonomy.json   full nested taxonomy (families > lanes > roles) + ladders + vocabularies
  ../roles.csv       one row per role (open in Excel / Sheets)
  ../lanes.csv       one row per lane

Source format (one family per block, any number of blocks per file):

  @family <id> | <Name> | <one-line description>
  @lane <id> | <Name> | isco 2433 3322 | riasec ES | entry open | sprint direct | modes employed freelance | ladder corporate | tags hunting persuasion
  > One-line description of the lane.
  - <Role title> | <level> | aka alias one; alias two | mode freelance | +tag -tag

Role fields after the level are optional and can come in any order.
Usage: python3 build.py [--isco path/to/isco.json]
"""
import csv, json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

LEVELS = ["trainee", "entry", "mid", "senior", "lead", "manager", "director", "exec", "owner"]
LEVEL_INFO = {
    "trainee":  {"track": "ic",    "label": "Trainee / apprentice / intern", "typical_years": "0"},
    "entry":    {"track": "ic",    "label": "Entry / junior",               "typical_years": "0-2"},
    "mid":      {"track": "ic",    "label": "Mid-level / independent practitioner", "typical_years": "2-5"},
    "senior":   {"track": "ic",    "label": "Senior",                       "typical_years": "5-8"},
    "lead":     {"track": "ic",    "label": "Lead / staff / principal / master", "typical_years": "8+"},
    "manager":  {"track": "mgmt",  "label": "Manager / team lead",          "typical_years": "4+"},
    "director": {"track": "mgmt",  "label": "Head of / director",           "typical_years": "8+"},
    "exec":     {"track": "mgmt",  "label": "Executive / partner / C-level","typical_years": "12+"},
    "owner":    {"track": "owner", "label": "Owner / founder of own business","typical_years": "varies"},
}
MODES = ["employed", "public", "freelance", "owner", "performer", "gig"]
ENTRY = {
    "open": "No formal requirement; you can start by doing the work.",
    "course": "Short course or certificate (weeks to months).",
    "certificate": "Licence or regulated certification required.",
    "apprenticeship": "Vocational education and apprenticeship (in Norway: fagbrev).",
    "degree": "Bachelor's degree normally required.",
    "advanced": "Master's, professional or doctoral degree required.",
    "selection": "Talent-based or competitive selection (tryouts, auditions, admission tests).",
}
SPRINT = {
    "direct": "You can do the real work in a 1-3 week sprint (e.g. make sales calls, publish videos).",
    "simulated": "A sprint can use realistic practice tasks (e.g. build an app, model a company, design a brand).",
    "shadow": "Only observation, interviews and small related tasks are possible (licensed or safety-critical work).",
}
TAGS = {
    "hunting": "Finding new customers or opportunities; frequent rejection",
    "relationship": "Building long-term relationships with the same people",
    "persuasion": "Changing minds; selling ideas or products",
    "negotiation": "Bargaining over price, terms or outcomes",
    "technical": "Deep technical or specialist knowledge",
    "analytical": "Reasoning through complex problems and data",
    "numbers": "Working with figures, money and quantitative models",
    "writing": "Writing is a core output",
    "creative": "Generating original ideas or work",
    "aesthetic": "Visual or sensory taste and judgement",
    "building": "Making or repairing physical things",
    "physical": "Physically demanding work",
    "outdoor": "Much of the work is outdoors or in the field",
    "precision": "Small errors have large consequences",
    "care": "Helping, treating or looking after people",
    "teaching": "Explaining and developing others",
    "leadership": "Leading people and taking responsibility for their output",
    "visible": "Working in front of an audience or the public eye",
    "solo": "Mostly working alone",
    "team": "Mostly working in a close team",
    "risk": "Income or outcomes are uncertain; real downside",
    "routine": "Repeatable, structured tasks",
    "shift": "Shift, night or weekend work",
    "travel": "Frequent travel or time away from home",
    "pressure": "High-stakes, time-pressured moments",
    "competition": "Directly ranked against others",
    "practice": "Mastery requires years of deliberate practice",
    "autonomy": "You set your own schedule and direction",
    "detail": "Careful, detail-oriented work",
}
# How tags connect to the assessment battery (constructs from /assessment).
TAG_TO_CONSTRUCTS = {
    "hunting": ["dispositions.setback_resilience", "dispositions.persuasion", "neo.E3", "interests.E"],
    "relationship": ["neo.E1", "neo.A3", "interests.S", "interests.E"],
    "persuasion": ["dispositions.persuasion", "neo.E3", "interests.E"],
    "negotiation": ["dispositions.persuasion", "neo.E3", "eq.management", "neo.N6(-)"],
    "technical": ["interests.I", "interests.R", "cognitive.general"],
    "analytical": ["cognitive.matrix", "cognitive.series", "neo.O5", "interests.I"],
    "numbers": ["cognitive.quant", "cognitive.number_series", "interests.C"],
    "writing": ["cognitive.verbal(phase2)", "interests.A", "neo.O5"],
    "creative": ["creativity.aut", "neo.O1", "neo.O2", "interests.A"],
    "aesthetic": ["neo.O2", "interests.A"],
    "building": ["interests.R", "cognitive.rotation", "dispositions.physical_embodied"],
    "physical": ["dispositions.physical_embodied", "interests.R"],
    "outdoor": ["lane_interests.outdoor_expedition", "interests.R"],
    "precision": ["neo.C6", "neo.C2", "neo.N6(-)"],
    "care": ["neo.A3", "neo.A6", "interests.S", "eq.understanding"],
    "teaching": ["interests.S", "eq.understanding", "neo.E1"],
    "leadership": ["neo.E3", "biodata.led_group", "eq.management", "neo.C4"],
    "visible": ["dispositions.visibility_comfort", "neo.N4(-)", "neo.E2"],
    "solo": ["dispositions.team_orientation(-)", "dispositions.self_direction"],
    "team": ["dispositions.team_orientation", "neo.A4"],
    "risk": ["dispositions.variance_tolerance", "behaviour.balloon", "neo.E5"],
    "routine": ["interests.C", "neo.O4(-)", "neo.C2"],
    "shift": ["values.working_conditions", "neo.E4"],
    "travel": ["values_ext.freedom_place", "neo.O4"],
    "pressure": ["neo.N6(-)", "neo.N1(-)"],
    "competition": ["dispositions.competitiveness", "values_ext.competition"],
    "practice": ["dispositions.mastery_practice", "dispositions.long_horizon", "behaviour.learning_rate"],
    "autonomy": ["dispositions.self_direction", "values.independence", "values_ext.freedom_time"],
    "detail": ["neo.C2", "neo.C6", "cognitive.symbol_match"],
}
LADDERS = {
    "corporate": {"name": "Corporate (IC and management tracks)", "steps": [
        ["trainee", "Intern / trainee / graduate programme"], ["entry", "Junior / associate (0-2 yrs)"], ["mid", "Professional (2-5 yrs)"],
        ["senior", "Senior (5-8 yrs)"], ["lead", "Lead / staff / principal (8+ yrs, IC track)"], ["manager", "Team lead / manager"],
        ["director", "Head of / director"], ["exec", "VP / C-level"]]},
    "professional_firm": {"name": "Professional services firm (up or out)", "steps": [
        ["trainee", "Summer intern"], ["entry", "Analyst / associate / trainee lawyer (advokatfullmektig)"], ["mid", "Consultant / associate"],
        ["senior", "Senior associate / senior consultant"], ["manager", "Manager / counsel"], ["director", "Director / senior manager / principal"],
        ["exec", "Partner"]]},
    "trades": {"name": "Trades (Norwegian vocational track)", "steps": [
        ["trainee", "Apprentice (lærling), usually 2 years school + 2 years in a company"], ["entry", "Journeyman with trade certificate (fagbrev / svennebrev)"],
        ["mid", "Experienced tradesperson"], ["senior", "Specialist / authorised installer"], ["lead", "Master craftsman (mesterbrev)"],
        ["manager", "Foreman / site lead (bas, formann)"], ["director", "Operations / project manager at a contractor"], ["owner", "Own contracting business"]]},
    "independent": {"name": "Independent / freelance", "steps": [
        ["trainee", "Side project, first paid jobs"], ["entry", "Part-time freelance income"], ["mid", "Full-time freelance, steady clients"],
        ["senior", "Established: waitlist, premium rates, referrals"], ["lead", "Recognised expert: productised offer, teaching others"],
        ["owner", "Studio / agency with employees or subcontractors"]]},
    "creator": {"name": "Creator", "steps": [
        ["trainee", "Hobbyist, publishing consistently"], ["entry", "First income (affiliate, small sponsors)"], ["mid", "Part-time income"],
        ["senior", "Full-time creator"], ["lead", "Top creator in niche; multiple income streams"], ["owner", "Media business / brand with a team"]]},
    "performer": {"name": "Performer / athlete", "steps": [
        ["trainee", "Youth / amateur / student"], ["entry", "Semi-professional, first paid work"], ["mid", "Professional"],
        ["senior", "Established professional"], ["lead", "Elite / headline / international"], ["owner", "Post-career: own brand, coaching, broadcasting"]]},
    "academic": {"name": "Academic", "steps": [
        ["trainee", "Research assistant / master's student"], ["entry", "PhD candidate (stipendiat)"], ["mid", "Postdoc / researcher"],
        ["senior", "Associate professor (førsteamanuensis) / senior researcher"], ["lead", "Professor / research director"],
        ["manager", "Head of department / research group leader"], ["director", "Dean / institute director"]]},
    "medical": {"name": "Medicine (Norway)", "steps": [
        ["trainee", "Medical student"], ["entry", "Junior doctor (LIS1)"], ["mid", "Resident in specialist training (LIS2/LIS3)"],
        ["senior", "Specialist"], ["lead", "Senior consultant (overlege)"], ["manager", "Section chief"], ["director", "Clinic / department head"],
        ["owner", "Private practice owner"]]},
    "public": {"name": "Public sector (Norway)", "steps": [
        ["trainee", "Trainee / summer temp"], ["entry", "Adviser (rådgiver)"], ["mid", "Senior adviser (seniorrådgiver)"],
        ["lead", "Special adviser / chief engineer (spesialrådgiver, sjefingeniør)"], ["manager", "Section head (seksjonssjef / underdirektør)"],
        ["director", "Department director (avdelingsdirektør)"], ["exec", "Director-general / agency head"]]},
    "uniformed": {"name": "Uniformed services", "steps": [
        ["trainee", "Recruit / cadet / student"], ["entry", "Officer, private or constable"], ["mid", "Experienced / specialist"],
        ["senior", "Senior specialist / NCO"], ["manager", "Supervisor / lieutenant / captain"], ["director", "Senior officer / chief"],
        ["exec", "Commander / chief of service"]]},
    "frontline": {"name": "Frontline service", "steps": [
        ["entry", "Associate / worker"], ["mid", "Experienced / trainer of new staff"], ["senior", "Specialist / key holder"],
        ["manager", "Shift lead / supervisor / store manager"], ["director", "Area / regional manager"], ["owner", "Own shop or franchise"]]},
    "founder": {"name": "Founder", "steps": [
        ["trainee", "Side project / early employee at a startup"], ["entry", "First product, first customers"], ["mid", "Profitable or funded company"],
        ["senior", "Scaling: team of 10-50"], ["lead", "Scaled company or exit"], ["owner", "Serial founder / investor"]]},
}

def die(msg):
    print("ERROR:", msg); sys.exit(1)

def parse_kv(fields):
    kv = {}
    for f in fields:
        f = f.strip()
        if not f: continue
        k, _, v = f.partition(" ")
        kv[k] = v.strip()
    return kv

def build(isco_path=None):
    isco = json.load(open(isco_path)) if isco_path and os.path.exists(isco_path) else None
    families, lanes_by_id, role_ids = [], {}, set()
    fam = lane = None
    errors = []
    for path in sorted(glob.glob(os.path.join(ROOT, "src", "*.txt"))):
        for n, raw in enumerate(open(path, encoding="utf-8"), 1):
            line = raw.rstrip("\n")
            where = f"{os.path.basename(path)}:{n}"
            if not line.strip() or line.lstrip().startswith("#"): continue
            if line.startswith("@family "):
                parts = [p.strip() for p in line[8:].split(" | ")]
                fam = {"id": parts[0], "name": parts[1], "description": parts[2] if len(parts) > 2 else "", "lanes": []}
                families.append(fam); lane = None
            elif line.startswith("@lane "):
                if not fam: errors.append(f"{where}: lane before family"); continue
                parts = [p.strip() for p in line[6:].split(" | ")]
                kv = parse_kv(parts[2:])
                lid = parts[0]
                if lid in lanes_by_id: errors.append(f"{where}: duplicate lane id {lid}")
                lane = {
                    "id": lid, "name": parts[1], "family": fam["id"], "description": "",
                    "isco": kv.get("isco", "").split(), "riasec": kv.get("riasec", ""),
                    "entry": kv.get("entry", "open"), "sprint": kv.get("sprint", "simulated"),
                    "modes": kv.get("modes", "employed").split(), "ladder": kv.get("ladder", "corporate"),
                    "tags": kv.get("tags", "").split(), "status": kv.get("status", "curated"), "roles": [],
                }
                for k in kv:
                    if k not in ("isco", "riasec", "entry", "sprint", "modes", "ladder", "tags", "status"):
                        errors.append(f"{where}: unknown lane key '{k}'")
                v = lane
                if v["entry"] not in ENTRY: errors.append(f"{where}: bad entry {v['entry']}")
                if v["sprint"] not in SPRINT: errors.append(f"{where}: bad sprint {v['sprint']}")
                if v["ladder"] not in LADDERS: errors.append(f"{where}: bad ladder {v['ladder']}")
                if not re.fullmatch(r"[RIASEC]{1,3}", v["riasec"] or "X"): errors.append(f"{where}: bad riasec {v['riasec']}")
                for m in v["modes"]:
                    if m not in MODES: errors.append(f"{where}: bad mode {m}")
                for t in v["tags"]:
                    if t not in TAGS: errors.append(f"{where}: bad tag {t}")
                for c in v["isco"]:
                    if isco is not None and c not in isco: errors.append(f"{where}: unknown ISCO code {c}")
                lanes_by_id[lid] = lane; fam["lanes"].append(lane)
            elif line.startswith(">"):
                if lane: lane["description"] = (lane["description"] + " " + line[1:].strip()).strip()
            elif line.startswith("- "):
                if not lane: errors.append(f"{where}: role before lane"); continue
                parts = [p.strip() for p in line[2:].split(" | ")]
                title, level = parts[0], (parts[1] if len(parts) > 1 else "")
                if level not in LEVELS: errors.append(f"{where}: bad level '{level}' for '{title}'"); continue
                role = {"title": title, "level": level, "track": LEVEL_INFO[level]["track"],
                        "mode": "owner" if level == "owner" else lane["modes"][0], "aka": [], "tags_add": [], "tags_remove": []}
                for f in parts[2:]:
                    if f.startswith("aka "): role["aka"] = [a.strip() for a in f[4:].split(";") if a.strip()]
                    elif f.startswith("mode "):
                        role["mode"] = f[5:].strip()
                        if role["mode"] not in MODES: errors.append(f"{where}: bad role mode {role['mode']}")
                    else:
                        for tok in f.split():
                            if tok[:1] in "+-" and tok[1:] in TAGS:
                                (role["tags_add"] if tok[0] == "+" else role["tags_remove"]).append(tok[1:])
                            else: errors.append(f"{where}: unknown role field '{tok}' in '{title}'")
                slug = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")[:60]
                rid = f"{lane['id']}.{slug}"
                k = 2
                while rid in role_ids: rid = f"{lane['id']}.{slug}_{k}"; k += 1
                role_ids.add(rid); role["id"] = rid
                role["tags"] = sorted((set(lane["tags"]) | set(role["tags_add"])) - set(role["tags_remove"]))
                lane["roles"].append(role)
            else:
                errors.append(f"{where}: cannot parse line: {line[:80]}")
    for l in lanes_by_id.values():
        if not l["roles"]: errors.append(f"lane {l['id']} has no roles")
        if not l["description"]: errors.append(f"lane {l['id']} has no description")
        if not l["isco"]: errors.append(f"lane {l['id']} has no ISCO code")
    if errors:
        print("\n".join(errors[:80])); die(f"{len(errors)} validation errors")
    return families, lanes_by_id, isco

def write_outputs(families, lanes, isco):
    n_roles = sum(len(l["roles"]) for l in lanes.values())
    covered = sorted({c for l in lanes.values() for c in l["isco"]})
    meta = {
        "name": "Lane taxonomy", "version": "0.1",
        "counts": {"families": len(families), "lanes": len(lanes), "roles": n_roles,
                   "isco_unit_groups_covered": len(covered), "isco_unit_groups_total": sum(1 for c in isco if len(c) == 4) if isco else None},
        "structure": "family > lane > role. Seniority is the role's level plus the lane's ladder template. Work mode is per role.",
    }
    out = {"meta": meta, "levels": LEVEL_INFO, "modes": MODES, "entry": ENTRY, "sprint": SPRINT,
           "tags": TAGS, "tag_to_constructs": TAG_TO_CONSTRUCTS, "ladders": LADDERS,
           "families": [{**{k: v for k, v in f.items() if k != "lanes"},
                         "lanes": [{**{k: v for k, v in l.items() if k != "roles"},
                                    "isco_labels": {c: isco[c]["label"] for c in l["isco"]} if isco else {},
                                    "roles": [{k: v for k, v in r.items() if k not in ("tags_add", "tags_remove")} for r in l["roles"]]}
                                   for l in f["lanes"]]} for f in families]}
    json.dump(out, open(os.path.join(ROOT, "taxonomy.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "roles.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["role_id", "role", "level", "track", "mode", "also_called", "lane_id", "lane", "family", "entry", "sprint", "riasec", "tags", "isco"])
        famname = {f["id"]: f["name"] for f in families}
        for l in lanes.values():
            for r in l["roles"]:
                w.writerow([r["id"], r["title"], r["level"], r["track"], r["mode"], "; ".join(r["aka"]), l["id"], l["name"], famname[l["family"]],
                            l["entry"], l["sprint"], l["riasec"], " ".join(r["tags"]), " ".join(l["isco"])])
    with open(os.path.join(ROOT, "lanes.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["lane_id", "lane", "family", "description", "roles", "modes", "entry", "sprint", "ladder", "riasec", "tags", "isco"])
        famname = {f["id"]: f["name"] for f in families}
        for l in lanes.values():
            w.writerow([l["id"], l["name"], famname[l["family"]], l["description"], len(l["roles"]), " ".join(l["modes"]), l["entry"],
                        l["sprint"], l["ladder"], l["riasec"], " ".join(l["tags"]), " ".join(l["isco"])])
    return meta, covered

if __name__ == "__main__":
    isco_path = sys.argv[sys.argv.index("--isco") + 1] if "--isco" in sys.argv else os.path.join(ROOT, "reference", "isco08.json")
    families, lanes, isco = build(isco_path)
    meta, covered = write_outputs(families, lanes, isco)
    print(json.dumps(meta["counts"]))
    if isco:
        missing = [c for c in sorted(isco) if len(c) == 4 and c not in covered]
        print(f"ISCO unit groups not covered by any lane: {len(missing)}")
        for c in missing: print("  ", c, isco[c]["label"])
