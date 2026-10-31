# ChoreQuest

A Matrix-themed productivity game. Sorting email, filing expenses and finishing
quests earns XP, coins and streaks; a dashboard tracks progress over time, and
Neo, an AI coach, answers questions about your own data and keeps you moving.

## Features

- **Expense Asteroids** – each payment falls as an asteroid labelled with the
  merchant and amount. Keys `1`–`5` fire the matching category cannon; a hit
  files the expense (+3 XP, +1 coin).
- **Inbox Sort** – archive, keep or star emails with the arrow keys; every 10th
  email in a combo pays a bonus.
- **Quest Board** – manual and calendar quests with difficulty-based rewards.
- **Dashboard** – level and rank, today's activity, a 14-day XP chart (with a
  table view), and week/month comparisons.
- **Neo coach** – a chat that answers "how much more did I score this week?",
  "where did my money go last month?" or "motivate me" from your real stats.
- **Google sign-in and cloud sync** – progress is saved to Firestore per user;
  guests keep a local save that migrates on first sign-in.

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
- `.env` is git-ignored; see `.env.example`.

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

## Accessibility

Keyboard play throughout, visible focus rings, a skip link, ARIA labels on icon
buttons, a live region for coach replies, a table alternative for the chart and
reduced-motion support for the background animation.
