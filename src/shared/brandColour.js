/* ==========================================================================
   BRAND COLOUR, FOUND RATHER THAN ASKED FOR

   What this is: the company's own colour, worked out from what an admin
   uploads, and saved as companies.brand_color so every document comes out in
   the company's colour instead of our blue.

   Why it exists: Anthony, 2026-11-10: "the system by default is supposed to
   use the company's own branding colors... If the company did not upload
   their branding colors... you can see repeated colors that the company is
   using, both their logo... You should use that as a default, not using
   blue for everything." Nobody is asked. It is decided quietly, the way a
   designer would, and our blue stays only when nothing is found.

   Where a colour comes from, strongest first:
     1. A colour written in their own material, such as "#20B255" in a brand
        guide. The one that appears most often wins.
     2. Their logo or another brand picture: the most common strong colour in
        it, ignoring white, black, greys and see-through pixels.

   What it must never do:
     - Overwrite a colour that is already set. The first real colour stays,
       and an admin's own choice is never replaced by a guess.
     - Fail an upload. Every path here is wrapped: a colour that cannot be
       found just leaves things as they were.
   ========================================================================== */

import { supabase } from "./supabase.js";

/* --------------------------------------------------------------------------
   1. What counts as a brand colour
   A colour a reader would call "a colour": not white, not black, not grey.
   -------------------------------------------------------------------------- */

function channels(hex) {
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/* True for colours with enough colour in them to be a brand. */
function isStrongColour(hex) {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return max > 40 && min < 235 && saturation > 0.35;
}

/* --------------------------------------------------------------------------
   2. From text: the colour their own material names most often
   -------------------------------------------------------------------------- */

export function colourFromText(text) {
  const counts = new Map();
  for (const match of String(text ?? "").matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const hex = match[1].toUpperCase();
    if (!isStrongColour(hex)) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex;
      bestCount = count;
    }
  }
  return best ? `#${best}` : "";
}

/* --------------------------------------------------------------------------
   3. From a picture: the most common strong colour in it
   The picture is shrunk to 64 by 64 first, so this is quick on a phone.
   Colours are grouped into buckets so a gradient counts as one colour.
   -------------------------------------------------------------------------- */

export async function colourFromImage(blob) {
  if (typeof document === "undefined" || !blob) return "";
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue; // see through
      const hex = [data[i], data[i + 1], data[i + 2]]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      if (!isStrongColour(hex)) continue;
      // Bucket by rounding each channel to the nearest 32.
      const key = [data[i], data[i + 1], data[i + 2]].map((v) => Math.round(v / 32)).join(",");
      const entry = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      entry.n += 1;
      entry.r += data[i];
      entry.g += data[i + 1];
      entry.b += data[i + 2];
      buckets.set(key, entry);
    }

    let top = null;
    for (const entry of buckets.values()) if (!top || entry.n > top.n) top = entry;
    // Fewer than 2% of the picture is not a brand colour, it is a speck.
    if (!top || top.n < size * size * 0.02) return "";
    return `#${[top.r, top.g, top.b].map((v) => Math.round(v / top.n).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* --------------------------------------------------------------------------
   4. Save it, only if the company has none yet
   The update itself carries the "is null" condition, so two uploads at once
   cannot both write, and an admin's own colour is never replaced.
   -------------------------------------------------------------------------- */

export async function rememberBrandColour(companyId, colour) {
  if (!companyId || !/^#[0-9A-F]{6}$/i.test(colour ?? "")) return false;
  try {
    const { data, error } = await supabase
      .from("companies")
      .update({ brand_color: colour })
      .eq("id", companyId)
      .is("brand_color", null)
      .select("id");
    return !error && (data ?? []).length > 0;
  } catch {
    return false;
  }
}
