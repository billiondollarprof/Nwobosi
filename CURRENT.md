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
- **Sign in is a code, not a password.** `/auth` asks for an email and
  Supabase sends a six digit code. `shouldCreateUser` is false, which is the
  whole security of that screen: left on, anyone typing any address would be
  given an account. An unknown address is answered exactly like a known one
  and the code simply never arrives, so the screen cannot be used to find out
  who is on the system.
  **There is no password anywhere in the interface.** All three existing
  accounts have real Gmail addresses, checked against `auth.users`, so a code
  reaches every one of them and the old door was redundant. See the No
  passwords section in `CLAUDE.md` for the standing rule.
  **This is what finishes the invite flow.** An invitation link is single use,
  so without a code an invited person could get in exactly once and would be
  locked out on their next device.
  **An admin session lasts 24 hours**, held in `shared/adminClock.js` and
  checked when the admin panel loads. Supabase has one token lifetime per
  project, so the shorter one is enforced in the app. Read the note at the
  top of that file: it is a convenience against a laptop left open, not a
  security boundary. RLS is the boundary.
  **`OTP_LENGTH` in `Auth.jsx` is 6 and must match** Authentication → Sign In
  / Providers → Email → Email OTP Length. The setting accepts 6 to 10 and new
  projects are created at 8. A mismatch means somebody types six of their
  eight digits and nothing on screen explains the refusal.
  **The email is branded**, and its source is
  `supabase/email-templates/otp.html`. Supabase keeps its own copy, so
  editing that file changes nothing until it is pasted into Authentication →
  Emails → Magic Link. Calling `signInWithOtp` with no redirect sends that
  template; `{{ .Token }}` rather than `{{ .ConfirmationURL }}` is what makes
  it a code instead of a link.
  **Custom SMTP is required for this to work at any volume.** Supabase's
  built in sender is rate limited per hour and best effort by their own docs.
  Point Auth at Resend, and check the "minimum interval between emails"
  setting, which is 60 seconds by default and per project, not per person. It reads who you are from
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
- **One address for the workspace: `/demo`.** It renders the admin panel or
  the assistant depending on who is signed in, with `?view=assistant` for an
  admin who wants to see what staff see. `/{slug}` and `/{slug}/admin` are
  gone. The slug was decorative: Chat never read it and Admin only used it to
  build links, because both have always taken the workspace from the session,
  which is the only source a person cannot edit in the address bar.
  Dropping it fixed a real bug as a side effect. Every unknown single segment
  path used to be read as a company name and sent to a sign in screen, which
  both looked broken and let somebody probe for which companies exist. A
  mistyped path goes home now.
  `/chat`, `/admin` and `/{slug}/admin` redirect rather than 404, because
  they were public.
- **`/anthony` is the page for job applications and LinkedIn.** Separate
  from `/founder` on purpose: that one answers "who is behind StellaXafe"
  for somebody already reading about StellaXafe, this one answers "what does
  this person build and can they do it for us" for somebody who has never
  heard of either. Written in the language those roles are advertised in.
  A path rather than a subdomain for now, because it works the moment it
  deploys. `anthony.stellaxafe.com` needs DNS and a certificate; when that
  lands it points here and the address on a profile never has to change.
- **`ARCHITECTURE.md` is new and matters.** It records how the product is
  designed to work, in Anthony's own description, and most of it is not what
  the demo does yet. `CURRENT.md` is what is built; `ARCHITECTURE.md` is the
  target. It also carries the one live copy problem: the landing page says
  "Nothing ever leaves" and that is falsifiable, because prompts still reach
  the model provider even though documents are never stored here.
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

## Support, the second environment

Added 2026-09-07. The plan for all of it is `SUPPORT.md`, which is the
current record and takes precedence over the older section in
`ARCHITECTURE.md`.

**What is live in the database, applied and walked through against the real
project:**

- `knowledge_sources.customer_visible`, default false, and
  `customer_knowledge(company_id)`, the only read path the support side has.
  The filter is inside the function so no call site can widen it.
- `support_threads`, `support_messages`, `escalations`, and the quiet window
  that hands a conversation back on its own.
- `support_routes`, so a billing question reaches billing, plus
  `support_message_add`, `support_route_labels`, `support_escalate` and
  `support_escalation_notified`.
- `company_spend`, an atomic decrement. The staff assistant's read then
  write loses charges when two calls land together, which is rare with one
  person in one conversation and normal on an open inbox.

Every one of those was exercised end to end in SQL: a repeat delivery is
recorded once, an unknown route falls to the default, a second default is
refused, and support presence turns on when a colleague speaks and lapses
by itself.

**What is deployed:** `support-ask`, with `verify_jwt` off and a shared
secret. Haiku only, no connectors, published sources only. `add-link` and
`assistant` were redeployed the same day, so the live project and this
repository match.

**The assistant's slug is now `assistant`, with no hyphen.** It used to be
`assistant-`, a trailing hyphen it was created with, while the dashboard
showed the name as "assistant". That trap is gone: the hyphenated function
was deleted on 2026-09-08 and the code redeployed on the clean slug.
`src/shared/config.js` points at it.

**What is not done yet:**

- `SUPPORT_SHARED_SECRET` is not set on the project. Until it is, every
  call to `support-ask` answers 401, which is the correct closed state.
- Nothing has called it. `supabase.co` is unreachable from a session, so the
  function has never been exercised over HTTP. That test is a browser or a
  live webhook, not something this repository can prove.
- No company has a support route yet, so an escalation would be recorded
  with nobody emailed.
- **The Amara branch is written and pushed**, on Amara's `testing` branch,
  in `receive-whatsapp-webhook`. It sits at the one point where a message
  was being thrown away: after the guest pipeline declines it. Guarded three
  ways, and the first is the one that matters: with no
  `STELLAXAFE_SUPPORT_URL` or `STELLAXAFE_SUPPORT_SECRET` it returns at once
  and that function behaves exactly as it did before, so it can be deployed
  ahead of the secrets. **Not deployed.** Amara's Rule 7 says the owner
  deploys and the ledger records it, and `DEPLOYMENTS.md` there now says the
  repo is ahead.

- **Amara's demo data is set.** Two support routes: Billing to
  anthony@stellaxafe.com, and Everything else to support@amara.ng as the
  default. Three of the five knowledge sources are published to the support
  side, 37 chunks: the summary of Amara, the landing page and the partner
  programme. `PaymentReceipt26-08-2026` and the executive brief stay off,
  the receipt because it must and the brief because that is a judgement
  call, not a default.

---

## What is not real, and must not be claimed

- **Canva makes nothing.** The app is registered, the keys are in place,
  no code sends anything to it. Shown as **Set up**.
- **Google Drive connects nothing.** Google has the client and secret,
  there is no `oauth-callback` function. Shown as **Set up**.
- **Gmail, Slack, Notion** are examples. Shown as **Example**.
- **Resend is live.** `RESEND_API_KEY` was set on 2026-09-06. Two things
  send mail now: the contact form via `send-contact`, and staff invitations
  via `invite-staff`. Both send from `noreply@mail.stellaxafe.com`, on a
  domain verified with Resend. An invitation that cannot be emailed is not
  fatal: the admin gets the link back on screen and the reply says
  `emailed: false`, so the screen tells the truth about what happened.
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
- Deployed: `assistant`, `add-link`, `support-ask`, `invite-staff`,
  `check-access-code`, `create-workspace`, `send-contact`, `resume-demo`,
  `accept-invite`.
- **Secrets are still by hand.** `send-contact` reads `RESEND_API_KEY`, and
  optionally `CONTACT_TO` and `CONTACT_FROM` if the inbox or the sending
  address ever changes. The from address has to be on a domain verified
  with Resend. `stellaxafe.com` and `mail.stellaxafe.com` both are.
- **Slug and display name are two different things**, and renaming a
  function does not rename its slug. That is what left the assistant on
  `assistant-` for months while the dashboard showed "assistant". It now
  lives on the clean `assistant` slug. Calling a slug that does not exist
  is a 404 with no CORS headers, which a browser reports as a send failure,
  so it looks like a network fault. Slugs are named in
  `src/shared/config.js` under `FUNCTIONS`.
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
