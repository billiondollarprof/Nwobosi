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

## assistant, v26, a REDEPLOY (2026-09-23)

Live v25 matches commit fb52422 exactly (checked by pulling the deployed
source). v26 adds prompt lines only, nothing in the logic:

- base prompt: "THE STEPS ARE A PATH, NOT A SCRIPT"
- analyse: "FIRST, ARE THEY SAYING YES TO A READ BACK YOU ALREADY GAVE?"
  and the BUILD_NOW marker the chat now acts on
- orient: a real answer to a real question, not "a line or two"

The chat works without it (a typed "continue" puts the build button up),
but with it a typed "continue" builds straight away.

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
