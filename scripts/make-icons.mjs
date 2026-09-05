/* ==========================================================================
   ICONS
   Every icon the site serves, generated here so none of them can drift.

   Two drawings, one idea, each sized for where it is used:

     public/favicon.svg   the tab. Drawn for 16 pixels, where the full mark
                          has nothing left to render. Read the note at the
                          top of that file before changing it.
     seal(), below        the app mark at full fidelity, for the home screen
                          and the share card, where the pixels exist.

   Run it with `npm run icons` after changing either. Nothing is exported
   by hand, which is how the tab and the app ended up showing two different
   logos in the first place.

   It writes:

     favicon.ico          16, 32 and 48, in one file. This is the one that
                          was missing, and its absence is the whole bug: a
                          browser asks for /favicon.ico whether you link to
                          it or not, the SPA catch all answered with
                          index.html, and Safari fell back to a cached icon
                          from an older deployment.
     favicon-32.png       the explicit link, for browsers that use it.
     apple-touch-icon.png 180, iOS home screen, the full mark on a solid
                          ground because iOS puts no background behind it.
     og-image.png         1200 by 630, for a link pasted into LinkedIn or
                          Slack. Square icons get cropped to a strip there.
   ========================================================================== */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

/* The brand ground. Matches --bg in tokens.js. */
const GROUND = "#05060D";

/* The full Seal, at full fidelity: fine outer boundary, lit gateway ring,
   and a bead that exactly fills the channel between them. This is the app
   mark, and it is used wherever there are enough pixels to carry it, which
   means the home screen and the share card but never the tab.

   public/favicon.svg is deliberately a different drawing. See the note at
   the top of that file: below about 32 pixels this one falls apart, because
   the boundary stroke is 1.6 on a 100 unit grid, a quarter of a pixel at a
   tab size. Two drawings, one idea, each one sized for where it is used. */
function seal(px) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">
       <defs>
         <linearGradient id="g" x1="18" y1="82" x2="82" y2="18" gradientUnits="userSpaceOnUse">
           <stop offset="0%" stop-color="#2E42E0"/>
           <stop offset="52%" stop-color="#7C8CF5"/>
           <stop offset="100%" stop-color="#E8EBFF"/>
         </linearGradient>
       </defs>
       <circle cx="50" cy="50" r="44" fill="none" stroke="#7C819B" stroke-width="1.6"/>
       <circle cx="50" cy="50" r="30" fill="none" stroke="url(#g)" stroke-width="7"/>
       <circle cx="77.12" cy="22.88" r="4.85" fill="#F5A820"/>
     </svg>`,
  );
}

/* ICO is a container: a header, one directory entry per size, then the
   images themselves. Modern readers accept PNG inside it, so each entry is
   just a rendered PNG with an offset written in front of it. */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;

  pngs.forEach(({ size, data }, i) => {
    const at = i * 16;
    /* 0 means 256 in this format. Nothing here is that large, but the
       encoding is the encoding. */
    dir.writeUInt8(size >= 256 ? 0 : size, at);
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1);
    dir.writeUInt8(0, at + 2); // palette size, 0 for true colour
    dir.writeUInt8(0, at + 3); // reserved
    dir.writeUInt16LE(1, at + 4); // colour planes
    dir.writeUInt16LE(32, at + 6); // bits per pixel
    dir.writeUInt32LE(data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

async function main() {
  const svg = await readFile(path.join(PUBLIC, "favicon.svg"));
  await mkdir(PUBLIC, { recursive: true });

  /* --- favicon.ico, transparent, three sizes ---------------------------- */
  const icoSizes = [16, 32, 48];
  const pngs = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      data: await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer(),
    })),
  );
  await writeFile(path.join(PUBLIC, "favicon.ico"), buildIco(pngs));

  /* --- the explicit 32 --------------------------------------------------- */
  await sharp(svg, { density: 384 })
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC, "favicon-32.png"));

  /* --- iOS home screen --------------------------------------------------
     180 pixels is plenty for the full Seal, so this uses it. The tab tile
     is drawn for 16 and looks blunt this large: its bead is oversized on
     purpose and crosses the ring rather than sitting inside it, which is
     right at a tab size and wrong at this one.

     Square, not rounded. iOS rounds the corners itself, and a second
     radius inside the one it applies leaves a dark rim around the icon. */
  const APPLE = 180;
  await sharp({
    create: { width: APPLE, height: APPLE, channels: 4, background: GROUND },
  })
    .composite([
      {
        input: await sharp(seal(132), { density: 700 }).resize(132, 132).png().toBuffer(),
        left: 24,
        top: 24,
      },
    ])
    .png()
    .toFile(path.join(PUBLIC, "apple-touch-icon.png"));

  /* --- the share card ----------------------------------------------------
     1200 by 630 is large enough for the full Seal, so this uses it. The
     tab tile would read as a logo pasted onto a card, not as the mark. */
  const mark = await sharp(seal(260), { density: 700 }).resize(260, 260).png().toBuffer();
  /* Sized against the frame rather than guessed at. Helvetica at this
     weight averages about half its point size per character, so the
     longest line here is roughly 43 by 13.5, which clears 1200 with the
     margin the text starts at. The first attempt ran off the right edge. */
  const words = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
       <text x="530" y="286" font-family="Helvetica, Arial, sans-serif" font-size="66"
             font-weight="700" fill="#F5F5F7" letter-spacing="-1.5">StellaXafe</text>
       <text x="530" y="346" font-family="Helvetica, Arial, sans-serif" font-size="27"
             fill="#9BA0AE">Private AI that already knows your company.</text>
       <text x="530" y="386" font-family="Helvetica, Arial, sans-serif" font-size="27"
             fill="#9BA0AE">Nothing ever leaves.</text>
     </svg>`,
  );
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: GROUND },
  })
    .composite([
      { input: mark, left: 190, top: 185 },
      { input: words, left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(PUBLIC, "og-image.png"));

  console.log("Wrote favicon.ico, favicon-32.png, apple-touch-icon.png, og-image.png");
}

main();
