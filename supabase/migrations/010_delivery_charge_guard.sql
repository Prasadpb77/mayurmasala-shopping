-- 010: Make the DB-level insert guard aware of delivery charges.
--
-- Migration 008 added a trigger that force-recomputes "total" from the
-- submitted items on every insert, so a forged total can never be written
-- even via a direct REST call with the anon key. That trigger predates
-- delivery charges, so it would silently drop the delivery charge from
-- "total" every time. It also didn't validate "delivery_charge" or
-- "delivery_zone" at all — meaning someone bypassing the app's checkout
-- API could still insert an order with a fake near-zero delivery_charge
-- directly against the REST API, even though "total" itself was safe.
--
-- This replaces the trigger so it:
--   1) computes subtotal from items (unchanged behaviour, renamed field)
--   2) validates delivery_zone against the known zone keys (defaults to
--      "rest_of_india" if missing/invalid)
--   3) looks up that zone's charge from site_settings.delivery_zones itself
--      — never trusting whatever delivery_charge the client sent
--   4) sets total = subtotal + the authoritative delivery_charge

create or replace function guard_order_insert()
returns trigger as $$
declare
  computed_subtotal numeric;
  zone_key text;
  zone_charge numeric;
  zones jsonb;
begin
  computed_subtotal := (
    select coalesce(sum((item->>'price')::numeric * (item->>'qty')::numeric), 0)
    from jsonb_array_elements(new.items) as item
  );

  zone_key := new.delivery_zone;
  if zone_key is null or zone_key not in (
    'pune_local', 'mumbai', 'metro', 'nagpur', 'maharashtra', 'rest_of_india'
  ) then
    zone_key := 'rest_of_india';
  end if;

  select value into zones from site_settings where key = 'delivery_zones';

  zone_charge := coalesce((zones -> zone_key ->> 'charge')::numeric, 0);

  new.subtotal := computed_subtotal;
  new.delivery_zone := zone_key;
  new.delivery_charge := zone_charge;
  new.total := computed_subtotal + zone_charge;
  new.status := 'received';
  new.payment_received := false;
  new.bill_url := null;
  return new;
end;
$$ language plpgsql;

-- Trigger definition itself (trg_guard_order_insert) is unchanged, just
-- picks up the new function body automatically since it's the same name.
