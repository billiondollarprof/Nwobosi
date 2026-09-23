/* ==========================================================================
   A CHAT CAN BE DELETED FROM THE LIST WITHOUT DELETING WHAT IT HOLDS

   Anthony, 2026-09-23: "make deleting a chat possible... But deleting a chat
   doesn't delete it's memory."

   WHY A COLUMN AND NOT A DELETE
   The per person memory in DIRECTION.md ("Memory, instead of keeping the
   file") is not built yet. Until it is, a conversation row IS the memory:
   its resume log (state), its confirmed brief and its messages are what
   that memory will be built from. Deleting the row would throw that away.

   So "delete" in the app sets hidden_at. The chat leaves the person's list
   and the app never shows it again. The row stays, under the row level
   security the table already has: a staff member reads and writes only
   their own rows, and one company never sees another's.

   WHAT THIS CHANGES
   Adds one empty column and one index. It changes no existing row and
   removes nothing. Safe to run twice: both statements say "if not exists".
   ========================================================================== */

alter table public.conversations
  add column if not exists hidden_at timestamptz;

comment on column public.conversations.hidden_at is
  'Set when the person deletes the chat from their list. The row is kept on purpose: it is what their memory is built from. Null means it is on their list.';

/* The sidebar asks for one person's chats that are not hidden, newest
   first. This index answers exactly that question. */
create index if not exists conversations_staff_visible_idx
  on public.conversations (staff_id, updated_at desc)
  where hidden_at is null;
