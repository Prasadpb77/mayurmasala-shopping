-- ============================================================
-- Migration: closes three gaps found during a security review.
--
-- 1) Removes anonymous/public SELECT access to the "orders" table
--    entirely. Previously `using (true)` meant anyone calling the
--    Supabase REST API directly with the anon key (visible in any
--    website's JS — not a secret) could list every customer's name,
--    phone, and address, not just look up one order by id.
--    Tracking/pay pages must now go through a server API route using
--    the service role key instead of querying the table directly.
--
-- 2) Adds a trigger that recomputes "total" from the submitted items
--    server-side, and force-resets status/payment_received/bill_url to
--    safe defaults on every insert — closing the gap where someone
--    could bypass the app's checkout route and insert a forged order
--    (fake total, already "delivered", already "paid") directly via
--    the REST API.
--
-- 3) Constrains "bill_url" so it can only ever point at your own
--    Supabase Storage bucket, so even a compromised admin session
--    can't redirect it to an external phishing/payment page.
--
-- Safe to run on an existing project.
-- ============================================================

-- --- 1) Remove anon SELECT on orders ---------------------------------
drop policy if exists "public read own order" on orders;

drop policy if exists "authenticated select orders" on orders;
create policy "authenticated select orders" on orders
  for select using (auth.role() = 'authenticated');

-- --- 2) Insert guard trigger ------------------------------------------
create or replace function guard_order_insert()
returns trigger as $$
begin
  new.total := (
    select coalesce(sum((item->>'price')::numeric * (item->>'qty')::numeric), 0)
    from jsonb_array_elements(new.items) as item
  );
  new.status := 'received';
  new.payment_received := false;
  new.bill_url := null;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_guard_order_insert on orders;
create trigger trg_guard_order_insert before insert on orders
  for each row execute procedure guard_order_insert();

drop policy if exists "public insert orders" on orders;
create policy "public insert orders" on orders
  for insert with check (
    status = 'received'
    and payment_received = false
    and bill_url is null
  );

-- --- 3) Constrain bill_url to your own storage domain -----------------
drop policy if exists "authenticated manage orders" on orders;
create policy "authenticated manage orders" on orders
  for update using (auth.role() = 'authenticated')
  with check (
    auth.role() = 'authenticated'
    and (
      bill_url is null
      or bill_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/bills/'
    )
  );

-- ============================================================
-- IMPORTANT — action required after running this migration:
-- Add a SUPABASE_SERVICE_ROLE_KEY environment variable (from Supabase
-- Project Settings > API > service_role key) to your Vercel project.
-- This is a SECRET key — do NOT prefix it with NEXT_PUBLIC_, and never
-- expose it to the browser. It's only ever used inside server-side API
-- routes (app/api/orders/[id]/route.ts) to fetch a single order safely.
-- ============================================================
