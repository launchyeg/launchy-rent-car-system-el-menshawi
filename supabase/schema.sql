-- Launchy Rent Car System v1 — database schema
--
-- Base schema for a BRAND-NEW Supabase project only. Run this once in your
-- SQL editor (Project → SQL Editor → New query → paste → Run). Safe to
-- re-run on the same fresh project (idempotent throughout).
--
-- If you already ran an earlier version of this file against a live
-- project, do NOT re-run this whole file to pick up later changes —
-- instead run the matching file(s) under supabase/migrations/ in order.
-- Each migration only contains the incremental change, so it's safe to
-- apply to a database that already has data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- cars — the fleet. Every other table hangs off this one via car_id.
-- ---------------------------------------------------------------------
create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  make text,
  model text not null,
  year smallint,
  category text not null check (category in ('luxury', 'sedan', 'suv', 'economy')),
  transmission text not null check (transmission in ('automatic', 'manual')),
  fuel_type text not null check (fuel_type in ('petrol', 'hybrid', 'electric')),
  seats smallint not null default 5,
  bags smallint not null default 2,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- insurance_records
-- ---------------------------------------------------------------------
create table if not exists insurance_records (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars (id) on delete cascade,
  provider text,
  policy_number text,
  price numeric not null,
  payment_date date,
  start_date date not null,
  expiry_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insurance_records_car_id_idx on insurance_records (car_id);
create index if not exists insurance_records_expiry_date_idx on insurance_records (expiry_date);

-- ---------------------------------------------------------------------
-- license_renewals
-- ---------------------------------------------------------------------
create table if not exists license_renewals (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars (id) on delete cascade,
  renewal_date date not null,
  expiry_date date not null,
  cost numeric not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists license_renewals_car_id_idx on license_renewals (car_id);
create index if not exists license_renewals_expiry_date_idx on license_renewals (expiry_date);

-- ---------------------------------------------------------------------
-- oil_changes — maintenance is intentionally just oil changes in v1.
-- Tracked by mileage, not date: the owner records the odometer reading at
-- each visit and a target reading for the next change; getOilStatus()
-- compares the two, so both are required.
-- ---------------------------------------------------------------------
create table if not exists oil_changes (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars (id) on delete cascade,
  odometer_km integer not null,
  next_change_odometer_km integer not null,
  cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oil_changes_car_id_idx on oil_changes (car_id);

-- ---------------------------------------------------------------------
-- bookings — v1 is deliberately simple: no customer accounts, no payments
-- ---------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars (id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  pickup_date date not null,
  return_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_car_id_idx on bookings (car_id);
create index if not exists bookings_date_range_idx on bookings (pickup_date, return_date);

-- ---------------------------------------------------------------------
-- push_subscriptions — one row per device/browser that enabled push
-- notifications from the dashboard (see src/dashboard/pwa/pushSubscription.js).
-- ---------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- notification_log — which alerts have already been pushed, so the
-- periodic check (supabase/functions/push-alerts) only pushes genuinely
-- new ones. A row is deleted once its alert resolves, so a later
-- re-occurrence (e.g. insurance renewed, then expires again next year)
-- pushes again instead of staying silenced forever.
-- ---------------------------------------------------------------------
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security — single-admin v1: any authenticated user has full
-- access, no one else (anon key is only ever used for the login call).
-- ---------------------------------------------------------------------
alter table cars enable row level security;
alter table insurance_records enable row level security;
alter table license_renewals enable row level security;
alter table oil_changes enable row level security;
alter table bookings enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;

drop policy if exists "authenticated full access" on cars;
create policy "authenticated full access" on cars
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on insurance_records;
create policy "authenticated full access" on insurance_records
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on license_renewals;
create policy "authenticated full access" on license_renewals
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on oil_changes;
create policy "authenticated full access" on oil_changes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on bookings;
create policy "authenticated full access" on bookings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on push_subscriptions;
create policy "authenticated full access" on push_subscriptions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on notification_log;
create policy "authenticated full access" on notification_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- updated_at auto-touch trigger, applied to every table above
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on cars;
create trigger set_updated_at before update on cars
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at on insurance_records;
create trigger set_updated_at before update on insurance_records
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at on license_renewals;
create trigger set_updated_at before update on license_renewals
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at on oil_changes;
create trigger set_updated_at before update on oil_changes
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at on bookings;
create trigger set_updated_at before update on bookings
  for each row execute function set_updated_at();
