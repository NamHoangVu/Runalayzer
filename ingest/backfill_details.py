"""One-time backfill: fetches rich Garmin activity data (training effect,
splits, weather, streams) for every existing `activities` row that doesn't
yet have a matching `activity_details` row, and upserts it.

Resumable/idempotent: only ever processes rows missing a details row, so
it's safe to Ctrl+C and re-run. Meant to be run once, by hand, locally (not
via GitHub Actions — a several-hundred-activity run takes well over the
runtime a scheduled workflow should reasonably occupy):

    cd ingest
    GARMIN_EMAIL=... GARMIN_PASSWORD=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      python backfill_details.py
"""

import sys

import requests
from garminconnect import Garmin

from activity_details import fetch_activity_details_row, upsert_activity_details_rows
from garmin_sync import require_env, supabase_headers


def fetch_all_activities(supabase_url: str, headers: dict) -> list[dict]:
    res = requests.get(
        f"{supabase_url}/rest/v1/activities",
        headers=headers,
        params={"select": "id,garmin_activity_id", "limit": 2000},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()


def fetch_existing_detail_ids(supabase_url: str, headers: dict) -> set[str]:
    res = requests.get(
        f"{supabase_url}/rest/v1/activity_details",
        headers=headers,
        params={"select": "activity_id", "limit": 2000},
        timeout=30,
    )
    res.raise_for_status()
    return {row["activity_id"] for row in res.json()}


def main() -> None:
    garmin_email = require_env("GARMIN_EMAIL")
    garmin_password = require_env("GARMIN_PASSWORD")
    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    supabase_service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = supabase_headers(supabase_service_role_key)

    print("Logging in to Garmin Connect...")
    client = Garmin(garmin_email, garmin_password)
    client.login()

    all_activities = fetch_all_activities(supabase_url, headers)
    already_done = fetch_existing_detail_ids(supabase_url, headers)
    todo = [a for a in all_activities if a["id"] not in already_done]

    total = len(todo)
    print(f"{total} activities missing details (of {len(all_activities)} total).")

    done = 0
    failed = []
    for i, activity in enumerate(todo, start=1):
        row = fetch_activity_details_row(client, activity["garmin_activity_id"], activity["id"])
        if row is not None:
            upsert_activity_details_rows(supabase_url, headers, [row])
            done += 1
        else:
            failed.append(activity["garmin_activity_id"])
        print(f"{i}/{total} done (activity {activity['garmin_activity_id']})")

    print(f"Backfill complete. {done} succeeded, {len(failed)} failed.")
    if failed:
        print(f"Failed activity IDs (safe to re-run script to retry): {failed}", file=sys.stderr)


if __name__ == "__main__":
    main()
