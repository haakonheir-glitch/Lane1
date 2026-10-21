# Lane

*Evidence, not horoscopes.* Lane helps people find the line of work they're best suited to: a profile from four short assessment modules, a Lane Map ranked against the person's own strengths, short real-world trials ("sprints"), and an evidence record that updates as they go.

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
| **Accounts** | Email and password (bcrypt-hashed). Sessions are random tokens in an httpOnly cookie, and only a SHA-256 hash of each token is stored in the database. `src/proxy.ts` sends signed-out visitors to `/login`, and every page and action checks the session again on the server. |
| **Assessment** | Lane's own item bank (`src/lib/assessment/items.ts`): 36 interest items (RIASEC), 40 personality items (Big Five, half reverse-worded), 16 work-value items, and three timed games with 8 items each (verbal analogies, number series, pattern matrices). Answers save as you go. Game answers are marked on the server, and the browser never receives the answer keys. |
| **Scoring** | `src/lib/assessment/scoring.ts`. Questionnaire scales are the mean of their keyed answers, rescaled to 0–100, with an 80% interval. Games are scored as % correct with an 80% Wilson interval, plus a processing-speed score. Values are ranked weights. Percentiles appear only once 30 people have completed the assessment. |
| **Lane Map** | `src/lib/assessment/lanes.ts`. Each of the 20 lanes has weights over the measured features. Fit is ipsative: each feature is z-scored against the person's own mean and spread. Values add a 20% term. Intervals widen when inputs are missing. Payoff curves and the tie logic are in `src/lib/scoring.ts`. |
| **Sprints** | `src/lib/sprints/`. There are 8 hand-written sprint templates, plus a generic one-week "taste test" for every other lane. You can run one sprint at a time. Tasks, daily check-ins and logs are saved, and the close-out asks whether you'd continue. Improvement is the change from the first third of logged days to the last. Performance percentiles need 10 people who have run the same sprint. |
| **Evidence** | Conviction per lane starts at its relative fit and moves toward sprint evidence (continue 35%, energy 25%, flow 20%, improvement 20%). A completed sprint weighs 1.5× the prior. The timeline is built from your actual records. |
| **Your data** | Settings → **Export data** downloads everything as JSON. **Delete account** (password required) removes it all immediately. |

The questions are new and not yet validated, and the copy says so. Once there is enough data, reliability can be checked per scale using the export or the database.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Apply migrations, build, then serve |
| `npm test` | Scoring and lane-model checks |
| `npm run e2e -- [url]` | Browser run-through as a new user: sign up, all modules, sprint, evidence, export, delete |
| `npm run seed` | Create or reset the demo account |
| `npm run db:generate` | Create a migration after changing `src/lib/db/schema.ts` |
| `npm run shoot -- [url]` / `npm run a11y -- [url]` | Screenshots at 390/1440 px in both themes, and an axe WCAG audit. Both sign in as the demo account. |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |

The browser scripts use Playwright. If its browser isn't installed, run `npx playwright install chromium`, or point `PW_CHROMIUM` at a Chrome binary.

## Folder structure

```
src/
├─ proxy.ts                 sends signed-out visitors to /login
├─ app/
│  ├─ (marketing)/          /, /method
│  ├─ (auth)/               /login, /signup
│  ├─ (onboarding)/start/   onboarding questions
│  ├─ (app)/                assess, profile, lanes, sprints, evidence, settings
│  ├─ actions/              server actions: auth, assessment, sprints, account
│  ├─ api/export/           JSON data export
│  └─ system/               design-system specimen (sample data)
├─ components/              UI components (see /system)
└─ lib/
   ├─ db/                   Drizzle schema + client (Postgres or local PGlite)
   ├─ auth.ts               sessions, password hashing, requireUser()
   ├─ data/                 per-user data access for pages; sample.ts feeds the marketing page and /system
   ├─ assessment/           item bank, scoring, lane model, report text
   └─ sprints/              sprint templates and evidence maths
drizzle/                    SQL migrations
scripts/                    migrate, seed, screenshots, a11y
tests/                      scoring checks, end-to-end run
```

Design decisions are recorded in [`PLAN.md`](PLAN.md#10-decisions).
