/* ==========================================================================
   THE DOCUMENT, READ ONCE, FOR EVERY FORMAT

   WHY THIS EXISTS
   Anthony, 2026-09-23, holding the first PDF that ever came out of the
   flow: "look at the document. the formatting is not very clean and I
   believe slides/pptx and even word and Excel might not be clean and well
   arranged if PDF is not so clean."

   He was right about all four. Each writer read the Markdown its own way,
   so each got a different set of things wrong: spaces vanished next to bold
   words in the PDF, the title was printed twice in the PDF and in Word, a
   table was drawn on top of the bullets in Slides, and a "> quote" showed
   its arrow. This file is now the ONE reading of the document. The PDF,
   Word, Slides and Spreadsheet writers and the preview in the chat all take
   what this returns, so a fix here is a fix everywhere.

   WHAT IT RETURNS
     title      the document's own "# " heading, or the fallback given
     subtitle   a short line directly under the title, if there is one
     blocks     headings, paragraphs, lists, quotes and tables, in order
     notes      the "What would make this better" section, taken OUT

   WHY THE NOTES ARE TAKEN OUT
   The writing step ends a document with "What would make this better"
   when it had to work round something missing. That section is written TO
   the person who asked, for example "Give me the real address and I'll
   drop it in". On 2026-09-23 it was printed at the bottom of a pricing FAQ
   meant for Amara's customers. So it never goes in the file. The chat shows
   it beside the document instead, where the person reads it.

   WHAT IT MUST NEVER DO
   - Never drop or add a space. The text between two marks is kept exactly
     as written, spaces included. That was the PDF's "Youdon't" and its
     "Essential ," with a space before the comma.
   - Never lose a line break the writer put inside a paragraph. A plan's
     name on one line and what it is for on the next are two lines.

   DESIGN BLOCKS, 2026-09-23
   Anthony: "I don't want it to be doing basic output but top tier
   formatted documents that the staff won't have any need to edit." He sent
   a deck as the standard: section labels, cards side by side, one big
   figure, a takeaway strip. So the writing step can now mark those with a
   few ":::" blocks, and every writer draws them. Each one still reads as
   plain text anywhere that does not understand it. See OUTPUT-QUALITY.md.

     :::label Pricing                     a small label on the heading above
     :::cards  ... :::                    2 to 4 cards, each "### Title | kicker"
     :::steps  ... :::                    the same, numbered in order
     :::stat 20% | what the number is ... :::   one big figure and its story
     :::takeaway The one line that matters.     a strip that sums it up
     :::image team.jpg | Our front desk team    a picture, by its file name

   READ TOP TO BOTTOM
     1. Inline text: bold, italic, links, line breaks
     2. Blocks: the line by line reading
     3. Design blocks
     4. Title, subtitle and notes
   ========================================================================== */

import { isTableLine, isDivider, rawCells } from "../structure.js";

/* --------------------------------------------------------------------------
   SECTION 1: Inline text

   A run is { text, bold, italic } or { br: true } for a line break. The
   text of a run is exactly what was between the marks, with its spaces.
   -------------------------------------------------------------------------- */

/* Dashes. A spaced em dash reads as a pause, and this product writes
   pauses as commas. A dash between two numbers is a range, 9–5, and stays. */
function tidy(text) {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1–$2")
    .replace(/\s+[–—]\s+/g, ", ")
    .replace(/[—]/g, ", ");
}

/* Links keep their words and lose the address, unless the words ARE the
   address. A printed page cannot be clicked, and "(https://...)" after
   every link is noise. Code marks are dropped and the text kept. */
function plainInline(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, words) => words);
}

export function readInline(source) {
  const text = tidy(plainInline(String(source ?? "")));
  const runs = [];

  /* Bold first (** or __), then italic (* or _). An underscore only counts
     as a mark at a word edge, so snake_case_names are left alone. */
  /* The italic star may not be followed by a second star. Without that, in
     "business: **Essential**, **Premier**" the italic rule matched first,
     at the space before "**", and printed "*Essential*" with its stars
     showing. That was in every format on 2026-09-23. */
  const pattern = /\*\*(.+?)\*\*|__(.+?)__|(^|[^\w*])\*(?![\s*])(.+?)\*(?![\w*])|(^|[^\w_])_(?![\s_])(.+?)_(?![\w_])/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    let start = match.index;
    let lead = "";
    if (match[3] !== undefined) lead = match[3];
    if (match[5] !== undefined) lead = match[5];
    start += lead.length;

    if (start > last) runs.push({ text: text.slice(last, start) });

    if (match[1] !== undefined || match[2] !== undefined) {
      runs.push({ text: match[1] ?? match[2], bold: true });
    } else {
      runs.push({ text: match[4] ?? match[6], italic: true });
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });

  return runs.filter((r) => r.text);
}

/* Several lines of one paragraph, joined with real line breaks. */
function linesToRuns(lines) {
  const runs = [];
  lines.forEach((line, i) => {
    if (i > 0) runs.push({ br: true });
    runs.push(...readInline(line));
  });
  return runs;
}

/* The plain words of some runs, for measuring and for spreadsheets. */
export function plainText(runs) {
  return (runs ?? []).map((r) => (r.br ? "\n" : r.text)).join("");
}

/* --------------------------------------------------------------------------
   SECTION 2: Blocks

   Consecutive list lines become ONE list block with items, rather than a
   loose line each. Word numbering, PDF lists and slide bullets all need to
   know where a list starts and ends.
   -------------------------------------------------------------------------- */

export function readBlocks(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "p", runs: linesToRuns(paragraph) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push(list);
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    /* A DESIGN BLOCK. Read whole, by section 3 below, which says how many
       lines it used. */
    const fence = line.match(/^:::\s*([a-z]+)\s*(.*)$/i);
    if (fence) {
      flushAll();
      const used = readDesignBlock(fence[1].toLowerCase(), fence[2], lines, index, blocks);
      index += used - 1;
      continue;
    }
    /* A closing ":::" on its own, left over from a block that was already
       closed or never opened. Nothing to print. */
    if (/^:::\s*$/.test(line)) {
      flushAll();
      continue;
    }

    /* A table: a header row, then a divider row. Both are required. */
    if (isTableLine(line) && isDivider(lines[index + 1])) {
      flushAll();
      const header = rawCells(line).map(readInline);
      const rows = [];
      index += 2;
      while (index < lines.length && isTableLine(lines[index].trim())) {
        const row = rawCells(lines[index].trim());
        while (row.length < header.length) row.push("");
        rows.push(row.slice(0, header.length).map(readInline));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (!line) {
      flushAll();
      continue;
    }

    /* A rule is a pause in the writing, not something to print. */
    if (/^([-*_])\1{2,}$/.test(line)) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push({ type: "h", level: Math.min(heading[1].length, 4), runs: readInline(heading[2]) });
      continue;
    }

    const bullet = line.match(/^[-*+•]\s+(.*)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { type: "list", ordered, start: ordered ? Number(numbered[1]) : 1, items: [] };
      list.items.push({ runs: readInline(ordered ? numbered[2] : bullet[1]) });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushAll();
      const previous = blocks[blocks.length - 1];
      /* Several "> " lines in a row are one quote. */
      if (previous && previous.type === "quote" && lines[index - 1]?.trim().startsWith(">")) {
        previous.runs.push({ br: true }, ...readInline(quote[1]));
      } else {
        blocks.push({ type: "quote", runs: readInline(quote[1]) });
      }
      continue;
    }

    /* A line straight after a list, with no blank line, is still a new
       paragraph, not part of the last bullet. */
    flushList();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}

/* --------------------------------------------------------------------------
   SECTION 3: Design blocks

   Returns how many lines the block used, so the caller can skip them.
   Anything malformed degrades to ordinary text rather than vanishing: a
   card with no title is a paragraph, an unknown block is its own lines.
   -------------------------------------------------------------------------- */

/* "Title | kicker" -> both halves. The kicker is optional. */
function splitTitle(text) {
  const [title, ...rest] = String(text ?? "").split("|");
  return { title: readInline(title.trim()), kicker: rest.join("|").trim() };
}

/* The lines of a block up to its closing ":::". A block that is never
   closed ends at the next heading, so a forgotten fence cannot swallow the
   rest of the document. */
function bodyLines(lines, start) {
  const body = [];
  let i = start + 1;
  for (; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (/^:::\s*$/.test(t)) return { body, used: i - start + 1 };
    if (/^#{1,2}\s/.test(t) || /^:::\s*[a-z]/i.test(t)) break;
    body.push(lines[i]);
  }
  return { body, used: i - start };
}

function readItems(body) {
  const items = [];
  let current = null;
  for (const raw of body) {
    const heading = raw.trim().match(/^#{3,6}\s+(.*)$/);
    if (heading) {
      current = { ...splitTitle(heading[1]), lines: [] };
      items.push(current);
    } else if (current) {
      current.lines.push(raw);
    } else if (raw.trim()) {
      /* Text before the first card: a card with no title. */
      current = { title: [], kicker: "", lines: [raw] };
      items.push(current);
    }
  }
  return items.map((item) => ({ title: item.title, kicker: item.kicker, blocks: readBlocks(item.lines.join("\n")) }));
}

function readDesignBlock(kind, rest, lines, index, blocks) {
  if (kind === "label") {
    const text = rest.trim();
    const previous = blocks[blocks.length - 1];
    if (previous && previous.type === "h" && !previous.label) previous.label = text;
    else if (text) blocks.push({ type: "label", text });
    return 1;
  }

  if (kind === "takeaway") {
    /* One line, or a block of lines up to ":::". */
    if (rest.trim()) {
      blocks.push({ type: "takeaway", runs: readInline(rest.trim()) });
      return 1;
    }
    const { body, used } = bodyLines(lines, index);
    blocks.push({ type: "takeaway", runs: readInline(body.map((l) => l.trim()).filter(Boolean).join(" ")) });
    return used;
  }

  /* A picture, named by the file it came from: something the person
     uploaded in the chat, or an image in the company's knowledge base. The
     writers look the name up in docs/images.js. A name nobody can find
     becomes a clearly marked space saying which picture belongs there. */
  if (kind === "image") {
    const [name, ...caption] = rest.split("|");
    if (name.trim()) blocks.push({ type: "image", name: name.trim(), caption: caption.join("|").trim() });
    return 1;
  }

  if (kind === "cards" || kind === "steps") {
    const { body, used } = bodyLines(lines, index);
    const items = readItems(body).filter((item) => item.title.length || item.blocks.length);
    if (items.length) blocks.push({ type: kind, items });
    return used;
  }

  if (kind === "stat") {
    const { body, used } = bodyLines(lines, index);
    const [value, ...caption] = rest.split("|");
    blocks.push({
      type: "stat",
      value: value.trim(),
      caption: caption.join("|").trim(),
      blocks: readBlocks(body.join("\n")),
    });
    return used;
  }

  /* Not a block we know. Its lines are kept as ordinary text. */
  const { body, used } = bodyLines(lines, index);
  blocks.push(...readBlocks(body.join("\n")));
  return used;
}

/* --------------------------------------------------------------------------
   SECTION 4: Title, subtitle and notes
   -------------------------------------------------------------------------- */

const NOTES_HEADING = /^what would make this better\b/i;

/* The subtitle is a short line under the title that introduces it, like
   "Everything you need to know before you sign up." A long paragraph is
   the opening of the body, not a subtitle, and stays where it is. */
const SUBTITLE_MAX = 160;

export function readDocument(markdown, fallbackTitle = "Document") {
  const all = readBlocks(markdown);

  /* The notes to the person, cut out whole: from their heading to the next
     heading at the same level or above, or the end. */
  const blocks = [];
  const notes = [];
  let inNotes = null;
  for (const block of all) {
    if (block.type === "h" && NOTES_HEADING.test(plainText(block.runs).trim())) {
      inNotes = block.level;
      continue;
    }
    if (inNotes !== null && block.type === "h" && block.level <= inNotes) inNotes = null;
    (inNotes !== null ? notes : blocks).push(block);
  }

  let title = fallbackTitle;
  if (blocks[0]?.type === "h" && blocks[0].level === 1) {
    title = plainText(blocks.shift().runs).trim() || fallbackTitle;
  }

  let subtitle = "";
  if (blocks[0]?.type === "p") {
    const words = plainText(blocks[0].runs).trim();
    if (words.length <= SUBTITLE_MAX && !words.includes("\n")) {
      subtitle = words;
      blocks.shift();
    }
  }

  return { title, subtitle, blocks, notes };
}

/* The notes as plain lines, for showing in the chat. */
export function notesAsText(notes) {
  const out = [];
  for (const block of notes ?? []) {
    if (block.type === "list") block.items.forEach((item) => out.push(plainText(item.runs)));
    else if (block.runs) out.push(plainText(block.runs));
  }
  return out.filter((line) => line.trim());
}

/* Every word a block says, flattened, for measuring and for the plain text
   fallbacks. Knows the design blocks as well as the ordinary ones. */
export function blockText(block) {
  if (!block) return "";
  if (block.runs) return plainText(block.runs);
  if (block.type === "list") return block.items.map((i) => plainText(i.runs)).join("\n");
  if (block.type === "table") return [block.header, ...block.rows].map((r) => r.map(plainText).join(" ")).join("\n");
  if (block.type === "cards" || block.type === "steps") {
    return block.items.map((i) => [plainText(i.title), i.kicker, ...i.blocks.map(blockText)].join("\n")).join("\n");
  }
  if (block.type === "stat") return [block.value, block.caption, ...block.blocks.map(blockText)].join("\n");
  if (block.type === "label") return block.text;
  if (block.type === "image") return block.caption || block.name;
  return "";
}
