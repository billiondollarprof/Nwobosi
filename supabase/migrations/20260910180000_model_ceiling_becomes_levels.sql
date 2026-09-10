/* ==========================================================================
   THE CEILING STOPS NAMING A VENDOR AND STARTS NAMING A JOB

   Applied 2026-09-10. Renames the four values of the model_tier enum:

     haiku-4-5  ->  conversational
     sonnet-5   ->  standard
     opus-5     ->  deeper
     fable-5    ->  deepest

   WHY
   Anthony, 2026-09-10: "The name should not be shown because tomorrow we
   might be installing the same thing for a company using OpenAI. So I want
   to keep the same architecture, the same design, but just changing the
   model brain."

   The enum was the last place the vendor reached outside the edge
   functions. It is the type of staff.model_ceiling and
   companies.default_model_ceiling, both of which the browser reads, so a
   vendor's product name arrived in the client as data even after the
   labels were taken off the screens.

   Which model sits behind a level is now decided in exactly two tables,
   both server side: MODEL_ID in supabase/functions/assistant/index.ts and
   MODEL_FOR_LEVEL in supabase/functions/support-ask/index.ts. Moving a
   deployment to another provider is those two tables and nothing else.

   RENAME, NOT REPLACE, AND THAT MATTERS
   Renaming an enum value leaves every existing row untouched. The label
   changes; the rows keep pointing at the same value. Nothing is rewritten,
   nothing can be lost, and there is no moment where a row holds a value
   its own type will not accept. Replacing the type would have meant a
   rewrite of two tables and a window where either could fail halfway.

   WHAT WAS CHECKED FIRST
     - Every column on the type: companies.default_model_ceiling,
       staff.model_ceiling, and the staff_effective_limits view.
     - Every function and view whose body mentions one of the old values.
       There were none, so nothing needed rebuilding after the rename.

   WHAT WAS CHECKED AFTER
     - The four labels, in the right order.
     - companies.default_model_ceiling now defaults to 'standard'::model_tier.
       This was the one real risk: a column default is a stored expression,
       and a rename that did not carry through would have left the default
       pointing at a label that no longer exists. It carried through.
     - Real rows read as levels: both companies on standard, and the one
       member of staff with a ceiling set now reads standard.

   SAFE TO RUN TWICE. A second run finds no old label and does nothing,
   rather than failing on a value that has already been renamed.
   ========================================================================== */

do $$
declare
  pair record;
begin
  for pair in
    select * from (values
      ('haiku-4-5', 'conversational'),
      ('sonnet-5',  'standard'),
      ('opus-5',    'deeper'),
      ('fable-5',   'deepest')
    ) as t(old_label, new_label)
  loop
    if exists (
      select 1
      from pg_enum e
      join pg_type ty on ty.oid = e.enumtypid
      join pg_namespace n on n.oid = ty.typnamespace
      where n.nspname = 'public'
        and ty.typname = 'model_tier'
        and e.enumlabel = pair.old_label
    ) then
      execute format(
        'alter type public.model_tier rename value %L to %L',
        pair.old_label, pair.new_label
      );
    end if;
  end loop;
end $$;

comment on type public.model_tier is
  'How far a piece of work is allowed to reach. Levels, deliberately not model names: which model sits behind a level is decided in the edge functions and appears on no screen and in no browser bundle, so a deployment can move to another provider without the product changing.';
