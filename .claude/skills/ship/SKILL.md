---
name: ship
description: Take finished, checked work from the feature branch to testing, wait for every check, then go live by merging testing into main once everything is green, and report. Use when a change is ready, or when Anthony says "push it", "send it to testing" or "go live".
---

# ship

Anthony's rule (2026-11-02): once everything on testing is green, it goes
live without asking again. This skill is that rule as steps. The rule itself
is in `docs/rules/BRANCHING.md`.

## Before you start

- `npm run verify` is green on your machine.
- The change has been used by hand (`docs/rules/UI-CHECKS.md`), and for a
  screen, the `screens` skill has run.
- **Any SQL that writes** in this change has Anthony's yes on the batch, and
  has been applied (`new-migration`). If not, stop and ask first.
- **Any edge function change** has been described to Anthony in plain words
  (which function, what changes) and he said yes. Merging to main deploys it.

## Steps

1. **Commit, push the feature branch, then testing.**
   ```
   git push -u origin <feature-branch>
   git fetch origin testing
   git checkout testing && git merge --no-ff <feature-branch> && git push origin testing
   ```
2. **Wait for every check on that commit.**
   ```
   GH_REPO=billiondollarprof/Nwobosi scripts/wait-runs.sh testing $(git rev-parse HEAD)
   ```
   It must print ALL GREEN: CI and the smoke test.
3. **Red anywhere: stop.** Read the failed job's log
   (`gh run view -R billiondollarprof/Nwobosi --job <id> --log-failed`), find
   the cause, fix it, go back to step 1. Never switch a check off or skip a
   test. If the cause is outside this change, tell Anthony.
4. **All green: go live.**
   ```
   git fetch origin main testing
   git checkout -B main-merge origin/main
   git merge --no-ff origin/testing -m "Merge testing into main: <what>"
   git push origin main-merge:main
   git push origin main-merge:testing
   ```
   The push to testing is the "merge main back into testing" rule.
5. **Wait for the live checks.**
   ```
   GH_REPO=billiondollarprof/Nwobosi scripts/wait-runs.sh main $(git rev-parse main-merge)
   ```
   CI, the smoke test (against `stellaxafe01.pages.dev`), and Edge functions
   when a function changed: guard, deploy, check after.
6. **A bad deploy:** roll the site back in Cloudflare (it keeps old builds),
   say so, then fix through testing. A function that failed its guard was NOT
   deployed; tell Anthony which, and what differed.
7. **Report to Anthony in a few lines:** what went live, CI, the smoke test,
   which functions deployed.
8. **Bookkeeping:** update `docs/state/LIVE.md` for any function deployed,
   take the item off `docs/state/OPEN.md`, add one dated line at the end of
   `docs/history/SESSIONS.md`.

## If the skill itself goes wrong

It stops at the step that failed and says which. If `scripts/wait-runs.sh`
is the fault, fix the script in the same change and say so. Never skip a
step to finish.
