# Migrations

Applied directly to the Supabase project (`cbunsqzkhidwjtxdsmxd`) from a
session, through the Supabase MCP connection, not by the CLI. The files here
are the record of what ran, written after the fact.

**The database is the source of truth for what is live.** Check it before
assuming a file here has been applied:

```sql
select version, name from supabase_migrations.schema_migrations
order by version desc limit 10;
```

A file present here and absent from that list never ran.

## 2026-09-23: the first thirteen are here now

The first migrations, including `core_schema` and `row_level_security`,
used to exist only inside the live database. They were read out of
`supabase_migrations.schema_migrations` on 2026-09-23 (a read only query,
approved by Anthony) and saved here under their live version numbers, so
a new company's database can be built from this folder. See
`DEPLOY-A-COMPANY.md`.
