# ChoreQuest

> **The problem:** we all procrastinate on painful digital chores: a bursting
> inbox, a month of unreviewed expenses, a to-do list that never shrinks.
>
> **ChoreQuest's answer:** every chore becomes a fast, arcade-style game. Each
> move you make in the game *is* a chore decision, recorded the moment you make
> it. Clear the game and the chore is done.

Built as a Matrix-themed web app with React, Firebase and Gemini.

## How each chore becomes a game

| Painful chore | The game | What one move does |
| --- | --- | --- |
| **Reviewing expenses** | **Expense Asteroids.** Upload your bank statement (CSV) and every transaction falls as an asteroid labelled with its merchant and amount. | Keys `1`–`5` fire the food, travel, bills, shopping or other cannon. A hit files that payment under that category (+3 XP, +1 coin). Misses cost shields, and the asteroids fall faster the more you file. |
| **Triaging email** | **Inbox Sort.** Emails arrive as a card stack against a combo timer. | `←` archives, `→` keeps, `↑` stars, `Z` undoes. Every 10th email in a row is a +10 XP combo bonus, and an empty inbox is a "boss defeated". |
| **Getting through the to-do list** | **Quest Board.** Tasks and calendar events become quests rated easy, medium or hard. | Completing a quest pays 10, 25 or 50 XP plus coins. Reopening it takes the reward back, so the score stays honest. |

### What keeps you coming back

- **XP, levels and ranks** (Initiate → Operator → Hacker → Netrunner → Architect → The One), coins and a daily streak.
- **Dashboard:** today's activity, your best day, a 14-day XP chart split by chore (with a table view), and this-week vs last-week and this-month vs last-month comparisons.
- **Neo, the AI coach (Gemini):** ask *"how much more did I score this week?"*, *"where did my money go last month?"* or *"motivate me"*. Neo answers from your actual activity history and spending, and ends with one concrete next move.
- **Your progress follows you:** sign in with Google and everything syncs to Firestore. Guests keep a local save that moves to the cloud on first sign-in.

### Real data in, real results out

- **Bank statements:** any CSV (up to 500 rows) with a date column, a description column (Description, Narration, Particulars, Payee…) and an amount column (Amount, Debit, Withdrawal…). Dates can be `DD/MM/YYYY` or `YYYY-MM-DD`. Duplicate rows are detected, so re-uploading the same statement never double-counts.
- **Spending breakdown:** filed payments roll up into rupee totals per category, which Neo can summarise for any date range.
- **Activity history:** every reward is logged per day, so week and month comparisons reflect what you actually did.

## Architecture

```
src/
  lib/          pure logic, no React: xp rules, stats over daily history,
                expense helpers, coach tool definitions, Firebase init
  state/        React context + reducer for game state and auth
  services/     persistence (local / Firestore) and the coach sessions
  pages/        Dashboard, Expenses, Inbox Sort, Quest Board (lazy-loaded)
  components/   layout, HUD, chart, asteroid game engine, coach chat
```

- **Game state** lives in one reducer (`state/gameReducer.ts`). Every reward also
  updates `history[YYYY-MM-DD]`, which powers the dashboard and the coach.
- **Persistence** (`services/progressStore.ts`) debounces saves to
  `localStorage` for guests or `users/{uid}` in Firestore when signed in.
- **Coach** (`services/coach.ts`) uses Gemini through Firebase AI Logic with
  function calling. Gemini never sees raw data up front: it calls the tools in
  `lib/coachTools.ts` (`get_player_profile`, `get_activity_between`,
  `compare_periods`, `get_spending_summary`), which read the synced state, so
  every number it quotes is real. If Gemini is unavailable the session falls
  back to an on-device engine (`services/localCoach.ts`) that calls the same
  tools.

## Security

- Firestore rules (`firestore.rules`) let a user read and write only their own
  document and validate the shape and size of every save.
- No AI API key ships to the browser: Gemini is called via Firebase AI Logic.
- Optional App Check (reCAPTCHA v3) via `VITE_RECAPTCHA_SITE_KEY`.
- `.env` is git-ignored; see `.env.example`. `.env.production` holds only the
  public Firebase web config, which ships in the bundle anyway.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Firebase web config
npm run dev
```

See `FIREBASE_SETUP.md` for creating the Firebase project, enabling Google
sign-in, Firestore and AI Logic (Gemini Developer API).

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (code-split per page and vendor) |
| `npm test` | Vitest unit tests for stats, reducer and coach |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |

## Deployment (Cloud Run)

The `Dockerfile` builds the site with Node and serves `dist/` from nginx on
port 8080 (`nginx.conf` adds SPA routing, asset caching and security headers).
Production builds take their public Firebase config from `.env.production`.

- **From GitHub:** Cloud Run → Create service → *Continuously deploy from a
  repository*; every push to `main` rebuilds and redeploys.
- **From a terminal:** `gcloud run deploy chorequest --source . --region asia-south2 --allow-unauthenticated`

After the first deploy, add the `*.run.app` domain under Firebase →
Authentication → Settings → Authorized domains so Google sign-in works.

## Accessibility

Keyboard play throughout, visible focus rings, a skip link, ARIA labels on icon
buttons, a live region for coach replies, a table alternative for the chart and
reduced-motion support for the background animation.
