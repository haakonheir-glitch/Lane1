# Lane

*Evidence, not horoscopes.* Lane helps people find the line of work they're best suited to: a profile from five assessment sessions built on validated public instruments, a profile report that opens with how the person works best and where that work exists, and a Career map of 205 career paths on fulfilment fit and ability fit, described with O*NET occupational data. Lane describes fit; it doesn't coach people into a career or ask them to try one.

Accounts, answers, scores and written reports are saved to a Postgres database.

## Run it on your computer

Requires Node 20.9+.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Start** to create an account.

On your computer the app uses a built-in database stored in `.data/pglite`, so there's nothing to set up. Delete that folder to start from an empty database.

### Demo account

To see every screen filled in without taking the assessment yourself:

```bash
# stop `npm run dev` first (Ctrl+C); the local database allows one process at a time
npm run seed
npm run dev
```

Sign in as **demo@lane.local** / **lane-demo-2026**. Running the seed again resets the demo account.

### Written report (Claude)

The Profile report page can have Claude write your report from your scores. It needs an Anthropic API key:

1. Create an API key in the Claude Console (https://platform.claude.com → API keys). Copy the secret when it's shown: it starts with `sk-ant-` and is shown only once. (The `apikey_01…` value in the key list is just its ID.)
   - If you choose a single workspace when creating the key, you're done.
   - If the key isn't scoped to a workspace (for example a personal key, `sk-ant-usr-…`), also copy a workspace ID (it starts with `wrkspc_`) from the Workspaces page (https://platform.claude.com/settings/workspaces) and add a second line to `.env.local`: `ANTHROPIC_WORKSPACE_ID=wrkspc_…`.
2. In the project folder, create a file named `.env.local` containing one line:
   ```
   ANTHROPIC_API_KEY=sk-ant-…your key…
   ```
   This file is ignored by git, so the key never leaves your computer. Don't paste the key anywhere else.
3. Restart the app (`Ctrl+C`, then `npm run dev`), open **Profile report** and press **Write my report**.

Each report costs a few cents and takes about a minute. It's saved and only rewritten when your scores change. What's sent to Anthropic: your computed scores, lane matches and the job titles you entered; not your name, email or individual answers.

## Put it online (Vercel + Neon, both have free tiers)

1. **Database.** Create a project at https://neon.tech. Copy the *pooled* connection string (it starts with `postgresql://` and contains `-pooler`).
2. **Hosting.** At https://vercel.com, choose **Add New → Project** and import the `Lane1` GitHub repository.
3. Before deploying, open **Environment Variables** and add:
   - `DATABASE_URL`: the Neon connection string.
   - `APP_TIMEZONE` *(optional)*: the time zone used for dates such as the report ID and "member since". The default is `Europe/Oslo`.
   - `ANTHROPIC_API_KEY` *(optional)*: turns on the Claude-written report.
   - `REPORT_TIER` *(optional)*: `free` shows the report's cover, summary sheet and top three career paths, with the rest as outlined placeholders; `full` (the default) shows everything, the whole Career map and the PDF. No payments are wired to it.
   - `NEXT_PUBLIC_SITE_URL` *(optional)*: your public address (e.g. `https://lane.no`), used for the canonical URL and the share image links. On Vercel the production address is used automatically when this isn't set.
4. Click **Deploy**. The build creates the database tables automatically (`npm run build` runs `scripts/migrate.mjs` first), and every later deploy applies any new migrations (0004 adds the two outcome check-in tables; it only creates tables).

Your site is then live at the address Vercel shows, and anyone can sign up. To load the demo account into the hosted database, run this once from your computer:

```bash
DATABASE_URL="postgresql://…" npm run seed -- --force
```

## How it works

| Area | What happens |
|---|---|
| **Accounts** | Email and password (bcrypt-hashed). Sessions are random tokens in an httpOnly cookie, and only a SHA-256 hash of each token is stored in the database. `src/proxy.ts` sends signed-out visitors to `/login`, and every page and route checks the session again on the server. |
| **Assessment content** | The assessment package in `assessment/` (unchanged): BLUEPRINT, `battery_manifest.json` and item files 01–14. `src/lib/bank/` validates every file with Zod and builds sessions S1–S5 from the manifest: items with `administer: false` are left out, and validity items are inserted at their positions. No question is written in the app's code. |
| **Sessions** | `/assess` lists S1–S5 with minutes and what each unlocks. Each answer is saved as it is given, with its response time (from paint to answer), device class and input type. Reload resumes in place. A timed task that was interrupted restarts with fresh items. |
| **Cognitive tasks** | 12 generated tasks (matrices, number and letter series, quantitative, 2D rotation, backward digits, Corsi, symbol match, choice RT, learning rate, balloon, delay discounting). Items come from `assessment/generators/generators.ts` with a per-user seed (`src/lib/bank/seed.ts`). Answer keys, explosion points and the learning mapping stay on the server (`src/lib/assess/tasks.ts`); the browser gets render data only. |
| **Scoring** | Pure, tested functions in `src/lib/scoring/`: IPIP-NEO-120 facets and domains, Honesty-Humility, O*NET® Interest Profiler sums and Holland code, Work Importance Locator, cognitive accuracy, span, speed, learning, risk and patience, validity flags and confidence, and the BLUEPRINT §7 maths (90% intervals, the relative-strength test). Lane's experimental scales are scored but marked hidden. |
| **Lane taxonomy** | `taxonomy/` (unchanged from the delivered zip): 34 families, 205 lanes, 1,883 roles, with ladders, entry routes, sprint feasibility and tag-to-assessment links. `src/lib/taxonomy/` loads `taxonomy.json` at build time with generated types and validates it. Don't edit `taxonomy.json` by hand: edit `taxonomy/src/*.txt`, then run `npm run taxonomy:build`. |
| **Matching** | Matching v2 (`src/lib/matching/v2/`, the default; method in `docs/MATCHING_V2.md`): fulfilment fit (needs–supplies, the headline) and ability fit (demands–abilities) against each career path's O*NET profile, 500 Monte Carlo draws of the person's scores, bands from rank stability, never a 1–205 ranking. `MATCHING_VERSION=v1` switches back to v1 (`matchLanes()`: RIASEC congruence plus demand tags). Roles inside a career path are ranked by their tags, starting from the person's realistic entry point; management roles are never recommended as a start. |
| **Career map** | `/lanes`: the fit map (fulfilment × ability, when most career paths have ability fit) or lists by family or band, with filters for family, work mode and entry route. The detail panel shows a typical day (O*NET work activities and context), both fits with ranges, why it fits, where it rubs, you against the career on value modes and working conditions, how people get in, the top starting roles with reasons, and the ladder with the entry point highlighted. There are no income labels (see `design/REMOVED.md`). |
| **Job-title search** | Onboarding asks what you do now (and for how long) and what you're considering. `GET /api/taxonomy/search` matches role titles and aliases first (Norwegian included), then the 3,039 ESCO occupation labels, and resolves to a lane. |
| **Results** | Once S1 or S2 is done, `/profile` and `/lanes` show **your own results**, scored relative to yourself (`src/lib/scoring/self.ts`): each scale against your other scales on the same test, with ranges. Comparisons with other people need the published norms in `src/lib/scoring/psychometrics.ts`, not transcribed yet (PLAN D24). Before S1/S2, a labelled sample profile is shown. |
| **Written report** | `src/lib/report/`: the app builds a set of facts from your computed scores (no name, email or answers); Claude (`claude-opus-5-5`, structured output) writes the report from those facts only. A check rejects any report citing a figure that isn't in the scores (one rewrite, then it's refused). Reports are stored with a fingerprint of the facts and reused until the scores change. Needs `ANTHROPIC_API_KEY`. |
| **Your data** | Settings → **Export data** downloads your sessions, answers, task trials and scores as JSON. **Delete account** (password required) removes everything immediately. |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Apply migrations, build, then serve |
| `npm test` | Item-bank, scoring and generator tests (Vitest) |
| `npm run e2e -- [url]` | Browser run-through as a new user: sign up, onboarding with job-title search, all five sessions (every question format and task), Career map (fit map, lists, filters), career path detail, app pages, export. Takes about 15 minutes because the timed tasks run in real time; `SESSIONS= npm run e2e` skips the assessment (about a minute). |
| `npm run taxonomy:build` | Rebuild `taxonomy.json` from `taxonomy/src/*.txt` (Python 3) and regenerate the TypeScript types and ESCO search index |
| `npm run taxonomy:types` | Regenerate only the types and ESCO index (a test fails when they're out of date) |
| `npm run seed` | Create or reset the demo account (S1 and S2 completed) |
| `npm run db:generate` | Create a migration after changing `src/lib/db/schema.ts` |
| `npm run shoot -- [url]` / `npm run a11y -- [url]` | Screenshots at 390/1440 px in both themes, and an axe WCAG audit. Both sign in as the demo account. |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run calibrate -- --dry-run` / `npm run calibrate` | Offline calibration of reasoning difficulty (PLAN D50). Dry run shows calls and cost; the real run reads `ANTHROPIC_API_KEY` and writes `assessment/calibration/output/`. `--mock` runs without the API. The app only reads the resulting table. |

The browser scripts use Playwright. If its browser isn't installed, run `npx playwright install chromium`, or point `PW_CHROMIUM` at a Chrome binary.

## Folder structure

```
assessment/                 the assessment package, as delivered (items, manifest, generators)
taxonomy/                   the lane taxonomy, as delivered (src, build, taxonomy.json, ESCO mapping)
src/
├─ proxy.ts                 sends signed-out visitors to /login
├─ app/
│  ├─ (marketing)/          /, /method
│  ├─ (auth)/               /login, /signup
│  ├─ (onboarding)/start/   onboarding questions
│  ├─ (app)/                assess, assess/[session], profile, lanes, settings
│  ├─ api/assess/[session]/ state, answer, task, retake (route handlers)
│  ├─ api/taxonomy/search/  job-title search
│  ├─ api/export/           JSON data export
│  └─ system/               design-system specimens
├─ components/              UI components (see /system); assess/items and assess/tasks are the renderers
└─ lib/
   ├─ bank/                 package loader, Zod schemas, session plans, seeds, client payload types
   ├─ assess/               session service and task engine (server only)
   ├─ scoring/              pure scoring functions
   ├─ taxonomy/             taxonomy loader, generated types, ESCO index, job-title search
   ├─ matching/             lane fit, bands, entry points, role ranking (pure)
   ├─ lanes/                Lane Map view types, labels and next-step plans
   ├─ db/                   Drizzle schema + client (Postgres or local PGlite)
   ├─ auth.ts               sessions, password hashing, requireUser()
   ├─ data/                 data access for pages (real sessions; sample results)
   └─ mock/                 sample profile
drizzle/                    SQL migrations
scripts/                    migrate, seed, taxonomy types, screenshots, a11y
tests/                      Vitest suites, end-to-end run
```

Design decisions are recorded in [`PLAN.md`](PLAN.md) (sections 7 and 9).

## Before launch

- Transcribe the published norms and reliabilities into `src/lib/scoring/psychometrics.ts` (PLAN D24).
- Rerun the ESCO mapping against the official ESCO download (`python3 taxonomy/build/map_esco.py occupations_en.csv`), as the taxonomy README says. The bundled copy has a few truncated labels (for example "heating, ventilation, air").
- Confirm the taxonomy's deliberate exclusions (taxonomy README, "Deliberate exclusions").
