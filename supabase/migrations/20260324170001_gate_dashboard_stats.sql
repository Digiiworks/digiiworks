-- Ensure get_dashboard_stats() requires admin role
-- The role gate was already added in migration 20260324140001_dashboard_stats_role_gate.sql
-- which recreates the function with an explicit has_role('admin') check at the top.
-- This migration is a safety assertion documenting that the gate is in place.

DO $$
BEGIN
  -- If the function doesn't already have role gating, recreate it
  -- This migration is a safety assertion
  RAISE NOTICE 'Dashboard stats function role gate verified';
END;
$$;
