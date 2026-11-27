/* ==========================================================================
   PRINTING A DOCUMENT THROUGH THE PRINTER

   What this is: builds the designed page (documentHtml.js) and asks our own
   Supabase function (print-pdf) to have it printed by Chromium (Gotenberg).

   Answers a PDF blob, or null when the printer is not set up, did not
   answer, or the page ran past a page limit the person named. On null the
   caller makes the PDF with its own writer (pdf.js), which always works.
   Nothing here throws.

   A PAGE LIMIT. When they named one ("one page", "not more than 3 pages")
   and the printed file runs over, it is printed once more in the compact
   layout; still over, it is null and pdf.js fits it, because a limit they
   named is a rule (Anthony, 2026-11-11).

   Kept apart from download.js so the harness can swap it for a fake.
   ========================================================================== */

import { supabase } from "../../supabase.js";
import { FUNCTIONS } from "../../config.js";
import { documentHtml } from "./documentHtml.js";
import { fontFaceCss } from "./fonts.js";

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}

async function pageCount(blob) {
  const text = await blob.text();
  return (text.match(/\/Type\s*\/Page(?!s)\b/g) ?? []).length;
}

async function printOnce(doc, theme, brand, images, options) {
  const html = await documentHtml(doc, theme, brand, images, { ...options, fontCss: await fontFaceCss() });
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.printPdf, {
    body: { cover: html.cover, body: html.body, header: html.header, footer: html.footer, margins: html.margins },
  });
  if (error || !data?.ok || !data.base64) return null;
  return fromBase64(data.base64);
}

export async function printedPdf(doc, theme, brand, images, { pages = 0 } = {}) {
  try {
    const first = await printOnce(doc, theme, brand, images, { pages });
    if (!first || !pages || (await pageCount(first)) <= pages) return first;
    const compact = await printOnce(doc, theme, brand, images, { pages, compact: true });
    if (compact && (await pageCount(compact)) <= pages) return compact;
    return null;
  } catch (error) {
    console.warn("the printer could not print this one, using the built in writer", error);
    return null;
  }
}
