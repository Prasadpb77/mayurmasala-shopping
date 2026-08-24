-- ============================================================
-- Migration: makes the "upi" row in site_settings read-only from the
-- website's admin dashboard. After this runs, the VPA can only be set
-- or changed by running SQL directly in the Supabase SQL Editor
-- (which runs as the project owner and bypasses RLS) — never through
-- the site's admin login, even if that login is compromised.
--
-- Public read access is unchanged (the checkout/pay/bill pages still
-- need to read the VPA client-side to render the UPI QR code).
-- ============================================================

drop policy if exists "authenticated manage settings" on site_settings;

drop policy if exists "authenticated insert settings" on site_settings;
create policy "authenticated insert settings" on site_settings
  for insert with check (auth.role() = 'authenticated' and key <> 'upi');

drop policy if exists "authenticated update settings" on site_settings;
create policy "authenticated update settings" on site_settings
  for update using (auth.role() = 'authenticated' and key <> 'upi')
  with check (auth.role() = 'authenticated' and key <> 'upi');

drop policy if exists "authenticated delete settings" on site_settings;
create policy "authenticated delete settings" on site_settings
  for delete using (auth.role() = 'authenticated' and key <> 'upi');

-- ============================================================
-- To set or update your UPI ID, run this directly in the SQL Editor:
--
-- update site_settings
-- set value = '{"vpa": "yourshop@okbank", "payee_name": "Your Shop Name"}'
-- where key = 'upi';
-- ============================================================
