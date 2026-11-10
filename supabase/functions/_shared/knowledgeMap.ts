/* ==========================================================================
   THE KNOWLEDGE MAP

   What this is: one short page that says what the company has given us.
   Every source, what kind it is, how long it is, what it holds, the
   sections inside it, and where the brand colour came from.

   Why it exists. Anthony, 2026-11-10: "one short file summarising every
   source, its sections and where it lives... says where the brand colour
   came from... the assistant reads it and fetches only what it needs."

   Who reads it:
     1. The assistant, at the top of the company material on every turn, so
        it can find the right source by name before it reads the text.
     2. The admin, on the Knowledge screen, so they can see at a glance what
        the assistant knows and what is missing.

   It is built from what is already stored, every time it is asked for, so
   it can never fall out of date with the sources themselves. Nothing here
   is saved.

   What it must never do:
     - Use a technical word. An admin reads this. "Words", not "characters"
       or "tokens". "Picture", not "image asset".
     - Claim a section that is not in the text. Sections are only ever
       headings found in the source itself.
     - Import anything. This file is used by the edge function (Deno) and by
       the browser (Vite) alike, so it stays plain code with no imports.
   ========================================================================== */

export type MapSource = {
  name: string;
  description?: string | null;
  kind?: string | null;
  location?: string | null;
  text?: string | null;
};

export type BrandColour = {
  colour?: string | null;
  from?: string | null;
};

/* --------------------------------------------------------------------------
   1. Sections: the headings a source actually has
   A line counts as a heading when it is a Markdown heading, or a short line
   in capitals, or a short line ending in a colon. Eight at most, in order,
   each said once.
   -------------------------------------------------------------------------- */

export function sectionsOf(text: string | null | undefined, max = 8): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const raw of String(text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line || line.length > 70) continue;
    let heading = "";
    const md = line.match(/^#{1,3}\s+(.+?)\s*#*$/);
    if (md) heading = md[1];
    else if (/^[A-Z0-9][A-Z0-9 &,'/()-]{2,}$/.test(line) && /[A-Z]{3}/.test(line)) heading = line;
    else if (/^[A-Z][^.!?]{2,48}:$/.test(line)) heading = line.slice(0, -1);
    heading = heading.replace(/[*_`]/g, "").trim();
    if (!heading) continue;
    const key = heading.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(heading);
    if (found.length >= max) break;
  }
  return found;
}

/* --------------------------------------------------------------------------
   2. The pieces of one line
   -------------------------------------------------------------------------- */

export function wordsIn(text: string | null | undefined): number {
  const t = String(text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function kindWord(kind: string | null | undefined): string {
  if (kind === "image") return "picture";
  if (kind === "link") return "web page";
  return "file";
}

/* Rounded so a reader sees a size, not a count: 1,240 becomes "about 1,200". */
function aboutWords(n: number): string {
  if (n === 0) return "no words read yet";
  if (n < 100) return `${n} words`;
  const rounded = n < 1000 ? Math.round(n / 50) * 50 : Math.round(n / 100) * 100;
  return `about ${rounded.toLocaleString("en-GB")} words`;
}

/* --------------------------------------------------------------------------
   3. The brand colour line
   Where it came from, in the order a person would trust it: named in their
   own material, taken from their logo or a picture, or nothing found, in
   which case documents use our blue.
   -------------------------------------------------------------------------- */

export function brandLine(brand: BrandColour | null | undefined): string {
  const colour = String(brand?.colour ?? "").trim();
  if (!colour) return "Brand colour: none found yet, so documents use StellaXafe blue.";
  const from = String(brand?.from ?? "").trim();
  return from
    ? `Brand colour: ${colour.toUpperCase()}, found in ${from}.`
    : `Brand colour: ${colour.toUpperCase()}, found in their uploads.`;
}

/* --------------------------------------------------------------------------
   4. The whole map, as short Markdown
   -------------------------------------------------------------------------- */

export function knowledgeMap(sources: MapSource[], brand?: BrandColour | null): string {
  const list = sources ?? [];
  const totalWords = list.reduce((sum, s) => sum + wordsIn(s.text), 0);
  const lines: string[] = [
    "KNOWLEDGE MAP",
    `${list.length} source${list.length === 1 ? "" : "s"}, ${aboutWords(totalWords)} in all.`,
    brandLine(brand),
    "",
  ];
  for (const s of list) {
    const words = wordsIn(s.text);
    const sections = sectionsOf(s.text);
    const where = s.location && /^https?:\/\//.test(s.location) ? `, from ${s.location}` : "";
    lines.push(`- ${s.name} (${kindWord(s.kind)}, ${aboutWords(words)}${where})`);
    if (s.description) lines.push(`  Holds: ${String(s.description).trim()}`);
    if (sections.length) lines.push(`  Sections: ${sections.join("; ")}`);
  }
  return lines.join("\n");
}
