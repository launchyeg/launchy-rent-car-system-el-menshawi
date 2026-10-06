# Database & backend setup

- **New Supabase project, nothing set up yet:** run `schema.sql` once in the SQL editor. It reflects the final, current shape of the database.
- **Existing project, applying a schema change:** put the incremental change in a new `migrations/NNNN_description.sql` file (numbered after whatever's already there) and run just that file — don't re-run all of `schema.sql`.

## Migrations, in order

Files in `migrations/` are incremental: run only the ones your database hasn't had yet, in numeric order, each once, in the SQL editor. `schema.sql` is the final shape for a brand-new project and already includes everything below.

| File | What it does | Notes |
|---|---|---|
| `0001_push_notifications_schema.sql`, `0002_push_notifications_schedule.sql` | Push notification tables and schedule | Referred to in the push section below; already applied on existing projects. |
| `0003_cars_contract_fields.sql` | Adds `cars.color` and `cars.owner_name` | **Never re-run it once plates exist.** It still contains `drop column if exists plate_number, trim` (cleanup from an earlier draft), which would delete every plate number entered after `0006`. On a fresh project the order 0003 → 0006 is safe. |
| `0004_bookings_v1_1.sql` | Customer/price columns on `bookings`, contract-number sequence (from 1001), `cancelled_at`, `returned_on`, value checks, immutable contract number | Only adds columns, so it can't fail on existing data. Past bookings are marked as received (one-time backfill). |
| `0005_bookings_constraints.sql` | `return_date > pickup_date` check, and the overlap exclusion constraint on `car_id` + `daterange(pickup_date, return_date, '[)')` for non-cancelled bookings | **Run `preflight_bookings_v1_1.sql` first** — it fails, changing nothing, if existing bookings are invalid or overlap. |
| `0006_cars_plate_number.sql` | Adds optional, non-unique `cars.plate_number` | Safe to re-run. |

**Order for an existing project upgrading to 2.1.0**

1. Take a database backup.
2. Run `preflight_bookings_v1_1.sql` (read-only). Both queries must return zero rows; fix whatever they list (instructions are in the file).
3. Run `0003`, `0004`, `0005`, `0006` in that order.
4. Redeploy the `push-alerts` Edge Function (see below).

**Verify**

```sql
-- constraints (expect '[)' in the overlap definition)
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'bookings'::regclass
  and conname in ('bookings_dates_valid', 'bookings_no_overlap');

-- contract numbers start at 1001, in creation order
select contract_number, customer_name from bookings order by contract_number limit 5;

-- car columns
select column_name from information_schema.columns
where table_name = 'cars' and column_name in ('color', 'owner_name', 'plate_number');
```

**Tests that touch the database** use a *separate* test project, never this one — see `.env.test.example` and `src/dashboard/features/bookings/bookingsRules.db.test.js`.

## Push notifications (Edge Function)

`functions/push-alerts/index.ts` checks every 15 minutes for anything that's newly crossed into an alert state (insurance/license/oil/booking) and sends a real Web Push notification to every device that's enabled it from the dashboard bell. No third-party account — it's the open Web Push standard (VAPID), not Firebase/OneSignal/etc.

1. **Run the two new tables** (if you haven't already): `migrations/0001_push_notifications_schema.sql` in the SQL editor.
2. **Generate a VAPID key pair** (one-time, no account): `npx web-push generate-vapid-keys`.
3. **Frontend:** put the **public** key in your `.env` as `VITE_VAPID_PUBLIC_KEY` (see `.env.example`) and rebuild/redeploy.
4. **Deploy the function** — Dashboard → Edge Functions → Create → name it `push-alerts` → paste in `functions/push-alerts/index.ts`, or `supabase functions deploy push-alerts` via the CLI.
5. **Set its secrets** (Dashboard → Edge Functions → push-alerts → Secrets, or `supabase secrets set`):
   - `VAPID_PUBLIC_KEY` — same value as `VITE_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY` — the private half, **never** put this in `.env` or the frontend
   - `VAPID_SUBJECT` — optional, e.g. `mailto:you@example.com`
   - (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically)
6. **Schedule it** — run `migrations/0002_push_notifications_schedule.sql` after filling in your project ref and anon key.
7. **Enable it on your phone** — open the dashboard, click the bell, tap "تفعيل إشعارات الهاتف" (only shows up if you haven't already enabled it on that device).
8. **Test it manually** before waiting for the schedule: `supabase functions invoke push-alerts` (or the Dashboard's "Invoke" button) — check the function logs to confirm it ran and sent, then check your phone.

**Redeploying after code changes** (e.g. when alert rules or labels change; secrets and the schedule stay as they are):

```bash
supabase functions deploy push-alerts --project-ref <your-project-ref>
```
