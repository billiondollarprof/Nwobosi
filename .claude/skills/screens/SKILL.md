---
name: screens
description: Screenshot a screen at phone and desktop width in both themes, click through its controls, and run the overflow check at 320, 360, 390 and 414. Use after building or changing any screen, before saying it is done (docs/rules/UI-CHECKS.md).
---

# screens

Nothing is done until it has been used and looked at. This skill does the
looking.

## Steps

1. **Public pages (the marketing site, setup, sign in):** build and serve.
   ```
   npm run build
   npm run preview -- --port 4328 --strictPort &
   ```
2. **App screens (chat, admin, support):** serve the harness instead. It
   swaps Supabase for a fake (`scripts/__harness/fake-supabase.js`), so a
   screen can be looked at with no real workspace and no real data.
   ```
   npx vite --config vite.harness.config.js --port 5301 &
   ```
   The flow walks in `scripts/__harness/*.cjs` show how to drive it. Copy
   the nearest one into the scratchpad and adapt it.
3. **Overflow check** for anything that changes layout:
   ```
   BASE=http://localhost:4328 node scripts/overflow-audit.cjs
   ```
   A new public route goes into `routes` in that file first.
4. **Click through.** Every button, type the wrong thing, cancel a dialog and
   check nothing happened, **refresh the page and check it saved.**
5. **Screenshots** at 390 and 1280 wide, light and dark. Look at them with
   the Read tool. Judge them as somebody who was never told how the screen
   works.
6. **Say what you checked:** which controls, which widths, both themes, what
   the overflow check said.

## If the skill itself goes wrong

- The browser will not start in a cloud session: Playwright in the repo may
  want a different Chromium build than the one installed. Point the path it
  asks for at `/opt/pw-browsers/chromium-*/chrome-linux64/chrome` with a
  symlink. That is a local fix, never a repo change.
- A harness screen shows nothing: the fake is missing data the screen waits
  for. Add it to the fake, never a delay.
