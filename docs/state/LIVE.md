# Live: what is actually deployed

What this is: the one place that says what is running for real. Update it
every time something is deployed, in the same turn. A wrong line here is worse
than no line, because the next session trusts it.

How to change anything listed here: `docs/rules/DEPLOY.md`.
The old deploy log, up to 2026-11-02: `docs/history/DEPLOYS-to-2026-11-02.md`.

---

## 1. The site

- **stellaxafe.com** is whatever is on `main`. Every push to `main` publishes.
- **testing.stellaxafe01.pages.dev** is whatever is on `testing`. Built
  noindex.
- Hosting: Cloudflare Pages. The project is named `stellaxafe` in the
  dashboard and its addresses are `*.stellaxafe01.pages.dev`; the production
  build is `stellaxafe01.pages.dev`, which stellaxafe.com serves.
- stellaxafe.com has Cloudflare bot protection: automated visitors (GitHub's
  checks, scripts) get a "Just a moment..." page, HTTP 403. People are not
  affected.

## 2. Edge functions

Supabase project `cbunsqzkhidwjtxdsmxd`. Read from the live project on
2026-11-11 (times in UTC), after main `861c564` (designed slides, the look a
person asks for or copies from their PowerPoint) deployed `assistant` v70.

| Function | Version | Last deployed |
|---|---|---|
| `assistant` | 70 | 2026-11-11 16:33 |
| `support-ask` | 33 | 2026-11-11 04:39 |
| `add-link` | 26 | 2026-11-11 04:38 |
| `read-before-publish` | 20 | 2026-11-11 04:39 |
| `describe-source` | 17 | 2026-11-11 04:38 |
| `canva-design` | 18 | 2026-11-11 04:38 |
| `read-image` | 17 | 2026-11-11 04:39 |
| `group-images` | 18 | 2026-11-11 04:39 |
| `invite-staff` | 25 | 2026-09-23 17:31 |
| `oauth-callback` | 18 | 2026-09-23 17:31 |
| `support-reply` | 14 | 2026-09-23 17:31 |
| `revoke-staff` | 11 | 2026-09-23 17:31 |
| `convert-document` | 5 | 2026-09-23 17:31 |
| `drive-connect` | 5 | 2026-09-23 17:31 |
| `drive-upload` | 5 | 2026-09-23 17:31 |
| `check-access-code` | 25 | 2026-09-16 14:12 |
| `create-workspace` | 23 | 2026-09-16 14:12 |
| `send-contact` | 16 | 2026-09-16 14:12 |
| `resume-demo` | 16 | 2026-09-16 14:12 |
| `accept-invite` | 16 | 2026-09-16 14:12 |
| `canva-connect` | 17 | 2026-09-16 14:12 |

**Compared 2026-11-02: every live function carries the repo copy**, all 21,
including `assistant` v53 (648 of 648 markers). Run by GitHub
(`functions.yml`, compare mode). From now on GitHub deploys the functions from
`main` (`docs/rules/BRANCHING.md`), so this table is updated after each deploy.

## 3. Outside services

- **Email:** Resend, sending from `noreply@mail.stellaxafe.com`
  (`RESEND_API_KEY` set 2026-09-06).
- **Web search:** our own, in `supabase/functions/_shared/search.ts`. Tries
  Tavily (free plan, or keyless) then DuckDuckGo (no key). Brave is used only
  if `BRAVE_API_KEY` is set.
- **Document converter** (`converter/`, for Cloud Run): NOT deployed. Anthony's
  step, in `converter/README.md`. Until then conversion uses the in browser way.
  Needs `CONVERTER_URL` and `CONVERTER_SECRET` on the functions.
