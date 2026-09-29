# Database & backend setup

- **New Supabase project, nothing set up yet:** run `schema.sql` once in the SQL editor. It reflects the final, current shape of the database.
- **Existing project, applying a schema change:** put the incremental change in a new `migrations/NNNN_description.sql` file (numbered after whatever's already there) and run just that file — don't re-run all of `schema.sql`.
