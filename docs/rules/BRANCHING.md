# Branching: testing, main, and what a push means

Open this before any merge or push. Moved here unchanged from `CLAUDE.md` on
2026-11-02.

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
