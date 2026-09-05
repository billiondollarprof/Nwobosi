# CLAUDE.md

This file tells Claude how to work on this project. The product is StellaXafe.

## How to talk to the user

- Use plain, simple, direct English.
- Go straight to the point.
- No em dashes, ever.
- Use a hyphen only when the word actually needs one.
- Keep sentences short and simple. This matters most in UI text (buttons, labels, messages the end user sees). Inside code, comments can use normal technical language.
- Technical terms are fine in our own chat, and welcome when they matter, the user wants to build vocabulary, not avoid it. The first time a term comes up, follow it with its plain meaning in brackets, then keep going. Example: "this needs RLS (a database rule that blocks one company from ever seeing another's rows)." Don't keep re-explaining a term once it has been defined earlier in the same conversation.

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

## The product principle

The product should feel like an unfair advantage to someone who is not technical. Simple to set up, simple to use, working at full intelligence underneath. It should feel like cheating.

That means:

- **The staff side has no settings.** No model picker, no advanced options, no toggles. Every knob you show is a way to get it wrong, and a reminder they are operating machinery. They talk, it works.
- **Admin setup never exposes the plumbing.** An admin should never need to understand embeddings, chunking, vectors, or retrieval. Setup is: upload your files, give each one a name and a line saying what it holds, invite your people. Everything technical happens out of sight.
- **Plain words in every screen.** No indexed, embedding, vector, token, RAG, or model ID in anything a user reads. Say ready, being read, outside sources. This is the rule for a deployed company's own app, the screens their staff and admin actually use every day. It does not loosen there, ever.
- **Two things stay visible, because they build trust.** The read back, which proves it understood before spending someone's time. And which sources it used, which proves it is not inventing. Everything else hides.

The advantage does not come from the model. It comes from the output already knowing the company's templates, numbers, and standards without the staff member supplying any of it. Build toward that.

**The landing page, and anything else that is StellaXafe talking about itself, is a different surface with different rules.** A calm, mature, premium company is allowed to sound like it knows what it is talking about. Use a real technical term where it earns its place and carries authority, RLS, retrieval, tenant isolation, that kind of thing, rather than always reaching for the softest possible word. The read is not a technical buyer, but someone technical usually reviews the page before a deal moves, so it should hold up to that read too. What it is not: a wall of buzzwords, or jargon reached for out of habit rather than because the sentence needed it. Calm and simple stays the default tone, a real term shows up when it is the clearest and most precise word available, not as flavour.

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

These pages come together to form the app, but the source for each stays separate and clean.

The app is a single page application. The separate page files are for reading and working on the code. They build into one app, so clicking between sections is instant with no page reload. Keep both sides of this true: split for reading, joined for speed.
