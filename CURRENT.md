# CURRENT

Where StellaXafe actually stands. The body of this file was written
2026-08-27; the note directly below was added 2026-09-04. Read this first.
`SESSIONS.md` is the log behind it, and `DIRECTION.md` is what this is all
being built toward.

---

## What this repository is, before anything else

**StellaXafe is not SaaS.** There is no plan, no seat, no self serve tier,
and nobody signs up. It is built to order: a company comes with
requirements and the deployment is built into their own systems.

**So everything in this repository is a blueprint.** It proves the
architecture and it shows the shape. It is not the software any customer
will be handed. What they receive is built for them, and what is added or
dropped depends on the contract.

Four things never vary, in any deployment: private, safe, hallucination
constrained by design, and the iteration problem solved. Everything else does. See
`DIRECTION.md` for why the third is stated as a mechanism and never as a
number.

This matters for how the rest of this file reads. "Not real yet" below
means not wired in the blueprint. It does not mean out of scope, and it is
not a reason to remove a claim from a public page. `DIRECTION.md` holds
the rule for what public copy may say.

---

This file is deliberately blunt about what is real and what is not,
because the last three sessions were spent finding things that looked
finished and were not. Trust this list over anything a screen says.

---

## Reaching Supabase, and what has actually run

**This section was wrong for three sessions. Corrected 2026-09-06 by
querying the live database.**

It used to say nothing had ever run end to end against real Supabase. The
database says otherwise: **2 companies, 3 staff, 7 knowledge sources, 42
chunks, 6 saved conversations.** It has run.

It also held `SX-4M8G-T4P3` as an unspent code for the first live run. That
code was redeemed on 2026-08-27 and belongs to the `buildfest` workspace.
**Unused codes, checked live:** `SX-3NKZ-GCYJ`, `SX-LNDA-4KHU`,
`SX-F3MP-LWAV`, `SX-KNA9-KQ6E`, `SX-Y9YA-TBE9`.

**Two different paths to Supabase, and only one of them is blocked.**

- Plain HTTP from a session's shell or browser still fails:
  `supabase.co` answers `CONNECT tunnel failed, 403`. So an edge function
  cannot be called, and the app cannot be driven against the real backend
  from inside a session.
- **The Supabase MCP connection works.** Migrations apply, SQL runs, edge
  functions deploy, straight from a session. That is how
  `resolve_access_code` and `resume-demo` were shipped.

So: the database layer can be built and tested here. Anything that has to
go through an edge function over HTTP still has to be tried by the user in
a real browser.

---

## What is genuinely real

- **Setup, and the code is the identity.** `/setup` is three steps: enter
  your code, tell it about your company, start using it. **Nobody types an
  email or a password.** Asking a stranger for their address before they
  have seen anything is where they leave, and the code is already a better
  credential: unguessable, handed out one at a time, checked server side in
  a table no browser can read.
  The account underneath is real, just derived. The address comes from the
  code, the password is random and thrown away after one use, and the way
  back in is the code itself. `resolve_access_code` now answers `new` or
  `resume` instead of treating a used code as dead, and the new
  `resume-demo` function mints a one time session for the workspace's admin
  and hands it to the browser. **So a used code is no longer spent, it is
  the key to the workspace it built.** It resolves the admin by their staff
  row, so the two workspaces built under the old email and password flow
  resume too.
  None of the email and password code is deleted, only unused: a real
  deployment still needs an identity that belongs to a person.
  **`/setup?step=N` opens any of the three screens with stand in values, in
  dev only**, compiled out of production and checked by grepping `dist`.
- **Sign in.** Real Supabase password sign in, for accounts that have a
  password. Untouched by the setup change above. It reads who you are from
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
- **The interview cannot write the document.** Each stage has its own
  output ceiling: 700 tokens for the interview, 4000 for the analysis,
  8000 for the writing. It used to be 8000 everywhere, and asked to "just
  build it" the cheap model wrote the whole one pager on the spot, never
  sent the marker, and the flow never reached the read back or the
  download. A ceiling, not a rule.
- **The interview ends three ways**, all identical, all ending in the
  marker: it has enough, the person tells it to get on with it, or the
  person points it at the company sources. Five questions is enforced by
  the app, not trusted to the model, and the model is warned on its last
  turn so it closes cleanly instead of being cut off.
- **The knowledge base.** Files and pasted text are read, chunked, stored
  in `knowledge_sources` and `knowledge_chunks`, and their **contents**
  reach the model from the analysis stage onward.
- **PDF and Word** are parsed in the browser. Scanned PDFs are refused
  with an explanation rather than stored empty.
- **Links** are fetched once, server side, by `add-link`, admin only, with
  private addresses refused and every redirect hop checked.
- **Images** in the chat are shrunk to 1568px and sent as image blocks.
- **Finished work downloads as a PDF or a Word file**, laid out in the
  browser by `shared/download.js`. It used to download as Markdown, which
  a phone will not open, so the deliverable could not be shown to anyone.
- **Finished work** is saved to `work_history` and survives a refresh.
- **Conversations are saved** to `conversations`, the last three per
  person, so a brief someone is halfway through survives a closed tab or
  a different phone. The sidebar offers them under "Pick up where you left
  off" and resuming restores the stage as well as the messages.
- **The public site.** Six pages sharing one nav and one footer: landing,
  `/services`, `/founder`, `/insights`, `/form-builder`, `/contact`. Ported
  from the separate StellaXafe repo in session 5, so this repo is now the
  only one. Services, Founder and Contact are routes styled as modals, with
  real URLs and instant navigation. **Demo is not a separate page**, every
  demo link goes to `/setup`, which is built to be landed on cold: it is on
  the same nav and footer as the rest of the site and it says what the four
  steps are before asking for the code.
- **The mark is the Containment Seal**, built to `MARK.md`. Read that file
  before touching the logo: the old interlocked rings were a drift away
  from the written spec and looked like somebody else's mark. Only the
  idle orbit is built. The other two states wait on a real event to fire
  them.
- **The ground is `#05060D`, not pure black, and stays cool.** In
  `tokens.js`, so it applies to every screen. Display type sits at weight
  500 at large sizes, not 700.
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
- **Resend still sends nothing, but it is one step away.** The contact form
  and its `send-contact` function are built and deployed, and they email
  `anthony@stellaxafe.com`. `RESEND_API_KEY` is **not set** in the Supabase
  dashboard, so the function fails closed and no email leaves yet. Setting
  that key is the whole remaining step. Nothing else in the product sends
  mail, branded or otherwise.
- **Email OTP does not exist.** The OTP screen is in `Auth.jsx` and is
  unreachable. Sign in is password only.
- **There is no staff invite flow.** An admin cannot add a person. The
  `access_requests` table has no INSERT policy, so the request path could
  not work even if it were wired.
- **Skills are a badge, not a capability.** PowerPoint, Word, Excel,
  Design, Mind map, Analysis are detected from wording and shown in the
  nav. Word and PDF are real now. **PowerPoint, Excel and Design are
  not**: a request for a deck gets a well written outline of one as a PDF,
  not a `.pptx`.
- **Images cannot go in the knowledge base.** Company sources reach the
  model as text in the system prompt, and an image cannot go there.
  Converting an image to PDF does not help: PDF extraction returns text,
  and a PDF of a picture has none.

---

## Deployment

- Frontend: Cloudflare, deploys from `main`. **The live site is whatever
  is on `main`**, which caught us out for a whole session once.
- Edge functions are **not** deployed by git. They are pasted into the
  Supabase dashboard by hand, or pushed straight to the project by a
  session with Supabase access, which is how `send-contact` got there.
  Sources live in `supabase/functions/`.
- Deployed: `assistant-`, `add-link`, `invite-staff`, `check-access-code`,
  `create-workspace`, `send-contact`.
- **Secrets are still by hand.** `send-contact` reads `RESEND_API_KEY`, and
  optionally `CONTACT_TO` and `CONTACT_FROM` if the inbox or the sending
  address ever changes. The from address has to be on a domain verified
  with Resend. `stellaxafe.com` and `mail.stellaxafe.com` both are.
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
