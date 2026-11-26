-- Undo for supabase/migrations/20261125120000_document_references.sql.
-- Removes the reference lists and the function that reads one by its code.
-- Any QR code already printed will then open a page saying the list was not found.
drop function if exists public.references_by_code(text);
drop table if exists public.document_references;
