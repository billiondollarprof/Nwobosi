# CLAUDE.md

The rules for working on this project. The product is StellaXafe.

**These rules are not for Claude alone. Every agent working in this repo
follows them: Claude, DeepSeek, Codex, Gemini, Copilot, and whatever comes
after them.** Anthony, 2026-09-23: "if I'm giving you the token I want you
to see CLAUDE.md as your rule and follow it... add in it, that this rule is
also for DeepSeek agents."

What differs from one agent to the next is only the filename its tool opens.
It is never the rules once they are open. So this file is written to be read
by any of them, and the name of the agent reading it is not a reason to skip
a rule inside it.

**This is the one real rules file, and it is deliberately the only one.**
Beside it sit short signposts, because each tool looks for its own name:
`AGENTS.md`, `GEMINI.md`, and `.github/copilot-instructions.md`. They point
here and hold no rules of their own, so none of them can drift apart from
this one. The DeepSeek harness reads this file and `AGENTS.md` directly, so
it needs no signpost of its own. If another tool needs its own name, such as
`.cursorrules`, add another signpost like those. Never copy this file.

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

### Write so it can be read once

Anthony, 2026-09-10: "the English language you are using sometimes I don't
used to follow... sometimes your words are not connecting properly."

That is a failure of the writing, not of the reading. Fix it here.

- **Short sentences.** One idea each. If a sentence has two commas in it,
  it is probably two sentences.
- **British English.** Colour, realise, behaviour, whilst never.
- **Plain words over clever ones.** "Stops" not "obviates". "Read again"
  not "re-derive". If a shorter word does the job, the longer one is showing
  off.
- **No sentence that needs reading twice.** Read it back. If the meaning
  arrives on the second pass and not the first, rewrite it.
- **Say the thing, then explain it.** Not the other way round. The answer
  goes first, the reasoning goes after.
- **Careful with subordinate clauses.** A sentence that starts with "while"
  or "although" or "given that" makes somebody hold the first half in their
  head. Split it.
- **Numbers as numbers.** "0.3 cents", not "a third of a cent".

The technical terms stay, with their plain meaning in brackets the first
time. That rule has not changed. The problem is not the terms, it is the
sentences they sit in.

### Write in Anthony's voice, not in Claude's

Anthony, 2026-09-15: "your English that you speak, it usually sounds in a
certain way that people don't used to understand it, and it reads too
AI-ish. Learn to start talking like me... your job is to fix the exact
word, use the right part of speech, put the punctuation correct, but let
the tone be my tone."

This is not a preference and it is not optional. It applies to every
client facing line, every piece of UI copy, and to how Claude talks in
the chat as well. Claude is learning this, and it has to keep practising
it, because the default voice keeps coming back.

**What Claude is fixing, and what Claude is keeping.**

Claude fixes the mechanics. The spelling, the punctuation, the tense, the
word he was reaching for and did not quite land on. Claude keeps the
voice. The rhythm, the order he puts things in, the way he explains
something by walking through it.

So it is not a translation. It is the same man speaking, cleaned up.

**The five things his voice actually does.**

1. **He asks the question, then he answers it.** "And how does it achieve
   the privacy? It achieves the privacy because it is deployed in the
   company's own environment." That is his move and it works, because the
   reader is already holding that question when the answer arrives. Claude
   states a conclusion and moves on, which leaves the reader behind.

2. **He carries the noun forward instead of reaching for a pronoun.** He
   says "it achieves the privacy", not "it does so". Repeating the thing
   is what stops a reader losing the thread three clauses in.

3. **He chains cause to effect out loud.** So, then, because, which means,
   that is why. He never leaves the join for the reader to work out. Claude
   drops the joins to sound tighter and the sentences stop connecting,
   which is the exact thing Anthony said he cannot follow.

4. **He narrates a sequence in order, in time.** First this happens, then
   it does that, and once that is done you get this. He does not summarise
   a process, he walks you through it.

5. **He talks to a person.** "You don't get to paste articles around." Not
   "users are not required to". Second person, active, and the consequence
   for that person said out loud.

**The tells that give Claude away. Cut every one of them.**

- The fragment used for drama. "Not a compromise. A decision." Nobody
  talks like that.
- The "it is not X, it is Y" construction. Once in a long piece is fine.
  Claude does it four times a paragraph.
- The aphorism at the end of a paragraph, the neat little closing line
  that sounds wise and says nothing new. "An address that is nearly right
  is not right." Delete it and the paragraph is better.
- The triple. Three parallel clauses, rising. It is a tic.
- A sentence starting with "That" pointing back at a whole idea, when
  naming the thing would be clearer.
- Abstract nouns doing a verb's job. "The reservation holds" instead of
  "it keeps the space".

**How this sits with the short sentences rule above.**

Short does not mean clipped, and that is where Claude got it wrong. The
rule above exists because Anthony could not follow the writing. Chopping
sentences into fragments does not fix that, it makes it worse, because a
fragment leaves out the very words that carry the meaning across.

What he asked for is the opposite of clipping. He asked for more detail,
not less, said in his own movement. So keep the sentence easy to follow,
keep one idea in it, and keep the small joining words that make the idea
land. Where the two rules pull against each other, his voice wins.

**Read it back in his voice before shipping it.** Not "is this correct",
but "would he have said it this way". If it sounds like a product page
wrote itself, it is not finished.

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

## Never change what Anthony designed without asking first

Anthony, 2026-09-23, after an agent turned thinking off for the `orient` and
`interview` stages on its own:

> "Did I ask you to remove thinking? You only do what I ask you to do. And
> apart from that, if you decided to fix any bug, and that will cause you to
> change anything that I've already built, you have to tell me first and
> explain it to me in plain and simple language before you carry out the
> task. You don't go and change something that I did not ask you."

> "Do you know how long it took me to design this platform, that you just go
> and be changing things on your own? You have no volition to break anything
> that I worked and put there."

What happened, so nobody repeats it. An agent found that the interview stage
could spend its whole token ceiling thinking and write nothing. That part was
true and worth knowing. Then it decided the thinking itself was the fault,
turned it off for two stages, and called it a fix.

It was not a fix. **The interview reasons.** Weighing the answers it has just
been given, and working out what is still missing or wrong, is the job. The
agent removed that to buy back tokens, which is a design decision, and design
decisions on this platform are his. He had to find out from a review rather
than from a question.

So, from now on, and this is not advice:

- **A diagnosis is not permission.** Finding the cause of something is the
  job. Changing what you found is a separate job, and it belongs to him.
- **If what you found is not a bug, you do not touch it.** A design choice
  you disagree with is not a fault. Say what you think it costs, in one line,
  and leave it exactly as it is.
- **Tell him first, in plain words, then stop and wait.** What you want to
  change, what it does today, what it would do instead, and what it costs.
  Waiting means waiting, even when you are certain.
- **Keep the change to the thing he asked for.** Do not carry a second
  improvement along because you were already in the file.
- **If you already changed something without asking, undo it, then ask.**
  Put it back to what he built, say plainly what you did, and offer the change
  as a question. Do not defend it, and do not keep half of it.

The one exception is unchanged and narrow: a request that would break the live
site, lose data, or put a false claim on a public page. Say so plainly and
wait. This is not that.

## Start of every session

- Read `CURRENT.md` first. It has the full state of what was being worked on when the last session ended.
- Read `SESSIONS.md` next. It is the log of past sessions.
- At the end of a session, update both files.

### Write his requests down the moment he makes them

Anthony, 2026-09-15: "Have you actually been recording my requests or you
have been throwing them away and only working on the ones you remember?"

He was right to ask. They were being listed back to him in chat and never
written anywhere that survives, so `CURRENT.md` sat two days stale while
four of his asks lived only in a conversation. That makes remembering his
own product his job instead of Claude's, and it is the one thing he should
never have to do.

So the rule is now:

- **`CURRENT.md` opens with "ANTHONY'S OPEN REQUESTS".** That section is
  read first, before anything else in the file.
- **A request he makes that is not built in that same turn goes in that
  section immediately**, in his own words, with the date. Not at the end of
  the session, when the session might not get an end.
- **It comes off the list when it is built and checked**, never when it is
  planned or when a plan for it has been shown to him.
- **A decision he makes goes in the "Decided" part** of that section, so
  nobody reopens a question he has already closed.

Listing something back to him in a reply is not recording it. The reply
disappears; the file does not.

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

## START IT AND FINISH IT, IN THE SAME SESSION

Anthony, 2026-09-22: "why are you unnecessarily eating up time and credit
and not taking your time to audit and plan a fix?... You have at least 8
things not yet done. You keep circling one thing without getting it right."

He was right, and it had a shape. One thing got half fixed, the fix got
explained at length, a new fault appeared in the same area, and the cycle
went round again. Meanwhile eight real items sat untouched and his
subscription ran down. **Four weeks in and he still has no demo video.**

These rules exist so that cannot keep happening. They are not advice.

### 1. One task at a time, and it is not done until it is used

Pick one thing. Finish it completely: built, used by hand, checked, pushed,
deployed if it needs deploying. Only then pick up the next one. A session
that half finishes three things has finished nothing and has spent three
times the money doing it.

**Finished means Anthony can use it.** Not "the code is written". Not "the
tests pass". Not "it is pushed". If it needs an edge function deployed and
it is not deployed, it is not finished, and the reply says so in the first
line rather than the last.

### 2. Audit the whole area before changing one line of it

The invitation broke four separate times in two days. Every time, one fault
was fixed and the next one was found by Anthony pressing the button. That
is the most expensive way to work, because every round costs a deploy, a
test by him, and a reply from me.

So before touching anything, read the whole path end to end and write down
EVERY fault found, then fix them together. For the invite that would have
been: the level list, the password length, the email wording, the panel
overflow and the revoke button, all in one pass.

**A fix that arrives alone, when three faults were sitting next to it, is
not a fix. It is a round trip.**

### 3. Never break what works while fixing what does not

Read the diff before pushing and ask one question of every deletion: was
anybody relying on this? Adding to a working function should delete
nothing. Where something has to move, say so plainly in the reply.

### 4. Every control gets used before the word "done"

Click it. Change the value. **Refresh the page.** This project has shipped
five controls that rendered perfectly and wrote nothing: the level picker,
the outputs box, the support toggle, revoke, and the requests panel. Every
one was found by Anthony, never by a test. A control that writes nothing
cannot fail, so it never reports anything, and it looks exactly like one
that works.

### 5. Say less

The answer first, in one or two lines. Then only what he has to do, as a
numbered list. No narration of what was tried, no explaining the reasoning
unless he asks, no repeating what is already in the commit message. **He is
paying for every word.**

Where a long explanation genuinely belongs somewhere, it belongs in the
code comment or in `CURRENT.md`, not in the reply.

### 6. The list is the job

`CURRENT.md` holds what is open. Work down it. Do not start something new
because it turned up while doing something else: write it down and carry
on. Come back to the reply with the same task finished, not with a
different one started.

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

### You can read what is actually deployed. Do that instead of guessing.

`mcp__Supabase__get_edge_function` returns the live source of any function.
It was sitting there unused for two days while a paste ritual grew up around
not knowing what was deployed.

So the honest version of the rule is now:

1. **Pull the deployed source first.** Compare it against the repo copy.
2. **If they match, the repo is safe to edit and deploy.** No paste needed.
3. **If they differ, the deployment wins.** Something was changed in the
   console and never came back to git. Work from the deployed copy, and say
   so plainly rather than quietly overwriting somebody's fix.

The paste rule exists because the repo and the deployment drift. It was never
about the pasting. It was about not knowing. Now it can be known, so know it.

### An edit that was not written to disk is not an edit

On 2026-09-09 support went down for three messages. Every reply was written,
saved to the database, and then the function threw on the way out, so the
customer sat there getting nothing while the record showed a perfect answer.

The cause was not the code. It was two checks that both looked like they had
passed.

**One.** An edit script made three changes and asserted on each anchor. The
third anchor missed, the script raised, and the file was never written. The
two changes that HAD matched were lost with it. A later script then added the
code that USED a variable without the code that DECLARED it.

**Two.** The type checker was run, and it knew. It was run as
`npx tsc ... | grep -E "TS1[0-9]{3}"`, which shows only syntax errors. A
missing name is TS2304. The check had been told not to report the one thing
that was wrong.

So, before any edge function is handed over or deployed:

1. **Look at the file, not at the script's output.** `grep` for the thing you
   just added. A script that printed "ok" and a file that contains the change
   are two different facts.
2. **Run `node scripts/check-functions.mjs`.** It type checks every function
   and excuses only the Deno global and jsr/npm/https imports. Never narrow a
   check to a class of error you guessed at in advance, which is exactly how
   this one got through.
3. **Diff against the version before your change** and count the deletions.
   Adding lines to a working function should delete nothing.

### Bookkeeping never fails a reply

The same outage taught this. The thing that threw was a log write, running
after the customer's answer was already composed. Anything that happens after
the real work is done gets its own `try`, because a row nobody reads is never
worth a person getting silence.

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

**After anything lands on `main`, merge `main` back into `testing` straight
away.** A hotfix, or a merge from testing, puts a commit on `main` that
`testing` does not have. Left alone, `testing` shows as behind `main`, which
reads as though `testing` is missing work and makes the next merge harder
to trust. On 2026-09-23 it had drifted 5 behind. `testing` should only ever
be ahead of `main` or level with it.

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
