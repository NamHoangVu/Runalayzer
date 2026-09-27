-- Stravalyzer database schema.
-- Review and run this in the Supabase SQL editor (Project -> SQL Editor) once approved.
-- No RLS policies: every query goes through the server-only service-role
-- client (lib/supabase/admin.ts); the anon key is never exposed to the browser.
--
-- Data source is Garmin Connect (via the unofficial `garminconnect` Python
-- library, run on a schedule from GitHub Actions — see /ingest). There is no
-- OAuth: no tokens are stored, only a Garmin username identifying the account.

create extension if not exists pgcrypto;

-- =========================================================
-- users: one row per Garmin Connect account.
-- Single-user today, but keyed by garmin_username so more accounts
-- can be added later without a schema change.
-- =========================================================
create table users (
  id                uuid primary key default gen_random_uuid(),
  garmin_username   text not null unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_users_garmin_username on users (garmin_username);

-- =========================================================
-- user_profile: goals / body stats / training plan, 1:1 with users.
-- =========================================================
create table user_profile (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references users(id) on delete cascade,

  height_cm                 numeric(5,2),
  weight_kg                 numeric(5,2),
  birth_year                int,
  max_heart_rate            int,
  training_level            text check (training_level in ('beginner', 'intermediate', 'advanced')),

  -- e.g. [{ "type": "race", "activity_type": "Run", "target": "marathon",
  --         "target_time_seconds": 14400, "target_date": "2026-04-12" }]
  goals_structured          jsonb not null default '[]'::jsonb,
  goals_freeform            text,

  -- e.g. [{ "week_start": "2026-09-29", "activity_type": "Run",
  --         "target_distance_km": 40, "target_sessions": 4 }]
  training_plan_structured  jsonb not null default '[]'::jsonb,
  training_plan_freeform    text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- =========================================================
-- activities: one row per Garmin activity.
-- =========================================================
create table activities (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references users(id) on delete cascade,
  garmin_activity_id           bigint not null unique,

  name                         text,
  type                         text not null,
  sport_type                   text,

  start_date                   timestamptz not null,
  start_date_local             timestamptz,
  timezone                     text,
  moving_time_seconds          int,
  elapsed_time_seconds         int,

  distance_meters              numeric(10, 2),
  total_elevation_gain_meters  numeric(8, 2),
  elev_high_meters              numeric(8, 2),
  elev_low_meters               numeric(8, 2),

  has_heartrate                boolean not null default false,
  average_heartrate             numeric(5, 2),
  max_heartrate                 numeric(5, 2),

  -- No Garmin equivalent exposed by the unofficial library — always null for
  -- now. Kept in the schema since they're cheap to have and annoying to add
  -- back later if a mapping is ever found.
  average_watts                 numeric(6, 2),
  max_watts                     numeric(6, 2),
  weighted_avg_watts            numeric(6, 2),
  kilojoules                    numeric(8, 2),
  device_watts                  boolean,
  suffer_score                  int,
  trainer                       boolean not null default false,
  manual                        boolean not null default false,

  average_speed_mps             numeric(6, 3),
  max_speed_mps                 numeric(6, 3),
  average_cadence               numeric(6, 2),

  raw                           jsonb not null,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index idx_activities_user_id_start_date on activities (user_id, start_date desc);
create index idx_activities_user_id_type on activities (user_id, type);

-- =========================================================
-- updated_at auto-touch trigger, shared across tables.
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger trg_user_profile_updated_at
  before update on user_profile
  for each row execute function set_updated_at();

create trigger trg_activities_updated_at
  before update on activities
  for each row execute function set_updated_at();
