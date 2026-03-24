-- Daily cron jobs for automated background tasks
-- PREREQUISITES:
--   1. pg_cron and pg_net extensions must be enabled in your Supabase project
--      (Dashboard → Database → Extensions → search "pg_cron" and "pg_net")
--   2. Set your project URL and service role key as DB settings (run once in SQL Editor):
--        ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
--        ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--      Both values are in: Supabase Dashboard → Settings → API

DO $$
DECLARE
  base_url text := current_setting('app.settings.supabase_url', true);
  svc_key  text := current_setting('app.settings.service_role_key', true);
BEGIN
  IF base_url IS NULL OR base_url = '' OR svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'Skipping cron setup: configure app.settings.supabase_url and app.settings.service_role_key first.';
    RETURN;
  END IF;

  -- 6am UTC daily: refresh FX rates from Frankfurter API
  PERFORM cron.schedule(
    'daily-fx-rate-refresh',
    '0 6 * * *',
    format(
      $$SELECT net.http_post(url:='%s/functions/v1/update-exchange-rates',
        headers:='{"Authorization":"Bearer %s","Content-Type":"application/json"}'::jsonb,
        body:='{}'::jsonb) AS request_id$$,
      base_url, svc_key
    )
  );

  -- 8am UTC daily: send overdue invoice reminders
  PERFORM cron.schedule(
    'daily-dunning-reminders',
    '0 8 * * *',
    format(
      $$SELECT net.http_post(url:='%s/functions/v1/send-dunning-reminders',
        headers:='{"Authorization":"Bearer %s","Content-Type":"application/json"}'::jsonb,
        body:='{}'::jsonb) AS request_id$$,
      base_url, svc_key
    )
  );

  RAISE NOTICE 'Cron jobs scheduled: daily-fx-rate-refresh (6am UTC) and daily-dunning-reminders (8am UTC)';
END;
$$;
