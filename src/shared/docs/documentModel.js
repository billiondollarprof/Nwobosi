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
     :::image team.jpg #team | Caption | Photo: Chidi Okafor
                                          the same, with a tag and a source
     :::chart bar #revenue | Caption | Source: Q3 report
     | Quarter | 2025 |  ...  :::         a chart, drawn by code from a table
                                          (charts/chartData.js)

   SLIDE DIAGRAMS, 2026-11-11 (section 3, where each is read):
     :::flow  - A  - **B**  - C  :::      boxes joined by arrows, B lit
     :::hub Centre | caption  - item ... :::   one box fanning out to a list
     :::phases  ### Name | 3 weeks ... Outcome: ... :::   phase rows
     :::tree Top | caption  ### Child | role ... :::     an org chart
     :::statement The line, **lit** words.          a closing statement
     ### [church] Title                   a card with an icon on the slide

   FIGURES, 2026-09-23 (DOCUMENT-HARNESS.md, sections 2 and 3)
   A picture can carry its source, printed small under the caption. It can
   also carry a tag, and the text can point at it with [[fig:team]]. CODE
   numbers the figures, never the model, so "see Figure 3" always points at
   the right one. Numbers are only shown when a document has two or more
   figures, or when the text points at one; a single picture nobody refers
   to does not need "Figure 1" under it.

   READ TOP TO BOTTOM
     1. Inline text: bold, italic, links, line breaks
     2. Blocks: the line by line reading
     3. Design blocks
     4. Title, subtitle and notes
     5. Figure numbers
   ========================================================================== */

import { isTableLine, isDivider, rawCells } from "../structure.js";
import { chartData } from "./charts/chartData.js";

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

/* ⚠️ SAYING THE SAME THING TWICE, caught in the builder, 2026-11-10.
   The model often writes a small label and a heading that say the same thing
   ("THE PROBLEM" over "The problem"), and the pages read as a stutter. These
   compare two pieces of text the way a reader would: case, punctuation and a
   leading "the", "our" or "your" do not count. It lives here, in the builder,
   so it holds whatever the model writes. */
function plainWords(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/^\s*(the|our|your)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function saysTheSame(a, b) {
  const x = plainWords(a);
  const y = plainWords(b);
  return Boolean(x) && x === y;
}

/* The line at the top or foot of every page: company, then title. When the
   title IS the company name, it is said once ("Volt · Volt" read as a fault). */
export function runningLine(brandName, title) {
  if (!brandName) return title;
  if (saysTheSame(brandName, title)) return brandName;
  return `${brandName}  ·  ${title}`;
}

/* A kicker that is only a number ("01", "2.", "Step 3") repeats the number the
   numbered steps already print, so it is dropped. */
function isOnlyANumber(text) {
  return /^(step\s*)?0*\d+[.):]?$/i.test(String(text ?? "").trim());
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
      /* A label written just above a heading that says the same thing goes. */
      const before = blocks[blocks.length - 1];
      if (before && before.type === "label" && saysTheSame(before.text, heading[2])) blocks.pop();
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

/* "Title | kicker" -> both halves. The kicker is optional. A title may
   start with an icon's name in square brackets, "[church] Our church",
   which the slides draw and the other formats leave out (slides/slideIcons.js
   has the list). */
function splitTitle(text) {
  let raw = String(text ?? "");
  let icon = "";
  const named = raw.trim().match(/^\[([a-z0-9-]+)\]\s*(.*)$/i);
  if (named) {
    icon = named[1].toLowerCase();
    raw = named[2];
  }
  const [title, ...rest] = raw.split("|");
  const kicker = rest.join("|").trim();
  return { title: readInline(title.trim()), kicker: isOnlyANumber(kicker) ? "" : kicker, icon };
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
  return items.map((item) => ({ title: item.title, kicker: item.kicker, icon: item.icon ?? "", blocks: readBlocks(item.lines.join("\n")) }));
}

/* The first line of a figure: "lobby.jpg #lobby | caption | source".
   The name may have spaces in it ("team photo.jpg"), so the tag is only a
   "#word" at the END of the first part. With no tag, the file name without
   its extension is the tag, so [[fig:lobby]] works for lobby.jpg either way.
   Everything after the second "|" is the source, kept whole. */
export function figureHead(rest) {
  const [first = "", caption = "", ...source] = String(rest ?? "").split("|");
  const tagged = first.trim().match(/^(.*?)\s+#([\w-]+)$/);
  const name = (tagged ? tagged[1] : first).trim();
  const tag = (tagged ? tagged[2] : name.replace(/\.[a-z0-9]+$/i, "")).toLowerCase();
  return { name, tag, caption: caption.trim(), source: source.join("|").trim() };
}

function readDesignBlock(kind, rest, lines, index, blocks) {
  if (kind === "label") {
    const text = rest.trim();
    const previous = blocks[blocks.length - 1];
    /* A label that only repeats the heading it sits on adds nothing. */
    if (previous && previous.type === "h" && saysTheSame(text, plainText(previous.runs))) return 1;
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
    const head = figureHead(rest);
    if (head.name) blocks.push({ type: "image", name: head.name, tag: head.tag, caption: head.caption, source: head.source, figure: null });
    return 1;
  }

  /* A chart: its type, tag, caption and source on the first line, and a
     table of numbers under it. charts/chartData.js reads and checks the
     numbers. A chart with a problem keeps its table, so the writers can
     show the numbers instead, and the problem is told to the staff. */
  if (kind === "chart") {
    const { body, used } = bodyLines(lines, index);
    const [first = "", caption = "", ...source] = rest.split("|");
    const kindWord = first.trim().split(/\s+/)[0] ?? "";
    const table = readBlocks(body.join("\n")).find((b) => b.type === "table") ?? null;
    const cells = (row) => row.map((runs) => plainText(runs).trim());
    const data = table
      ? chartData(kindWord, cells(table.header), table.rows.map(cells))
      : { kind: null, categories: [], series: [], unit: {}, problem: "The chart has no table of numbers under it." };
    blocks.push({
      type: "chart",
      kind: data.kind,
      tag: chartTag(rest),
      caption: caption.trim(),
      source: source.join("|").trim(),
      table,
      data,
      figure: null,
    });
    return used;
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

  /* SLIDE DIAGRAMS, 2026-11-11. Anthony sent a designed deck as the
     standard: a row of boxes joined by arrows, phases, a hub fanning out to
     a list, an org chart, a closing statement. The slides draw each one as
     real, editable PowerPoint shapes (slides/slideDiagrams.js). The PDF and
     Word files show the same content plainly: a flow is one line with
     arrows, a hub is its name and a list, phases are numbered steps, a tree
     is cards, a statement is a takeaway strip. */

  /* :::flow, then one step per line ("- Member"). The step in **bold** is
     the one the slide lights up. One line "A > B > C" works too. */
  if (kind === "flow") {
    const { body, used } = bodyLines(lines, index);
    const source = rest.trim() ? rest.split(/\s*(?:>|→)\s*/) : body.map((l) => l.replace(/^\s*(?:[-*]|\d+[.)])\s+/, ""));
    const steps = source.map((t) => t.trim()).filter(Boolean).slice(0, 7).map((t) => {
      const lit = /^\*\*.*\*\*$/.test(t);
      return { runs: readInline(t.replace(/^\*\*(.*)\*\*$/, "$1")), lit };
    });
    if (steps.length >= 2) blocks.push({ type: "flow", steps });
    else blocks.push(...readBlocks(body.join("\n")));
    return rest.trim() ? 1 : used;
  }

  /* :::hub The centre | what it is, then a list of what comes out of it. */
  if (kind === "hub") {
    const { body, used } = bodyLines(lines, index);
    const [centre = "", ...caption] = rest.split("|");
    const list = readBlocks(body.join("\n")).find((b) => b.type === "list");
    const intro = readBlocks(body.join("\n")).filter((b) => b.type === "p");
    if (centre.trim() && list) {
      blocks.push({ type: "hub", centre: readInline(centre.trim()), caption: caption.join("|").trim(), items: list.items, intro });
    } else {
      blocks.push(...readBlocks(body.join("\n")));
    }
    return used;
  }

  /* :::phases, each "### Foundation | 3 to 4 weeks", its points, and an
     optional "Outcome: ..." line. Read like steps, so every format that
     draws steps draws these. */
  if (kind === "phases") {
    const { body, used } = bodyLines(lines, index);
    const items = readItems(body).filter((item) => item.title.length || item.blocks.length).map((item) => {
      const outcomeAt = item.blocks.findIndex((b) => b.type === "p" && /^outcome\s*:/i.test(plainText(b.runs).trim()));
      if (outcomeAt < 0) return item;
      /* The line stays in the item's text for the PDF and Word files; the
         slides draw it in its own column and skip the line (slideOutcome). */
      const outcome = plainText(item.blocks[outcomeAt].runs).replace(/^outcome\s*:\s*/i, "").trim();
      return { ...item, outcome };
    });
    if (items.length) blocks.push({ type: "steps", variant: "phases", items });
    return used;
  }

  /* :::tree The top box | what it is, then "### Child | role" items, each
     with an optional list under it. Read as cards everywhere else. */
  if (kind === "tree") {
    const { body, used } = bodyLines(lines, index);
    const [top = "", ...caption] = rest.split("|");
    const items = readItems(body).filter((item) => item.title.length || item.blocks.length);
    if (items.length) {
      /* The top box is also a bold line above the cards, so the PDF and
         Word files keep it. The slides draw it as the top box instead. */
      if (top.trim()) blocks.push({ type: "p", treeTop: true, runs: readInline(`**${top.trim()}**${caption.join("|").trim() ? `: ${caption.join("|").trim()}` : ""}`) });
      blocks.push({ type: "cards", variant: "tree", top: readInline(top.trim()), topCaption: caption.join("|").trim(), items });
    }
    return used;
  }

  /* :::style dark | #1E3A8A   THE LOOK THE PERSON ASKED FOR, 2026-11-11.
     Anthony: "the person that is designing it can decide, tell the model
     the design they want". Dark or light, and a colour. It is taken out of
     the document by readDocument (doc.style) and never printed. */
  if (kind === "style") {
    const [modeWord = "", colour = ""] = rest.split("|").map((t) => t.trim());
    const mode = /light|white/i.test(modeWord) ? "light" : /dark|black/i.test(modeWord) ? "dark" : "";
    const accent = (colour.match(/#?([0-9a-f]{6})\b/i)?.[1] ?? modeWord.match(/#?([0-9a-f]{6})\b/i)?.[1] ?? "").toUpperCase();
    blocks.push({ type: "style", mode, accent });
    return 1;
  }

  /* :::statement One line, said big. **Bold** words are lit. */
  if (kind === "statement") {
    if (rest.trim()) {
      blocks.push({ type: "takeaway", variant: "statement", runs: readInline(rest.trim()) });
      return 1;
    }
    const { body, used } = bodyLines(lines, index);
    const text = body.map((l) => l.trim()).filter(Boolean).join(" ");
    if (text) blocks.push({ type: "takeaway", variant: "statement", runs: readInline(text) });
    return used;
  }

  /* Not a block we know. Its lines are kept as ordinary text. */
  const { body, used } = bodyLines(lines, index);
  blocks.push(...readBlocks(body.join("\n")));
  return used;
}

/* A slide diagram as the plain blocks every other format already draws.
   The PDF and Word writers pass their blocks through this first. A flow is
   one line with arrows, its lit step in bold. A hub is its name in bold,
   then its list. */
export function plainForm(block) {
  if (block.type === "flow") {
    const runs = [];
    block.steps.forEach((step, i) => {
      if (i) runs.push({ text: "  →  " });
      runs.push(...step.runs.map((r) => ({ ...r, bold: r.bold || step.lit })));
    });
    return [{ type: "p", runs }];
  }
  if (block.type === "hub") {
    const head = [{ text: plainText(block.centre), bold: true }];
    if (block.caption) head.push({ text: `: ${block.caption}` });
    return [{ type: "p", runs: head }, ...block.intro, { type: "list", ordered: false, start: 1, items: block.items }];
  }
  return [block];
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
  const { text, refs, findings } = resolveFigureRefs(String(markdown ?? ""));
  const all = readBlocks(text);

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

  /* The look the person asked for (":::style"), taken out of the text
     first, so it can sit anywhere, even above the title. */
  let style = null;
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    if (blocks[i].type === "style") {
      const { mode, accent } = blocks.splice(i, 1)[0];
      style = { ...(mode ? { mode } : {}), ...(accent ? { accent } : {}), ...(style ?? {}) };
    }
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

  numberFigures(blocks, refs);
  forEachBlock(blocks, (block) => {
    if (block.type === "chart" && block.data.problem) {
      findings.push(`${block.caption ? `The chart "${block.caption}"` : "A chart"} could not be drawn, so its numbers are shown as a table. ${block.data.problem}`);
    }
  });
  return { title, subtitle, blocks, notes, findings, style };
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
  if (block.type === "flow") return block.steps.map((st) => plainText(st.runs)).join(" > ");
  if (block.type === "hub") return [plainText(block.centre), block.caption, ...block.intro.map(blockText), ...block.items.map((i) => plainText(i.runs))].join("\n");
  if (block.type === "image") return [block.caption || block.name, block.source].filter(Boolean).join("\n");
  if (block.type === "chart") {
    const table = block.table ? blockText(block.table) : "";
    return [block.caption, table, block.source].filter(Boolean).join("\n");
  }
  return "";
}

/* --------------------------------------------------------------------------
   SECTION 5: Figure numbers

   Done in two passes over the same order, so the two can never disagree:
     1. Before reading, every figure line (":::image" or ":::chart") is
        found in order and given a number, and every [[fig:tag]] in the text
        is swapped for "Figure N".
     2. After reading, the figure blocks are walked in the same order and
        given the same numbers.
   A tag used twice points at the first one. A [[fig:tag]] with no figure
   becomes "the figure" and a finding, so the staff is told rather than
   the file carrying a broken tag.
   -------------------------------------------------------------------------- */

const FIGURE_LINE = /^\s*:::\s*(image|chart)\b\s*(.*)$/i;
const FIGURE_REF = /\[\[\s*fig\s*:\s*([\w.-]+)\s*\]\]/gi;

/* The tag of a chart line, "bar #revenue | ...". A chart with no tag has
   none; only pictures fall back to their file name. */
function chartTag(rest) {
  const first = String(rest ?? "").split("|")[0];
  const tagged = first.match(/#([\w-]+)/);
  return tagged ? tagged[1].toLowerCase() : "";
}

function resolveFigureRefs(markdown) {
  const tags = new Map();
  let count = 0;
  for (const line of markdown.split("\n")) {
    const m = line.match(FIGURE_LINE);
    if (!m) continue;
    count += 1;
    const tag = m[1].toLowerCase() === "image" ? figureHead(m[2]).tag : chartTag(m[2]);
    if (tag && !tags.has(tag)) tags.set(tag, count);
  }

  const findings = [];
  let pointed = false;
  const text = markdown.replace(FIGURE_REF, (_, raw) => {
    const n = tags.get(raw.toLowerCase().replace(/\.[a-z0-9]+$/i, "")) ?? tags.get(raw.toLowerCase());
    if (n) {
      pointed = true;
      return `Figure ${n}`;
    }
    findings.push(`The text points at a figure called "${raw}", and there is no such figure. It now says "the figure".`);
    return "the figure";
  });

  return { text, refs: { show: count >= 2 || pointed }, findings };
}

/* Every block, including the ones inside cards, steps and a stat, in
   reading order. */
export function forEachBlock(blocks, visit) {
  for (const block of blocks ?? []) {
    visit(block);
    if (block.items) block.items.forEach((item) => forEachBlock(item.blocks, visit));
    if (block.type === "stat") forEachBlock(block.blocks, visit);
  }
}

function numberFigures(blocks, refs) {
  let n = 0;
  let charts = 0;
  forEachBlock(blocks, (block) => {
    if (block.type === "image" || block.type === "chart") {
      n += 1;
      block.figure = refs.show ? n : null;
    }
    /* Every chart's place in reading order, so its picture copy
       (charts/chartPictures.js) can be found again by each writer. */
    if (block.type === "chart") {
      block.chartIndex = charts;
      charts += 1;
    }
  });
}

/* "Figure 2. The front desk" for documents, or just the caption when the
   document does not number its figures. Slides pass withNumber false. */
export function figureCaption(block, withNumber = true) {
  const number = withNumber && block.figure ? `Figure ${block.figure}.` : "";
  return [number, block.caption].filter(Boolean).join(" ");
}
