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

export type ActivityStreamPoint = {
  t: number | null; // seconds since activity start
  lat: number | null;
  lon: number | null;
  ele: number | null; // meters
  hr: number | null; // bpm
  speed: number | null; // m/s — reuse formatPace() for display
  power: number | null; // watts
  cadence: number | null;
  sl: number | null; // stride length, cm
  vo: number | null; // vertical oscillation, cm
  gct: number | null; // ground contact time, ms
  pc: number | null; // performance condition, dimensionless
  bb: number | null; // body battery, 0-100
};

export type ActivitySplit = {
  lap_index: number | null;
  start_time_gmt: string | null;
  distance_m: number | null;
  duration_s: number | null;
  moving_duration_s: number | null;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  average_speed_mps: number | null;
  max_speed_mps: number | null;
  average_hr: number | null;
  max_hr: number | null;
  average_cadence: number | null;
  max_cadence: number | null;
  average_power: number | null;
  max_power: number | null;
  normalized_power: number | null;
  ground_contact_time_ms: number | null;
  stride_length_cm: number | null;
  vertical_oscillation_cm: number | null;
  vertical_ratio_pct: number | null;
  calories: number | null;
  intensity_type: string | null;
};

export type ActivityWeather = {
  temp_c: number | null;
  apparent_temp_c: number | null;
  dew_point_c: number | null;
  relative_humidity: number | null;
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  wind_direction_compass: string | null;
  description: string | null;
  station_name: string | null;
};

export type ActivityDetailsRow = {
  activity_id: string;
  training_effect_aerobic: number | null;
  training_effect_aerobic_label: string | null;
  training_effect_aerobic_message: string | null;
  training_effect_anaerobic: number | null;
  training_effect_anaerobic_message: string | null;
  calories_total: number | null;
  calories_bmr: number | null;
  water_loss_ml: number | null;
  body_battery_delta: number | null;
  ground_contact_time_ms: number | null;
  stride_length_cm: number | null;
  vertical_oscillation_cm: number | null;
  vertical_ratio_pct: number | null;
  normalized_power_watts: number | null;
  total_work_kj: number | null;
  moderate_intensity_minutes: number | null;
  vigorous_intensity_minutes: number | null;
  steps: number | null;
  weather: ActivityWeather | null;
  splits: ActivitySplit[];
  streams: ActivityStreamPoint[];
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
      activity_details: {
        Row: ActivityDetailsRow;
        Insert: Partial<ActivityDetailsRow> & Pick<ActivityDetailsRow, "activity_id">;
        Update: Partial<ActivityDetailsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
