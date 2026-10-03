# El Menshawi Rent Car

Public landing page for El Menshawi Rent Car ([elmenshawirentcar.com](https://elmenshawirentcar.com)), plus an Arabic (RTL) admin dashboard at `/dashboard` for managing the fleet, insurance, license renewals, maintenance, and bookings.

See [CHANGELOG.md](CHANGELOG.md) for what's been added/changed over time.

## Content (public page)

All page text, images, and links are driven from a single file:

```
src/content/content.js
```

Edit that file to change copy, links, or swap images — no component code needs to change. Images are remote URLs (Cloudinary + a few hotlinked sources), not local files.

## Admin dashboard

Source lives under `src/dashboard/` (components, pages under `src/pages/dashboard/`). Backend setup (Supabase schema, migrations, Edge Functions, push notifications) is documented in [supabase/README.md](supabase/README.md).

## Running the project

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # production build
npm run preview  # preview the production build locally
npm run lint     # lint the codebase
```
