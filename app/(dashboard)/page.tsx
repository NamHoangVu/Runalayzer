import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDistance } from "@/lib/format";

// Always reflects live DB state — must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createAdminClient();
  const { data: user } = await supabase.from("users").select("id").limit(1).maybeSingle();

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Ingen aktiviteter ennå</h1>
        <p className="text-sm text-foreground/70">
          Data kommer fra en planlagt Garmin-synk (GitHub Actions), ikke fra noe du trigger her i
          appen. Kjør jobben manuelt i Actions-fanen på GitHub for å teste, eller vent til neste
          planlagte kjøring.
        </p>
      </div>
    );
  }

  const { data: activities } = await supabase
    .from("activities")
    .select("id, name, type, start_date, distance_meters")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false })
    .limit(20);

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Aktiviteter</h1>
        <p className="text-sm text-foreground/70">
          Ingen aktiviteter synkronisert ennå. Historisk synk og feedback kommer i en senere runde.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Aktiviteter</h1>
      <ul className="flex flex-col gap-2">
        {activities.map((activity) => (
          <li key={activity.id}>
            <Link
              href={`/activities/${activity.id}`}
              className="block rounded border border-foreground/10 p-3 text-sm transition-colors hover:border-foreground/30 hover:bg-foreground/5"
            >
              <span className="font-medium">{activity.name ?? activity.type}</span>{" "}
              <span className="text-foreground/60">
                — {activity.type} — {formatDate(activity.start_date)}
                {activity.distance_meters ? ` — ${formatDistance(activity.distance_meters)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
