# Changelog

All notable changes to this project are documented here, newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — v3 (planned)

### Showroom booking system

- Customer-facing reservation/booking flow for the showroom itself — not the
  internal admin "Bookings" record-keeping already shipped in v1, but a
  booking system the showroom's own customers would use. Not started yet.

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
