-- ============================================================
-- Mayur Masala and Pooja Center — Supabase schema
-- Run this whole file once in Supabase SQL Editor
-- ============================================================

-- 1. EXTENSIONS ------------------------------------------------
create extension if not exists "uuid-ossp";

-- 2. ORDER STATUS ENUM ------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('received', 'processing', 'out_for_delivery', 'delivered', 'return_not_delivered');
  end if;
end $$;

-- 3. PRODUCTS ------------------------------------------------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  category text default 'general',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. ORDERS ------------------------------------------------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,          -- short human friendly code e.g. MM-20260822-0001
  customer_name text not null,
  phone text not null,                        -- validated E.164-ish, digits only w/ optional +91
  is_whatsapp boolean not null default true,
  address_line1 text not null,
  address_line2 text,
  pincode text not null,
  city text not null,
  state text not null default 'Maharashtra',
  address text,                               -- legacy combined address (unused by new orders)
  items jsonb not null,                       -- [{product_id,name,price,qty}]
  total numeric(10,2) not null,
  status order_status not null default 'received',
  payment_received boolean not null default false,
  bill_url text,                              -- pdf uploaded at "out for delivery" stage
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at desc);

-- 5. SITE SETTINGS (banner / about / footer, editable from dashboard) ------
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into site_settings (key, value) values
  ('banner', '{"enabled": true, "text": "Celebrating 30+ years in Pimpri — fresh masalas ground daily, all pooja samagri under one roof.", "link": ""}'),
  ('about', '{"title": "Our Story", "body": "Founded in 1992, Mayur Masala and Pooja Center has been Pimpri''s trusted home for pure, freshly ground masalas and complete pooja samagri for over three decades. What began as a small family counter has grown into the area''s most loved masala and pooja store, serving generations of families with the same care, purity and honesty we started with."}'),
  ('footer', '{"tagline": "Trusted since 1992 — Pimpri''s own masala and pooja store.", "hours": "Open all days, 9:00 AM - 9:00 PM"}'),
  ('instagram_reels', '{"urls": ["", "", ""]}'),
  ('upi', '{"vpa": "", "payee_name": ""}')
on conflict (key) do nothing;

-- 6. UPDATED_AT TRIGGER ------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute procedure set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute procedure set_updated_at();

drop trigger if exists trg_settings_updated_at on site_settings;
create trigger trg_settings_updated_at before update on site_settings
  for each row execute procedure set_updated_at();

-- 7. ORDER NUMBER GENERATOR ------------------------------------------------
create or replace function generate_order_number()
returns text as $$
declare
  today_str text := to_char(now(), 'YYYYMMDD');
  seq_num int;
  result text;
begin
  select count(*) + 1 into seq_num
  from orders
  where order_number like 'MM-' || today_str || '-%';

  result := 'MM-' || today_str || '-' || lpad(seq_num::text, 4, '0');
  return result;
end;
$$ language plpgsql;

-- 7b. ORDER INSERT GUARD ------------------------------------------------
-- Recomputes "total" from the submitted items server-side (so a forged
-- total can never be inserted, however the insert is made — app route,
-- direct REST call, anything) and force-resets status/payment/bill fields
-- to safe defaults. This holds even for insert paths that bypass the app.
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

-- 5b. REVIEWS (manually curated from Google, shown on homepage) ------------
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  review_date date,
  featured boolean not null default true,   -- uncheck to hide without deleting
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_featured on reviews(featured, sort_order);

alter table reviews enable row level security;

drop policy if exists "public read featured reviews" on reviews;
create policy "public read featured reviews" on reviews
  for select using (featured = true);

drop policy if exists "authenticated manage reviews" on reviews;
create policy "authenticated manage reviews" on reviews
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon) can: read active products, read settings,
-- insert an order, read a SINGLE order by its id (for tracking).
-- Only authenticated (dashboard) users can: manage products,
-- update orders, edit settings.
-- ============================================================

alter table products enable row level security;
alter table orders enable row level security;
alter table site_settings enable row level security;

-- Products: anyone can view active products
drop policy if exists "public read active products" on products;
create policy "public read active products" on products
  for select using (active = true);

drop policy if exists "authenticated manage products" on products;
create policy "authenticated manage products" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Orders: public (anon) can only INSERT — never SELECT directly. Individual
-- order lookups for the tracking/pay pages go through a server-side API
-- route using the service role key (never exposed to the browser), so the
-- anon key genuinely cannot list or scrape the orders table at all, even by
-- calling the Supabase REST API directly outside the app.
drop policy if exists "public insert orders" on orders;
create policy "public insert orders" on orders
  for insert with check (
    status = 'received'
    and payment_received = false
    and bill_url is null
  );
  -- total/status/payment_received/bill_url are also force-reset by the
  -- trg_orders_before_insert trigger below, so this holds even if a request
  -- bypasses the app and hits the REST API directly with a crafted payload.

drop policy if exists "public read own order" on orders;
-- (intentionally no anon/public select policy on orders — see note above)

drop policy if exists "authenticated select orders" on orders;
create policy "authenticated select orders" on orders
  for select using (auth.role() = 'authenticated');

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
  -- bill_url is constrained to your own Supabase storage bucket, so even a
  -- compromised admin session can't point it at an external phishing/QR page.

drop policy if exists "authenticated delete orders" on orders;
create policy "authenticated delete orders" on orders
  for delete using (auth.role() = 'authenticated');

-- Site settings: public can read everything (including "upi", since the
-- checkout/pay/bill pages need the VPA client-side to render the QR code).
-- The dashboard (authenticated role) can write every settings row EXCEPT
-- "upi" — that row is intentionally excluded from every write policy below,
-- so the payout destination can only ever be changed via direct SQL in the
-- Supabase SQL editor (which runs as the project owner and bypasses RLS),
-- never through the website's admin login.
drop policy if exists "public read settings" on site_settings;
create policy "public read settings" on site_settings
  for select using (true);

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
-- STORAGE BUCKETS
-- Run these, or create via Dashboard > Storage > New bucket
-- product-images: public bucket for product photos
-- bills: public bucket for delivery bill PDFs (link shared via WhatsApp)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict (id) do nothing;

-- Storage policies: allow authenticated uploads, public read
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "authenticated upload product images" on storage.objects;
create policy "authenticated upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated update product images" on storage.objects;
create policy "authenticated update product images" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete product images" on storage.objects;
create policy "authenticated delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "public read bills" on storage.objects;
create policy "public read bills" on storage.objects
  for select using (bucket_id = 'bills');

drop policy if exists "authenticated upload bills" on storage.objects;
create policy "authenticated upload bills" on storage.objects
  for insert with check (bucket_id = 'bills' and auth.role() = 'authenticated');

-- ============================================================
-- NOTE ON ORDER PRIVACY:
-- The anon key has NO select policy on "orders" at all — it can only
-- insert new orders. The tracking page (/track/[id]) and pay page
-- (/pay/[id]) fetch a single order by id through a server-side API route
-- that uses the SUPABASE_SERVICE_ROLE_KEY (never exposed to the browser),
-- not by querying the table directly from the client. This means the
-- anon key genuinely cannot list or scrape customer orders, even by
-- calling the Supabase REST API directly from outside the app.
-- ============================================================
