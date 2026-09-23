/* ==========================================================================
   FINDING THE SHAPE INSIDE THE MARKDOWN

   The model writes one thing: Markdown. A deck needs slides and a
   spreadsheet needs rows and columns, so something has to work out where
   the slides and the tables are. This is that something.

   WHY THIS IS SEPARATE FROM download.js
   -------------------------------------
   download.js reads Markdown as a flowing document: headings, bullets,
   paragraphs, one after another. That is exactly right for a PDF and for
   Word, and exactly wrong for a deck, where a heading is not a heading, it
   is the start of a new slide.

   Two readings of the same text. Keeping them in one file would mean one
   parser trying to be both, and the day somebody improves it for the deck
   is the day the PDF changes shape for no reason anybody can see.

   WHAT IT NEVER DOES
   ------------------
   It never invents. If the model wrote three sections, there are three
   slides, not "three, plus a title slide and a thank you slide I added".
   A deck with a slide nobody wrote is the same failure as a document with
   a fact nobody gave it.

   READ TOP TO BOTTOM
     1. Slides, for the deck
     2. Tables, for the spreadsheet
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: SLIDES

   A slide starts at a heading. Everything under it, until the next heading
   of the same level or higher, is that slide's body.

   WHICH HEADING LEVEL STARTS A SLIDE is worked out from the document rather
   than fixed, because the model is not consistent about whether a report
   starts at # or at ##. The shallowest heading present wins. A document
   whose headings are all ## gets one slide per ##; a document with a single
   # title and several ## sections gets its slides from the ##, with the #
   becoming the title slide.
   -------------------------------------------------------------------------- */

/* A slide that holds nothing is a slide nobody wants to sit through, and a
   slide holding twelve bullets is unreadable from the back of a room. */
const MAX_BULLETS_PER_SLIDE = 7;

export function toSlides(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");

  /* Every heading, with its level and where it sits. */
  const headings = [];
  lines.forEach((line, index) => {
    const m = line.trim().match(/^(#{1,6})\s+(.+)$/);
    if (m) headings.push({ level: m[1].length, text: clean(m[2]), index });
  });

  if (!headings.length) {
    /* No headings at all. One slide, and the title comes from the caller,
       because guessing a title from the first sentence produces a slide
       headed with half a sentence. */
    const body = bulletsFrom(lines);
    return body.length ? [{ title: "", bullets: body, lead: true }] : [];
  }

  const shallowest = Math.min(...headings.map((h) => h.level));

  /* A lone shallowest heading at the very top is a document title, not a
     section. It becomes the opening slide and the rest come from the level
     below it. */
  const atShallowest = headings.filter((h) => h.level === shallowest);
  let titleSlide = null;
  let slideLevel = shallowest;

  if (atShallowest.length === 1 && atShallowest[0].index < 3) {
    const deeper = headings.filter((h) => h.level > shallowest);
    if (deeper.length) {
      titleSlide = { title: atShallowest[0].text, bullets: [], lead: true };
      slideLevel = Math.min(...deeper.map((h) => h.level));
    }
  }

  const starts = headings.filter((h) => h.level === slideLevel);
  const slides = [];

  starts.forEach((start, i) => {
    const next = starts[i + 1];
    const body = lines.slice(start.index + 1, next ? next.index : lines.length);
    const bullets = bulletsFrom(body);

    /* THE SLIDE KEEPS ITS TABLE.

       bulletsFrom drops table rows, because a Markdown table rendered as
       bullets is a row of pipes and reads as damage. Dropping it there and
       nowhere else left a section with a table in it as a slide with a
       heading and nothing under it, which is worse than either.

       Only the first table on a section. Two tables on one slide is a slide
       nobody can read from the back of a room, and the second one keeps its
       own place in the spreadsheet either way. */
    const table = toTables(body.join("\n"))[0] ?? null;

    /* Over the ceiling, the slide is split rather than cropped. Cropping
       loses somebody's work silently, which is the worse of the two. */
    if (bullets.length <= MAX_BULLETS_PER_SLIDE) {
      slides.push({ title: start.text, bullets, table });
      return;
    }
    for (let at = 0; at < bullets.length; at += MAX_BULLETS_PER_SLIDE) {
      slides.push({
        title: at === 0 ? start.text : `${start.text} (continued)`,
        bullets: bullets.slice(at, at + MAX_BULLETS_PER_SLIDE),
        /* The table rides with the first part only. Repeating it on every
           continuation slide is noise. */
        table: at === 0 ? table : null,
      });
    }
  });

  return titleSlide ? [titleSlide, ...slides] : slides;
}

/* Turns a run of lines into the lines that go on a slide.

   A bullet stays a bullet. A paragraph becomes one too, because a slide is
   not the place for a wall of prose and splitting it into sentences would
   chop somebody's careful sentence in half. Table rows are dropped: a
   Markdown table on a slide is a row of pipes, which reads as damage. */
function bulletsFrom(lines) {
  const out = [];
  let paragraph = [];

  const flush = () => {
    if (!paragraph.length) return;
    out.push(clean(paragraph.join(" ")));
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) { flush(); continue; }
    if (/^([-*_])\1{2,}$/.test(line)) { flush(); continue; }
    if (/^#{1,6}\s/.test(line)) { flush(); continue; }
    if (isTableLine(line)) { flush(); continue; }

    const bullet = line.match(/^[-*+]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) { flush(); out.push(clean(bullet[1])); continue; }

    paragraph.push(line);
  }

  flush();
  return out.filter(Boolean);
}

/* --------------------------------------------------------------------------
   SECTION 2: TABLES

   A Markdown table is a header row, a row of dashes, then the body. The row
   of dashes is what tells a table apart from three lines that happen to
   contain a pipe, so it is required rather than assumed.

   Every table in the document comes back, in order, each with the nearest
   heading above it as its name. A spreadsheet with tabs called Sheet1 and
   Sheet2 makes somebody open both to find out what they are.
   -------------------------------------------------------------------------- */

export function toTables(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const tables = [];

  let heading = "";
  let at = 0;
  /* A table inside a ":::chart" block is that chart's numbers. It is named
     after the chart's caption, and carries the chart's place in reading
     order, so the spreadsheet can put the chart's picture beside it. The
     count matches documentModel.js, which numbers charts the same way. */
  let charts = 0;
  let chart = null;

  while (at < lines.length) {
    const line = lines[at].trim();

    const h = line.match(/^#{1,6}\s+(.+)$/);
    if (h) { heading = clean(h[1]); chart = null; at += 1; continue; }

    const opensChart = line.match(/^:::\s*chart\b(.*)$/i);
    if (opensChart) {
      chart = { index: charts, caption: clean(opensChart[1].split("|")[1] ?? "") };
      charts += 1;
      at += 1;
      continue;
    }
    if (/^:::\s*$/.test(line)) { chart = null; at += 1; continue; }

    /* A header row, then a divider. Both, or it is not a table. */
    if (isTableLine(line) && at + 1 < lines.length && isDivider(lines[at + 1])) {
      const header = cells(line);
      const rows = [];
      at += 2;

      while (at < lines.length && isTableLine(lines[at].trim())) {
        const row = cells(lines[at].trim());
        /* Ragged rows are padded rather than dropped. A short row is a
           typo in one cell, and throwing the whole row away loses the
           other four. */
        while (row.length < header.length) row.push("");
        rows.push(row.slice(0, header.length));
        at += 1;
      }

      if (rows.length) {
        tables.push(chart
          ? { name: chart.caption || heading, header, rows, chartIndex: chart.index }
          : { name: heading, header, rows });
      }
      chart = null;
      continue;
    }

    at += 1;
  }

  return tables;
}

/* Exported so download.js can find tables while it reads the document as a
   flowing thing, without a second definition of what a table row looks
   like. One definition, used by every reader. */
export function isTableLine(line) {
  return line.includes("|") && line.replace(/[^|]/g, "").length >= 2;
}

export function isDivider(raw) {
  const line = String(raw ?? "").trim();
  return isTableLine(line) && /^[\s|:-]+$/.test(line) && line.includes("-");
}

/* The cells, with their Markdown still on them.

   Two readers want different things. The spreadsheet wants plain text, so
   it uses cells() below. The document writers want the marks intact, so
   splitBold can tell which run was bold, and they use this. Splitting the
   row is the same job either way, so it is written once. */
export function rawCells(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function cells(line) {
  return rawCells(line).map(clean);
}

/* --------------------------------------------------------------------------
   SECTION 3: Tidying one line

   The marks come off. A slide reading "**Revenue** was up" with the stars
   showing is worse than one that lost the bold, and a spreadsheet cell is
   not a place for Markdown at all.
   -------------------------------------------------------------------------- */

function clean(text) {
  return String(text ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/(^|\s)\*(?!\s)([^*]+?)\*(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/[–—]/g, ", ")
    .trim();
}
