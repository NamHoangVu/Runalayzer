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
        <h1 className="text-lg font-semibold">Fant ikke aktiviteten</h1>
        <Link href="/" className="text-sm underline">
          Tilbake til aktiviteter
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
          ← Tilbake til aktiviteter
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
        <Stat label="Distanse" value={formatDistance(activity.distance_meters)} />
        <Stat label="Tid (aktiv)" value={formatDuration(activity.moving_time_seconds)} />
        <Stat label="Tid (totalt)" value={formatDuration(activity.elapsed_time_seconds)} />
        <Stat label="Snittfart" value={formatPace(activity.average_speed_mps, activity.type)} />
        <Stat label="Makshastighet" value={formatPace(activity.max_speed_mps, activity.type)} />
        <Stat label="Høydemeter" value={formatElevation(activity.total_elevation_gain_meters)} />
        <Stat
          label="Puls (snitt)"
          value={
            activity.average_heartrate != null
              ? `${Math.round(activity.average_heartrate)} bpm`
              : "–"
          }
        />
        <Stat
          label="Puls (maks)"
          value={activity.max_heartrate != null ? `${Math.round(activity.max_heartrate)} bpm` : "–"}
        />
        <Stat
          label="Kadens"
          value={activity.average_cadence != null ? `${Math.round(activity.average_cadence)}` : "–"}
        />
        <Stat
          label="Watt (snitt)"
          value={activity.average_watts != null ? `${Math.round(activity.average_watts)} W` : "–"}
        />
        <Stat
          label="Watt (maks)"
          value={activity.max_watts != null ? `${Math.round(activity.max_watts)} W` : "–"}
        />
        <Stat label="Kalorier" value={calories} />
      </div>

      {!details && (
        <p className="text-sm text-foreground/60">
          Detaljert data er ikke klar for denne aktiviteten ennå.
        </p>
      )}

      {details && (
        <>
          {mapPoints.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-foreground/70">Rute</h2>
              <ActivityMap points={mapPoints} />
            </div>
          )}

          {details.streams.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-foreground/70">Grafer</h2>
              <ActivityCharts streams={details.streams} activityType={activity.type} />
            </div>
          )}

          {details.splits.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-foreground/70">Runder</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-foreground/60">
                      <th className="p-2">#</th>
                      <th className="p-2">Distanse</th>
                      <th className="p-2">Tid</th>
                      <th className="p-2">Tempo</th>
                      <th className="p-2">Puls</th>
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
            <h2 className="mb-2 text-sm font-medium text-foreground/70">Utvidet statistikk</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <Stat
                label="Treningseffekt (aerob)"
                value={
                  details.training_effect_aerobic != null
                    ? `${details.training_effect_aerobic.toFixed(1)} (${details.training_effect_aerobic_label ?? "–"})`
                    : "–"
                }
              />
              <Stat
                label="Treningseffekt (anaerob)"
                value={
                  details.training_effect_anaerobic != null
                    ? details.training_effect_anaerobic.toFixed(1)
                    : "–"
                }
              />
              <Stat
                label="Hvilekalorier"
                value={
                  details.calories_bmr != null ? `${Math.round(details.calories_bmr)} kcal` : "–"
                }
              />
              <Stat
                label="Aktivitetskalorier"
                value={activeCalories != null ? `${Math.round(activeCalories)} kcal` : "–"}
              />
              <Stat label="Est. svettetap" value={formatWaterLoss(details.water_loss_ml)} />
              <Stat
                label="Body Battery-effekt"
                value={formatSigned(details.body_battery_delta, "")}
              />
              <Stat
                label="Bakkekontakttid"
                value={
                  details.ground_contact_time_ms != null
                    ? `${Math.round(details.ground_contact_time_ms)} ms`
                    : "–"
                }
              />
              <Stat label="Skrittlengde" value={formatStrideLength(details.stride_length_cm)} />
              <Stat
                label="Vertikal oscillasjon"
                value={
                  details.vertical_oscillation_cm != null
                    ? `${details.vertical_oscillation_cm.toFixed(1)} cm`
                    : "–"
                }
              />
              <Stat
                label="Vertikalt forholdstall"
                value={
                  details.vertical_ratio_pct != null
                    ? `${details.vertical_ratio_pct.toFixed(1)} %`
                    : "–"
                }
              />
              <Stat
                label="Normalisert kraft"
                value={
                  details.normalized_power_watts != null
                    ? `${Math.round(details.normalized_power_watts)} W`
                    : "–"
                }
              />
              <Stat
                label="Totalt arbeid"
                value={
                  details.total_work_kj != null ? `${Math.round(details.total_work_kj)} kJ` : "–"
                }
              />
              <Stat
                label="Moderat intensitet"
                value={
                  details.moderate_intensity_minutes != null
                    ? `${details.moderate_intensity_minutes} min`
                    : "–"
                }
              />
              <Stat
                label="Høy intensitet"
                value={
                  details.vigorous_intensity_minutes != null
                    ? `${details.vigorous_intensity_minutes} min`
                    : "–"
                }
              />
              <Stat label="Steg" value={details.steps != null ? `${details.steps}` : "–"} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
