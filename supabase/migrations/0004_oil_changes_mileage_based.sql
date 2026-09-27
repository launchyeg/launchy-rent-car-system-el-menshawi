-- Migration 0004 — oil_changes: switch from date-based to mileage-based.
--
-- Run this only against a database that already has `oil_changes` from
-- schema.sql. Skip entirely on a brand-new project — schema.sql already
-- has the final shape.
--
-- What changes: change_date, next_change_date, and oil_type are dropped
-- (no longer collected — OilChangeForm.jsx no longer has those fields).
-- odometer_km and next_change_odometer_km become required, since they're
-- now the only two fields getOilStatus() reads to compute the badge
-- (warning starts once fewer than 1000 km remain).
--
-- Any existing rows missing odometer_km/next_change_odometer_km are
-- backfilled with placeholder values below so the not-null constraint
-- doesn't fail on old data — go back and correct those specific rows
-- with the car's real current reading afterwards.

alter table oil_changes drop column if exists change_date;
alter table oil_changes drop column if exists next_change_date;
alter table oil_changes drop column if exists oil_type;

update oil_changes set odometer_km = 0 where odometer_km is null;
update oil_changes set next_change_odometer_km = odometer_km + 7000
  where next_change_odometer_km is null;

alter table oil_changes alter column odometer_km set not null;
alter table oil_changes alter column next_change_odometer_km set not null;

drop index if exists oil_changes_car_id_change_date_idx;
create index if not exists oil_changes_car_id_idx on oil_changes (car_id);
