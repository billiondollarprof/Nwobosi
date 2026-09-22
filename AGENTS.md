# AGENTS.md

**The working rules for this project are in `CLAUDE.md`. Read that file
first. This one is a signpost, not a second set of rules.**

It exists because `AGENTS.md` is the name most coding agents look for, and
`CLAUDE.md` is the name Claude Code looks for. Rather than keep two copies
that drift apart, there is one real file and this pointer.

## Read these three, in this order, before you touch anything

1. **`CLAUDE.md`** — how to work on this project. How to write, how to talk
   to Anthony, the branching and deploy rules, the database and edge
   function rules, and what the product is for. It is long and all of it
   matters.
2. **`CURRENT.md`** — where the work actually is right now. It opens with
   ANTHONY'S OPEN REQUESTS, which is the first thing to read in it.
3. **`SESSIONS.md`** — the log of past sessions.

## The three that will save you the most time

- **`FLOW.md`** — what the product does, end to end. The canonical spec.
- **`ARCHITECTURE.md`** — how it is put together.
- **`DIRECTION.md`** — where it is going.

## Four rules worth knowing before you read anything else

They are all explained properly in `CLAUDE.md`. They are repeated here only
because getting one of them wrong is expensive.

- **Every push to `main` is a publish.** The site is live and `main` deploys
  straight to it. Work goes through the `testing` branch. Do not merge to
  `main` without being asked.
- **Show SQL before running it.** Say what it is for, show the statement,
  say plainly whether it reads or writes, then wait.
- **The repo is not the deployment.** An edge function file existing in
  `supabase/functions/` means it is written, not that it is live. Pull the
  deployed copy and compare before changing anything.
- **Nothing is finished until it has been used.** Click the control. Change
  the value and refresh. This project has shipped several controls that
  rendered perfectly and wrote nothing to the database, and every one of
  them was found by a person using the screen, never by a test.

## The signposts that exist, and why there are several

It is the tool that decides which filename it opens, not the model. Each one
looks for its own name and ignores the others, so there is one real rules
file and a pointer for every tool that has been used here.

| Tool | Opens |
|---|---|
| OpenAI Codex | `AGENTS.md` (this file) |
| Claude Code | `CLAUDE.md` (the real one) |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

All of them say the same thing: read `CLAUDE.md`.

If your tool looks for a name that is not on that list, such as
`.cursorrules`, add another signpost like this one. **Never copy
`CLAUDE.md` into it.** A copy drifts the moment either file is edited, and
then one of them is lying to whoever reads it. One real file, as many
signposts as you need.
