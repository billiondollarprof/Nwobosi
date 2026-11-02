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
- Hosting: Cloudflare Pages, project `stellaxafe01`.

## 2. Edge functions

Supabase project `cbunsqzkhidwjtxdsmxd`. Read from the live project on
2026-11-02 (times in UTC).

| Function | Version | Last deployed |
|---|---|---|
| `assistant` | 53 | 2026-09-26 17:57 |
| `support-ask` | 27 | 2026-09-25 12:10 |
| `add-link` | 22 | 2026-09-25 12:10 |
| `read-before-publish` | 16 | 2026-09-25 12:10 |
| `describe-source` | 13 | 2026-09-25 12:10 |
| `canva-design` | 14 | 2026-09-25 12:10 |
| `read-image` | 13 | 2026-09-25 12:10 |
| `group-images` | 14 | 2026-09-25 12:11 |
| `invite-staff` | 23 | 2026-09-23 17:31 |
| `oauth-callback` | 16 | 2026-09-23 17:31 |
| `support-reply` | 12 | 2026-09-23 17:31 |
| `revoke-staff` | 9 | 2026-09-23 17:31 |
| `convert-document` | 3 | 2026-09-23 17:31 |
| `drive-connect` | 3 | 2026-09-23 17:31 |
| `drive-upload` | 3 | 2026-09-23 17:31 |
| `check-access-code` | 23 | 2026-09-16 14:12 |
| `create-workspace` | 21 | 2026-09-16 14:12 |
| `send-contact` | 14 | 2026-09-16 14:12 |
| `resume-demo` | 14 | 2026-09-16 14:12 |
| `accept-invite` | 14 | 2026-09-16 14:12 |
| `canva-connect` | 15 | 2026-09-16 14:12 |

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
