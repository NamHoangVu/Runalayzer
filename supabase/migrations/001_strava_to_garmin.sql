-- One-time migration: run this in the Supabase SQL editor against the
-- already-live database (which has the old Strava-shaped `users`/`activities`
-- columns from before the Garmin pivot). Safe to run even though those
-- tables are currently empty (Strava OAuth was never completed).
-- After running this, supabase/schema.sql describes the resulting shape.

alter table users drop column access_token;
alter table users drop column refresh_token;
alter table users drop column token_expires_at;
alter table users drop column scope;

alter table users rename column strava_athlete_id to garmin_username;
alter table users alter column garmin_username type text using garmin_username::text;
alter table users rename constraint users_strava_athlete_id_key to users_garmin_username_key;
drop index if exists idx_users_strava_athlete_id;
create index idx_users_garmin_username on users (garmin_username);

alter table activities rename column strava_activity_id to garmin_activity_id;
alter table activities rename constraint activities_strava_activity_id_key to activities_garmin_activity_id_key;
