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

## assistant: two lines, and only two

**Raised 2026-09-10.** The database half is already live, so until these two
lines are deployed the staff side keeps rounding money up and keeps throwing
away material past 60,000 characters.

The repo copy of `assistant/index.ts` has not been touched since 2026-09-07
and the deployment is from the same day, so they are almost certainly the
same. Almost certainly is not the standard for this project, so these are
given as two find-and-replace edits rather than a whole file. Make them in
the Supabase editor and nothing else can move.

**One.** Find:

```ts
  return Math.ceil(dollars * 100);
```

Replace with:

```ts
  return Math.round(dollars * 100 * 1e6) / 1e6;
```

**Two.** Find:

```ts
const MAX_SOURCE_CHARS = 60000;
```

Replace with:

```ts
const MAX_SOURCE_CHARS = 200000;
```

**What the second one costs.** The staff side runs on Sonnet, which is twice
the price of support's Haiku. At 200,000 characters a staff member's first
message of a session costs about 12 to 13 cents, and each message after that,
while the five minute cache is warm, costs about 1 cent. Worth it for real
work, but watch it rather than assume it.

---

## Nothing else pending
