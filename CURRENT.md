# CURRENT

Where StellaXafe actually stands, written 2026-08-27, near the end of the
session before submission. Read this first. `SESSIONS.md` is the log
behind it.

This file is deliberately blunt about what is real and what is not,
because the last three sessions were spent finding things that looked
finished and were not. Trust this list over anything a screen says.

---

## The one thing nobody has done yet

**Nothing has ever run end to end against the real Supabase.** Every piece
is tested in a browser against stand-in responses, and the whole chat flow
passes that way, but the model has never once spoken through this chain
with real credentials. The first live run is still the real test.

The session that built most of this could not reach `supabase.co` at all:
the environment's network policy answers 403. Testing has to be done by
the user, or by a session whose environment allows that host.

An unspent access code is held for it: **SX-4M8G-T4P3**, to be registered
under **ofilifire@gmail.com**.

---

## What is genuinely real

- **Setup.** `/setup` takes an access code, creates the auth user, the
  company and the staff row, signs the admin in, and lands them on
  `/{slug}/admin`. Rollback on every step.
- **Sign in.** Real Supabase password sign in. It reads who you are from
  the database and sends you to your own workspace, admin side or chat
  side. A wrong password and an unknown email land in the same place on
  purpose.
- **The assistant.** Streaming, real Claude, three stages, enforced server
  side: who you are (RLS), which model (stage capped by the staff
  ceiling), how much (budget checked before, decremented after by real
  usage). Prompt caching on the base prompt.
- **The stage flow.** Interview on Haiku, three to five questions, ends
  with a hidden marker. Automatic step up to Sonnet. Sonnet reads the
  sources and either asks for what is missing (drops back to the cheap
  model for that conversation) or reads the brief back. Only a read back
  puts the Build card up. Corrections re-enter the same loop.
- **The knowledge base.** Files and pasted text are read, chunked, stored
  in `knowledge_sources` and `knowledge_chunks`, and their **contents**
  reach the model from the analysis stage onward.
- **PDF and Word** are parsed in the browser. Scanned PDFs are refused
  with an explanation rather than stored empty.
- **Links** are fetched once, server side, by `add-link`, admin only, with
  private addresses refused and every redirect hop checked.
- **Images** in the chat are shrunk to 1568px and sent as image blocks.
- **Finished work** is saved to `work_history` and survives a refresh.
- **Conversations are saved** to `conversations`, the last three per
  person, so a brief someone is halfway through survives a closed tab or
  a different phone. The sidebar offers them under "Pick up where you left
  off" and resuming restores the stage as well as the messages.
- **RLS** is tight. Every table on, every policy scoped by
  `private.current_company_id()`, which reads `staff` by `auth.uid()`.
  `access_codes` has RLS on and zero policies, so only the service role
  reaches it. Verified against the live database.

## What is not real, and must not be claimed

- **Canva makes nothing.** The app is registered, the keys are in place,
  no code sends anything to it. Shown as **Set up**.
- **Google Drive connects nothing.** Google has the client and secret,
  there is no `oauth-callback` function. Shown as **Set up**.
- **Gmail, Slack, Notion** are examples. Shown as **Example**.
- **Resend sends nothing.** No email leaves the product, branded or
  otherwise.
- **Email OTP does not exist.** The OTP screen is in `Auth.jsx` and is
  unreachable. Sign in is password only.
- **There is no staff invite flow.** An admin cannot add a person. The
  `access_requests` table has no INSERT policy, so the request path could
  not work even if it were wired.
- **Skills are a badge, not a capability.** PowerPoint, Word, Excel,
  Design, Mind map, Analysis are detected from wording and shown in the
  nav. Every output is Markdown, downloaded as `.md`. Nothing produces a
  real deck, sheet or design.
- **Images cannot go in the knowledge base.** Company sources reach the
  model as text in the system prompt, and an image cannot go there.
  Converting an image to PDF does not help: PDF extraction returns text,
  and a PDF of a picture has none.

---

## Deployment

- Frontend: Cloudflare, deploys from `main`. **The live site is whatever
  is on `main`**, which caught us out for a whole session once.
- Edge functions are **not** deployed by git. They are pasted into the
  Supabase dashboard by hand. Sources live in `supabase/functions/`.
- Deployed: `assistant-`, `add-link`, `invite-staff`, `check-access-code`,
  `create-workspace`.
- **The assistant's slug is `assistant-`, with a trailing hyphen.** The
  dashboard shows its Name as "assistant", and renaming does not change a
  slug. Calling the wrong one is a 404 with no CORS headers, which a
  browser reports as a send failure, so it looks like a network fault.
  Slugs are named in `src/shared/config.js` under `FUNCTIONS`.
- **`verify_jwt` is OFF on all of them, deliberately.** The toggle is
  "verify with legacy secret" and this project uses the new key system
  (`sb_publishable_...`), so ON can reject valid user tokens. Every
  function checks the caller itself with `auth.getUser()` and reads under
  their identity.

## Working agreements

- Develop on `claude/nwobosi-access-5mces1`, merge to `main` when a piece
  is done. The user has standing permission for that merge.
- Paste edge function source into chat, or send the file. The user
  deploys by hand.
- **A green build is not evidence a page renders.** Two separate bugs this
  week compiled clean and threw in the browser. Drive the app.

---

## Next, in the order I would do it

1. **The live run.** Everything above is untested against real
   infrastructure.
2. **Staff invites**, so a presentation can show more than one account.
   Needs an INSERT policy on `access_requests` or a direct invite path.
3. **Describing images at upload**, so a logo becomes words the knowledge
   base can hold. One model call per upload, fits the existing pipeline.
4. **Canva**, after the competition. Needs `oauth-callback`, token
   storage, design creation and export polling.
5. **Real file formats.** A `.docx` or `.pptx` writer is the difference
   between an outline of a deck and a deck.
6. **Resend and email OTP**, for a real deployment rather than a demo.
