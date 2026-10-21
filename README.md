# Lane

*Evidence, not horoscopes.* Lane helps people find the line of work they're best suited to: a profile from five assessment sessions built on validated public instruments, a Lane Map ranked against the person's own strengths, short real-world trials ("sprints"), and an evidence record that updates as they go.

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

## Put it online (Vercel + Neon, both have free tiers)

1. **Database.** Create a project at https://neon.tech. Copy the *pooled* connection string (it starts with `postgresql://` and contains `-pooler`).
2. **Hosting.** At https://vercel.com, choose **Add New → Project** and import the `Lane1` GitHub repository.
3. Before deploying, open **Environment Variables** and add:
   - `DATABASE_URL`: the Neon connection string.
   - `APP_TIMEZONE` *(optional)*: the time zone used for sprint days. The default is `Europe/Oslo`.
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
| **Results** | **Sample for now.** `/profile` and `/lanes` show a sample profile, computed by running a persona's answers through the real scoring code. Real results need the published norms and reliabilities in `src/lib/scoring/psychometrics.ts`, which are not transcribed yet (see PLAN D24). Your own answers and scores are saved and included in the export. |
| **Sprints, evidence** | Sample data for now; interactions on the sprint page aren't saved. |
| **Your data** | Settings → **Export data** downloads your sessions, answers, task trials and scores as JSON. **Delete account** (password required) removes everything immediately. |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Apply migrations, build, then serve |
| `npm test` | Item-bank, scoring and generator tests (Vitest) |
| `npm run e2e -- [url]` | Browser run-through as a new user: sign up, all five sessions (every question format and task), app pages, export. Takes about 15 minutes because the timed tasks run in real time. |
| `npm run seed` | Create or reset the demo account (S1 and S2 completed) |
| `npm run db:generate` | Create a migration after changing `src/lib/db/schema.ts` |
| `npm run shoot -- [url]` / `npm run a11y -- [url]` | Screenshots at 390/1440 px in both themes, and an axe WCAG audit. Both sign in as the demo account. |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |

The browser scripts use Playwright. If its browser isn't installed, run `npx playwright install chromium`, or point `PW_CHROMIUM` at a Chrome binary.

## Folder structure

```
assessment/                 the assessment package, as delivered (items, manifest, generators)
src/
├─ proxy.ts                 sends signed-out visitors to /login
├─ app/
│  ├─ (marketing)/          /, /method
│  ├─ (auth)/               /login, /signup
│  ├─ (onboarding)/start/   onboarding questions
│  ├─ (app)/                assess, assess/[session], profile, lanes, sprints, evidence, settings
│  ├─ api/assess/[session]/ state, answer, task, retake (route handlers)
│  ├─ api/export/           JSON data export
│  └─ system/               design-system specimens
├─ components/              UI components (see /system); assess/items and assess/tasks are the renderers
└─ lib/
   ├─ bank/                 package loader, Zod schemas, session plans, seeds, client payload types
   ├─ assess/               session service and task engine (server only)
   ├─ scoring/              pure scoring functions
   ├─ db/                   Drizzle schema + client (Postgres or local PGlite)
   ├─ auth.ts               sessions, password hashing, requireUser()
   ├─ data/                 data access for pages (real sessions; sample results)
   └─ mock/                 sample profile, lanes, sprints, evidence
drizzle/                    SQL migrations
scripts/                    migrate, seed, screenshots, a11y
tests/                      Vitest suites, end-to-end run
```

Design decisions are recorded in [`PLAN.md`](PLAN.md) (sections 7 and 9).
