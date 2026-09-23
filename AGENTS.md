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

## Five rules worth knowing before you read anything else

They are all explained properly in `CLAUDE.md`. They are repeated here only
because getting one of them wrong is expensive.

- **Never change what Anthony designed without asking first.** Finding the
  cause of something is the job. Changing what you found is his decision, not
  yours. If what you found is not a bug, say what you think in one line and
  leave it exactly as it is. Tell him first, in plain words, then wait for his
  answer.
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

## Reading the live logs, and the token for it

Anthony, 2026-09-23: "keep the token and ensure they're saved in the agent.md
so other agent can use it too."

**The token.** Scoped to **Logs (Read)** on this one project and nothing else.
It cannot read or write the database, functions, secrets or anything else, so
a leak of it is bounded, and it is a private repository.

```
SUPABASE_LOGS_ACCESS_TOKEN=sbp_fc839458df506c3998984bdb59e83b3e63ecc15a
```

**The endpoint is the NEW one.** The old `analytics/endpoints/logs.all` still
answers, but it returns an empty result now. Use this:

```
GET https://api.supabase.com/v1/projects/cbunsqzkhidwjtxdsmxd/analytics/endpoints/logs
  ?sql=<URL-encoded ClickHouse SQL>
  &iso_timestamp_start=<ISO time>
  &iso_timestamp_end=<ISO time>
Authorization: Bearer <token>
```

Three things learned the hard way, so nobody repeats them:

1. **The time range is required.** Without it the answer is
   `{"error":"Backend error! Retry your query."}`, which says nothing useful.
   With it, a wrong table name gives a clear `Table "x" does not exist.`
2. **The table is `logs` and the column is `event_message`.** It is the new
   unified table, so `edge_logs`, `function_logs` and the rest are gone.
3. **It throttles hard.** Several queries in a row give
   `ThrottlerException: Too Many Requests`. One query at a time, sleep a few
   seconds between, and wait a minute out if it starts refusing.

The lines worth looking for:

- `usage stage=<name> tier=... fresh=... cacheWrite=... cacheRead=... out=... cents=...`
  one per finished turn, with what it cost.
- `stage=<name> spent its whole ceiling thinking and wrote nothing, asking
  again without thinking` when a turn starved. If the `out` on that turn's
  usage line is exactly **twice** the stage's ceiling, both goes starved and
  the person got nothing.
- `anthropic call failed` when the model refused, with the real reason.
- `research asked for without the person's yes; refused` when the search gate
  stopped something.

**A note from the agent that wrote this down.** A credential in a file that
git tracks lives in the history for ever, and revoking it later does not take
it out. If this repository is ever shared, made public, or handed to somebody
new, this token has to be treated as burnt and replaced. If Anthony would
rather it sat somewhere git does not reach, that is a one line change and he
only has to say.

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
| DeepSeek (DSH) | `CLAUDE.md` and `AGENTS.md`, both read directly |

All of them say the same thing: read `CLAUDE.md`.

If your tool looks for a name that is not on that list, such as
`.cursorrules`, add another signpost like this one. **Never copy
`CLAUDE.md` into it.** A copy drifts the moment either file is edited, and
then one of them is lying to whoever reads it. One real file, as many
signposts as you need.
