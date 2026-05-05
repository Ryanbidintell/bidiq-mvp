# supabase/migrations

This is the **canonical location** for all BidIntell schema migrations. The Supabase CLI (`supabase db push`) reads this folder.

## Naming convention

All new migrations must use the `YYYYMMDD_description.sql` format:

```
20260215_add_stripe_webhook_events.sql
20260301_add_gc_density_index.sql
```

- Date = calendar date the migration was written (not applied)
- Description = snake_case summary of what changes
- Never reuse a date+description that already exists — append `_2` if needed

## Do not use numbered prefixes

The five legacy files (`001_initial_schema.sql` through `005_beta_feedback.sql`) predate this convention and are kept for history. All new files must use the `YYYYMMDD_` prefix so they sort chronologically.

## History

| Date range | What landed |
|---|---|
| `001`–`005` | Initial schema, Layer 0, company types, fingerprinting, beta feedback |
| Feb 3–14 | Weight columns, beta tables, GC normalization, GC→clients rename, billing |
| Feb 16–18 | Admin metrics tables, subscription tracking, org schema, RLS fixes |
| Feb 27–Mar 2 | Bid economics, game theory modules, ROI calculator |
| Mar 11–25 | OAuth connections, email alias |
| Apr 6–28 | GC bids/merge, org schema, competition density, client behavior, is_comped |
| May 1 | Outbound prospecting tables |

## Archived / one-off SQL

Files that are utility scripts, schema snapshots, debugging queries, or superseded one-off fixes live in `../sql/archive/`. Do not run them against production without reviewing their contents first.

## Running migrations

```bash
supabase db push
```

Or paste individual files into the Supabase SQL Editor for manual application.
