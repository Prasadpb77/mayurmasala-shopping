-- ============================================================
-- Migration: structured delivery address (PIN code, address line 1/2,
-- city, state) instead of one free-text address field.
-- Safe to run on an existing project — old orders keep their original
-- "address" text untouched; new orders populate the structured columns.
-- ============================================================

alter table orders add column if not exists address_line1 text;
alter table orders add column if not exists address_line2 text;
alter table orders add column if not exists pincode text;
alter table orders add column if not exists city text;
alter table orders add column if not exists state text default 'Maharashtra';

-- Old "address" column is now optional (new orders don't set it directly;
-- it's kept only so historical orders placed before this migration still
-- display correctly).
alter table orders alter column address drop not null;
