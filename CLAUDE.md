# CLAUDE.md

This file tells Claude how to work on this project. The product is StellaXafe, built for the BuildFest competition.

## How to talk to the user

- Use plain, simple, direct English.
- Go straight to the point.
- No em dashes, ever.
- Use a hyphen only when the word actually needs one.
- Keep sentences short and simple. This matters most in UI text (buttons, labels, messages the end user sees). Inside code, comments can use normal technical language.

## Start of every session

- Read `CURRENT.md` first. It has the full state of what was being worked on when the last session ended.
- Read `SESSIONS.md` next. It is the log of past sessions.
- At the end of a session, update both files.

## When the user asks for a new feature

1. Repeat the request back in short, simple language. Wait for the user to confirm you understood it right.
2. Once confirmed, audit anything you need to check first (existing code, existing docs).
3. Write a short spec or plan for how you will build it.
4. Build it.

## UI work

- After building or changing any UI, take a screenshot and check it against the design (sleek, clean, premium feel) before calling it done.
- Click through buttons and interactive elements yourself and confirm they work before calling it done.

## Project structure

This project is not one big file. Each major part of the app is its own page, in its own file:

- Chat interface: its own page.
- Admin interface: its own page.
- Landing page: its own page.
- Auth pages: its own page.

Inside each page, break the code into clearly labeled sections (for example, inside the auth page: login, signup, OTP verification). Each section should be easy to find and read top to bottom.

These pages come together to form the app, but the source for each stays separate and clean.

The app is a single page application. The separate page files are for reading and working on the code. They build into one app, so clicking between sections is instant with no page reload. Keep both sides of this true: split for reading, joined for speed.
