# StellaXafe — Design & Copy Guidelines

Reference this before editing any page. The same rules are repeated as a
comment at the top of `partials/head.html`, where the editing actually
happens. They used to be embedded in every generated page as well, back
when pages were hand edited. They are now stripped from the built output
so internal authoring notes are not sitting in public view source on
every URL.

## Copy Rules
- No em dashes and no hyphens anywhere in body copy. Use commas, periods,
  colons, or restructure the sentence. Hyphens only where truly
  unavoidable (rare compound terms with no clean alternative).
- Short, direct sentences over long compound ones.
- Company name in copyright and legal contexts: **StellaXafe Technologies
  Limited**. Copyright year is **2025** until told otherwise.
- The AI governance research concept is publicly framed as a **dynamic,
  evolving AI governance framework**. "AI Police" is an internal nickname
  that can be mentioned as an aside, not the primary public label.

## Typography
- Headings: **Clash Display** (via Fontshare)
- Body: **General Sans** (via Fontshare)
- Data or code style labels, log lines, technical tags: **JetBrains Mono**
- Amara wordmark recreation only: **Fraunces**
- Do not substitute system fonts or swap these without a reason.

## Brand Mark
- The "X" in StellaXafe is never a plain letter. Use the `x_glyph()`
  helper in `build.py`, a custom crossing blade SVG matching the brand
  mark, wherever the wordmark appears at meaningful size (nav, footer,
  headings).
- Product marks (Amara, XALOM) render as real typography or the provided
  transparent brand assets, never as a flattened screenshot treated like
  a photo.
- XALOM has two logo assets, one tuned for light backgrounds and one for
  dark. Use the `.xalom-logo-light` / `.xalom-logo-dark` class pair so the
  correct one shows automatically per theme.

## Icons
- Every icon is inline SVG. No emoji as functional icons, no icon fonts,
  no raster icon images.

## Theming
- Every surface must work in both dark and light mode via the
  `data-theme="light"` attribute on `<html>`. Never hardcode `#fff` or
  `#000` for text or backgrounds; use the CSS custom properties in
  `:root` / `html[data-theme="light"]`.
- Theme choice persists via `localStorage` and applies before first
  paint. The inline script that does this sits in `partials/head.html`
  and must stay inline and stay ahead of the stylesheet, otherwise the
  wrong theme flashes on load.

## Motion
- Card grids: wrap the grid in `.flip-grid` and give each card
  `.flip-in` for the on scroll 3D reveal.
- Simple text blocks that should not tilt: `.fade-up`.
- Log style readouts: `.log-line`, staggers automatically via JS.

## Structure
- The site is built by `build.py` from `partials/` (shared shell),
  `content/` (one file per page), and `pages.py` (the manifest). Never
  edit the generated pages in `dist/`, they are overwritten on every
  build. Only `dist/` is published.
- `index.html` is the landing page. Services, Founder, and Contact are
  full pages styled to read as modals (dimmed backdrop, centered card,
  close button back to home) so each still has a real, shareable URL.
- Demo, Insights, and Form Builder & Automation are full standalone
  pages, not modals.
- The founder page is a standalone presentation of Anthony Nwobosi, not
  a bio card folded into the landing page list of sections.

## Known Limitation
- Static HTML files mean navigating to a modal styled page is a real
  page load, not an instant popup. Moving to a framework with client
  side routing (Next.js or similar) is the correct long term fix if
  instant transitions matter.
