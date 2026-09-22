# Brought over from the old StellaXafe repo, 2026-09-22

These six files were the only thing in the `billiondollarprof/stellaxafe`
repository that did not already exist somewhere in this one. They were
copied here so that repository could be deleted without losing them.

## Why they were the only thing worth keeping

That repo held the public site before it moved into this React app. Its own
`DECISIONS.md` records the move, on 2026-09-02:

> The two repos were always the same product living apart: this one held
> the public site, `Nwobosi` held the product, its backend, and the
> `stellaxafe` domain. `Nwobosi` is now the single repo with everything,
> and the pages here were ported into its React app.

So the code there was genuinely dead. Every page exists as a React route in
`src/pages/`: Services, Contact, Founder, Insights and Form Builder, with
the landing content merged into the landing page already here. The images
were copied into `public/` at the same time. The Python build script, the
`partials/`, the `content/` and the `dist/` output were all superseded.

The writing was not superseded, and that is what is in this folder.

## What each one is, and whether it still applies

- **`DECISIONS.md`** — 345 lines. The living record of what was decided
  about the public site, including reasons that never made it into code.
  HISTORICAL. This repo's own record is `CURRENT.md`, and that is the one
  to read and to keep current. Do not start updating this one again.

- **`DESIGN-GUIDELINES.md`** — 77 lines. Copy, typography and theming rules
  for the site. STILL USEFUL as reference. Where it disagrees with
  `CLAUDE.md` or `src/shared/tokens.js` in this repo, those win, because
  they are the ones the live site actually reads.

- **`plans/01-positioning-and-brand.md`** — how the product was positioned
  and why the brand looks the way it does.
- **`plans/02-architecture.md`** — the architecture as it was planned before
  any of it was built. Worth reading against `ARCHITECTURE.md` here to see
  what changed and what held.
- **`plans/03-build-schedule.md`** — the original order of work.
- **`plans/04-logo-and-hero.md`** — the thinking behind the mark. See also
  `MARK.md` in this repo, which is the live version.

All four plans are HISTORICAL. They are kept because the reasoning in them
is hard to reconstruct and cheap to store, not because anybody should be
working from them.
