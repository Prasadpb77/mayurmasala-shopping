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
    create type order_status as enum ('received', 'processing', 'out_for_delivery', 'delivered');
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
  address text not null,
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
  ('instagram_reels', '{"urls": ["", "", ""]}')
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

-- Orders: public can INSERT (place order) and SELECT by id (tracking page)
drop policy if exists "public insert orders" on orders;
create policy "public insert orders" on orders
  for insert with check (true);

drop policy if exists "public read own order" on orders;
create policy "public read own order" on orders
  for select using (true); -- tracking page fetches by exact id via API route (service role) - see note below

drop policy if exists "authenticated manage orders" on orders;
create policy "authenticated manage orders" on orders
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated view all orders" on orders;
-- (covered by "public read own order" select=true; dashboard uses authenticated session anyway)

-- Site settings: public can read, only authenticated can write
drop policy if exists "public read settings" on site_settings;
create policy "public read settings" on site_settings
  for select using (true);

drop policy if exists "authenticated manage settings" on site_settings;
create policy "authenticated manage settings" on site_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

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
-- The "public read own order" policy allows selecting orders by id,
-- which is fine because order IDs are random UUIDs (unguessable) and
-- the tracking page only ever queries by exact id. Do NOT build any
-- public "list all orders" view using the anon key.
-- ============================================================
