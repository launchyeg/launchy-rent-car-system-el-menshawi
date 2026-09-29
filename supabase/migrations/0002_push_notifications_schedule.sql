-- Migration 0002 — schedule the periodic push-alerts check.
--
-- Before running: replace <YOUR-PROJECT-REF> and <YOUR-SUPABASE-ANON-KEY>
-- below with your actual project's values (Project Settings → API) — same
-- pattern as any other scheduled Edge Function in this project. Requires
-- pg_cron and pg_net (both available on Supabase by default).
--
-- Runs every 15 minutes — periodic, not instant: it checks the database
-- for anything that has newly crossed into an alert state since the last
-- check, not the moment a record is edited.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'push-alerts-check',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/push-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <YOUR-SUPABASE-ANON-KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To change the interval later, unschedule first:
--   select cron.unschedule('push-alerts-check');
-- then re-run a `cron.schedule` call with the new interval.
