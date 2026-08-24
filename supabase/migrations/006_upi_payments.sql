-- ============================================================
-- Migration: adds the "upi" site_settings row so the shop's UPI ID
-- (VPA) can be set from /admin/settings, used to generate the
-- pay-by-UPI QR code on bills and the pay link sent on WhatsApp.
-- Safe to run even if it already exists.
-- ============================================================

insert into site_settings (key, value) values
  ('upi', '{"vpa": "", "payee_name": ""}')
on conflict (key) do nothing;
