# CLAUDE.md

How to work on StellaXafe. **These rules are for every agent in this repo**:
Claude, DeepSeek, Codex, Gemini, Copilot and whatever comes next. `AGENTS.md`,
`GEMINI.md` and `.github/copilot-instructions.md` only point here. Never copy
this file; add another pointer instead.

This file is deliberately short. It holds the rules that apply to every task,
and a map of where everything else lives. **Open a file from the map only when
the job in front of you needs it.** Reading everything costs Anthony money and
buys nothing. (Rewritten 2026-11-02. The previous full text is in
`docs/history/CLAUDE-to-2026-11-02.md`; every rule in it either moved to a file
below or is kept here.)

---

## 1. Start of every session

1. Read `docs/state/OPEN.md`. It is what he has asked for and decided.
2. Stop reading. Open anything else only when the task needs it.

## 2. Where things are

| When you are about to... | Open |
|---|---|
| Write a reply, UI text or any copy for a client, buyer or recruiter | `docs/rules/WRITING.md` |
| Design or change a screen, a flow or admin setup | `docs/rules/PRODUCT.md` |
| Call any screen change done | `docs/rules/UI-CHECKS.md` |
| Run SQL, or touch an edge function | `docs/rules/DEPLOY.md` |
| Check what is live, and at which version | `docs/state/LIVE.md` |
| Merge or push | `docs/rules/BRANCHING.md` |
| Create a file or reshape one | `docs/rules/STRUCTURE.md` |
| Understand what the product is for, and what public copy may claim | `docs/product/DIRECTION.md` |
| Understand isolation, privacy, WhatsApp as the customer side | `docs/product/ARCHITECTURE.md` |
| Work on the assistant's stages | `docs/product/FLOW.md`, `docs/product/ASSISTANT-SPEC.md` |
| Work on documents, charts, conversion | `docs/product/DOCUMENT-HARNESS.md`, `docs/product/OUTPUT-QUALITY.md` |
| Work on support | `docs/product/SUPPORT.md` |
| Set up a new company | `docs/product/DEPLOY-A-COMPANY.md` |
| Work for Dreef, the first client | `docs/clients/dreef/` |
| Work on the marketing site | `docs/stellaxafe-site/` |
| Find out why something was done, or what happened before | `docs/history/` (search it, do not read it whole) |

Code comments that say `CURRENT.md`, `SESSIONS.md` or `PENDING-DEPLOYS.md`
mean the old files, now in `docs/history/`. Comments inside edge functions are
left as they are on purpose: changing them would make the repo differ from
what is deployed.

Also in `docs/product/`: `HOW-IT-WORKS.md`, `ROADMAP.md`, `STYLE-MEMORY.md`,
`IMAGES.md`, `MARK.md`.

## 3. How to talk to Anthony

- Plain, direct English. British spelling. Short sentences, one idea each.
- **No em dashes, ever.** A hyphen only where the word needs one.
- **The answer first**, then only what he needs. He pays for every word.
- **Every technical term gets its plain meaning in brackets the first time** it
  comes up in a conversation. This is how he builds vocabulary, so it is never
  skipped. Example: idempotent (safe to run twice, because the second run
  changes nothing).
- **Anything he has to do himself is a numbered list**, in order, saying where
  he is before what to click.
- **Say what is already done before what is left.**
- Client facing or public text follows `docs/rules/WRITING.md` in full: his
  voice, and the Humanizer checks.

## 4. Taking direction

Anthony is in charge. That is the working rule, not a formality.

- **A specific request gets carried out.** Not argued with, not swapped for a
  better idea, not done at half size. Do it, then say it is done.
- **Opinions are for when they are asked for.** "What do you think" or "do what
  works best" are invitations. Anything else is an instruction. If something
  still looks wrong after, say it in one line, after, never instead.
- **New features and big work: repeat the request back in a few lines and wait
  for his yes.** Then audit, plan briefly, build. A small or specific request
  skips the repeat.
- **His design is his.** Finding a cause is the job; changing what he built is a
  separate decision, and it is his. If it is not a bug, do not touch it: say
  what it costs in one line and leave it. If you already changed it without
  asking, put it back, then ask. (2026-09-23, after thinking was switched off
  in two stages without asking.)
- **The one narrow exception:** a request that would break the live site, lose
  data, or put a false claim on a public page. Say so plainly and wait. Taste is
  not this.

## 5. How to work

1. **Write his request into `docs/state/OPEN.md` the moment he makes it**, if it
   is not finished in the same turn. Listing it back in chat is not recording
   it.
2. **One task at a time.** Finished means he can use it: built, used by hand,
   checked, pushed, deployed if it needs it.
3. **Audit the whole area before changing one line**, write down every fault
   found, and fix them together. A fix that arrives alone, with three faults
   next to it, is a round trip.
4. **Never break what works while fixing what does not.** Read the diff back.
   Ask of every deletion: was anybody relying on this?
5. **Nothing is done until it has been used.** Click it, change it, refresh.
   For anything a person sees: screenshot at phone and desktop width, both
   themes, plus `scripts/overflow-audit.cjs` (`docs/rules/UI-CHECKS.md`).
6. **Something new turns up mid task?** Write it in `OPEN.md` and carry on.

## 6. The three rules that cannot be got wrong

- **Every push to `main` is a publish** to stellaxafe.com. Work goes through
  `testing` first. Never merge to `main` without being asked. Pushing `testing`
  needs no asking. (`docs/rules/BRANCHING.md`)
- **SQL:** read only queries run freely and are reported. Anything that writes
  goes to him as one batch, a short line per statement, and waits for his yes.
  (`docs/rules/DEPLOY.md`)
- **Edge functions:** the repo is not the deployment. Compare the live copy
  first, and a redeploy is always asked for. (`docs/rules/DEPLOY.md`)

## 7. Product rules in one breath

The staff side has no settings. Admin setup never shows the plumbing. No
technical words on any screen a client's staff use. The read back and the
sources used always stay visible. **No passwords**: sign in is a code sent to
email. Full text: `docs/rules/PRODUCT.md`.

## 8. Model choice

Only Anthony can switch the model, with `/model`. Before anything substantial,
name the tier in one line: "Sonnet is enough for this" (building to an agreed
spec, forms, wiring a known API, docs, screenshot runs) or "this one is worth
Opus" (architecture, security, auth, money, hard debugging, copy that has to
land). Never switch in the middle of a task.

## 9. Keeping the docs small

The docs used to cost a new session 67,000 tokens before any work. Keep them
lean:

- **`OPEN.md` holds only what is open and what is decided.** A finished item
  leaves the same day, as one dated line at the end of
  `docs/history/SESSIONS.md`.
- **`LIVE.md` is updated in the same turn as any deploy.**
- **The reason behind a rule goes in the rule's own file**, in a line or two.
  Incident stories go in `docs/history/`.
- **A long explanation belongs in the code header or the topic file**, not in a
  reply and not here.
- **Never add to this file what belongs in a topic file.** Add a row to the map
  instead.
