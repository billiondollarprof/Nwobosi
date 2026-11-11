/* ==========================================================================
   THE NUMBER THEY ASKED FOR

   What this is: reads what the person said for a number of slides, pages or
   sheets, and whether it is exact, a ceiling or a floor.

   Why. Anthony, 2026-11-11: "If a person chooses a number of slides, the
   system should give them that number... not more than 10 means it can be
   less than 10... more than 10 means it should be more. The system should
   be able to adapt to any number without overspilling", in Word, Excel and
   slides alike. With no number, the system decides.

     "4 slides", "four slides", "a 4 slide deck"     { kind: "exact", n: 4 }
     "not more than 10 slides", "at most", "up to",
     "maximum", "no more than", "under", "max"       { kind: "max", n: 10 }
     "more than 10", "at least", "minimum", "over"   { kind: "min", n: 10 }  (min is inclusive of "at least";
                                                       "more than 10" becomes n: 11)
     "3 pages max", "10 slides or fewer"            { kind: "max", n: 3 }
     "12 slides or more"                             { kind: "min", n: 12 }
     "one pager", "one-page", "single page"          { kind: "exact", n: 1 } for pages

   The person's LATEST message that names a number for that thing wins, so a
   correction ("make it 6 instead") replaces the first ask.

   What it must never do: invent a number. Nothing said means null, and the
   writers then decide the length themselves.
   ========================================================================== */

const WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, single: 1,
};

const UNITS = {
  slide: "slides?|slide\\s?decks?|decks?",
  page: "pages?|pagers?",
  sheet: "sheets?|tabs?|worksheets?",
};

const NUMBER = `(\\d{1,3}|${Object.keys(WORDS).join("|")})`;

function toNumber(word) {
  const w = String(word).toLowerCase();
  return /^\d+$/.test(w) ? Number(w) : WORDS[w] ?? null;
}

/* The count in one piece of text, or null. */
export function countIn(text, unit) {
  const units = UNITS[unit];
  if (!units) return null;
  const t = String(text ?? "").toLowerCase().replace(/[-–]/g, " ");
  /* "a 4 slide deck", "4 slides", "four page", "10 sheet". */
  const counted = new RegExp(`(.{0,24}?)\\b${NUMBER}\\s+(?:${units})\\b`, "g");
  let found = null;
  for (const match of t.matchAll(counted)) {
    const n = toNumber(match[2]);
    if (!n) continue;
    const before = match[1];
    let kind = "exact";
    let value = n;
    if (/(no less than|not less than|no fewer than|not fewer than)\s*$/.test(before)) {
      kind = "min";
    } else if (/(not more than|no more than|at most|up to|maximum( of)?|max( of)?|under|less than|fewer than|within)\s*$/.test(before)) {
      kind = "max";
      if (/(under|less than|fewer than)\s*$/.test(before)) value = n - 1;
    } else if (/(more than|over|above|at least|minimum( of)?|min( of)?|no less than|not less than)\s*$/.test(before)) {
      kind = "min";
      if (/(more than|over|above)\s*$/.test(before)) value = n + 1;
    }
    /* Words AFTER the count: "3 pages max", "10 slides or fewer",
       "12 slides or more". */
    const after = t.slice(match.index + match[0].length, match.index + match[0].length + 20);
    if (kind === "exact" && /^\s*(max\b|maximum|at most|or less|or fewer|tops)/.test(after)) kind = "max";
    else if (kind === "exact" && /^\s*(or more|minimum|at least|plus)/.test(after)) kind = "min";
    if (value >= 1) found = { kind, n: value };
  }
  return found;
}

/* The latest count the person gave for this unit across the conversation,
   or null when they never named one. */
export function askedCount(messages = [], unit) {
  let found = null;
  for (const m of messages ?? []) {
    if (m?.role !== "user") continue;
    const c = countIn(typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? ""), unit);
    if (c) found = c;
  }
  return found;
}

/* The most there may be, or Infinity when no ceiling was asked for. */
export function ceilingOf(count) {
  if (!count) return Infinity;
  return count.kind === "min" ? Infinity : count.n;
}
