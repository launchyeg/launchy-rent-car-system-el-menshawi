# CLAUDE.md

Single-page marketing/landing site for **El Menshawi Rent Car**, a car-rental business in Hurghada, Egypt (production: https://elmenshawirentcar.com). Built by Launchy (repo: `launchyeg/landing-page-el-menshawi-rent-car`).

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build -> dist/ (gitignored)
npm run preview  # serve the built dist/
npm run lint     # oxlint (config: .oxlintrc.json)
```

There are no tests, no CI config, and no deployment config in the repo.

## Stack

- React 19 + Vite 8 (`@vitejs/plugin-react`), plain JavaScript/JSX (no TypeScript)
- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens live in `src/index.css` under `@theme`
- Framer Motion for animations, react-icons for icons
- oxlint for linting

**Not present:** router, state library, backend, database, authentication, API calls, environment variables, i18n. Everything runs client-side.

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
public/                     favicon.svg, robots.txt, sitemap.xml
```

### Data flow

`content.js` exports plain objects → `App.jsx` / `LandingPage.jsx` import them → spread into section components as props (`<Hero {...hero} />`). Components are presentational and hold only local UI state (menu open, modal open, testimonial index, form values). Content stays JSON-serializable: icons are referenced by string key and resolved through `src/lib/icons.js`.

### Booking flow (the only "backend")

`Booking.jsx` form → on submit, builds a text message from the fields and opens `https://wa.me/<business phone>?text=...` in a new tab. Nothing is stored or sent to a server. The business phone comes from `contact.phone.value` in `content.js`; the WhatsApp link in `social` is derived from it too.

### External services

- **Cloudinary** (`res.cloudinary.com/dirbnpgsp`) — most images
- **Hotlinked third-party images** — fleet car photos (hatla2ee, gstatic thumbnails, yallamotor, nissan-cdn, changan.com.eg, zigwheels, motory S3) and two rental-category images from a Webflow template CDN (`cdn.prod.website-files.com`)
- **Google Fonts** — Inter + Plus Jakarta Sans (loaded non-blocking in `index.html`)
- **WhatsApp** (`wa.me`), Google Maps link, Google Reviews share link, Facebook, Instagram

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
- Section anchors in use: `#top` (hero), `#car-types`, `#about`, `#fleet`, `#services`, `#testimonials`, `#booking`, `#footer`.

## Known issues / gotchas (verify before changing)

- **Broken anchor:** navbar and footer "Book Now" link to `#book`, but the booking section id is `booking`.
- **LCP preload mismatch:** `index.html` preloads a Cloudinary image (`706595150_…`) that is no longer the hero image (`content.js` hero uses `pexels-danila-rusanov…`). The preload is wasted and the real hero loads late. OG/Twitter/JSON-LD images also still use the old one. Update them together when changing the hero.
- Fleet cars carry `price`, `currency`, `period` (all `1000 EGP / Per Day`), but `Fleet.jsx` doesn't render them; it shows a hard-coded "Ask for Price" button instead. `fleet.viewAllCta` is also unused.
- The Testimonials side image is hard-coded in `Testimonials.jsx` instead of `content.js`.
- Testimonials are static entries in `content.js`, not pulled from Google. The Google card shows a fixed 5 stars.
- The navbar "Account" button (desktop) and "Admin" link (mobile, `href="#"`) do nothing. There is no admin or auth.
- Car type "Luxury" has no matching fleet cars. Car-type cards all link to `#booking` without preselecting the type.
- The booking form has no check that drop-off is after pick-up and no minimum date.
- `README.md` mentions `public/images/`, which doesn't exist; images are remote URLs.
- Hotlinked third-party images can disappear or be blocked at any time, and they have licensing/hotlinking concerns.
- Navbar and TermsModal both set `document.body.style.overflow`. Closing one can re-enable scrolling while the other is open.
- `TermsModal` is instantiated twice (Footer and Booking), both reading `termsAndPrivacy[0]`.
