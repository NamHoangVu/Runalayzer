# Garmin sync

Pulls activities from Garmin Connect and writes them into the same Supabase tables the Next.js app reads from. Runs on a schedule via `.github/workflows/garmin-sync.yml` (daily, plus a manual "Run workflow" button in the Actions tab).

`garmin_sync.py` also fetches rich per-activity data (training effect, splits, weather, GPS/metric streams — see `activity_details.py`) for any _newly_ synced activities, and writes it to the `activity_details` table. This is cheap since only new activities trigger it (usually 0-1/day).

## Known limitations (not solved, just documented)

- Uses the **unofficial** [`garminconnect`](https://pypi.org/project/garminconnect/) package, which logs in with a real Garmin username/password (Garmin has no OAuth-based personal-use API). It talks to undocumented internal endpoints that Garmin can change or block at any time without notice.
- Garmin sometimes challenges logins from unfamiliar IPs (GitHub Actions runners use rotating cloud IPs) with extra verification. If the scheduled run starts failing for no obvious reason, this is the first thing to suspect — the fix is usually just logging in from a normal browser once to clear the challenge, not a code change.

## Local testing

Before wiring this into GitHub Actions secrets, test it locally so Garmin login issues are easier to debug than in CI logs:

```bash
cd ingest
pip install -r requirements.txt
GARMIN_EMAIL=you@example.com \
GARMIN_PASSWORD=... \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
python garmin_sync.py
```

## One-time historical details backfill

`activity_details` only gets filled in for activities synced _after_ this feature was added. To backfill it for all already-synced activities, run once locally (not via GitHub Actions — this takes much longer than a scheduled job should occupy, and issues ~4 Garmin requests per activity with a 1s delay between each to stay rate-limit-friendly):

```bash
cd ingest
GARMIN_EMAIL=you@example.com \
GARMIN_PASSWORD=... \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
python backfill_details.py
```

It only processes activities still missing a details row, prints progress (`N/total done`), and is safe to interrupt and re-run — it'll resume where it left off.

## GitHub Actions setup

In the repo's Settings -> Secrets and variables -> Actions, add:

- `GARMIN_EMAIL`
- `GARMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These never touch the Next.js app or its own env vars — they only exist as repo secrets consumed by this workflow.

Free GitHub Actions scheduled workflows are automatically disabled after 60 days without any repository activity; re-enable it from the Actions tab if that happens.
