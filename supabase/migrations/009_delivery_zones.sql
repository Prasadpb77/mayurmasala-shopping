-- 009: Delivery zone charges
-- Adds subtotal/delivery_charge to orders (total = subtotal + delivery_charge),
-- and seeds an admin-editable "delivery_zones" row in site_settings holding
-- the ₹ charge for each zone. Charges are looked up server-side at order
-- creation time — never trusted from the client.

alter table orders add column if not exists subtotal numeric(10, 2);
alter table orders add column if not exists delivery_charge numeric(10, 2) not null default 0;
alter table orders add column if not exists delivery_zone text;

-- Backfill existing rows: subtotal = total, delivery_charge stays 0 (unknown
-- historically, since this concept didn't exist yet).
update orders set subtotal = total where subtotal is null;

insert into site_settings (key, value)
values (
  'delivery_zones',
  '{
    "pune_local": { "label": "Pune (Local)", "charge": 0 },
    "mumbai": { "label": "Mumbai", "charge": 80 },
    "metro": { "label": "Other Metro Cities", "charge": 100 },
    "nagpur": { "label": "Nagpur", "charge": 80 },
    "maharashtra": { "label": "Rest of Maharashtra", "charge": 60 },
    "rest_of_india": { "label": "Rest of India", "charge": 150 }
  }'::jsonb
)
on conflict (key) do nothing;
