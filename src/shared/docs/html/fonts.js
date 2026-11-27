/* ==========================================================================
   THE PRINTED PAGE'S FONT

   What this is: Poppins (the font of Anthony's own proposals; Open Font
   Licence, free to bundle), read into the page itself as @font-face rules,
   so the printer draws exactly this font without fetching anything.

   Two subsets per weight: latin, and latin-ext for the naira sign and other
   currency marks. Read once per visit and kept.

   What it must never do: block a document. If a font cannot be read, the
   page falls back to the printer's own sans serif.
   ========================================================================== */

import latin400 from "@fontsource/poppins/files/poppins-latin-400-normal.woff2?url";
import latin500 from "@fontsource/poppins/files/poppins-latin-500-normal.woff2?url";
import latin600 from "@fontsource/poppins/files/poppins-latin-600-normal.woff2?url";
import latin700 from "@fontsource/poppins/files/poppins-latin-700-normal.woff2?url";
import ext400 from "@fontsource/poppins/files/poppins-latin-ext-400-normal.woff2?url";
import ext500 from "@fontsource/poppins/files/poppins-latin-ext-500-normal.woff2?url";
import ext600 from "@fontsource/poppins/files/poppins-latin-ext-600-normal.woff2?url";
import ext700 from "@fontsource/poppins/files/poppins-latin-ext-700-normal.woff2?url";

const FILES = [
  [400, latin400, "U+0000-00FF,U+2000-206F"], [500, latin500, "U+0000-00FF,U+2000-206F"],
  [600, latin600, "U+0000-00FF,U+2000-206F"], [700, latin700, "U+0000-00FF,U+2000-206F"],
  [400, ext400, "U+0100-024F,U+20A0-20AB"], [500, ext500, "U+0100-024F,U+20A0-20AB"],
  [600, ext600, "U+0100-024F,U+20A0-20AB"], [700, ext700, "U+0100-024F,U+20A0-20AB"],
];

let cached = null;

async function asBase64(url) {
  const buffer = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  return btoa(binary);
}

export async function fontFaceCss() {
  if (cached !== null) return cached;
  try {
    const rules = await Promise.all(FILES.map(async ([weight, url, range]) =>
      `@font-face{font-family:Poppins;font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${await asBase64(url)}) format("woff2");unicode-range:${range};}`));
    cached = rules.join("\n");
  } catch (error) {
    console.warn("could not read the document font, using the printer's own", error);
    cached = "";
  }
  return cached;
}
