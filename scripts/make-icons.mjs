/* ==========================================================================
   ICONS
   Every icon the site serves, rendered from one source: public/favicon.svg.

   Run it with `npm run icons` after changing the mark. Nothing here is
   drawn twice by hand, which is how the tab icon and the app ended up
   showing two different logos in the first place.

   It writes:

     favicon.ico          16, 32 and 48, in one file. This is the one that
                          was missing, and its absence is the whole bug: a
                          browser asks for /favicon.ico whether you link to
                          it or not, the SPA catch all answered with
                          index.html, and Safari fell back to a cached icon
                          from an older deployment.
     favicon-32.png       the explicit link, for browsers that use it.
     apple-touch-icon.png 180, iOS home screen, on a solid ground because
                          iOS puts no background behind it.
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

  /* --- iOS, on a ground, because iOS gives it none ---------------------- */
  const touch = await sharp(svg, { density: 512 }).resize(148, 148).png().toBuffer();
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: GROUND },
  })
    .composite([{ input: touch, gravity: "center" }])
    .png()
    .toFile(path.join(PUBLIC, "apple-touch-icon.png"));

  /* --- the share card ---------------------------------------------------- */
  const mark = await sharp(svg, { density: 700 }).resize(260, 260).png().toBuffer();
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
