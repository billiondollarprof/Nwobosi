# UI checks: nothing is finished until it has been used

Open this before calling any screen change done. Moved here unchanged from
`CLAUDE.md` on 2026-11-02.

## UI work

- After building or changing any UI, take a screenshot and check it against the design (sleek, clean, premium feel) before calling it done.
- Click through buttons and interactive elements yourself and confirm they work before calling it done.
- **A screenshot cannot see content clipped off the right edge, so run
  `scripts/overflow-audit.cjs` as well.** `PageShell` uses `overflow-x-clip`,
  which means anything wider than the viewport is cut off rather than
  scrolled, and `scrollWidth` still reports the page as clean. The Insights
  page shipped with its heading and body clipped on every phone under 374px
  and passed every check that was being run. The script measures real
  element edges at four phone widths across every public route. Read the
  header in that file before trusting or changing it.

### Nothing is finished until it has been walked through

This is not the optional half of the job. A change that has not been used
is a change that has not been tested, and every time that step got skipped
something shipped broken: the clipped Insights page, the log out that did
not log out, the six digit box against an eight digit code.

So, every time, no exceptions:

1. **Use the thing you just built, as the person who will use it.** Click
   the button. Toggle the toggle. Cancel the dialog and confirm it did
   nothing. Type the wrong thing and see what happens.
2. **Look at it, do not read the markup.** Screenshot at a phone width and
   a desktop width, in both themes.
3. **Run `scripts/overflow-audit.cjs`** for anything that changes layout.
4. **Judge the UI as somebody who was never told how it works.** If a
   control needs explaining, the control is wrong, not the person. Anthony
   should never have to teach an admin what a switch does.
5. Only then say it is done, and say what you actually checked.

### Every control gets used before the word "done"

Click it. Change the value. **Refresh the page.** This project has shipped
five controls that rendered perfectly and wrote nothing: the level picker,
the outputs box, the support toggle, revoke, and the requests panel. Every
one was found by Anthony, never by a test. A control that writes nothing
cannot fail, so it never reports anything, and it looks exactly like one
that works.
