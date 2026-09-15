# CURRENT

Where StellaXafe actually stands. The body of this file was written
2026-08-27; the note directly below was added 2026-09-04. Read this first.
`SESSIONS.md` is the log behind it, and `DIRECTION.md` is what this is all
being built toward.

---

## ANTHONY'S OPEN REQUESTS

**Read this before anything else in this file, and add to it the moment he
asks for something.**

Why this section exists: on 2026-09-15 Anthony asked whether his requests
were being recorded or thrown away. They were being listed back to him in
chat every time, and they were never written down anywhere that survives a
session. He was right. A request that lives only in a conversation is gone
the moment that conversation ends, and he then has to remember it and ask
again, which makes remembering his own product his job instead of Claude's.

So: when he asks for something and it is not built in that same turn, it
goes here, in his words, with the date. It comes off the list when it is
built and checked, not when it is planned.

### Open

1. **Merge the admin knowledge base "access" subsection into "usage".**
   Asked 2026-09-15, repeated 2026-09-15. His words: "Why did you put
   access and usage into two different sections. Besides the upper part of
   that usage section is already in the access section. The explanation of
   the capability can be at the bottom of the access section."
   Not started.

2. **Recheck the admin knowledge base layout on tablet and desktop.**
   Asked 2026-09-15. His words: "your fix for iPad and desktop needs
   checking still." A tablet and desktop layout was added on 2026-09-14
   (md: breakpoints, tablet 1817 to 1660, desktop 1797 to 1559) and he has
   not seen it verified since.
   Not started.

3. **Rearrange the landing page below the fold: the mechanism goes above
   integrations.** Asked 2026-09-15. The plan was written and shown to him
   and he asked for it again, so it is wanted, not just considered.
   The plan: the six steps move above integrations, the standalone read
   back section folds into them, and a four outcome block goes under it.
   The sixth step is new, "it keeps what you accepted", per staff member
   and never a company standard. Outcome three reads "Nothing enters your
   work that you did not approve", which is his decision of 2026-09-15 over
   "near zero hallucination".
   Planned, not built.

4. **Canva design creation, item 3 of the agreed order.** Asked
   2026-09-15. Upload the asset, create the design, place and crop the
   image, export it, LOOK at the export and correct it before handing it
   over, and give a one click Open in Canva.
   Token refresh built and tested. Nothing else built.

5. **Per person connectors**, item 4 of the agreed order. Email, Slack,
   Notion, each staff member connecting their own. Not started.

6. **Style memory.** When a staff member downloads work they liked, save
   that style for THAT PERSON so the next similar job does not start from
   nothing. Per staff member only, never a company standard, and staff A
   never gets a suggestion from staff B's work. Spec written in
   STYLE-MEMORY.md. Not built.

7. **Support as a seat, not a page.** A flag on the staff row set by an
   admin, one door for everybody at /workspace, and a toggle between their
   own work and the support queue. The escalation email carries a link
   into their workspace, and support then chooses email or WhatsApp
   depending on whether the customer gave an email. Agreed 2026-09-15, not
   built.

### Decided, so nobody reopens them

- **Headline:** "Private AI that already knows your company. / Zero data
  leakage." His choice, 2026-09-15, over "Your data never leaves your
  cloud". The accent sits on the closing line because it is the anchor.
- **Subtext:** his sentence, used as he wrote it. Do not trim it for
  phones.
- **The rotating line:** three words a switch, his length.
- **Hallucination claim:** "Nothing enters your work that you did not
  approve." His decision over "near zero hallucination".
- **Connector labels:** every one says Coming soon, Drive included. Drive
  gets picked up after the video walkthrough.
- **Bedrock:** never named on a public page. It belongs in a per customer
  deployment doc, because a customer may want Azure.

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

## The assistant's six stages, and what is actually live

Added 2026-09-10. This is the flow Anthony asked for so he could record the
demo videos. It is deployed as `assistant` **v11**, sha `80723d2a31b1ec38`.
The repo copy was brought back in line with that deployment on the same day.

The six stages, in the order a person walks through them:

1. **orient** - it reads the company's material and works out what they are
   asking for. It ends by offering an interview, marked `OFFER_INTERVIEW`.
2. **interview** - three or four questions, no more, and only when they said
   yes. It stops itself with `INTERVIEW_DONE`.
3. **analyse** - it works out what it still does not have. Two routes out:
   `NEED_INPUT` for anything only they can know, `NEED_LOOKUP` for anything
   public and findable. The read back happens here, in the conversation,
   before any prompt is written.
4. **research** - the only stage that can reach the internet, and only after
   they tap the button. Everything found comes back with its source, and
   nothing is used until they approve it.
5. **brief** - the prompt. This is written before anything is built, it
   carries the approved outside findings with their sources, and it carries
   the corrections they made on purpose.
6. **generate** - the document, written from the brief.

**The search tools are attached in code, not in a prompt.** `searchTools` is
built only when `stage === "research"`. On every other turn the tools are not
in the request at all, so no amount of persuading can reach them. The base
prompt says so in the section titled "YOU CANNOT GO AND LOOK, UNLESS THEY LET
YOU OUT".

Three things that were broken and are now fixed:

- **The 400 that stopped the whole flow for days.** The interview to analyse
  handoff sent a conversation ending on an assistant turn, and the model
  rejects that. Guarded twice now, once in `sendTurn` and once server side.
  No fake user turn is invented; the trailing assistant turn is dropped.
- **The cache mark sat on the wrong block.** Prompt caching is a prefix
  match, so the mark has to sit on the last stable block. Proven on real
  traffic: 13.7054 cents on the write, then 1.34188 cents, then 0.97168.
- **Findings never reached the brief.** `handleGenerate` bypasses `runTurn`,
  so it was passing an empty string. Both `sendTurn` calls now carry
  `findingsRef.current`.

**No model name reaches any screen, admin included.** The reason is
portability, not house style: the same product may be installed on a
different provider tomorrow. The admin sees four capability levels
(conversational, standard, deeper, deepest), each with an info icon.

## THE REPO IS AHEAD OF THE DEPLOYMENT, on purpose

**As of 2026-09-14 `supabase/functions/assistant/index.ts` is NOT what is
live.** The deployment is still v11, sha `80723d2a31b1ec38`. The repo has
14 extra lines in the research prompt, asking it to put `[FINDING]` on its
own line before each thing it found.

**Why it was not deployed.** The only way to deploy from a session is the
MCP tool, which takes the whole file inline. That means retyping 1,700
lines of a live function by hand, and this file is full of the damage that
kind of move has already done here. The gain is cosmetic: without the
marker, the model's opening line shows up as one extra row in the pick
list. Not worth the risk taken unasked.

**What to do about it.** Either deploy it deliberately, with a diff against
the deployed source straight after to prove it landed byte for byte, or
drop the 14 lines. Do not leave it sitting here for long: a repo that is
quietly ahead of the deployment is the thing that caused every edge
function rule in this file.

**The app copes with both.** `src/shared/findings.js` prefers the marker and
falls back to splitting on blank lines. The fallback is not a stopgap: the
model can miss an instruction on any turn, and a person must still get a
list they can tick.

## Picking which findings get used

Added 2026-09-14. Anthony: "the permission to use the data is supposed to
offer a third option should the person agrees with some of the search
results but not all, so they get to say which."

**The list opens with everything ticked and you untick what is wrong.** His
call, and it is the right one: "most of the data might always be accurate,
so the person has less things to type."

**One screen, no middle step.** A first version put a "Let me choose" button
in front of the list. He cut it: "it will list the search results as
selected, then you unselect the wrong ones and click continue." A button
whose only job is to reveal the thing the person came to look at buys
nothing.

Unticking everything is saying no, so the button says "Use none of it" and
does that. One finding is not a list, so that case is plain yes and no.

An unticked finding is still never stored. Only a count.

## The turn that never came back

Added 2026-09-14. Anthony sent a message and got silence. Not an error, not
a spinner that gave up. It had happened before.

**The cause was one `break`.** The stream reader called `onDone` only when
the server sent an explicit done event. Any other ending, the edge worker
killed at its limit, the connection dropped, the gateway hanging up, ended
with the browser still holding `typing = true`. The screen said it was
working. Nothing was.

Two fixes, and they are deliberately different in kind:

1. **A terminal event is compulsory.** Every path that ends a turn goes
   through `finish()`, which fires once. A stream that ends without a done
   or an error gets one invented. This cannot false alarm, because it only
   speaks when the stream is already over.
2. **A watchdog**, for the other shape of the same failure, where the
   stream stays open and nothing arrives. This one can false alarm, so it
   is slow: 25 seconds to say it is slow, 120 to give up, 300 for research
   because that stage genuinely says nothing for minutes while it searches.

The watchdog holds one read promise and races it repeatedly. Calling
`reader.read()` again each round is the obvious way to write it and it
loses chunks, because concurrent reads queue and a race keeps only the
first.

## Saying what it is doing while it does it

Added 2026-09-14. Anthony: "if it's still thinking or analyzing, there's no
way a person knows... so a person can know it's still working and wait for
it."

Three grey dots cannot say whether it has been reading for two seconds or
has been dead for two minutes, so the only safe reading of them is to press
the button again. `src/shared/thinkingWords.js` holds the words: three per
stage, advancing every 7 seconds, the last repeating.

**It is a progress line, not a progress bar.** Nothing counts down and
nothing claims to be nearly finished, because nothing here knows that. What
is known is which stage is running and how long it has run.

**The build card's green ticks are gone.** It used to show "Applied brand
kit and template" and "Structured layout", both hard coded, neither
connected to anything the product does. There is no brand kit. Nothing
applies a template. They were on screen while the model was still writing
the first line, and they were about to be in a demo video.

## Coming back the next day

Added 2026-09-10. Anthony asked for "a progressive log to always remember
where things left off". This is it.

**The visible half already worked and the invisible half did not.** Messages
and stage were saved, so returning brought the conversation back on screen.
Three things behind it were not saved, and those three decide what the
finished document says:

1. The outside findings the person had approved. They lived only in a
   variable in the browser. Come back tomorrow, press Build, and the figure
   they approved yesterday was silently missing.
2. How many interview questions had been asked. Reset to zero, so a
   returning person could be asked four more about a settled thing.
3. The confirmed read back. It was written to `conversations.brief` and
   never read back out.

All three are now saved to `conversations.state` and restored. The shape
lives in `src/shared/resumeLog.js` and nowhere else.

**A refused finding is still never stored.** Only a count is kept, so a
returning person can be told plainly that nothing was carried over. Anthony:
"if there is no go-ahead, it should not add it."

**One quiet line says what came back**, and only when something invisible
did. "Picked back up. Still holding 2 things you approved from outside." It
is `role: "system"`, which keeps it out of the saved row and out of the
model's message list, where a third role would be a 400 on the next turn.

**Two bugs found while wiring it, both in New chat.** It never cleared the
approved findings, so a figure approved in the morning was still sitting in
the browser in the afternoon and would have gone into a completely unrelated
document. And it set the stage to "interview", left over from before
"orient" existed, so every new chat skipped reading the knowledge base.

**What is not done: the model does not read the note yet.** The column is
written and read by the browser. Handing the note to the model at the top of
each turn needs a change to the `assistant` function, which is a redeploy,
and it has not been made. Until it is, the model still works everything out
again from the messages on every turn. Correct, just slower and dearer.

## Publishing a file to customers, and the guard on it

Added 2026-09-09. The one action in the admin that can send a company's own
material to somebody outside the company is turning a knowledge file on for
customers. Until this day it was a single tap with nothing in the way, and
a real payment receipt got turned on during testing with nothing said.

**What is live in the repo and on `testing`:**

- **A pair of options, not a toggle.** `src/shared/AudienceControl.jsx`.
  "Staff only" and "Customers too", both on screen at once, the one in
  force filled in. The old control showed the state and nothing else: not
  that there was a choice, not what the other choice was, not that it
  mattered. A control that has to be taught is a broken control.
- **A gate on the way out.** `src/shared/PublishGate.jsx`. Turning a file
  ON always asks, every file, every time. Turning one OFF never asks,
  because taking something back is always safe.
- **Two levels.** Soft is the default: one line, plain button, no colour.
  Firm only when the reader found something: amber, the finding is what
  you read, Cancel becomes the loud button, and the other one says "Turn
  it on anyway". A warning that shouts every time gets clicked through
  every time.
- **The reader.** `supabase/functions/read-before-publish`, deployed
  2026-09-09, now **version 2**, `verify_jwt` false like every function here,
  `ezbr_sha256` e3580d26deb00ba2bb8fa67cce4a11f9d0d654756e442b2a4e40d22bcbbe4db2.
  Admin only, checked in the function. Sonnet. Returns clear, warn or
  unknown plus one plain line. It leans internal on purpose and its reason
  never quotes the private part. **Confirmed working on a real file**: it
  identified a bank transfer receipt without printing the account number.

  Version 2 fixed the first false positive, found within an hour of going
  live. A file of pricing instructions came back as "internal", because
  instruction was being read as secrecy. The prompt now says plainly that a
  document written to steer the assistant is not private information.

- **A quiet delete guard.** `src/shared/ConfirmDelete.jsx`. The bin removed a
  file and its text on one tap with no undo.

- **Duplicate detection.** `src/shared/duplicates.js`. No model, no tokens, a
  string comparison against the list the browser already holds. A file name
  already taken gets red text. A link already in the base is different: it is
  a photograph of a page, so the same address again is a refresh, and
  `src/shared/RefreshOrKeep.jsx` asks what to do with the old reading.

- **Newest wins.** `customer_knowledge` now orders `k.created_at desc`.
  Applied and verified 2026-09-09: security definer preserved, grants still
  postgres and service_role only. It used to be oldest first, which put the
  stale copy in front and made the 40,000 character ceiling drop the newest
  material first.

- **The contradiction log.** `knowledge_contradictions` plus
  `knowledge_contradiction_log`. Written by support-ask when a company's own
  published material disagrees with itself while answering. One row per
  disagreement, not per message. No insert policy; the only way in is the
  security definer function, granted to service_role. Verified with a self
  test that wrote twice, confirmed one row with times_seen 2, confirmed a
  resolved row reopens, then deleted itself.

- **support-ask is at version 10**, `ezbr_sha256`
  283e8b1e521503acee33e7b03e98a8abd3ea9acc8e913300543f104c2842e230. It
  carries the writing rules, the dash line, the newest-first line, and the
  contradiction reporting.

### The outage on 2026-09-09, and what it changed

Version 9 of support-ask went live with a variable used and never declared.
Three 500s on Amara's real WhatsApp. Every reply was composed, appended to
the thread and saved, then the function threw on the way out, so the database
showed a perfect answer and the customer got silence.

Two checks both looked like they passed. An edit script asserted on three
anchors, the third missed, Python raised, and the file was never written,
taking the two edits that HAD matched with it. Then the type checker was run
as `| grep -E "TS1[0-9]{3}"`, which is syntax only, and a missing name is
TS2304.

**`scripts/check-functions.mjs` exists because of this.** It type checks every
edge function and excuses only the Deno global and jsr/npm/https imports.
Run it before any deploy. Never narrow a check to a class of error guessed at
in advance.

**The contradiction log and the metering now each have their own try**, and
`CLAUDE.md` carries the rule: bookkeeping never fails a reply. Both run after
the customer's answer already exists.

### The 40,000 character ceiling, which nothing on any screen mentions

`MAX_SOURCE_CHARS` in support-ask is 40,000. Amara's landing page alone is
59,837, so a third of it never reaches the model, including the whole partner
programme. Nothing warns anybody. This is the binding constraint on what
support knows, and it binds long before the model's own limits do.

Ask support about the partner programme today and it knows nothing, with no
sign anything is missing.

**The rule the whole thing turns on, and it is not negotiable:**

> The reading can add a warning. It can never remove one, and it can never
> encourage.

The gate opens whatever the reader says or fails to say. A clean reading
does not skip the question, it only leaves the dialog quiet. A reading that
failed says "nobody has checked it" and is never dressed up as clean.

The design that was tried and rejected was to let the reader decide whether
to ask, and pop up an offer when it came back clean. That turns a model's
mistake into the product actively inviting somebody to publish a payroll
sheet with a green tick beside it. A model that can wave something through
will eventually wave the wrong thing through.

**Not built yet:** the override log, meaning a record of the times the
reader warned and an admin turned the file on anyway. Nothing is logged for
the soft path, deliberately.

**A trap fixed on the way past, worth knowing about.** `PageShell` is a
column flex container, so a flex line takes the width of its widest item
and stretch only grows items up to it, never shrinks them. One long file
name held on one line by `truncate` made the admin content wrapper 512px
wide inside a 320px phone. `overflow-x-clip` then hid the result instead of
scrolling it and `document.scrollWidth` still read clean, so the bin and
the status pill on every row sat off the right edge with nothing reporting
it. The fix is `w-full` on the page's own wrapper, which makes its width
definite. `min-w-0` alone does not do it. Any new page inside `PageShell`
needs the same.

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

## Small things noticed and deliberately left

- **The workspace header truncates the company name at 320px.** It shows
  "A.." where it should show "Amara". Spotted 2026-09-10 while screenshotting
  the assistant's offer card. Not caused by that work, and not fixed with it,
  because a header change touches every screen and that was not what was
  being tested. Anthony: "note that and maybe fix it later."

## Next, in the order I would do it

1. **Hand the resume log to the model.** The column is written and read
   by the browser already. This is the `assistant` redeploy that lets it
   read its own working note instead of reading twenty messages again.
2. **The live run.** Everything above is untested against real
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
