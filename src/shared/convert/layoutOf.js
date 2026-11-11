/* ==========================================================================
   THE LAYOUT OF AN UPLOAD, FOR WHEN THE STAFF SAYS "LIKE THIS ONE"

   Anthony, 2026-09-23: "even during a new build, if the staff asks that
   the layout of an upload should be used, then the layout should not be
   thrown away. this only happens if they say it."
   (DOCUMENT-HARNESS.md, section 9.)

   WHAT THIS READS, FROM A PDF OR WORD FILE THE STAFF ATTACHES
     outline   the shape: its sections in order, their heading levels, and
               where its lists, tables and pictures sit. Plain text the
               model can follow. It carries heading names and table column
               names, never the body text (the model already has the words
               from readFile.js).
     style     from a Word file only: its body font, its heading colour and
               its page margins, read from the file's own XML.

   WHEN IT IS USED
   Always read, because it is cheap and done in the browser. Only USED when
   the person asks: the model is told the outline is for "only if they ask
   for this layout", and the style is applied only when the approved brief
   says "Layout: like <this file>" (Chat.jsx, buildFromBrief).

   WHAT IT MUST NEVER DO
   Fail an upload. Anything it cannot read, it leaves out, and the file is
   still attached for its words exactly as before.
   ========================================================================== */

import { docxToDocument, pdfToDocument } from "./readOriginal.js";

const MAX_LINES = 60;

function textOf(runs) {
  return (runs ?? []).map((r) => (r.br ? " " : r.text ?? "")).join("").replace(/\s+/g, " ").trim();
}

export function outlineOf(doc) {
  const lines = [];
  let pending = null;
  const say = (line) => {
    if (pending && pending.line === line) {
      pending.count += 1;
      return;
    }
    if (pending) lines.push(pending.count > 1 ? `${pending.line} x${pending.count}` : pending.line);
    pending = { line, count: 1 };
  };

  for (const block of doc.blocks ?? []) {
    if (block.type === "h") say(`${"#".repeat(block.level)} ${textOf(block.runs).slice(0, 80)}`);
    else if (block.type === "p") say("  paragraph");
    else if (block.type === "list") say(`  ${block.ordered ? "numbered" : "bullet"} list, ${block.items.length} item${block.items.length === 1 ? "" : "s"}`);
    else if (block.type === "table") {
      const columns = block.header.map(textOf).map((c) => c.slice(0, 30));
      const last = textOf(block.rows[block.rows.length - 1]?.[0]);
      say(`  table, ${columns.length} columns (${columns.join(" | ")}), ${block.rows.length} rows${/^total/i.test(last) ? ", ending in a Total row" : ""}`);
    } else if (block.type === "image") say("  picture");
  }
  if (pending) lines.push(pending.count > 1 ? `${pending.line} x${pending.count}` : pending.line);
  return lines.slice(0, MAX_LINES).join("\n");
}

/* --------------------------------------------------------------------------
   The style of a Word file
   -------------------------------------------------------------------------- */

function attr(xml, pattern) {
  return xml.match(pattern)?.[1] ?? "";
}

export async function styleOfDocx(buffer) {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const styles = (await zip.file("word/styles.xml")?.async("string")) ?? "";
    const theme = (await zip.file("word/theme/theme1.xml")?.async("string")) ?? "";
    const document = (await zip.file("word/document.xml")?.async("string")) ?? "";

    const styleBlock = (id) => styles.match(new RegExp(`<w:style[^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`))?.[0] ?? "";
    const normal = styleBlock("Normal");
    const heading = styleBlock("Heading1") || styleBlock("Title");
    const defaults = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? "";

    /* A font named outright, or the theme's body font ("minor") when the
       style points at the theme instead. */
    const themeMinor = attr(theme, /<a:minorFont>\s*<a:latin typeface="([^"]+)"/);
    const themeMajor = attr(theme, /<a:majorFont>\s*<a:latin typeface="([^"]+)"/);
    const fontIn = (xml) => {
      const named = attr(xml, /<w:rFonts[^>]*w:ascii="([^"]+)"/);
      if (named) return named;
      const pointed = attr(xml, /<w:rFonts[^>]*w:asciiTheme="([^"]+)"/);
      if (pointed) return pointed.startsWith("major") ? themeMajor : themeMinor;
      return "";
    };
    const font = fontIn(normal) || fontIn(defaults) || themeMinor;
    const headingFont = fontIn(heading) || themeMajor || font;
    const accent = attr(heading, /<w:color w:val="([0-9A-Fa-f]{6})"/).toUpperCase();

    const pgMar = document.match(/<w:pgMar [^>]*\/>/)?.[0] ?? "";
    const margin = (side) => Number(attr(pgMar, new RegExp(`w:${side}="(\\d+)"`))) || null;
    const margins = pgMar ? { top: margin("top"), bottom: margin("bottom"), left: margin("left"), right: margin("right") } : null;

    const style = {};
    if (font) style.font = font;
    if (headingFont) style.headingFont = headingFont;
    if (accent && accent !== "000000") style.accent = accent;
    if (margins && Object.values(margins).every(Boolean)) style.margins = margins;
    return Object.keys(style).length ? style : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   A POWERPOINT'S LOOK, 2026-11-11
   Anthony: "show them a PowerPoint that they have done, so the system can
   just copy the design color and pattern and use it. Use a normal
   PowerPoint that is not designed, is okay."
   Read from the file's own XML:
     accent      the colour the deck actually uses most on its slides (a
                 company's real colour), else the theme's first accent
     mode        dark or light, from the background most slides have
     font        the theme's body font, headingFont its heading font
     slides      how many slides it has
   -------------------------------------------------------------------------- */

function channelsOf(hex) {
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function lightnessOf(hex) {
  const [r, g, b] = channelsOf(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* How much colour a colour has: 0 for greys, white and black. */
function saturationOf(hex) {
  const c = channelsOf(hex);
  return Math.max(...c) - Math.min(...c);
}

export async function styleOfPptx(buffer) {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const read = async (name) => (await zip.file(name)?.async("string")) ?? "";
    const theme = await read("ppt/theme/theme1.xml");
    const master = await read("ppt/slideMasters/slideMaster1.xml");
    const slideNames = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const slides = await Promise.all(slideNames.map(read));

    /* The theme's named colours, so "bg1" or "accent2" can be turned into
       a real colour. */
    const scheme = {};
    for (const name of ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"]) {
      const block = theme.match(new RegExp(`<a:${name}>([\\s\\S]*?)</a:${name}>`))?.[1] ?? "";
      const value = attr(block, /srgbClr val="([0-9A-Fa-f]{6})"/) || attr(block, /lastClr="([0-9A-Fa-f]{6})"/);
      if (value) scheme[name] = value.toUpperCase();
    }
    const alias = { bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2" };
    const colourIn = (xml) => {
      const rgb = attr(xml, /<a:srgbClr val="([0-9A-Fa-f]{6})"/);
      if (rgb) return rgb.toUpperCase();
      const named = attr(xml, /<a:schemeClr val="(\w+)"/);
      return scheme[alias[named] ?? named] ?? "";
    };

    /* The background: a slide's own, else the master's, else white. */
    const bgOf = (xml) => colourIn(xml.match(/<p:bg>[\s\S]*?<\/p:bg>/)?.[0] ?? "");
    const masterBg = bgOf(master) || scheme.lt1 || "FFFFFF";
    const backgrounds = slides.map((x) => bgOf(x) || masterBg);
    const dark = backgrounds.filter((c) => lightnessOf(c) < 0.25).length;

    /* The colour the slides use most, among real colours (not greys). */
    const counts = new Map();
    for (const xml of slides) {
      for (const [, value] of xml.matchAll(/<a:srgbClr val="([0-9A-Fa-f]{6})"/g)) {
        const c = value.toUpperCase();
        if (saturationOf(c) < 0.25) continue;
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    const used = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const accent = used || scheme.accent1 || "";

    const style = { slides: slides.length, mode: dark > slides.length / 2 ? "dark" : "light" };
    if (accent) style.accent = accent;
    const minor = attr(theme, /<a:minorFont>\s*<a:latin typeface="([^"]+)"/);
    const major = attr(theme, /<a:majorFont>\s*<a:latin typeface="([^"]+)"/);
    if (minor) style.font = minor;
    if (major) style.headingFont = major;
    return style;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   The one entry point: { outline, style } for an attached file, or null.
   -------------------------------------------------------------------------- */

export async function readLayout(file) {
  try {
    const kind = String(file.name).split(".").pop()?.toLowerCase();
    if (kind === "docx") {
      const { doc } = await docxToDocument(file);
      return { outline: outlineOf(doc), style: await styleOfDocx(await file.arrayBuffer()) };
    }
    if (kind === "pdf") {
      const { doc } = await pdfToDocument(file);
      return { outline: outlineOf(doc), style: null };
    }
    if (kind === "pptx") {
      const buffer = await file.arrayBuffer();
      const { readPptx } = await import("../readFile.js");
      const text = await readPptx(buffer);
      const style = await styleOfPptx(buffer);
      const titles = text.split("\n\n").map((slide) => slide.split("\n")[0]).slice(0, MAX_LINES);
      const look = style ? `Look: ${style.mode}, colour #${style.accent ?? "none"}, fonts ${style.headingFont ?? "?"} / ${style.font ?? "?"}` : "";
      return { outline: [`${style?.slides ?? titles.length} slides`, look, ...titles].filter(Boolean).join("\n"), style };
    }
  } catch (error) {
    console.warn("could not read the layout of", file?.name, error);
  }
  return null;
}

/* The line in the approved brief that says which upload to lay it out like. */
export function layoutFromBrief(brief) {
  return String(brief ?? "").match(/Layout:\s*like\s+(.+?\.(?:docx|pdf|pptx))\b/i)?.[1]?.trim() ?? null;
}
