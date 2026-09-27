import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client for server-only code (route handlers, server
 * components/actions). Never import this from a "use client" component —
 * it bypasses RLS entirely, which is fine here since the app has no
 * client-side Supabase access and every query is scoped by user_id in
 * application code.
 */
export function createAdminClient() {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
