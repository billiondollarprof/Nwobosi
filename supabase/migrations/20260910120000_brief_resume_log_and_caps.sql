/* ==========================================================================
   THE BRIEF, THE RESUME LOG, AND THE CAPS THAT CHANGE PER DEPLOYMENT

   Applied 2026-09-10. Four columns, nothing dropped, nothing renamed, no
   existing row touched. Safe to run twice.

   WHY conversations.brief
   -----------------------
   DIRECTION.md calls the written prompt the second guardrail: the read back
   is what the person confirms, and the prompt is what stops anything
   reaching the finished document that was not in it. Until now the read
   back was shown and then thrown away, so a correction after it ("do not
   use that number") had nowhere to live. This is where it lives. Frozen at
   the moment they say go, and handed to the writing stage as the thing it
   may not exceed. Null until then.

   WHY conversations.state
   -----------------------
   Anthony, 2026-09-10: "is there something like a progressive log to always
   remember where things left off?"

   Messages and stage were already saved, so a person coming back the next
   day did get the whole conversation back. What they did not get was the
   model's own working notes, so it re-derived everything from twenty
   messages on every turn, slowly and with drift.

   Small on purpose. What is being made, which sources it picked, what is
   still missing, what the person was asked for and declined. A few hundred
   tokens. Never a second copy of the messages.

   WHY the two caps on companies
   -----------------------------
   Anthony, 2026-09-10: "if we are deploying in somebody's VPC, it can
   change." Both numbers were constants in the code. They belong to the
   deployment, not to us. Defaults are exactly the numbers that were hard
   coded, so nothing behaved differently the moment this ran. No admin
   screen: these are set at deployment and never seen.
   ========================================================================== */

alter table public.conversations
  add column if not exists brief text,
  add column if not exists state jsonb not null default '{}'::jsonb;

comment on column public.conversations.brief is
  'The confirmed read back, frozen at the moment the person says go. The writing stage is handed this and may not exceed it. Null until they confirm.';

comment on column public.conversations.state is
  'The working note the model reads at the top of every turn: what is being made, which sources were picked, what is still missing, what the person declined. Small on purpose, never a copy of the messages.';

alter table public.companies
  add column if not exists max_source_chars integer not null default 200000,
  add column if not exists max_files_per_message integer not null default 4;

comment on column public.companies.max_source_chars is
  'Ceiling on how much company material rides on one turn. A ceiling, not a target. Changes per deployment, never shown to anybody.';

comment on column public.companies.max_files_per_message is
  'How many files a staff member may attach at once. Changes per deployment.';
