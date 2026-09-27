-- One-time migration: purely additive — adds the new activity_details table
-- (rich per-activity data from Garmin's detail endpoints: training effect,
-- splits, weather, GPS/metric streams). No changes to existing tables.
-- Safe to run directly against the live database; run this in the Supabase
-- SQL editor (Project -> SQL Editor). After running this, supabase/schema.sql
-- describes the resulting shape.

create table activity_details (
  activity_id                       uuid primary key references activities(id) on delete cascade,

  training_effect_aerobic           numeric(3, 1),
  training_effect_aerobic_label     text,
  training_effect_aerobic_message   text,
  training_effect_anaerobic         numeric(3, 1),
  training_effect_anaerobic_message text,

  calories_total                    numeric(7, 1),
  calories_bmr                      numeric(7, 1),

  water_loss_ml                     numeric(7, 1),
  body_battery_delta                int,

  ground_contact_time_ms            numeric(6, 1),
  stride_length_cm                  numeric(6, 2),
  vertical_oscillation_cm           numeric(5, 2),
  vertical_ratio_pct                numeric(5, 2),

  normalized_power_watts            numeric(6, 1),
  total_work_kj                     numeric(8, 2),

  moderate_intensity_minutes        int,
  vigorous_intensity_minutes        int,
  steps                             int,

  weather                           jsonb,
  splits                            jsonb not null default '[]'::jsonb,
  streams                           jsonb not null default '[]'::jsonb,

  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

create trigger trg_activity_details_updated_at
  before update on activity_details
  for each row execute function set_updated_at();
