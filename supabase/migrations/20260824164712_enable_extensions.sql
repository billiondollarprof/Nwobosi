-- pgvector powers both the company knowledge index and the work history
-- memory. Keeping it in the extensions schema follows Supabase convention.
create extension if not exists vector with schema extensions;
