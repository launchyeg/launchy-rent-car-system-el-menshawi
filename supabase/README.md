# Database & backend setup

- **New Supabase project, nothing set up yet:** run `schema.sql` once in the SQL editor. It reflects the final, current shape of the database.
- **Existing project, applying a schema change:** put the incremental change in a new `migrations/NNNN_description.sql` file (numbered after whatever's already there) and run just that file — don't re-run all of `schema.sql`.

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
