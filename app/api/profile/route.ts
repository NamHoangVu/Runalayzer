import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Single-user for now: always operates on the first (and only) row in
// `users`. A real multi-user version would derive the user id from a
// session instead of grabbing the first row.
async function getSoleUserId(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("users").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function GET() {
  const userId = await getSoleUserId();
  if (!userId) {
    return NextResponse.json({ connected: false, profile: null });
  }

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connected: true, profile: profile ?? null });
}

interface ProfileUpdatePayload {
  height_cm?: number | null;
  weight_kg?: number | null;
  birth_year?: number | null;
  max_heart_rate?: number | null;
  training_level?: "beginner" | "intermediate" | "advanced" | null;
  goals_structured?: unknown[];
  goals_freeform?: string | null;
  training_plan_structured?: unknown[];
  training_plan_freeform?: string | null;
}

export async function POST(req: Request) {
  const userId = await getSoleUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Run the Garmin sync at least once before setting up your profile." },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as ProfileUpdatePayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: userId, ...body }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
