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
3. **One chat.** Anthony works in one long chat. Do not suggest a new one.
   The chat is summarised from time to time, so keep `OPEN.md` and `LIVE.md`
   current as you go: they are what survives in full.

## 2. Where things are

| When you are about to... | Open |
|---|---|
| Write a reply, UI text or any copy for a client, buyer or recruiter | `docs/rules/WRITING.md` |
| Design or change a screen, a flow or admin setup | `docs/rules/PRODUCT.md` |
| Call any screen change done | `docs/rules/UI-CHECKS.md` |
| Run SQL, or touch an edge function | `docs/rules/DEPLOY.md` |
| Check what is live, and at which version | `docs/state/LIVE.md` |
| Merge, push, go live, or change a GitHub workflow | `docs/rules/BRANCHING.md`, `.github/workflows/`, skill `ship` |
| Take screenshots, or make a database change | skills `screens`, `new-migration` in `.claude/skills/` |
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

## 5. What an agent may do, must ask, and must never do

So agents can work fast without guessing. Adapted from the Rhema repo,
2026-11-02, with Anthony's yes.

**May do without asking**
- Read any code, run any local test, build.
- Push to a feature branch and to `testing`.
- Run read only SQL (SELECT), and say in the reply what it read.
- **Merge `testing` into `main` once every check is green**, then merge
  `main` back into `testing`, and report it in a few lines (skill `ship`,
  `docs/rules/BRANCHING.md`).
- Re-run a GitHub job once, only if it died before any test ran.
- Fix a fault in its own unfinished work.
- Update the docs, `OPEN.md`, `LIVE.md` and the session log.
- Carry out a small, specific request straight away.

**Must ask first, then wait**
- **SQL that writes**: the whole batch for the piece of work at once, a plain
  line per statement. One yes covers the batch (`docs/rules/DEPLOY.md`).
- **A change to an edge function**: which one and what changes. Merging to
  `main` deploys it, so the yes comes before it reaches `testing`.
- Anything that deletes, drops, renames or removes data, whatever the checks
  say. Ask in plain words.
- Changing anything Anthony designed or built, even to fix a bug.
- A new service, a change to the stack, or anything that costs money.
- A big feature, or one that could be read two ways.

**Never**
- Put a secret in the code or the chat. Secrets go in GitHub secrets or the
  Supabase dashboard. A secret that reached a commit is rotated.
- **Write an access code or an API key in the repo, docs included.** Codes
  are given to Anthony in the chat only. In a doc, write `SX-XXXX-XXXX` and
  the code's label, never the code. (His rule, 2026-11-10. The repo is
  public while GitHub minutes are short.)
- Merge to `main` with a red check, or switch a check off, narrow it, or skip
  a test to get green.
- Force push or rewrite history on `main` or `testing`.
- Deploy an edge function by hand when the pipeline can do it, or over a live
  copy that failed the guard.
- Say "done" before the thing has been used.

## 6. How to work

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
   For anything a person sees: skill `screens` (`docs/rules/UI-CHECKS.md`).
6. **`npm run verify` is green before the word "done".** GitHub runs the same
   command. Never narrow a check to the errors you expected.
7. **Something new turns up mid task?** Write it in `OPEN.md` and carry on.
8. **Anything an agent does more than twice becomes a skill** in
   `.claude/skills/`, so the next agent runs it instead of working it out.
   A skill that fails stops at the failing step; fix the cause, or fix the
   skill in the same change and say so. Never skip a step.

## 7. The three rules that cannot be got wrong

- **Every push to `main` is a publish** to stellaxafe.com, and deploys any
  changed edge function. Work goes through `testing` first, and reaches `main`
  only when every check on `testing` is green. (`docs/rules/BRANCHING.md`)
- **SQL:** read only queries run freely and are reported. Anything that writes
  goes to him as one batch, a short line per statement, and waits for his yes.
  (`docs/rules/DEPLOY.md`)
- **Edge functions:** GitHub deploys them from `main`, guarded: a function
  whose live copy is not the previous repo copy is not deployed, and the run
  goes red. A change to one is asked for before it starts.
  (`docs/rules/DEPLOY.md`)

## 8. Product rules in one breath

The staff side has no settings. Admin setup never shows the plumbing. No
technical words on any screen a client's staff use. The read back and the
sources used always stay visible. **No passwords**: sign in is a code sent to
email. Full text: `docs/rules/PRODUCT.md`.

## 9. Model choice

Only Anthony can switch the model, with `/model`. Before anything substantial,
name the tier in one line: "Sonnet is enough for this" (building to an agreed
spec, forms, wiring a known API, docs, screenshot runs) or "this one is worth
Opus" (architecture, security, auth, money, hard debugging, copy that has to
land). Never switch in the middle of a task.

## 10. Keeping the docs small

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
