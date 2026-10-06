# CLAUDE.md

Public landing site plus an Arabic (RTL) admin dashboard ("Launchy Rent Car System", at `/dashboard`) for **El Menshawi Rent Car**, a car-rental business in Hurghada, Egypt (production: https://elmenshawirentcar.com). Built by Launchy (repo: `launchyeg/landing-page-el-menshawi-rent-car`). Product = Launchy Rent Car System, client = El Menshawi Rent Car. Current version: see `package.json` (shown in the dashboard sidebar and login page); history in `CHANGELOG.md`.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build -> dist/ (gitignored)
npm run preview  # serve the built dist/
npm run lint     # oxlint (config: .oxlintrc.json)
npm test         # Vitest, run once (npm run test:watch to re-run on save)
```

Tests cover pure logic (booking maths, status/alert rules, search, car label, contract renderer). `src/dashboard/features/bookings/bookingsRules.db.test.js` checks the database rules but only runs when `.env.test` points at a **separate** test Supabase project (see `.env.test.example`); otherwise it skips. There is no CI config; `vercel.json` rewrites everything to `index.html`.

**Version:** bump with `npm version <x.y.z> --no-git-tag-version` (updates `package.json` and `package-lock.json` together; `vite.config.js` injects it as `__APP_VERSION__`), and add a `CHANGELOG.md` entry.

## Stack

- React 19 + Vite 8 (`@vitejs/plugin-react`), plain JavaScript/JSX (no TypeScript)
- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens live in `src/index.css` under `@theme`
- Framer Motion for animations, react-icons for icons
- React Router (public site at `/`, dashboard under `/dashboard`, login at `/login`; the dashboard is lazy-loaded so the public site never downloads it)
- Supabase (`@supabase/supabase-js`): email/password auth for one admin, Postgres, an Edge Function for push notifications. Env vars: see `.env.example`
- Vitest for tests, oxlint for linting

**Not present:** state library, i18n, a PDF library (contracts use the browser's print dialog).

## Architecture

```
index.html            SEO meta, Open Graph/Twitter, JSON-LD (AutoRental), font + LCP preloads
src/main.jsx          React root (StrictMode)
src/App.jsx           <Layout> wrapping <LandingPage>, passes shared content as props
src/pages/LandingPage.jsx   Section order: Hero, CarTypes, About, Fleet, Services, Promo,
                            RentalCategories, Testimonials, Booking
src/components/layout/      Navbar, Footer, Layout, Brand, ContactFab (floating WhatsApp/call button)
src/components/landingPage/ One component per section + TermsModal
src/content/content.js      ALL copy, links, images, fleet data, contact info (single source of truth)
src/lib/motion.js           Shared Framer Motion variants (fadeUp, fadeIn, staggerContainer, staggerItem, viewportOnce)
src/lib/icons.js            String-key -> react-icon maps (specIcons, socialIcons)
src/index.css               Tailwind import, design tokens, component classes
public/                     favicon.svg, robots.txt, sitemap.xml, PWA manifest + sw.js (dashboard only)
```

### Dashboard (Arabic, RTL)

```
src/dashboard/AdminArea.jsx      Routes: /login, /dashboard/* (cars, insurance, licenses, maintenance, bookings),
                                 /dashboard/bookings/:id/contract (printable, outside the layout)
src/dashboard/auth/              AuthProvider, RequireAuth
src/dashboard/layout/            DashboardLayout, Sidebar, Topbar, push-notification button
src/dashboard/alerts/            AlertsProvider (fetches once, computes every alert, refreshes every minute)
src/dashboard/features/<x>/      One folder per area: *Api.js (Supabase queries), *Form.jsx, helpers
  bookings/                      bookingsApi, BookingForm, BookingActions, BookingDetails,
                                 BookingTimeline, bookingUtils (rentalDays, totalAmount, arabicDaysText, timelineBar…)
  contract/                      contractRenderer (pure), ContractDocument, contract.css (print/A4)
src/dashboard/lib/               alerts.js (all date/status/alert rules), carLabel.js, searchText.js, format.js
src/dashboard/ui/                Modal, ConfirmDialog, DataTable, FormField, SearchInput, StatusBadge, Toast…
src/pages/dashboard/             One page per route
src/config/company.js            Company details printed on contracts (per client)
src/content/contractTemplate.js  Contract wording (per client)
supabase/                        schema.sql (fresh project), migrations/ (incremental), preflight_*.sql,
                                 functions/push-alerts (Edge Function — a Deno copy of the alert rules)
```

Rules that must stay in one place: **car display name** → `carLabel()` in `src/dashboard/lib/carLabel.js` (format "make model year - owner", never the plate; ported into `push-alerts`); **search** → `matchesQuery()` in `src/dashboard/lib/searchText.js` (Arabic-aware; plate/phone/ID are strict whole-string matches); **booking status and alerts** → `getBookingStatus` / `getBookingNotice` / `getBookingDisplayStatus` in `alerts.js` (also ported into `push-alerts`, which must be redeployed — `supabase functions deploy push-alerts` — whenever those rules or labels change).

### Bookings data (v2.1.0)

Customer data is stored inside the booking row (no customers table, no payments): `customer_name`, `customer_phone`, `customer_id_number` (text), `customer_address`, `customer_license_number`, `daily_rate`, `deposit_amount`, `odometer_out`, `fuel_level_out` (full / three_quarters / half / quarter / empty), `notes`, plus `contract_number` (sequence from 1001, immutable), `cancelled_at` and `returned_on`. Displayed status is derived from dates (upcoming / active / overdue / completed) with cancellation and receipt stored. `daily_rate` and `customer_id_number` are required by the form only (legacy rows don't have them). Cars have `color`, `owner_name` (internal, never on the contract) and a required, non-unique `plate_number`.

### Data flow

`content.js` exports plain objects → `App.jsx` / `LandingPage.jsx` import them → spread into section components as props (`<Hero {...hero} />`). Components are presentational and hold only local UI state (menu open, modal open, testimonial index, form values). Content stays JSON-serializable: icons are referenced by string key and resolved through `src/lib/icons.js`.

### Public booking flow (no backend)

The public landing page's `Booking.jsx` form → on submit, builds a text message from the fields and opens `https://wa.me/<business phone>?text=...` in a new tab. Nothing is stored or sent to a server. The business phone comes from `contact.phone.value` in `content.js`; the WhatsApp link in `social` is derived from it too.

### External services

- **Cloudinary** (`res.cloudinary.com/dirbnpgsp`) — most images
- **Hotlinked third-party images** — fleet car photos (hatla2ee, gstatic thumbnails, yallamotor, nissan-cdn, changan.com.eg, zigwheels, motory S3) and two rental-category images from a Webflow template CDN (`cdn.prod.website-files.com`)
- **Google Fonts** — Inter + Plus Jakarta Sans (loaded non-blocking in `index.html`)
- **WhatsApp** (`wa.me`), Google Maps link, Google Reviews share link, Facebook, Instagram
- **Supabase** (dashboard only): auth, Postgres, Edge Function `push-alerts` on a 15-minute schedule. Setup and migrations: `supabase/README.md`

## Conventions

- **Content changes go in `src/content/content.js`, not components.** Add new copy there and pass it via props.
- Section components: default-export function, destructure props, wrap in `<section className="section" id={...}>` + `<div className="wrap">`. Alternate grey sections use `section section-alt`.
- Animate with the shared variants from `src/lib/motion.js` using `initial="hidden" whileInView="show" viewport={viewportOnce}`; don't define ad-hoc easing unless necessary (house easing is `[0.16, 1, 0.3, 1]`).
- Style with Tailwind utilities + design tokens (`text-ink`, `bg-primary`, `bg-surface-alt`, `shadow-card`, …) and the component classes in `index.css`: `.wrap`, `.section`, `.section-alt`, `.eyebrow`, `.section-heading`, `.btn`, `.btn-primary`, `.btn-light`, `.btn-outline`. Re-theme by editing `@theme` tokens.
- Tailwind v4 syntax is used (`bg-linear-to-b`, `aspect-4/3`, `z-110`, `h-10.5`) — don't "fix" these to v3 forms.
- Mobile/desktop nav breakpoint is `min-[900px]`.
- Images: `loading="lazy" decoding="async"` below the fold; the hero uses `fetchPriority="high"`.
- External links: `target="_blank" rel="noopener noreferrer"`. Icons get `aria-hidden="true"`; icon-only buttons get `aria-label`.
- Double quotes, 2-space indent, semicolons in `src/`. Short explanatory comments above components where behaviour isn't obvious.
- Dashboard: Arabic UI and RTL; reuse the components in `src/dashboard/ui/`; Supabase queries live in `features/<x>/*Api.js`; only the terms in "Dashboard terminology" below for pickup/return; schema changes go in a new numbered `supabase/migrations/NNNN_*.sql` plus `schema.sql`, never by editing an applied migration.
- Section anchors in use: `#top` (hero), `#car-types`, `#about`, `#fleet`, `#services`, `#testimonials`, `#booking`, `#footer`.

## Booking date rule (overlap and rental days)

- A booking occupies [delivery day, receipt day). If a car is received back on the 15th, it CAN be delivered to another customer on the 15th (same-day turnover is allowed). Back-to-back bookings are valid.
- Rental days = receipt_date - delivery_date. 10/10 -> 15/10 = 5 days; 10/10 -> 11/10 = 1 day.
- `return_date > pickup_date` stays strict. No single-day or zero-day bookings.
- A car is considered occupied on its delivery day through the day BEFORE the receipt day, for the purposes of the overlap rule.
- Enforced in the database: `bookings_no_overlap` is an exclusion constraint on `car_id` + `daterange(pickup_date, return_date, '[)')`, ignoring cancelled bookings (`cancelled_at is not null`); `bookings_dates_valid` is `return_date > pickup_date` (migration 0005).
- `rentalDays()` in `src/dashboard/features/bookings/bookingUtils.js` = return - pickup; `totalAmount()` = days × daily rate. Neither is stored — both are computed.
- `listBookedCarIds()` in `bookingsApi.js` uses the same rule (`pickup_date < newReturn` and `return_date > newPickup`), so the form hint, the error message and the database agree.
- The timeline draws each bar from the middle of the delivery day to the middle of the receipt day, so a receipt and a new delivery on the same day appear as two bars meeting in the middle of that day.

## Rental contract (print)

- Route: `/dashboard/bookings/:id/contract` (`src/pages/dashboard/ContractPage.jsx`), authenticated but outside `DashboardLayout` so there is no chrome to hide. Opened from "طباعة العقد" on the booking list rows and in the details modal (disabled for cancelled bookings). "طباعة" calls `window.print()`; "Save as PDF" comes from the browser's print dialog — no PDF library.
- **Contract wording lives only in `src/content/contractTemplate.js`** — edit the text there and nothing else changes. `{{placeholders}}` are filled from the booking, the car and the company config; a missing/empty/unknown value prints as a blank line, never `undefined` or `{{...}}`. Articles are auto-numbered (`بند (n):`); `{ text, onlyIf: "key" }` items print only when that value exists. The list of available placeholders is at the top of the template file and in `PLACEHOLDER_KEYS` (`src/dashboard/features/contract/contractRenderer.js`); a unit test fails if the template uses an unknown one.
- **Company details live in `src/config/company.js`** (name, address, phone, optional commercialRegister / taxNumber / representative — empty or "لا يوجد" means those header lines are not printed). Another client edits this file and the template.
- Contract date = the booking's delivery date (`pickup_date`); rental days = receipt − delivery; dates are DD/MM/YYYY and digits are Western. Owner name and trim are never in the contract; the plate is (`{{car_plate}}`).
- Print CSS (A4, margins, page-break handling for articles and signatures) is in `src/dashboard/features/contract/contract.css`.
- The contract text is a first draft and is not presented in the UI as legal advice; have a lawyer review the final wording.

## Dashboard terminology (Arabic UI) — keep consistent

From the rental company's point of view:

- **التسليم** = the day the company hands the car to the customer = `pickup_date`. Form label: "تاريخ التسليم (يوم تسليم السيارة للعميل)".
- **الاستلام** = the day the company receives the car back = `return_date`. Form label: "تاريخ الاستلام (يوم استلام السيارة من العميل)". The "تم الاستلام" button sets `returned_on`.
- Use only these two terms for the two dates/events in forms, tables, alerts, toasts, errors and push messages. Don't introduce إرجاع / رجوع / إخراج / check-in / check-out for them.
- In contract prose, the customer giving the car back is "رد السيارة" (e.g. "يلتزم الطرف الثاني برد السيارة للطرف الأول في تاريخ الاستلام المحدد").
- Alert wording: "تسليم سيارة اليوم", "استلام سيارة اليوم", "يتبقى N يوم على التسليم / على الاستلام", "متأخر N يوم عن الاستلام". Booking statuses are masculine (قادم، جاري، منتهي، ملغي).
- Date error: "تاريخ الاستلام يجب أن يكون بعد تاريخ التسليم".
- Database column names stay `pickup_date` / `return_date`.

## Known issues / gotchas (verify before changing)

- **Broken anchor:** navbar and footer "Book Now" link to `#book`, but the booking section id is `booking`.
- **LCP preload mismatch:** `index.html` preloads a Cloudinary image (`706595150_…`) that is no longer the hero image (`content.js` hero uses `pexels-danila-rusanov…`). The preload is wasted and the real hero loads late. OG/Twitter/JSON-LD images also still use the old one. Update them together when changing the hero.
- Fleet cars carry `price`, `currency`, `period` (all `1000 EGP / Per Day`), but `Fleet.jsx` doesn't render them; it shows a hard-coded "Ask for Price" button instead. `fleet.viewAllCta` is also unused.
- The Testimonials side image is hard-coded in `Testimonials.jsx` instead of `content.js`.
- Testimonials are static entries in `content.js`, not pulled from Google. The Google card shows a fixed 5 stars.
- The navbar's admin icon (desktop) and "Admin" link (mobile) go to `/login`.
- Car type "Luxury" has no matching fleet cars. Car-type cards all link to `#booking` without preselecting the type.
- The booking form has no check that drop-off is after pick-up and no minimum date.
- `README.md` mentions `public/images/`, which doesn't exist; images are remote URLs.
- Hotlinked third-party images can disappear or be blocked at any time, and they have licensing/hotlinking concerns.
- Navbar and TermsModal both set `document.body.style.overflow`. Closing one can re-enable scrolling while the other is open.
- `TermsModal` is instantiated twice (Footer and Booking), both reading `termsAndPrivacy[0]`.
