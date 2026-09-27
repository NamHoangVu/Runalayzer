import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ActivityMap from "@/components/ActivityMap";
import ActivityCharts from "@/components/ActivityCharts";
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSigned,
  formatStrideLength,
  formatWaterLoss,
  formatWeather,
} from "@/lib/format";

// Always reflects live DB state — must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  if (value === "–") return null;
  return (
    <div className="rounded border border-foreground/10 p-3">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  );
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: activity }, { data: details }] = await Promise.all([
    supabase.from("activities").select("*").eq("id", id).maybeSingle(),
    supabase.from("activity_details").select("*").eq("activity_id", id).maybeSingle(),
  ]);

  if (!activity) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Activity not found</h1>
        <Link href="/" className="text-sm underline">
          Back to activities
        </Link>
      </div>
    );
  }

  const raw = activity.raw as Record<string, unknown>;
  const rawCalories = typeof raw.calories === "number" ? raw.calories : null;
  const totalCalories = details?.calories_total ?? rawCalories;
  const calories = totalCalories != null ? `${Math.round(totalCalories)} kcal` : "–";
  const activeCalories =
    details?.calories_total != null && details?.calories_bmr != null
      ? details.calories_total - details.calories_bmr
      : null;

  const mapPoints = (details?.streams ?? [])
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => ({ lat: p.lat as number, lon: p.lon as number }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm underline">
          ← Back to activities
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{activity.name ?? activity.type}</h1>
        <p className="text-sm text-foreground/60">
          {activity.type}
          {activity.sport_type && activity.sport_type !== activity.type.toLowerCase()
            ? ` (${activity.sport_type})`
            : ""}{" "}
          — {formatDateTime(activity.start_date)}
          {details?.weather ? ` — ${formatWeather(details.weather)}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <Stat label="Distance" value={formatDistance(activity.distance_meters)} />
        <Stat label="Time (moving)" value={formatDuration(activity.moving_time_seconds)} />
        <Stat label="Time (total)" value={formatDuration(activity.elapsed_time_seconds)} />
        <Stat label="Average pace" value={formatPace(activity.average_speed_mps, activity.type)} />
        <Stat label="Max speed" value={formatPace(activity.max_speed_mps, activity.type)} />
        <Stat
          label="Elevation gain"
          value={formatElevation(activity.total_elevation_gain_meters)}
        />
        <Stat
          label="Heart rate (avg)"
          value={
            activity.average_heartrate != null
              ? `${Math.round(activity.average_heartrate)} bpm`
              : "–"
          }
        />
        <Stat
          label="Heart rate (max)"
          value={activity.max_heartrate != null ? `${Math.round(activity.max_heartrate)} bpm` : "–"}
        />
        <Stat
          label="Cadence"
          value={activity.average_cadence != null ? `${Math.round(activity.average_cadence)}` : "–"}
        />
        <Stat
          label="Power (avg)"
          value={activity.average_watts != null ? `${Math.round(activity.average_watts)} W` : "–"}
        />
        <Stat
          label="Power (max)"
          value={activity.max_watts != null ? `${Math.round(activity.max_watts)} W` : "–"}
        />
        <Stat label="Calories" value={calories} />
      </div>

      {!details && (
        <p className="text-sm text-foreground/60">
          Detailed data isn&apos;t ready for this activity yet.
        </p>
      )}

      {details && (
        <>
          {mapPoints.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-foreground/70">Route</h2>
              <ActivityMap points={mapPoints} />
            </div>
          )}

          {details.streams.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-foreground/70">Charts</h2>
              <ActivityCharts streams={details.streams} activityType={activity.type} />
            </div>
          )}

          {details.splits.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-foreground/70">Splits</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-foreground/60">
                      <th className="p-2">#</th>
                      <th className="p-2">Distance</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Pace</th>
                      <th className="p-2">Heart rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.splits.map((lap) => (
                      <tr key={lap.lap_index} className="border-t border-foreground/10">
                        <td className="p-2">{lap.lap_index}</td>
                        <td className="p-2">{formatDistance(lap.distance_m)}</td>
                        <td className="p-2">{formatDuration(lap.duration_s)}</td>
                        <td className="p-2">{formatPace(lap.average_speed_mps, activity.type)}</td>
                        <td className="p-2">
                          {lap.average_hr != null ? `${Math.round(lap.average_hr)} bpm` : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-medium text-foreground/70">Extended stats</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <Stat
                label="Training effect (aerobic)"
                value={
                  details.training_effect_aerobic != null
                    ? `${details.training_effect_aerobic.toFixed(1)} (${details.training_effect_aerobic_label ?? "–"})`
                    : "–"
                }
              />
              <Stat
                label="Training effect (anaerobic)"
                value={
                  details.training_effect_anaerobic != null
                    ? details.training_effect_anaerobic.toFixed(1)
                    : "–"
                }
              />
              <Stat
                label="Resting calories"
                value={
                  details.calories_bmr != null ? `${Math.round(details.calories_bmr)} kcal` : "–"
                }
              />
              <Stat
                label="Active calories"
                value={activeCalories != null ? `${Math.round(activeCalories)} kcal` : "–"}
              />
              <Stat label="Est. water loss" value={formatWaterLoss(details.water_loss_ml)} />
              <Stat
                label="Body Battery effect"
                value={formatSigned(details.body_battery_delta, "")}
              />
              <Stat
                label="Ground contact time"
                value={
                  details.ground_contact_time_ms != null
                    ? `${Math.round(details.ground_contact_time_ms)} ms`
                    : "–"
                }
              />
              <Stat label="Stride length" value={formatStrideLength(details.stride_length_cm)} />
              <Stat
                label="Vertical oscillation"
                value={
                  details.vertical_oscillation_cm != null
                    ? `${details.vertical_oscillation_cm.toFixed(1)} cm`
                    : "–"
                }
              />
              <Stat
                label="Vertical ratio"
                value={
                  details.vertical_ratio_pct != null
                    ? `${details.vertical_ratio_pct.toFixed(1)} %`
                    : "–"
                }
              />
              <Stat
                label="Normalized power"
                value={
                  details.normalized_power_watts != null
                    ? `${Math.round(details.normalized_power_watts)} W`
                    : "–"
                }
              />
              <Stat
                label="Total work"
                value={
                  details.total_work_kj != null ? `${Math.round(details.total_work_kj)} kJ` : "–"
                }
              />
              <Stat
                label="Moderate intensity"
                value={
                  details.moderate_intensity_minutes != null
                    ? `${details.moderate_intensity_minutes} min`
                    : "–"
                }
              />
              <Stat
                label="Vigorous intensity"
                value={
                  details.vigorous_intensity_minutes != null
                    ? `${details.vigorous_intensity_minutes} min`
                    : "–"
                }
              />
              <Stat label="Steps" value={details.steps != null ? `${details.steps}` : "–"} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
