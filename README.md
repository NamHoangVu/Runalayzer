# Stravalyzer

Personlig treningsanalyse-app: henter aktivitetsdata fra Garmin Connect og gir regelbasert feedback (ingen LLM). To deler:

- **Next.js-app** (App Router, TypeScript, Tailwind) — dashboard/profil, deploy til Vercel, database Supabase (Postgres)
- **`ingest/`** — en Python-jobb som kjøres på et skjema via GitHub Actions (siden Vercel ikke kan køre Python), henter aktiviteter fra Garmin Connect og skriver dem til Supabase

Strava brukes ikke — Strava krever nå betalt abonnement for API-tilgang, og Garmins offisielle API er stengt for privatpersoner. Se `ingest/README.md` for detaljer og kjente begrensninger ved den uoffisielle Garmin-tilgangen.

## Oppsett: Next.js-appen

1. `npm install`
2. Kopier `.env.example` til `.env.local` og fyll inn:
   - Supabase-prosjektets URL og service-role-nøkkel (Project Settings -> API)
   - Et selvvalgt `APP_PASSWORD` (delt passord for dashboardet) og en tilfeldig `SESSION_SECRET` (f.eks. `openssl rand -hex 32`)
3. Kjør SQL-schemaet i `supabase/schema.sql` i Supabase sin SQL editor (opprett `users`, `user_profile`, `activities`)
4. `npm run dev` og åpne http://localhost:3000 — du blir møtt av en passordside, deretter en tom aktivitetsliste til Garmin-synken har kjørt

## Oppsett: Garmin-synk

Se `ingest/README.md` for full instruks. Kort fortalt: push repoet til et privat GitHub-repo, legg inn `GARMIN_EMAIL`/`GARMIN_PASSWORD`/`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` som repo-secrets, og trigg `.github/workflows/garmin-sync.yml` manuelt for en første test.

## Status

Bygget så langt: passordgate, Garmin-synk (historisk + inkrementell), grunnleggende profilside. Regelbasert analysemotor og dashboard-grafer (Recharts) er ikke bygget ennå.

## Kommandoer

- `npm run dev` — utviklingsserver
- `npm run build` — produksjonsbygg
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
