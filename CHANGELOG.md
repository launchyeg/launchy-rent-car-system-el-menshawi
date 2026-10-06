# Changelog

All notable changes to this project are documented here, newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — v3 (planned)

### Showroom booking system

- Customer-facing reservation/booking flow for the showroom itself — not the
  internal admin "Bookings" record-keeping already shipped in v1, but a
  booking system the showroom's own customers would use. Not started yet.

## [2.1.0] - 2026-10-06

### Added — Bookings v2: customer data, timeline, contract

- **Booking data.** Each booking now carries the customer's name, ID/passport
  number (text), phone, address and driving-licence number, plus the daily
  rate, deposit, odometer and fuel level at delivery, and notes. Customer data
  lives inside the booking row — no customers table. Days and total are
  computed (days = receipt date − delivery date; total = days × daily rate),
  never stored.
- **Contract numbers.** Sequential, unique, immutable (starts at 1001;
  existing bookings are numbered in creation order).
- **Cancel / received.** A booking can be cancelled (and restored) and marked
  "تم الاستلام" (and un-marked). Cancelled bookings never block the car and
  never alert. `returned_on` records the receipt.
- **Overlap prevention in the database.** A car cannot have two non-cancelled
  bookings that overlap. The period is [delivery day, receipt day): a car
  received back on the 15th can be delivered to another customer on the
  15th. `return_date > pickup_date` is enforced by a CHECK. The form shows
  unavailable cars and maps database errors to Arabic messages.
- **Timeline view** (default) and **list view** on the Bookings page: month
  grid with cars as rows, bars from delivery to receipt (half-day inset so
  same-day turnovers meet in the middle), today and Friday/Saturday shading,
  click a bar for details, click an empty cell to add a booking. The list adds
  search (customer, phone, ID, plate, contract number, car, owner), status /
  car / month filters, and row actions (view, edit, cancel/restore, mark
  received, delete, print).
- **Printable contract** (A4, RTL, Arabic) from any booking, with Save as PDF
  from the browser. Wording lives in `src/content/contractTemplate.js`
  (placeholders, auto-numbered articles); company details in
  `src/config/company.js`. Missing values print as blank lines. Rental days
  are written with correct Arabic grammar (يوم واحد / يومان / 5 أيام / 12 يومًا).
- **Overdue alert** — "متأخر N يوم عن الاستلام" — on the dashboard and in push
  notifications (pushed once per booking). Alert wording unified: "تسليم سيارة
  اليوم", "استلام سيارة اليوم", "يتبقى N يوم على التسليم / الاستلام".
- **Cars** gain `color`, `owner_name` and `plate_number` (required in the form,
  not unique). A shared car label — "make model year - owner" — is used in
  every selector, table, dialog, alert and the timeline.
- **Shared search** that ignores Arabic letter variants, diacritics, case and
  spaces; words match in any order; plate, phone and ID match as whole strings.
- **Automated tests** (Vitest, `npm test`) for the pure logic, the contract
  renderer and alert rules, plus an optional database-rules test that needs a
  separate test Supabase project (`.env.test`, see `.env.test.example`).

### Changed

- Dates and events are named consistently in the dashboard: التسليم =
  `pickup_date`, الاستلام = `return_date`.
- Dashboard alerts and `push-alerts` ignore cancelled bookings and bookings
  already marked received. **Redeploy the `push-alerts` Edge Function.**
- `package-lock.json` version synced with `package.json`.

### Database — run in order (see `supabase/README.md`)

`supabase/preflight_bookings_v1_1.sql` (read-only), then
`0003_cars_contract_fields.sql`, `0004_bookings_v1_1.sql`,
`0005_bookings_constraints.sql`, `0006_cars_plate_number.sql`.
`supabase/schema.sql` reflects the final shape for new projects.

## [2.0.0] - 2026-10-03

### Added — PWA + push notifications

- Installable PWA, scoped to `/dashboard` only — the public landing page
  never prompts to install.
- Real Web Push notifications (VAPID, no third-party push service) for
  alert state changes (insurance / license / oil change / booking pickup
  or return), delivered via a Supabase Edge Function (`push-alerts`) on a
  scheduled job (pg_cron).
- Per-device push subscription storage (`push_subscriptions`) and
  dedup logging (`notification_log`) so the same alert isn't pushed twice.
- Minimal "enable notifications" button in the dashboard topbar.

## [1.0.0] - 2026-10-03

### Added — Landing page + admin dashboard ("Launchy Rent Car System")

- Arabic (RTL) admin dashboard at `/dashboard`, built on top of the existing
  public landing page without touching its bundle (lazy-loaded, code-split).
- Supabase email/password auth — single manually-created admin account, no
  public registration. `/login` (English) → `/dashboard` (Arabic RTL).
- Full CRUD for the fleet and its related records, each tied to a car via
  `car_id` with cascade delete:
  - **Cars** — make, model, year, category, transmission, fuel type, seats, bags.
  - **Insurance** — provider, policy price, expiry date.
  - **License renewals** — renewal date, expiry date, cost.
  - **Maintenance (oil changes)** — tracked by odometer reading, not date.
  - **Bookings** — customer name/phone, pickup (تسليم) and return (استلام) dates.
- Dashboard home with stat cards and a color-coded alert feed for anything
  approaching/overdue (insurance, license, oil change, booking pickup/return).
- Per-page color legend explaining what each status badge means.
- Search across all 5 list pages, plus pickup/return date filters on Bookings.
- Mobile-responsive dashboard layout (stacked cards/tables, no horizontal
  overflow).

### Changed

- Database schema, RLS policies, and Edge Functions live under `supabase/`
  (`schema.sql` for a fresh install, `migrations/` for incremental changes —
  see `supabase/README.md`).

## [0.0.0] - initial

- Static marketing/landing page for El Menshawi Rent Car (React + Vite +
  Tailwind). See `README.md`.
