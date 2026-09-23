# OUTPUT QUALITY: DESIGNED FILES, THE COMPANY'S VOICE, REUSING GOOD WORK

Spec, 2026-09-23. **Nothing in here is built yet.** Waiting for Anthony's
go ahead, per `CLAUDE.md`, "When the user asks for a new feature".

Anthony, 2026-09-23:

> "the decision/what I'm making isn't written as a typical prompt with
> formatting rules. even a slide must have some slide deck design like wise
> the spreadsheet. I don't want it to be doing basic output but top tier
> formatted documents that the staff won't have any need to edit."

> "the system learns to sound the way the company sounds from their uploads
> either in the knowledge base or directly into the chat as uploaded by the
> staff."

> "in case a completed and downloaded job, next time when someone wants
> something similar it can suggest if it should use the document as a
> reference to speed up build and save cost (perhaps), by reminding the
> staff, since that was noted as a satisfactory job."

He also sent `sample.pptx`, a 15 slide deck, as the standard to meet.

---

## What the sample deck does that ours does not

Read out of the file itself (LibreOffice here will not open it):

- **A banded header on every content slide.** Deep navy band across the
  top, the section name in white, and a gold label under it saying what
  this slide is ("Problem Triggers", "Outcome").
- **Cards.** Two or three tinted rounded boxes side by side, each with a
  navy title, a small teal kicker ("Reminds", "Reinforces", "Sustains")
  and its text.
- **A big number.** "20%" at 58pt on a navy panel, with its caption under
  it and the explanation beside it.
- **A takeaway bar.** One line across the bottom that says what the slide
  means: "As a rule of thumb: the checklist reminds, the Verify and Mark
  reinforces..."
- **A cover with a picture panel**, title and presenter.
- Two fonts only (Calibri body, Cambria headings), four colours only.

Ours today is a title and bullets on every slide. Clean, but basic.

---

## A. A brief that is a real design brief, and files built from it

### A1. The brief gets formatting rules

Today the brief says what the document contains. It will also say how it
looks, per format, so the writing step has a plan to follow:

- **Every format:** who reads it, the one thing they should take away, the
  sections in order, the voice, every fact with its source.
- **Slides:** a slide by slide plan. For each slide: its section, its
  label, and which layout it uses (below), with what goes where.
- **Documents (Word, PDF):** where a key figure is pulled out, where a
  comparison becomes cards or a table, where a callout goes, the closing.
- **Spreadsheets:** which sheets, which columns and their types (money,
  percent, date, text), which rows get totals, and a summary sheet when
  there is more than one table.

### A2. A small set of layouts the writers understand

The writing step marks the design in the Markdown with a few blocks. Each
one still reads as plain text anywhere that does not understand it.

| Block | What it becomes |
| --- | --- |
| `:::cards` with `###` items | 2 or 3 tinted cards side by side, title, kicker, text |
| `:::stat 20% \| caption` | the big number panel, explanation beside it |
| `:::takeaway` | the one line bar at the bottom of a slide, a callout in a document |
| `:::steps` | numbered steps laid out across the slide or page |
| `:::label` | the gold label under a slide's section name |
| tables | as today, with totals rows styled |

### A3. The writers draw them

- **Slides** (`src/shared/docs/deck.js`): the banded header, cards, stat
  panel, takeaway bar and steps, matching the sample's structure. Cover
  gets the company logo (`companies.logo_url`) in the picture panel when
  there is one.
- **PDF and Word:** cards as side by side boxes, stat as a pulled out
  figure, takeaway as a callout, so a report reads designed too.
- **Spreadsheet:** real totals with formulas, money and percent formats,
  a summary sheet, print settings (landscape, fit to width, repeated
  header row).
- **The company's own colour.** `companies.brand_color` already exists. It
  becomes the accent in every format instead of the fixed navy.

### A4. What it needs

- The `assistant` function: the brief and writing prompts. **Redeploy.**
- The four writers and the preview. Site push only.
- No SQL.

---

## B. Writing in the company's voice

### B1. What already exists

The base prompt has a "company's voice" section, built from the admin's
answers at setup. The whole knowledge base is already in every prompt, so
the model can SEE the company's documents. It is just never told to learn
how they are written.

### B2. What changes

1. **A voice note per company, made once.** When a source is uploaded,
   `describe-source` (already runs per source) also writes down how it is
   written: formal or warm, sentence length, British or American spelling,
   how customers are addressed, words they always or never use. Notes are
   merged into one short company voice note.
2. **The prompt uses it.** The brief and writing steps are told to write
   like that note, and the brief names the voice it chose.
3. **Staff uploads in the chat count too, for that piece of work.** A file
   a staff member hands over is studied for its voice as well, and that
   wins for the document being made, without changing the company's note.

### B3. What it needs

- **SQL:** one column, `companies.voice_note text`. Shown to Anthony first.
- `describe-source` and `assistant`. **Redeploys.**

---

## C. Offering a good past piece of work as the reference

### C1. This is STYLE-MEMORY.md, with one change Anthony asked for

`STYLE-MEMORY.md` (2026-09-14) already specs it: a download is the only
honest sign a piece of work was good, the shape is kept per person, and it
is offered, never applied.

Anthony now asks for more than the shape: "use the document as a
reference". So:

1. **Downloaded means kept.** On download the document is linked to the
   person as a reference (their own `work_history` row, which RLS already
   limits to them).
2. **A similar request gets an offer.** "Last time you made *Amara Pricing
   FAQ* (12 Sep) and kept it. Use it as the reference?" Yes or no, before
   the interview. The model judges "similar" from the request and the
   titles of that person's own kept work.
3. **Yes means the old document goes to the brief as a reference for
   structure, layout and voice**, with a hard fence: no fact, number or
   name from it may appear unless this conversation's sources say it.

### C2. The decision only Anthony can make

`STYLE-MEMORY.md` says the content of an old document must NEVER be kept,
because last quarter's numbers would leak into this quarter's work. Using
the whole document as a reference goes against that rule, and the fence in
C1.3 is how it is made safe. He decides:

- **Shape only** (the old rule): safest, a smaller speed up.
- **Whole document, fenced** (his new ask): faster and closer to the
  original, relies on the fence holding.

### C3. What it needs

- **SQL:** possibly a `kept_at` column on `work_history`. Shown first.
- `assistant`. **Redeploy.** The offer card in `Chat.jsx`.

---

## Order

1. **A** first. It is what a demo shows, and it needs no SQL.
2. **C** second, once he picks C2.
3. **B** third.

Each one is built, used by hand, checked by eye in all four formats, and
only then marked done, before the next starts.

---

# ROUND 2, 2026-09-23 (after A was built)

Anthony's answers and new asks are recorded word for word in `CURRENT.md`.
This is the plan for them. **Nothing below is built yet.**

## Decided

- **Reuse is SHAPE ONLY** (C2). No document content is kept for reuse.
- **An admin sees a short summary of staff work, not the work itself.**
  This replaces "admin sees everything" from earlier the same day.
- **Caching stays the main cost saver.** Anything per company goes in the
  cached part of the prompt; anything per person goes in its own cached
  block after it; only the stage instruction changes turn to turn.

## D. Admin sees a summary, not the work (privacy, do first)

Found while planning: `work_history.summary` holds the WHOLE document
(saveWork writes `summary: content`). So today an admin reads everyone's
full work, and `conversations_read` lets an admin read every chat.

1. The full text moves to a new table, `work_content`, readable only by
   the person who made it (RLS own rows only).
2. `work_history.summary` becomes a real short summary, made when the work
   is saved: its title line, what it is for, and its section names.
3. `conversations_read` loses its admin clause, so each chat is its
   owner's alone.
4. Existing rows: their full text is copied into `work_content`, then
   their summary is shortened. Shown as SQL first, it writes.

## 1. Images in the work

1. **Noticing.** While planning slides or a document, the assistant notes
   where a picture would carry the point (a cover, a product, a place, a
   team). It asks during the interview, once, for those spots only.
2. **Three answers offered, the person picks.** Upload their own photos;
   get a written prompt for Midjourney or any image generator, one per
   spot, that they can paste; or stock photo suggestions (search words and
   where to look), which uses the "go and look" permission like any search.
   Images already in the knowledge base are used first and named.
3. **Reading the pictures.** Uploaded images are already sent to the model
   so it can see them. It says which image goes where, in the read back,
   and the person can move them.
4. **Placing them.** A new block, `:::image <file name> | caption`. Slides
   get an image beside text or a full picture slide; PDF and Word place
   the image with its caption where the plan said. The picture itself is
   carried from the chat or the knowledge base into the file.

## 2. Voice, learned over time, per person

1. **Start:** Anthony's plain, conversational method, plus what the
   company's own documents show (formal or warm, spelling, em dashes or
   not, how customers are addressed). That becomes the COMPANY voice note.
2. **First chat:** the assistant asks each person, once, how they like to
   sound, and invites one or two of their past pieces to learn from.
3. **Their voice note** is kept on their own row and refined when they
   correct tone ("less formal", "no em dashes"). If they never answer, the
   company note is used.
4. **Cost:** both notes sit in cached blocks of the prompt, so they are
   read at a tenth of the price after the first turn.

## 3. Shape memory (STYLE-MEMORY.md), shape only

1. On download, the shape is worked out in the browser, no model call:
   how it opens, sections, depth, words per section, bullets against
   prose, tables, cards, figures, how it closes, the format.
2. Stored on the person's `work_history` row, small.
3. At the start of similar work, the assistant sees that person's kept
   shapes and says which one it will follow, in one line, so it does not
   think a style up from nothing. The person can say no.
4. **Later, with Drive connected:** the files it filed there can be read
   back for layout and tone as well. The Drive connection can only see
   files the app made, so that is exactly the kept work.

## 7. The company's own format, the sample deck is only the default

1. **A company style:** an admin uploads their own deck or document as a
   style source. Its colours, fonts and layout habits are read from the
   file (as was done with sample.pptx) and stored for the company. Every
   file then uses that instead of the default look.
2. **A one off style:** a staff member hands over a document in the chat
   and says "like this". That style is used for this piece only.

## Proposed order

D first (privacy, small). Then 1 (images, what a demo shows). Then 7
(company formats), 2 (voice) and 3 (shape memory), which all feed the same
learning phase and share their storage.
