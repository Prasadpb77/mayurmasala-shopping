-- ============================================================
-- Migration: adds the "reviews" table for the Google Reviews
-- section. Safe to run even if you already ran schema.sql before —
-- everything here uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- Run this once in Supabase SQL Editor if your project was set up
-- before this feature was added.
-- ============================================================

create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  review_date date,
  featured boolean not null default true,
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
