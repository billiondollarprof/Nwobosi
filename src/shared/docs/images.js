/* ==========================================================================
   PICTURES IN THE WORK

   WHY THIS EXISTS
   Anthony, 2026-09-23: "if a slide will also contain images apart from the
   logo that's already in the knowledge base, the assistant should ask for
   the image... It should also have the capability to read image and know
   for sure which image goes into which slide. even if asked to include an
   image into a PDF or word intended document, it should take the image and
   asks or suggest where the image fits."

   So three things happen here:

     1. NAMING. Every picture handed over in the chat reaches the model with
        its file name written just before it ("IMAGE: team.jpg"). The model
        can already see pictures; without the name it could not say which
        one goes where.
     2. FINDING. When a file is built, each ":::image name" the model wrote
        is looked up: first among the pictures in this conversation, then
        among the company's own images in the knowledge base.
     3. PREPARING. Every picture is redrawn as PNG or JPEG. The PDF, Word
        and PowerPoint writers do not all accept WebP, which is what this
        product stores uploads as, so a picture that would have vanished
        from one format is converted once, here, for all of them.

   WHAT IT MUST NEVER DO
   Never put a picture in a file that the person did not give or the
   company did not approve. A name that matches nothing is left as a marked
   space in the file, never filled with something else.

   READ TOP TO BOTTOM
     1. Naming pictures on the way in
     2. Finding them in the conversation
     3. Finding them in the knowledge base
     4. Preparing them for the files
   ========================================================================== */

import { supabase } from "../supabase.js";
import { imageKey } from "./imageKey.js";

export const IMAGE_LABEL = "IMAGE: ";

/* How names are compared lives in imageKey.js, so the writers can share it
   without importing the Supabase client. */
export { imageKey };

/* --------------------------------------------------------------------------
   SECTION 1: Naming pictures on the way in
   -------------------------------------------------------------------------- */

export function labelledImageBlocks(imageFiles) {
  const blocks = [];
  for (const a of imageFiles) {
    blocks.push({ type: "text", text: `${IMAGE_LABEL}${a.name}` });
    blocks.push({ type: "image", source: { type: "base64", media_type: a.image.media_type, data: a.image.data } });
  }
  return blocks;
}

/* --------------------------------------------------------------------------
   SECTION 2: Finding them in the conversation

   The pictures travel in each message's apiContent, which is what is sent
   to the model and what is saved with the chat, so a reopened chat still
   has them. A picture sent before names were added has no label; it is
   still used, under the name "image 1", "image 2" and so on.
   -------------------------------------------------------------------------- */

export function imagesInMessages(messages) {
  const found = new Map();
  let unnamed = 0;
  for (const m of messages ?? []) {
    const content = m?.apiContent;
    if (!Array.isArray(content)) continue;
    let pending = null;
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string" && block.text.startsWith(IMAGE_LABEL)) {
        pending = block.text.slice(IMAGE_LABEL.length).trim();
      } else if (block?.type === "image" && block.source?.type === "base64") {
        unnamed += 1;
        const name = pending || `image ${unnamed}`;
        found.set(imageKey(name), {
          name,
          dataUrl: `data:${block.source.media_type};base64,${block.source.data}`,
        });
        pending = null;
      }
    }
  }
  return found;
}

/* --------------------------------------------------------------------------
   SECTION 3: Finding them in the knowledge base

   Company images live in the private brand-assets bucket, under the
   company's own folder. The storage rules let anybody in the company read
   them, and nobody outside it.
   -------------------------------------------------------------------------- */

async function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function companyImage(companyId, name) {
  try {
    const { data: rows } = await supabase
      .from("knowledge_sources")
      .select("name, asset_path")
      .eq("company_id", companyId)
      .eq("kind", "image");
    const row = (rows ?? []).find((r) => imageKey(r.name) === imageKey(name));
    if (!row?.asset_path) return null;
    const { data: blob, error } = await supabase.storage.from("brand-assets").download(row.asset_path);
    if (error || !blob) return null;
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl ? { name: row.name, dataUrl } : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   SECTION 4: Preparing them for the files

   Redrawn on a canvas as PNG (keeps a logo's transparent background) or
   JPEG (a photo, much smaller). Also measured, because every writer needs
   the width and height to keep the picture's shape.
   -------------------------------------------------------------------------- */

const MAX_EDGE = 1600;

async function prepare(entry) {
  try {
    const blob = await (await fetch(entry.dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    const photo = /jpe?g/i.test(blob.type);
    const mime = photo ? "image/jpeg" : "image/png";
    return { name: entry.name, dataUrl: canvas.toDataURL(mime, 0.9), mime, width, height };
  } catch {
    return null;
  }
}

/* Every picture the document names, found and prepared. Names that match
   nothing are simply absent from the map, and the writers mark the space. */
export async function collectImages(doc, messages, companyId) {
  const wanted = [];
  const walk = (blocks) => {
    for (const b of blocks ?? []) {
      if (b.type === "image") wanted.push(b.name);
      if (b.items) b.items.forEach((item) => walk(item.blocks));
      if (b.blocks) walk(b.blocks);
    }
  };
  walk(doc.blocks);
  if (!wanted.length) return new Map();

  const inChat = imagesInMessages(messages);
  const out = new Map();
  for (const name of wanted) {
    const key = imageKey(name);
    if (out.has(key)) continue;
    const found = inChat.get(key) ?? (companyId ? await companyImage(companyId, name) : null);
    if (!found) continue;
    const ready = await prepare(found);
    if (ready) out.set(key, ready);
  }
  return out;
}
