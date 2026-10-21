# Lane Assessment Package v0.1

The full assessment battery for Lane: item banks, scoring rules, task generators and the research blueprint.

| File | What it is |
|---|---|
| `BLUEPRINT.md` | The research basis, design decisions, scoring model, lane-mapping model and validation plan. Read this first. |
| `ITEMS_PREVIEW.md` | Every question in plain text, module by module, for human review. Generated from the JSON. |
| `battery_manifest.json` | Session plan: which modules run in which of the five sessions, timings and what each session unlocks. |
| `items/01-14_*.json` | Machine-readable item banks with response formats, scoring keys, licensing and status flags. |
| `generators/generators.ts` | Seeded, dependency-free generators for every cognitive and behavioural task. |

## Handing this to Claude Code

Copy this whole folder into the app repo as `/assessment`, then add the following to the app master prompt (after section 5):

> **Assessment content.** All assessment content lives in `/assessment`. Read `assessment/BLUEPRINT.md` and `assessment/battery_manifest.json` before building the assessment flow.
> - Load items from `assessment/items/*.json` at build time. Do not hard-code questions in components.
> - Render the response format each file declares: `likert5`, `likert7`, `forced_q_sort`, `single`, `multi`, `text`, `number`, `slider_0_100`.
> - Implement the scoring rules in each file's `scoring` block as pure, unit-tested functions in `/lib/scoring`.
> - Import cognitive items from `assessment/generators/generators.ts`; seed each item from `hash(userId + taskId + attemptNumber)`.
> - Respect `status: EXPERIMENTAL`: collect the data, but do not show experimental scales as user-facing scores.
> - Respect `administer: false` (IPIP-NEO facet O6 is excluded).
> - Insert the validity items from file 12 at their `insert_after` positions.
> - Show the O*NET attribution from file 03 in the footer of every page that displays interest or values results.
> - Log per-item response time in milliseconds, plus device class and input type, for every response.
> - Keep answer keys on the server. Generate cognitive items and score cognitive, emotion-SJT and validity items in a server route, and send the client only what it needs to render. Answer keys shipped in the browser bundle can be read by anyone who opens dev tools.

## Status at a glance

- **Validated, ready to use:**
  - IPIP-NEO-120 (116 items administered)
  - Mini-IPIP6 Honesty-Humility
  - O*NET Interest Profiler Short Form
  - O*NET Work Importance Locator
  - Mini-IPIP (informant version)
- **Established paradigms, items need IRT calibration:** all cognitive and behavioural tasks.
- **Experimental, original to Lane, hidden from users until the pilot:**
  - interest, values and disposition extensions
  - emotion SJT
  - applied creativity tasks
  - biodata
  - observer items
- **Not yet built:** verbal reasoning (needs separate Norwegian and English item development).

## Testing the generators

```bash
cd generators && node --experimental-strip-types generators.test.ts   # Node 22.6+
```

The test checks 8,000 matrix items: each must have exactly one valid answer, no majority-feature shortcut and visible rotations. It also checks 2,000 seeds each of number series, letter series, quantitative problems, rotation items, digit span, symbol matching and discounting, requiring valid answers among unique options. Current result: all passed. Port these checks into the app's test suite.
