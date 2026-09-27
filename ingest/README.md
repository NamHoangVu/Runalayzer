# Garmin sync

Pulls activities from Garmin Connect and writes them into the same Supabase tables the Next.js app reads from. Runs on a schedule via `.github/workflows/garmin-sync.yml` (daily, plus a manual "Run workflow" button in the Actions tab).

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

## GitHub Actions setup

In the repo's Settings -> Secrets and variables -> Actions, add:

- `GARMIN_EMAIL`
- `GARMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These never touch the Next.js app or its own env vars — they only exist as repo secrets consumed by this workflow.

Free GitHub Actions scheduled workflows are automatically disabled after 60 days without any repository activity; re-enable it from the Actions tab if that happens.
