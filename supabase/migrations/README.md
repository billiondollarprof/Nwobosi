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
