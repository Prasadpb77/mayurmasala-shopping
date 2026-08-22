-- ============================================================
-- Migration: adds the "instagram_reels" site_settings row so the
-- 3 featured reel links can be managed from /admin/settings.
-- Safe to run even if it already exists (ON CONFLICT DO NOTHING).
-- ============================================================

insert into site_settings (key, value) values
  ('instagram_reels', '{"urls": ["", "", ""]}')
on conflict (key) do nothing;
