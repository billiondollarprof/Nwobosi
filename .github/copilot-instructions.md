# Copilot instructions

**The working rules for this project are in `CLAUDE.md`. Read that file first.**

This is a signpost, not a second set of rules. It exists because each coding
tool looks for a different filename, and keeping several copies of the rules
is how they start disagreeing with each other. There is one real file and
several pointers to it.

Read in this order:

1. `CLAUDE.md` — how to work on this project.
2. `CURRENT.md` — where the work is right now. It opens with ANTHONY'S OPEN
   REQUESTS, which is the first thing to read in it.
3. `SESSIONS.md` — the log of past sessions.
4. `AGENTS.md` — the same signpost as this one, with a little more detail.

Four rules that are expensive to get wrong, all explained properly in
`CLAUDE.md`:

- Every push to `main` is a publish. Work goes through `testing`.
- Show SQL before running it, and say whether it reads or writes.
- The repo is not the deployment. Pull the live copy of an edge function
  and compare before changing it.
- Nothing is finished until somebody has used it. Click the control, change
  the value, refresh the page.

Do not copy `CLAUDE.md` into this file. If your tool needs another name, add
another signpost like this one.
