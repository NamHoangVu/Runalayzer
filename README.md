# Runalyzer

Personal training analysis app: pulls activity data from Garmin Connect and gives rule-based feedback (no LLM). Two parts:

- **Next.js app** (App Router, TypeScript, Tailwind) — dashboard/profile, deployed to Vercel, database on Supabase (Postgres)
- **`ingest/`** — a Python job that runs on a schedule via GitHub Actions (since Vercel can't run Python), pulls activities from Garmin Connect and writes them to Supabase

Strava isn't used — Strava now requires a paid subscription for API access, and Garmin's official API is closed to individuals. See `ingest/README.md` for details and known limitations of the unofficial Garmin access.

## Setup: the Next.js app

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - Your Supabase project's URL and service-role key (Project Settings -> API)
   - A password of your choice for `APP_PASSWORD` (shared dashboard password) and a random `SESSION_SECRET` (e.g. `openssl rand -hex 32`)
3. Run the SQL schema in `supabase/schema.sql` in the Supabase SQL editor (creates `users`, `user_profile`, `activities`)
4. `npm run dev` and open http://localhost:3000 — you'll see a password page, then an empty activity list until the Garmin sync has run

## Setup: Garmin sync

See `ingest/README.md` for full instructions. In short: push the repo to a private GitHub repo, add `GARMIN_EMAIL`/`GARMIN_PASSWORD`/`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` as repo secrets, and manually trigger `.github/workflows/garmin-sync.yml` for a first test run.

## Status

Built so far: password gate, Garmin sync (historical + incremental), basic profile page, rich activity detail page (map, charts, splits, weather, training effect). A rule-based analysis/feedback engine hasn't been built yet.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
