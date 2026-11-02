# Branching, CI and going live

Open this before any merge or push.

What this is: how work travels from a feature branch to stellaxafe.com, and
what GitHub checks on the way. Rewritten 2026-11-02 when GitHub Actions was
added, on the model of the Rhema repo. The earlier text is in
`docs/history/CLAUDE-to-2026-11-02.md`.

---

## 1. The places

- **Feature branch:** where the work is built.
- **`testing`:** Cloudflare Pages builds it to
  **https://testing.stellaxafe01.pages.dev** (project `stellaxafe01`, so any
  branch gets `https://<branch>.stellaxafe01.pages.dev`). Nobody outside sees
  it, so pushing `testing` needs no asking.
- **`main`:** Cloudflare builds it to **stellaxafe.com**. Every push to
  `main` is a publish.
- **One Supabase project** serves testing and live (Anthony, 2026-11-02). So
  edge functions deploy only from `main`, and database changes follow
  `docs/rules/DEPLOY.md`, never a branch.

## 2. What GitHub checks (`.github/workflows/`)

| Workflow | When | What it proves |
|---|---|---|
| `ci.yml` | every push to testing and main, every pull request | `npm run verify` is green: lint, function type checks, tests, the flow walks in a real browser, the build |
| `smoke.yml` | every push to testing and main | the site is really serving THIS commit (`/version.txt`), and its pages answer. On main it checks `stellaxafe01.pages.dev`, the production build behind stellaxafe.com, because the domain's bot protection blocks GitHub |
| `functions.yml` | a push to main that touches a function | each changed function passes the guard (live is the previous repo copy), deploys, and is checked after |

`functions.yml` can also be run by hand in compare mode: it compares every
live function with the repo and changes nothing.

## 3. Going live

Anthony's rule, 2026-11-02: **once everything on testing is green, merge
`testing` into `main` without asking again.** Skill `ship` does these steps.

1. Work on the feature branch. Run `npm run verify`, use the change by hand.
2. Merge it into `testing` and push.
3. Wait for every check on that commit: `scripts/wait-runs.sh testing <sha>`.
   Green means CI and the smoke test.
4. **Red anywhere: stop.** Read the failed log, fix the cause, go back to 2.
   Never switch a check off, narrow it, or skip a test to get green.
5. **All green: merge `testing` into `main` and push.** No second yes.
6. **Merge `main` back into `testing` straight away**, so `testing` is never
   behind `main`.
7. Wait for the checks on `main`: `scripts/wait-runs.sh main <sha>`. That is
   CI, the smoke test against stellaxafe.com, and the edge functions if one
   changed.
8. Report in a few lines: what went live, what the checks said, which
   functions deployed. Update `docs/state/LIVE.md`.

**What still needs his yes BEFORE step 2**, because merging deploys it:
- **SQL that writes** (`docs/rules/DEPLOY.md`, as one batch).
- **A change to an edge function:** which function and what changes, in plain
  words. His yes covers the deploy that the merge triggers.
- **A false claim, or anything that changes what a public page promises.**

## 4. When something goes wrong after live

- **The site:** roll back in Cloudflare (it keeps the old builds), say so, then
  fix through `testing`.
- **A function that failed its guard** was not deployed. The live copy wins
  until a person looks. Say which function and what differed.
- **Hotfix straight to `main`** only when the live site is broken.

## 5. Previews stay out of search

Every branch that is not `main` is built noindex: `scripts/preview-guard.mjs`
writes a `robots.txt` and an `X-Robots-Tag` header on preview builds.
Production writes neither. Preview addresses are still public to anyone with
the link; put a preview behind Cloudflare Access if that matters.
