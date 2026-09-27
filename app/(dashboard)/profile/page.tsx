import { createAdminClient } from "@/lib/supabase/admin";
import ProfileForm from "@/components/ProfileForm";
import type { UserProfileRow } from "@/lib/supabase/types";

// Always reflects live DB state — must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createAdminClient();
  const { data: user } = await supabase.from("users").select("id").limit(1).maybeSingle();

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-foreground/70">
          No user registered yet — run the Garmin sync first (see README), and the user will be
          created automatically.
        </p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Profile</h1>
      <ProfileForm initial={profile as UserProfileRow | null} />
    </div>
  );
}
