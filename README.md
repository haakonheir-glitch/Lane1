# Lane

*Evidence, not horoscopes.* Lane helps people find the line of work they're best suited to: a profile from five assessment sessions built on validated public instruments, a Lane Map of 205 lanes in fit bands against the person's own strengths, short real-world trials ("sprints"), and an evidence record that updates as they go.

Accounts, answers, scores, sprints and evidence are saved to a Postgres database.

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

1. Create a key in the Anthropic Console (https://console.anthropic.com → API keys), **inside a workspace** (for example "Default"). Copy the secret when it's shown: it starts with `sk-ant-` and is shown only once. (The `apikey_01…` value in the key list is just its ID.) A key that isn't tied to a workspace also works if you add `ANTHROPIC_WORKSPACE_ID=<workspace id>` to `.env.local`.
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
   - `APP_TIMEZONE` *(optional)*: the time zone used for sprint days. The default is `Europe/Oslo`.
   - `ANTHROPIC_API_KEY` *(optional)*: turns on the Claude-written report.
4. Click **Deploy**. The build creates the database tables automatically (`npm run build` runs `scripts/migrate.mjs` first), and every later deploy applies any new migrations.

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
| **Lane taxonomy** | `taxonomy/` (unchanged from the delivered zip): 34 families, 205 lanes, 1,883 roles, with ladders, payoff curves, entry routes, sprint feasibility and tag-to-assessment links. `src/lib/taxonomy/` loads `taxonomy.json` at build time with generated types and validates it. Don't edit `taxonomy.json` by hand: edit `taxonomy/src/*.txt`, then run `npm run taxonomy:build`. |
| **Lane matching** | One pure function, `matchLanes()` in `src/lib/matching/`, takes a profile in the scoring output shape. Fit is relative to the person's own average: half RIASEC congruence, half the lane's demand tags scored through `tag_to_constructs`. Only validated scales count (experimental ones are listed as "not counted yet"). Lanes go into bands (strong fit / worth testing / unlikely) by the BLUEPRINT reliability rule, never a 1–205 ranking. Roles inside a lane are ranked by their tags, starting from the person's realistic entry point; management roles are never recommended as a start. |
| **Lane Map** | `/lanes`: grouped by family or by band, with filters for family, work mode, payoff, entry route and sprint feasibility, and the fit / fit × payoff toggle. The detail panel shows the fit drivers, the top starting roles with reasons, every role on the lane's ladder with the entry point highlighted, the payoff curve, and the next step: a real sprint (direct lanes), practice tasks (simulated) or an interview-and-shadow plan (shadow), at `/lanes/[lane]/plan`. Winner-take-all lanes always say the median income is low. |
| **Job-title search** | Onboarding asks what you do now (and for how long) and what you're considering. `GET /api/taxonomy/search` matches role titles and aliases first (Norwegian included), then the 3,039 ESCO occupation labels, and resolves to a lane. |
| **Results** | Once S1 or S2 is done, `/profile` and `/lanes` show **your own results**, scored relative to yourself (`src/lib/scoring/self.ts`): each scale against your other scales on the same test, with ranges. Comparisons with other people need the published norms in `src/lib/scoring/psychometrics.ts`, not transcribed yet (PLAN D24). Before S1/S2, a labelled sample profile is shown. |
| **Written report** | `src/lib/report/`: the app builds a set of facts from your computed scores (no name, email or answers); Claude (`claude-opus-5-5`, structured output) writes the report from those facts only. A check rejects any report citing a figure that isn't in the scores (one rewrite, then it's refused). Reports are stored with a fingerprint of the facts and reused until the scores change. Needs `ANTHROPIC_API_KEY`. |
| **Sprints, evidence** | Sample data for now; interactions on the sprint page aren't saved. In lanes that can't be tried directly, the sample entries are practice tasks, not sprints. |
| **Your data** | Settings → **Export data** downloads your sessions, answers, task trials and scores as JSON. **Delete account** (password required) removes everything immediately. |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Apply migrations, build, then serve |
| `npm test` | Item-bank, scoring and generator tests (Vitest) |
| `npm run e2e -- [url]` | Browser run-through as a new user: sign up, onboarding with job-title search, all five sessions (every question format and task), Lane Map filters, lane detail, plans, app pages, export. Takes about 15 minutes because the timed tasks run in real time; `SESSIONS= npm run e2e` skips the assessment (about a minute). |
| `npm run taxonomy:build` | Rebuild `taxonomy.json` from `taxonomy/src/*.txt` (Python 3) and regenerate the TypeScript types and ESCO search index |
| `npm run taxonomy:types` | Regenerate only the types and ESCO index (a test fails when they're out of date) |
| `npm run seed` | Create or reset the demo account (S1 and S2 completed) |
| `npm run db:generate` | Create a migration after changing `src/lib/db/schema.ts` |
| `npm run shoot -- [url]` / `npm run a11y -- [url]` | Screenshots at 390/1440 px in both themes, and an axe WCAG audit. Both sign in as the demo account. |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |

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
│  ├─ (app)/                assess, assess/[session], profile, lanes, sprints, evidence, settings
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
   ├─ matching/             lane fit, bands, entry points, role ranking, payoff curves (pure)
   ├─ lanes/                Lane Map view types, labels and next-step plans
   ├─ db/                   Drizzle schema + client (Postgres or local PGlite)
   ├─ auth.ts               sessions, password hashing, requireUser()
   ├─ data/                 data access for pages (real sessions; sample results)
   └─ mock/                 sample profile, sprints, evidence
drizzle/                    SQL migrations
scripts/                    migrate, seed, taxonomy types, screenshots, a11y
tests/                      Vitest suites, end-to-end run
```

Design decisions are recorded in [`PLAN.md`](PLAN.md) (sections 7 and 9).

## Before launch

- Transcribe the published norms and reliabilities into `src/lib/scoring/psychometrics.ts` (PLAN D24).
- Rerun the ESCO mapping against the official ESCO download (`python3 taxonomy/build/map_esco.py occupations_en.csv`), as the taxonomy README says. The bundled copy has a few truncated labels (for example "heating, ventilation, air").
- Confirm the taxonomy's deliberate exclusions (taxonomy README, "Deliberate exclusions").
