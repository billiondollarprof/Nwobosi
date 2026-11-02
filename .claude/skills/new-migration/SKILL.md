---
name: new-migration
description: Make a database change the StellaXafe way - the migration file, its undo file, a dry run against the real database that rolls back, Anthony's yes on the whole batch, then apply and check. Use whenever a table, column, function, policy or grant changes.
---

# new-migration

There is ONE Supabase project for testing and live (Anthony, 2026-11-02),
so a migration that runs, runs on the real thing. That is why the dry run
and his yes both come before it.

## Steps

1. **Write the migration** in `supabase/migrations/<yyyymmddhhmmss>_<what>.sql`.
   Open with a comment: what it does, why, and what it must never do.
   - A new table starts with `revoke all`, RLS (a database rule that decides
     who can see which rows) switched on, then only the grants it needs.
   - Additive by default. Dropping, renaming or deleting is named as such.
2. **Write its undo** in `supabase/rollbacks/<same name>.sql`: the statements
   that put the database back as it was.
3. **Dry run it.** It runs inside a transaction, prints exactly what changed,
   then rolls back.
   ```
   node scripts/db-dryrun.mjs supabase/migrations/<file>.sql --expect "<object>" --additive-only
   ```
   Drop `--additive-only` only for a change Anthony knows removes something.
4. **Ask once, for the whole batch.** Every write this piece of work needs, in
   one message: a short plain line per statement, the statements in one
   block, and which ones only add and which change or remove. Wait for yes.
5. **Apply it** with the Supabase tool `apply_migration`, same name and SQL.
6. **Check it took:** a read only query showing the new object, and the
   Supabase security advisors (`get_advisors`, type security) with no new
   warning.
7. **Use the feature by hand.** A valid migration does not prove the app
   works.
8. **Commit** the migration and its undo together.

## If the skill itself goes wrong

`db-dryrun.mjs` needs `SUPABASE_ACCESS_TOKEN`. Without it, stop and say so;
never apply a migration that was not dry run. If the dry run script is
wrong, fix it in the same change and say so.
