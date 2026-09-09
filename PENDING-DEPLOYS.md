# Waiting to be deployed

Changes that are written and correct but not live, because deploying them on
their own is not worth the interruption. They go out bundled with the next
change that genuinely needs a deploy.

**Empty this file when you deploy.** A list of pending work that still lists
work already done is worse than no list, because the next person cannot tell
which half is true.

For the rules on how a deployed function is changed, see `CLAUDE.md`, the
section "An edge function that already works is never rewritten from the
repo". Nothing here goes out any other way.

---

## support-ask, one line about dashes

**Raised 2026-09-09.** Anthony, reading a real reply on his phone:

> "the way the model types, it doesn't really write clean"

The writing rules deployed the same day fixed the length and the paragraphs.
One thing did not hold. The reply still read:

> "completely free right now – no card needed"

The instruction said *no dashes standing in for a pause*. The model took that
as no em dashes and used an en dash instead. That is a wording failure in the
instruction, not a failure to follow it: describing a character class and
hoping the model shares your definition of it is not an instruction, it is a
guess.

**The line to add**, at the end of the HOW TO WRITE block in `buildSystem`,
right after the punctuation line:

```js
  lines.push(
    "Never put a dash between words, of any kind. Not - and not – and not —. " +
      "Use a full stop, a comma, or start a new sentence instead.",
  );
```

Naming the three characters rather than describing them, because that is the
part that failed.

**Nothing else in that file changes.** This is a REDEPLOY and it follows the
paste rule: Anthony pastes the deployed source, the line is added to that, and
the whole function comes back in one block.

---

## Nothing else pending
