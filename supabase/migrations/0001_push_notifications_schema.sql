-- Migration 0001 — push notification tables.
--
-- Run this against your existing project (numbering restarts at 0001
-- since no earlier migration files are tracked in this repo — schema.sql
-- already reflects everything applied to your database up to this
-- point). Safe to run immediately, no placeholders to fill in.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,
  sent_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;

drop policy if exists "authenticated full access" on push_subscriptions;
create policy "authenticated full access" on push_subscriptions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on notification_log;
create policy "authenticated full access" on notification_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
