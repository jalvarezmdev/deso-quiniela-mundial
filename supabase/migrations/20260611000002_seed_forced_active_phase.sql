-- supabase/migrations/20260611000002_seed_forced_active_phase.sql
-- Default: no forced phase (null) so getActivePhase computes it.
-- Admins can set it to any PhaseKey via the admin panel.
INSERT INTO site_config (key, value) VALUES ('forced_active_phase', 'null')
ON CONFLICT (key) DO NOTHING;
