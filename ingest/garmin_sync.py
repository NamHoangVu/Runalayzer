"""Pulls activities from Garmin Connect and upserts them into Supabase.

Run on a schedule via .github/workflows/garmin-sync.yml. Uses the unofficial
`garminconnect` package (username/password login, no OAuth) and talks to
Supabase directly over its PostgREST REST API with the service-role key —
see ../supabase/schema.sql for the target tables.
"""

import os
import sys
from datetime import datetime, timezone

import requests
from garminconnect import Garmin

from activity_details import fetch_activity_details_row, upsert_activity_details_rows

PAGE_SIZE = 100

# Coarse activityType.typeKey prefixes -> our `type` column. Order matters:
# first matching prefix wins.
TYPE_PREFIX_MAP = [
    ("running", "Run"),
    ("cycling", "Ride"),
    ("biking", "Ride"),
    ("swimming", "Swim"),
    ("strength_training", "Strength"),
    ("yoga", "Yoga"),
    ("walking", "Walk"),
    ("hiking", "Hike"),
]


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return value


def supabase_headers(service_role_key: str) -> dict:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }


def ensure_user(supabase_url: str, headers: dict, garmin_username: str) -> str:
    res = requests.get(
        f"{supabase_url}/rest/v1/users",
        headers=headers,
        params={"garmin_username": f"eq.{garmin_username}", "select": "id"},
        timeout=30,
    )
    res.raise_for_status()
    rows = res.json()
    if rows:
        return rows[0]["id"]

    res = requests.post(
        f"{supabase_url}/rest/v1/users",
        headers={**headers, "Prefer": "return=representation"},
        json={"garmin_username": garmin_username},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()[0]["id"]


def get_last_synced_at(supabase_url: str, headers: dict, user_id: str) -> datetime | None:
    res = requests.get(
        f"{supabase_url}/rest/v1/activities",
        headers=headers,
        params={
            "user_id": f"eq.{user_id}",
            "select": "start_date",
            "order": "start_date.desc",
            "limit": 1,
        },
        timeout=30,
    )
    res.raise_for_status()
    rows = res.json()
    if not rows:
        return None
    return datetime.fromisoformat(rows[0]["start_date"])


def parse_garmin_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    # Garmin's *GMT fields are naive "YYYY-MM-DD HH:MM:SS" strings in UTC.
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def map_type(type_key: str | None) -> str:
    if not type_key:
        return "Unknown"
    lower = type_key.lower()
    for prefix, bucket in TYPE_PREFIX_MAP:
        if lower.startswith(prefix):
            return bucket
    return type_key.replace("_", " ").title()


def to_int(value: float | int | None) -> int | None:
    return round(value) if value is not None else None


def map_activity(activity: dict, user_id: str) -> dict:
    activity_type = activity.get("activityType") or {}
    type_key = activity_type.get("typeKey")
    start_date = parse_garmin_datetime(activity.get("startTimeGMT"))
    average_hr = activity.get("averageHR")

    cadence = None
    if type_key and type_key.startswith("running"):
        cadence = activity.get("averageRunningCadenceInStepsPerMinute")
    elif type_key and ("cycling" in type_key or "biking" in type_key):
        cadence = activity.get("averageBikingCadenceInRevPerMinute")

    return {
        "user_id": user_id,
        "garmin_activity_id": activity["activityId"],
        "name": activity.get("activityName"),
        "type": map_type(type_key),
        "sport_type": type_key,
        "start_date": start_date.isoformat() if start_date else None,
        "start_date_local": activity.get("startTimeLocal"),
        "moving_time_seconds": to_int(activity.get("movingDuration") or activity.get("duration")),
        "elapsed_time_seconds": to_int(activity.get("elapsedDuration") or activity.get("duration")),
        "distance_meters": activity.get("distance"),
        "total_elevation_gain_meters": activity.get("elevationGain"),
        "elev_high_meters": activity.get("maxElevation"),
        "elev_low_meters": activity.get("minElevation"),
        "has_heartrate": average_hr is not None,
        "average_heartrate": average_hr,
        "max_heartrate": activity.get("maxHR"),
        "average_watts": activity.get("averagePower"),
        "max_watts": activity.get("maxPower"),
        "average_speed_mps": activity.get("averageSpeed"),
        "max_speed_mps": activity.get("maxSpeed"),
        "average_cadence": cadence,
        "raw": activity,
    }


def upsert_activities(supabase_url: str, headers: dict, rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    res = requests.post(
        f"{supabase_url}/rest/v1/activities",
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=representation"},
        params={"on_conflict": "garmin_activity_id"},
        json=rows,
        timeout=30,
    )
    if not res.ok:
        print(f"Supabase upsert failed ({res.status_code}): {res.text}", file=sys.stderr)
    res.raise_for_status()
    return res.json()


def main() -> None:
    garmin_email = require_env("GARMIN_EMAIL")
    garmin_password = require_env("GARMIN_PASSWORD")
    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    supabase_service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")

    headers = supabase_headers(supabase_service_role_key)

    print("Logging in to Garmin Connect...")
    client = Garmin(garmin_email, garmin_password)
    client.login()

    user_id = ensure_user(supabase_url, headers, garmin_email)
    last_synced_at = get_last_synced_at(supabase_url, headers, user_id)
    print(f"Last synced activity: {last_synced_at or '(none — full backfill)'}")

    total_fetched = 0
    total_upserted = 0
    total_details = 0
    start = 0

    while True:
        page = client.get_activities(start, PAGE_SIZE)
        if not page:
            break
        total_fetched += len(page)

        rows = []
        oldest_in_page = None
        for activity in page:
            mapped = map_activity(activity, user_id)
            start_date = mapped["start_date"]
            if start_date:
                parsed = datetime.fromisoformat(start_date)
                oldest_in_page = parsed if oldest_in_page is None else min(oldest_in_page, parsed)
                if last_synced_at and parsed <= last_synced_at:
                    continue
            rows.append(mapped)

        upserted_rows = upsert_activities(supabase_url, headers, rows)
        total_upserted += len(upserted_rows)

        details_rows = []
        for row in upserted_rows:
            details = fetch_activity_details_row(client, row["garmin_activity_id"], row["id"])
            if details is not None:
                details_rows.append(details)
        upsert_activity_details_rows(supabase_url, headers, details_rows)
        total_details += len(details_rows)

        if last_synced_at and oldest_in_page and oldest_in_page <= last_synced_at:
            break
        start += PAGE_SIZE

    print(
        f"Done. Fetched {total_fetched} activities from Garmin, "
        f"upserted {total_upserted} activities and {total_details} activity_details rows."
    )


if __name__ == "__main__":
    main()
