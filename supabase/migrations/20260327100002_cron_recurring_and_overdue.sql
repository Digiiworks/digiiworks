-- Additional cron jobs: recurring invoice generation + overdue marking.
-- The existing 20260324160003 migration handles FX refresh and dunning.
-- PREREQUISITES: same as 20260324160003 (pg_cron + pg_net enabled, app.settings configured).

DO $$
DECLARE
  base_url text := current_setting('app.settings.supabase_url', true);
  svc_key  text := current_setting('app.settings.service_role_key', true);
BEGIN
  IF base_url IS NULL OR base_url = '' OR svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'Skipping cron setup: configure app.settings.supabase_url and app.settings.service_role_key first.';
    RETURN;
  END IF;

  -- 7am UTC on 1st of every month: generate recurring invoices for all eligible clients
  PERFORM cron.schedule(
    'monthly-recurring-invoice-generation',
    '0 7 1 * *',
    format(
      $$SELECT net.http_post(url:='%s/functions/v1/generate-recurring-invoices',
        headers:='{"Authorization":"Bearer %s","Content-Type":"application/json"}'::jsonb,
        body:='{}'::jsonb) AS request_id$$,
      base_url, svc_key
    )
  );

  -- 9am UTC daily: mark sent invoices as overdue when due_date has passed
  PERFORM cron.schedule(
    'daily-mark-overdue-invoices',
    '0 9 * * *',
    format(
      $$SELECT net.http_post(url:='%s/functions/v1/mark-overdue-invoices',
        headers:='{"Authorization":"Bearer %s","Content-Type":"application/json"}'::jsonb,
        body:='{}'::jsonb) AS request_id$$,
      base_url, svc_key
    )
  );

  RAISE NOTICE 'Cron jobs scheduled: monthly-recurring-invoice-generation (7am UTC 1st of month) and daily-mark-overdue-invoices (9am UTC daily)';
END;
$$;
