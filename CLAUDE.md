# CLAUDE.md

This file tells Claude how to work on this project. The product is StellaXafe.

## How to talk to the user

- Use plain, simple, direct English.
- Go straight to the point.
- No em dashes, ever.
- Use a hyphen only when the word actually needs one.
- Keep sentences short and simple. This matters most in UI text (buttons, labels, messages the end user sees). Inside code, comments can use normal technical language.
- Technical terms are fine in our own chat, and welcome when they matter, the user wants to build vocabulary, not avoid it. The first time a term comes up, follow it with its plain meaning in brackets, then keep going. Example: "this needs RLS (a database rule that blocks one company from ever seeing another's rows)." Don't keep re-explaining a term once it has been defined earlier in the same conversation.
- **The bracket is not optional.** Every technical term gets its plain
  meaning in brackets the first time it appears in a conversation. Digest
  (a fingerprint of a value, used to compare two secrets without showing
  either one). Idempotent (safe to run twice, because the second run
  changes nothing). This is not politeness, it is how Anthony builds the
  vocabulary, so skipping it takes something from him.
- **Anything he has to do himself is a numbered list.** Not a paragraph he
  has to mine for the actions. One step per line, in the order he does
  them, with the exact thing to type or click. Say where he is (which
  project, which screen) before saying what to do there. If a step can be
  skipped because it is already done, say so and say how you know.
- **Say what is already done before saying what is left.** He should never
  go hunting for something that exists, or redo something that is finished.

## Taking direction

Anthony is in charge. That is not a formality, it is the working rule.

- **A specific request gets carried out.** Not argued with, not substituted
  for a better idea, not done at half size. Do it, then say it is done.
- **Opinions are for when they are asked for.** "What do you think", "do
  your thing", "do what works best" are invitations. Anything else is an
  instruction. If something still looks wrong after the work is done, say
  it in one line, after, never instead.
- **One exception, and it is narrow.** A request that would break the live
  site, lose data, or put a false claim on a public page. Say so plainly
  and wait. Disagreeing about taste is not this.
- **Screenshot before saying anything is finished.** Every time, no
  exceptions. A green build is not evidence a page renders, and neither is
  reading the markup. Look at it on a phone width and a desktop width, in
  both themes, before the word "done" appears.

## Start of every session

- Read `CURRENT.md` first. It has the full state of what was being worked on when the last session ended.
- Read `SESSIONS.md` next. It is the log of past sessions.
- At the end of a session, update both files.

## When the user asks for a new feature

1. Repeat the request back in short, simple language. Wait for the user to confirm you understood it right.
2. Once confirmed, audit anything you need to check first (existing code, existing docs).
3. Write a short spec or plan for how you will build it.
4. Build it.

## UI work

- After building or changing any UI, take a screenshot and check it against the design (sleek, clean, premium feel) before calling it done.
- Click through buttons and interactive elements yourself and confirm they work before calling it done.
- **A screenshot cannot see content clipped off the right edge, so run
  `scripts/overflow-audit.cjs` as well.** `PageShell` uses `overflow-x-clip`,
  which means anything wider than the viewport is cut off rather than
  scrolled, and `scrollWidth` still reports the page as clean. The Insights
  page shipped with its heading and body clipped on every phone under 374px
  and passed every check that was being run. The script measures real
  element edges at four phone widths across every public route. Read the
  header in that file before trusting or changing it.

### Nothing is finished until it has been walked through

This is not the optional half of the job. A change that has not been used
is a change that has not been tested, and every time that step got skipped
something shipped broken: the clipped Insights page, the log out that did
not log out, the six digit box against an eight digit code.

So, every time, no exceptions:

1. **Use the thing you just built, as the person who will use it.** Click
   the button. Toggle the toggle. Cancel the dialog and confirm it did
   nothing. Type the wrong thing and see what happens.
2. **Look at it, do not read the markup.** Screenshot at a phone width and
   a desktop width, in both themes.
3. **Run `scripts/overflow-audit.cjs`** for anything that changes layout.
4. **Judge the UI as somebody who was never told how it works.** If a
   control needs explaining, the control is wrong, not the person. Anthony
   should never have to teach an admin what a switch does.
5. Only then say it is done, and say what you actually checked.

## Model choice

Claude cannot switch its own model. Only the user can, with `/model`. So Claude names the tier before starting anything substantial, in one short line, and the user decides.

Say it as the first line of the reply, before any work: "Sonnet is enough for this" or "this one is worth Opus".

**Sonnet 5 is enough for:**

- Building a screen from a spec already agreed
- Adding a form, a field, a route
- Wiring an API call whose shape is already known
- Doc updates, session logs, commit messages
- Screenshot runs and click through testing
- Refactors with a clear target

**Opus 5 earns its cost for:**

- Architecture decisions, anything that shapes what comes after
- Security code: row level security, auth, anything that redeems a code or spends money
- Debugging something that is not obvious
- Copy that has to land, like the headline
- Anything where being wrong means rebuilding rather than editing

Switching between tasks is free and keeps the whole conversation. Do not switch in the middle of one.

The bigger cost in a long session is not the tier, it is the length of the conversation being resent every turn. When a chunk of work is finished and the next chunk is unrelated, a fresh session saves more than a tier change does.

## Direction is not copy

Anthony briefs Claude so the work goes in the right direction. **A briefing
is not text to publish.** It is context. Claude translates it, and the
translation is the actual job.

- **Never transcribe a briefing onto a page.** "XALOM is just remaining
  wiring" tells Claude the state of things. On a public page it becomes a
  progress bar shown to a buyer, which is nobody's business and reads as
  half finished. Internal status stays internal. A public surface names a
  product and its stage in the same language the rest of the site uses.
- **Write for the person in front of the page.** A recruiter, a buyer, or
  somebody who needs a job done. Ask what they want to know, not what is
  true to say. Everything true does not go on.
- **Cut.** If one word does it, use one word. If two lines do it, never
  write a paragraph. Nobody arrives to read a textbook, they arrive to find
  one thing.
- **Delete every line that defends against an accusation nobody made.** No
  disclaimers, no "not a prototype", no explaining what Anthony does not
  personally do. A confession above the fold prices the work down before
  the reader has decided they want it. What he can and cannot take on is an
  interview conversation, and he handles it himself.
- **Sound certain.** Use the real term where it carries weight:
  orchestration, multi tenant isolation, human in the loop, production.
  Reaching for the softest possible word to seem humble reads as somebody
  who is not sure of themselves, and it sells him short. Do not overpromise
  and do not undersell. A claim that is true gets stated flat, not hedged.
- **Then read it back as the person it is aimed at.** Would you hire him?
  Would you buy? If the answer is no, the copy is not finished, however
  accurate it is.

## The product principle

The product should feel like an unfair advantage to someone who is not technical. Simple to set up, simple to use, working at full intelligence underneath. It should feel like cheating.

That means:

- **The staff side has no settings.** No model picker, no advanced options, no toggles. Every knob you show is a way to get it wrong, and a reminder they are operating machinery. They talk, it works.
- **Admin setup never exposes the plumbing.** An admin should never need to understand embeddings, chunking, vectors, or retrieval. Setup is: upload your files, give each one a name and a line saying what it holds, invite your people. Everything technical happens out of sight.
- **Plain words in every screen.** No indexed, embedding, vector, token, RAG, or model ID in anything a user reads. Say ready, being read, outside sources. This is the rule for a deployed company's own app, the screens their staff and admin actually use every day. It does not loosen there, ever.
- **Two things stay visible, because they build trust.** The read back, which proves it understood before spending someone's time. And which sources it used, which proves it is not inventing. Everything else hides.

The advantage does not come from the model. It comes from the output already knowing the company's templates, numbers, and standards without the staff member supplying any of it. Build toward that.

**The landing page, and anything else that is StellaXafe talking about itself, is a different surface with different rules.** A calm, mature, premium company is allowed to sound like it knows what it is talking about. Use a real technical term where it earns its place and carries authority, RLS, retrieval, tenant isolation, that kind of thing, rather than always reaching for the softest possible word. The read is not a technical buyer, but someone technical usually reviews the page before a deal moves, so it should hold up to that read too. What it is not: a wall of buzzwords, or jargon reached for out of habit rather than because the sentence needed it. Calm and simple stays the default tone, a real term shows up when it is the clearest and most precise word available, not as flavour.

## No passwords

Anthony's rule, and it holds unless a customer's own security policy
demands otherwise: **this product does not use passwords.**

- Signing in is a code sent to the person's email.
- An invitation is a link that works once and runs out.
- The demo's access code is the identity for the demo.
- A client who asks for passwords, because their policy says so, gets
  them. Nobody else does.

The reason is not fashion. A password is a secret the person has to store,
they store it badly or forget it, so every password system grows a reset
flow, and the reset flow is email anyway. The inbox was always the real
boundary. Going straight there removes a class of support work and the
worst failure this product can have, which is somebody locked out of a
workspace with no way back.

Where a password still exists in the code, it is either an account made
before this rule or a random value the server generates and throws away.
Neither is ever shown to anybody.

## Databases and edge functions

The database has real customer conversations in it and the edge functions
are live. Both are things that keep working right up until the moment
somebody changes them from memory. These rules exist so that cannot happen.

### Every SQL statement is shown and explained before it runs

Claude does not run SQL on a project without walking Anthony through it
first. Not a summary afterwards, before.

1. Say what the SQL is for, in one plain line.
2. Show the statement itself.
3. Say plainly whether it only reads (a SELECT, which changes nothing) or
   whether it writes (INSERT, UPDATE, DELETE, ALTER, which change or
   destroy data).
4. Wait. Anthony approves it or he does not.

He has said it directly: if he is not carried along, he will not approve.
An approval he did not understand is not an approval, it is a guess.

### Something redeploys functions without being asked, cause unknown

On 2026-09-08 three edge functions (`add-link`, `assistant`, `support-ask`)
jumped a version at the same instant, 17:25:33 UTC, with content matching
the repo. Nobody in that session deployed them by hand.

The first guess was that a push to `main` triggers it, because a merge to
`main` had just happened. **That guess was tested and it failed.** A later
push to `main` changing only `support-ask` produced no deploy at all, five
minutes on. So a push to `main` is not the trigger, and the real cause is
still unknown. Other candidates, none confirmed: another session using the
Supabase tools, or a deploy someone ran elsewhere.

What to do until somebody establishes the cause:

- **Never assume a push made a function live.** Check the version and the
  `ezbr_sha256` before saying anything is deployed. Repo state is not
  deployment state on this project either.
- **Say so plainly when a deploy has not landed**, rather than reporting
  the push as though it were the deploy.

### An edge function that already works is never rewritten from the repo

The code in the repo and the code that is actually deployed drift apart.
A file existing in `supabase/functions/` means it is written, not that it
is live. Handing over a whole function assembled from the repo can silently
undo something that was fixed directly in the console and never came back
to git.

So, for any function that is already deployed and working:

1. **Anthony pastes the currently deployed source into the chat.** Claude
   asks for it and waits. Claude does not skip this because it thinks it
   already knows what is there.
2. **Claude adds only the new lines to that pasted code.** Nothing else
   moves. No tidying, no renaming, no reformatting, no improving something
   on the way past.
3. **Claude says exactly what was added and where**, so Anthony can see the
   change without reading the whole file.
4. **Claude hands back the whole function in one copyable block**, so he
   replaces all of it and deploys once.
5. **Claude says plainly whether it is NEW or a REDEPLOY**, in those words,
   before he touches anything.

A brand new function has nothing to break, so it can come straight from the
repo. Every other one follows the five steps.

### Slug and display name stay identical

A function's slug is what the URL is built from. Its display name is a
label. Renaming the label does not rename the slug, and deploying by the
label creates a second function instead of updating the first. That is how
`assistant-` happened. Keep both strings the same and the trap cannot fire.

## Branching and deploying

The site is live. `main` deploys straight to stellaxafe.com with nothing
in between, so **every push to `main` is a publish.**

Because of that there is a testing branch, and work goes through it.

1. Build on a feature branch, as before.
2. Merge into `testing` and push. Cloudflare Pages builds it to
   **https://testing.stellaxafe01.pages.dev** (the Pages project is
   `stellaxafe01`, so any branch gets `https://<branch>.stellaxafe01.pages.dev`).
3. Look at it there. Both themes, a phone and a desktop, click the things.
4. Only then merge `testing` into `main`.

Claude does not merge to `main` without being asked. Pushing `testing` does
not need asking, because nobody outside sees it.

Two things keep previews from becoming a problem:

- **Every branch that is not `main` is built noindex.** `scripts/preview-guard.mjs`
  runs after the build and writes a `robots.txt` and an `X-Robots-Tag`
  header on any preview deployment. Unreleased copy indexed under a
  pages.dev domain is a mess to undo. Production writes neither.
- **Preview URLs are still public.** The guard tells crawlers to stay away;
  it does not stop a person with the link. Put previews behind Cloudflare
  Access if that matters for a given piece of work.

Hotfixes to `main` directly are allowed when the live site is broken.
Everything else waits for testing.

## Project structure

This project is not one big file. Each major part of the app is its own page, in its own file:

- Chat interface: its own page.
- Admin interface: its own page.
- Landing page: its own page.
- Auth pages: its own page.

Inside each page, break the code into clearly labeled sections (for example, inside the auth page: login, signup, OTP verification). Each section should be easy to find and read top to bottom.

**Every page and every section has to stand on its own.** This is not a
style preference, it is the rule that decides whether the next person can
work on this at all, and the next person includes a tired Anthony at 2am
and every fresh Claude session that has never seen the file before.

- **A header at the top of every file**, saying what this is, why it
  exists, and what it must never do. If a decision in the file would look
  wrong to somebody who was not in the conversation, the reason goes in the
  header. A file whose header is out of date is worse than one with no
  header, so when the code changes the header changes with it.
- **A labeled section for every distinct job in the file**, numbered where
  order matters, so anybody can scroll and land on the right one without
  reading the parts either side.
- **Written for the slowest engineer in the room, not the fastest.** No
  cleverness that has to be decoded, no abbreviation only the author
  understands, no reliance on knowing what happened three files away. If a
  line needs a paragraph to explain it, either write the paragraph or write
  a simpler line.
- **Read it back cold before calling it done.** Open the file as though you
  have never seen it. Can you tell in ten seconds what it does and where to
  change one thing? If not, it is not finished.

These pages come together to form the app, but the source for each stays separate and clean.

The app is a single page application. The separate page files are for reading and working on the code. They build into one app, so clicking between sections is instant with no page reload. Keep both sides of this true: split for reading, joined for speed.
