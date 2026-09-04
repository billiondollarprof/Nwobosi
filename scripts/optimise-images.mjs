/* ==========================================================================
   OPTIMISE IMAGES
   Turns whatever is dropped into assets/source/ into the WebP files the
   pages actually load.

   Run it with `npm run images`.

   Every photograph ships at three widths rather than one. A phone that is
   handed a 2400px file pays for all of it, decodes all of it, and then
   throws most of it away, and on a slow connection that is the difference
   between a page that feels expensive and one that feels broken. The
   markup picks the right width with srcset.

   Source files stay in assets/source/ and are never published. Only what
   lands in public/ is served.
   ========================================================================== */

import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets", "source");
const OUT = path.join(ROOT, "public", "img");

/* Widths chosen against where these actually appear: a phone at 2x, a
   tablet or a half width column at 2x, and a full width banner on a large
   display. Anything above 1600 is invisible at this page's measures. */
const WIDTHS = [640, 1024, 1600];

/* 82 is the point where WebP stops being distinguishable from the source
   on photographic content at normal viewing size, and every point above it
   costs bytes for nothing. Photographs get chroma subsampling; flat
   graphics and logos do not, because it smears hard colour edges. */
const PHOTO = { quality: 82, effort: 6 };
const GRAPHIC = { quality: 90, effort: 6, chromaSubsampling: "4:4:4" };

/* Names carrying "logo" or "mark" are treated as flat graphics. */
const isGraphic = (name) => /logo|mark|glyph/i.test(name);

async function main() {
  let entries;
  try {
    entries = await readdir(SOURCE);
  } catch {
    console.error(
      `Nothing to do: ${path.relative(ROOT, SOURCE)} does not exist.\n` +
        "Create it, drop the original photographs in, and run this again.",
    );
    process.exitCode = 1;
    return;
  }

  /* Anything named "reference" is something to work from, not something to
     ship. Artwork to trace, a screenshot to match. It stays in the source
     folder and never reaches public/img/. */
  const images = entries.filter(
    (f) => /\.(png|jpe?g|webp|tiff?)$/i.test(f) && !/reference/i.test(f),
  );
  if (!images.length) {
    console.error(`No images found in ${path.relative(ROOT, SOURCE)}.`);
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT, { recursive: true });

  for (const file of images) {
    const base = path.parse(file).name;
    const input = path.join(SOURCE, file);
    const meta = await sharp(input).metadata();
    const options = isGraphic(base) ? GRAPHIC : PHOTO;
    const original = (await stat(input)).size;

    /* Never upscale. A 900px source asked for at 1600 gets a soft, larger
       file that is worse in both directions. */
    const widths = WIDTHS.filter((w) => w <= meta.width);
    if (!widths.length) widths.push(meta.width);

    const written = [];
    for (const width of widths) {
      const out = path.join(OUT, `${base}-${width}.webp`);
      await sharp(input).resize({ width, withoutEnlargement: true }).webp(options).toFile(out);
      written.push(`${width}w ${Math.round((await stat(out)).size / 1024)}kb`);
    }

    console.log(
      `${file}  ${meta.width}x${meta.height} ${Math.round(original / 1024)}kb  ->  ${written.join(", ")}`,
    );
  }

  console.log(`\nWrote ${images.length} image(s) into ${path.relative(ROOT, OUT)}/`);
}

main();
