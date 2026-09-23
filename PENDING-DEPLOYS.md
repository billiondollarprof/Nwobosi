# Waiting to be deployed

Changes that are written and correct but not live. They go out bundled with
the next change that genuinely needs a deploy.

**Empty this file when you deploy.** A list of pending work that still lists
work already done is worse than no list, because the next person cannot tell
which half is true.

For the rules on how a deployed function is changed, see `CLAUDE.md`, the
section "An edge function that already works is never rewritten from the
repo". Nothing here goes out any other way.

---

## Conversion (2026-09-23)

- `convert-document`: NEW. Straight from the repo. Verify JWT off.
- The converter service on Google Cloud Run: NEW. Steps in
  `converter/README.md`.
- Secrets it reads: CONVERTER_URL, CONVERTER_SECRET.
- Until both are live, conversion still works in the browser; the card
  says the look is not the original's.

## Google Drive (2026-09-23)

- `drive-connect`: NEW. Straight from the repo.
- `drive-upload`: NEW. Straight from the repo.
- `oauth-callback`: REDEPLOY. Live v8 matched the repo before the change
  (checked by pulling it). The change adds the "google-drive" entry to
  PROVIDERS (8 lines) and changes one line so the return marker names the
  service; for Canva it is still "canva".
- Secrets it reads: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
- In Google Cloud, the OAuth client needs this exact Authorised redirect
  URI: https://cbunsqzkhidwjtxdsmxd.supabase.co/functions/v1/oauth-callback
  and the Google Drive API enabled.

## assistant, v27, a REDEPLOY (2026-09-23)

Live v26 matches the repo as it was before this change (checked by pulling
the deployed source). v27 adds prompt lines only, and deletes nothing:

- brief: "THE DESIGN PLAN for that file", slide by slide for decks, and
  where cards, a stat, a table and takeaways go in documents
- generate: "DESIGN IT, DO NOT JUST TYPE IT", the ::: layout blocks the
  file writers draw (label, cards, steps, stat, takeaway) and their rules
- THE SEARCH GATE: the research stage is refused (403) unless the
  person's last message is exactly "Yes, go and look.", so the web is
  never reached without their yes, whatever the browser sends.
  search-gate.test.mjs keeps the chat's words and the server's the same.
- PICTURES: the interview asks once where a picture would help (their own
  photos, a written prompt for an image generator, or stock photos with
  the search yes), the read back says which picture goes where, and the
  writer places them with `:::image name | caption`.

Checked again 2026-09-23 after the pictures lines: live is still v26 with
the same ezbr_sha256, and the diff against the repo before this change
deletes nothing.

## Before that: nothing pending

The money fix and both ceilings went out on 2026-09-10 and are confirmed
working against live traffic:

```
support usage fresh=1157 cacheWrite=22739 cacheRead=0 out=163 cents=3.039575
```

`cents=3.039575` rather than a whole number, and `cacheWrite=22739` against
the old `11009`, which is the raised ceiling reading all 82,178 characters
Amara has published instead of stopping at 40,000.

Amara's budget went from 76.000000 to 72.960425. Exact.

`support-ask` version 11. `assistant` version 7.
