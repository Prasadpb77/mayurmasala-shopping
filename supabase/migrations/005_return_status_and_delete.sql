-- ============================================================
-- Migration: adds a "Return / Not Delivered" order status, and
-- allows authenticated (dashboard) users to delete orders.
-- Safe to run on an existing project.
-- ============================================================

-- Postgres requires enum values to be added outside a transaction block,
-- and ALTER TYPE ... ADD VALUE IF NOT EXISTS is supported since PG 12.
alter type order_status add value if not exists 'return_not_delivered';

-- Allow the dashboard (authenticated) to delete orders. Public/anon still
-- cannot delete — only insert and select-by-id, per the existing policies.
drop policy if exists "authenticated delete orders" on orders;
create policy "authenticated delete orders" on orders
  for delete using (auth.role() = 'authenticated');
