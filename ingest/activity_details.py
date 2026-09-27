"""Fetches and compacts Garmin's rich per-activity data (training effect,
splits, weather, GPS/metric streams) and upserts it into `activity_details`.

Shared by garmin_sync.py (new activities, daily) and backfill_details.py
(one-time historical backfill).
"""

import sys
import time

import requests

SLEEP_BETWEEN_CALLS_SECONDS = 1.0


def f_to_c(fahrenheit: float | None) -> float | None:
    if fahrenheit is None:
        return None
    return round((fahrenheit - 32) * 5 / 9, 1)


def mph_to_kmh(mph: float | None) -> float | None:
    if mph is None:
        return None
    return round(mph * 1.60934, 1)


def build_metric_index(descriptors: list[dict]) -> dict[str, int]:
    """Maps metricDescriptors[].key -> its position in each sample's flat
    `metrics` array (the index field is `metricsIndex`, confirmed against a
    real get_activity_details() response)."""
    index = {}
    for d in descriptors:
        key = d.get("key")
        idx = d.get("metricsIndex")
        if key is not None and idx is not None:
            index[key] = idx
    return index

# short field name -> Garmin's metricDescriptors key
WANTED_METRICS = {
    "ts": "directTimestamp",
    "hr": "directHeartRate",
    "power": "directPower",
    "cadence": "directRunCadence",
    "sl": "directStrideLength",
    "vo": "directVerticalOscillation",
    "gct": "directGroundContactTime",
    "pc": "directPerformanceCondition",
    "bb": "directBodyBattery",
}


def extract_metric_samples(details: dict, metric_index: dict[str, int]) -> list[dict]:
    """Flattens activityDetailMetrics into compact per-sample dicts, keyed by
    the metric names we actually chart. Missing keys (e.g. non-running
    activities lack run-cadence/GCT) resolve to None via the index lookup."""
    samples = []
    for row in details.get("activityDetailMetrics", []):
        metrics = row.get("metrics", [])
        out = {}
        for short, garmin_key in WANTED_METRICS.items():
            idx = metric_index.get(garmin_key)
            out[short] = metrics[idx] if idx is not None and idx < len(metrics) else None
        if out["ts"] is not None:
            samples.append(out)
    samples.sort(key=lambda s: s["ts"])
    return samples


def build_streams(details: dict) -> list[dict]:
    """Compact time series for the map + charts. Uses geoPolylineDTO
    (Garmin's own already-decimated route, ~561 points for a 73min run)
    as the point backbone rather than the raw ~1493-sample
    activityDetailMetrics array, and enriches each point with the
    nearest-timestamp hr/power/cadence/etc via simple nearest-neighbor
    matching (no interpolation)."""
    polyline = (details.get("geoPolylineDTO") or {}).get("polyline") or []
    if not polyline:
        return []

    metric_index = build_metric_index(details.get("metricDescriptors") or [])
    samples = extract_metric_samples(details, metric_index)

    t0 = polyline[0].get("time")
    out = []
    j = 0
    for p in polyline:
        pt_time = p.get("time")
        while (
            samples
            and j + 1 < len(samples)
            and samples[j + 1]["ts"] is not None
            and pt_time is not None
            and abs(samples[j + 1]["ts"] - pt_time) <= abs(samples[j]["ts"] - pt_time)
        ):
            j += 1
        nearest = samples[j] if samples else {}

        out.append(
            {
                "t": round((pt_time - t0) / 1000) if pt_time is not None and t0 is not None else None,
                "lat": p.get("lat"),
                "lon": p.get("lon"),
                "ele": p.get("altitude"),
                "hr": nearest.get("hr"),
                "speed": p.get("speed"),
                "power": nearest.get("power"),
                "cadence": nearest.get("cadence"),
                "sl": nearest.get("sl"),
                "vo": nearest.get("vo"),
                "gct": nearest.get("gct"),
                "pc": nearest.get("pc"),
                "bb": nearest.get("bb"),
            }
        )
    return out


def map_summary_extras(summary: dict) -> dict:
    return {
        "training_effect_aerobic": summary.get("trainingEffect"),
        "training_effect_aerobic_label": summary.get("trainingEffectLabel"),
        "training_effect_aerobic_message": summary.get("aerobicTrainingEffectMessage"),
        "training_effect_anaerobic": summary.get("anaerobicTrainingEffect"),
        "training_effect_anaerobic_message": summary.get("anaerobicTrainingEffectMessage"),
        "calories_total": summary.get("calories"),
        "calories_bmr": summary.get("bmrCalories"),
        "water_loss_ml": summary.get("waterEstimated"),
        "body_battery_delta": summary.get("differenceBodyBattery"),
        "ground_contact_time_ms": summary.get("groundContactTime"),
        "stride_length_cm": summary.get("strideLength"),
        "vertical_oscillation_cm": summary.get("verticalOscillation"),
        "vertical_ratio_pct": summary.get("verticalRatio"),
        "normalized_power_watts": summary.get("normalizedPower"),
        "total_work_kj": summary.get("totalWork"),
        "moderate_intensity_minutes": summary.get("moderateIntensityMinutes"),
        "vigorous_intensity_minutes": summary.get("vigorousIntensityMinutes"),
        "steps": summary.get("steps"),
    }


def map_splits(splits_response: dict | None) -> list[dict]:
    if not splits_response:
        return []
    out = []
    for lap in splits_response.get("lapDTOs", []):
        out.append(
            {
                "lap_index": lap.get("lapIndex"),
                "start_time_gmt": lap.get("startTimeGMT"),
                "distance_m": lap.get("distance"),
                "duration_s": lap.get("duration"),
                "moving_duration_s": lap.get("movingDuration"),
                "elevation_gain_m": lap.get("elevationGain"),
                "elevation_loss_m": lap.get("elevationLoss"),
                "average_speed_mps": lap.get("averageSpeed"),
                "max_speed_mps": lap.get("maxSpeed"),
                "average_hr": lap.get("averageHR"),
                "max_hr": lap.get("maxHR"),
                "average_cadence": lap.get("averageRunCadence"),
                "max_cadence": lap.get("maxRunCadence"),
                "average_power": lap.get("averagePower"),
                "max_power": lap.get("maxPower"),
                "normalized_power": lap.get("normalizedPower"),
                "ground_contact_time_ms": lap.get("groundContactTime"),
                "stride_length_cm": lap.get("strideLength"),
                "vertical_oscillation_cm": lap.get("verticalOscillation"),
                "vertical_ratio_pct": lap.get("verticalRatio"),
                "calories": lap.get("calories"),
                "intensity_type": lap.get("intensityType"),
            }
        )
    return out


def map_weather(weather_response: dict | None) -> dict | None:
    if not weather_response:
        return None
    station = weather_response.get("weatherStationDTO") or {}
    weather_type = weather_response.get("weatherTypeDTO") or {}
    return {
        "temp_c": f_to_c(weather_response.get("temp")),
        "apparent_temp_c": f_to_c(weather_response.get("apparentTemp")),
        "dew_point_c": f_to_c(weather_response.get("dewPoint")),
        "relative_humidity": weather_response.get("relativeHumidity"),
        "wind_speed_kmh": mph_to_kmh(weather_response.get("windSpeed")),
        "wind_gust_kmh": mph_to_kmh(weather_response.get("windGust")),
        "wind_direction_compass": weather_response.get("windDirectionCompassPoint"),
        "description": weather_type.get("desc"),
        "station_name": station.get("name"),
    }


def fetch_activity_details_row(client, garmin_activity_id: int, activity_uuid: str) -> dict | None:
    """Fetches all 4 endpoints for one activity and returns an
    activity_details upsert row, or None if the core data (summary/details)
    can't be fetched. Weather failures alone are tolerated (indoor/treadmill
    activities often have none) and just leave weather=None."""
    try:
        summary = client.get_activity(garmin_activity_id).get("summaryDTO", {})
        time.sleep(SLEEP_BETWEEN_CALLS_SECONDS)
        splits = client.get_activity_splits(garmin_activity_id)
        time.sleep(SLEEP_BETWEEN_CALLS_SECONDS)
        details = client.get_activity_details(garmin_activity_id)
        time.sleep(SLEEP_BETWEEN_CALLS_SECONDS)
    except Exception as exc:  # noqa: BLE001 - unofficial API, any failure just means "skip this one"
        print(f"  ! skipping activity {garmin_activity_id}: core fetch failed: {exc}", file=sys.stderr)
        return None

    try:
        weather = client.get_activity_weather(garmin_activity_id)
        time.sleep(SLEEP_BETWEEN_CALLS_SECONDS)
    except Exception as exc:  # noqa: BLE001
        print(f"  ! no weather for activity {garmin_activity_id}: {exc}", file=sys.stderr)
        weather = None

    row = {"activity_id": activity_uuid, **map_summary_extras(summary)}
    row["splits"] = map_splits(splits)
    row["streams"] = build_streams(details)
    row["weather"] = map_weather(weather)
    return row


def upsert_activity_details_rows(supabase_url: str, headers: dict, rows: list[dict]) -> None:
    if not rows:
        return
    res = requests.post(
        f"{supabase_url}/rest/v1/activity_details",
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
        params={"on_conflict": "activity_id"},
        json=rows,
        timeout=60,
    )
    if not res.ok:
        print(f"Supabase activity_details upsert failed ({res.status_code}): {res.text}", file=sys.stderr)
    res.raise_for_status()
