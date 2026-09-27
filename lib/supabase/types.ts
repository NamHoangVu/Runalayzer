/**
 * Hand-written types mirroring supabase/schema.sql. If the schema changes,
 * update this file to match (or later switch to `supabase gen types`).
 */

// `type` (not `interface`) so these structurally satisfy the
// `Record<string, unknown>` bound that @supabase/supabase-js's generic
// Database schema constraint requires — interfaces are "open" and don't
// count as having an implicit index signature, so an interface here would
// silently make every table resolve to `never`.
export type UsersRow = {
  id: string;
  garmin_username: string;
  created_at: string;
  updated_at: string;
};

export type UserProfileRow = {
  id: string;
  user_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  birth_year: number | null;
  max_heart_rate: number | null;
  training_level: "beginner" | "intermediate" | "advanced" | null;
  goals_structured: unknown[];
  goals_freeform: string | null;
  training_plan_structured: unknown[];
  training_plan_freeform: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  garmin_activity_id: number;
  name: string | null;
  type: string;
  sport_type: string | null;
  start_date: string;
  start_date_local: string | null;
  timezone: string | null;
  moving_time_seconds: number | null;
  elapsed_time_seconds: number | null;
  distance_meters: number | null;
  total_elevation_gain_meters: number | null;
  elev_high_meters: number | null;
  elev_low_meters: number | null;
  has_heartrate: boolean;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_watts: number | null;
  max_watts: number | null;
  weighted_avg_watts: number | null;
  kilojoules: number | null;
  device_watts: boolean | null;
  average_speed_mps: number | null;
  max_speed_mps: number | null;
  average_cadence: number | null;
  suffer_score: number | null;
  trainer: boolean;
  manual: boolean;
  raw: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UsersRow;
        Insert: Partial<UsersRow> & Pick<UsersRow, "garmin_username">;
        Update: Partial<UsersRow>;
        Relationships: [];
      };
      user_profile: {
        Row: UserProfileRow;
        Insert: Partial<UserProfileRow> & Pick<UserProfileRow, "user_id">;
        Update: Partial<UserProfileRow>;
        Relationships: [];
      };
      activities: {
        Row: ActivityRow;
        Insert: Partial<ActivityRow> &
          Pick<ActivityRow, "user_id" | "garmin_activity_id" | "type" | "start_date" | "raw">;
        Update: Partial<ActivityRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
