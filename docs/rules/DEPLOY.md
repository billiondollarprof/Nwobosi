# Deploy: SQL and edge functions

Open this before running any SQL or touching any edge function.

What this is: the one procedure for changing the live database and the live
functions. It replaces four separate rules that used to sit in `CLAUDE.md`
and contradicted each other (paste the live code first, read it yourself,
always ask, standing permission). The old text, with the incidents behind
each rule, is in `docs/history/CLAUDE-to-2026-11-02.md`.

Why it is strict: the database holds real customer conversations and the
functions are live. Both keep working right up until somebody changes them
from memory.

Project: Supabase `cbunsqzkhidwjtxdsmxd`. What is live right now, and at
which version, is in `docs/state/LIVE.md`.

---

## 1. SQL

Decided by Anthony, 2026-11-02.

**Read only SQL runs without asking.** A SELECT changes nothing. Run it, then
say in the reply what it read and why, in one line.

**Anything that writes waits for his yes, and goes to him as one batch.**
INSERT, UPDATE, DELETE, ALTER, CREATE, DROP. For a piece of work, collect
every write it needs and send them together:

1. One short line per statement: what it does, in plain words.
2. The statements themselves, in one block.
3. Say plainly which ones only add (a new table, a new column) and which
   change or remove something that exists.
4. Wait. He reads it and approves the batch, or he does not.

**Before a write runs, dry run it:**

```
node scripts/db-dryrun.mjs <file.sql> --expect "<object>" --additive-only
```

It runs the statement inside a transaction, prints exactly what changed in the
database's shape, then rolls back, so nothing persists. Proved on 2026-09-25.
A dry run proves a statement is valid and does only what was intended. It
does not prove the app behaves, so use the feature by hand afterwards.

Anything destructive (a drop, a delete of rows, a column removed) is named as
destructive in plain words in the batch, whatever the dry run says.

## 2. Edge functions

### 2.1 The repo is not the deployment

A file in `supabase/functions/` means it is written, not that it is live.
Something has also redeployed functions without anybody asking, cause never
found (2026-09-08). So never assume. Always compare.

### 2.2 GitHub deploys, and the yes comes first

Since 2026-11-02, GitHub deploys edge functions from `main`
(`.github/workflows/functions.yml`, `scripts/deploy-functions.mjs`). Each
changed function is guarded (the live copy must be the previous repo copy, or
it is not deployed and the run goes red), deployed with `verify_jwt` off, and
checked after. Supabase's own GitHub deploy is switched off, so this is the
only automatic path.

**A change to an edge function is asked for before it starts**: which
function, what changes, in plain words. Merging to `main` deploys it, so that
yes covers the deploy. The steps below are for checking by hand, and for the
rare deploy the pipeline cannot do.

### 2.3 The order

1. **Pull the live copy and compare it with the repo, before editing.**

   ```
   node scripts/check-deploy.mjs <slug> [--from <gitref>] [--no-loss <oldfile>]
   ```

   The live body is a transpiled bundle, so a byte comparison is impossible.
   The check takes every long text literal from the repo file and confirms
   each one is in the live body. Say the count: "655 of 655". The live source
   can also be read with the Supabase tool `get_edge_function`.
2. **If they differ and the difference is not yours, the live copy wins.**
   Work from it, and say so. Do not overwrite somebody's console fix.
3. **Edit by exact text replacement only.** Never rewrite the file, never tidy
   on the way past.
4. **Look at the file, not at the script's output.** `grep` for what you
   added. A script that printed "ok" and a file that contains the change are
   two different facts.
5. **Run `node scripts/check-functions.mjs`.** It type checks every function.
   Never narrow a check to a class of error guessed in advance.
6. **Count the deletions in the diff.** Adding to a working function should
   delete nothing. List any removed line in the reply.
7. **Ask, then deploy.**
8. **Pull it back and check it landed**: the new lines are there, and what you
   did not touch is still there.
9. **Update `docs/state/LIVE.md`** with the new version and what was checked.
10. **Say exactly what was checked and what was not.** "All 655 markers and the
    new lines are in the live copy" is honest. "Byte for byte the same" is not.

### 2.4 When to hand it back instead

Stop and give it to Anthony when the live copy differs and the difference is
not yours, when the change is a rewrite rather than an addition, or when the
check you can run is weak. The fallback always works: he pastes the live
source, you add only the new lines, and you hand back the whole function in
one copyable block for him to deploy. Say whether it is NEW or a REDEPLOY.

## 3. Things that have bitten before

- **Slug and display name stay identical.** Renaming the label does not rename
  the slug, and deploying by the label creates a second function. That is how
  `assistant-` happened. Slugs are listed in `src/shared/config.js` under
  `FUNCTIONS`.
- **`verify_jwt` is off on every function, on purpose.** This project uses the
  new key system, which the legacy check can reject. Every function checks the
  caller itself with `auth.getUser()`.
- **Bookkeeping never fails a reply.** Anything that runs after the real work
  (a log write, a usage row) gets its own `try`. On 2026-09-09 a log write
  threw after the answer was ready, and customers got silence.
- **Secrets are set by hand** in the Supabase dashboard, never in the repo.
