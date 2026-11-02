# Code structure: how a file in this repo is laid out

Open this before creating a new file or reshaping an existing one. Moved here
unchanged from `CLAUDE.md` on 2026-11-02.

## Project structure

This project is not one big file. Each major part of the app is its own page, in its own file:

- Chat interface: its own page.
- Admin interface: its own page.
- Landing page: its own page.
- Auth pages: its own page.

Inside each page, break the code into clearly labeled sections (for example, inside the auth page: login, signup, OTP verification). Each section should be easy to find and read top to bottom.

**Every page and every section has to stand on its own.** This is not a
style preference, it is the rule that decides whether the next person can
work on this at all, and the next person includes a tired Anthony at 2am
and every fresh Claude session that has never seen the file before.

- **A header at the top of every file**, saying what this is, why it
  exists, and what it must never do. If a decision in the file would look
  wrong to somebody who was not in the conversation, the reason goes in the
  header. A file whose header is out of date is worse than one with no
  header, so when the code changes the header changes with it.
- **A labeled section for every distinct job in the file**, numbered where
  order matters, so anybody can scroll and land on the right one without
  reading the parts either side.
- **Written for the slowest engineer in the room, not the fastest.** No
  cleverness that has to be decoded, no abbreviation only the author
  understands, no reliance on knowing what happened three files away. If a
  line needs a paragraph to explain it, either write the paragraph or write
  a simpler line.
- **Read it back cold before calling it done.** Open the file as though you
  have never seen it. Can you tell in ten seconds what it does and where to
  change one thing? If not, it is not finished.

These pages come together to form the app, but the source for each stays separate and clean.

The app is a single page application. The separate page files are for reading and working on the code. They build into one app, so clicking between sections is instant with no page reload. Keep both sides of this true: split for reading, joined for speed.
