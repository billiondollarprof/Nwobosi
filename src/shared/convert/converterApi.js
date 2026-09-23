/* ==========================================================================
   ASKING THE EXACT CONVERTER

   One call, through our own Supabase function (convert-document), which
   checks who is asking and passes the file to the converter service. The
   browser never sees the converter's address or its secret.

   Answers { ok: true, blob } or { ok: false, state, reason }. state is
   "not_set_up" until the converter is deployed, and the caller then
   converts in the browser instead. Nothing here throws.

   Kept apart from convertFile.js so the harness can swap it for a fake.
   ========================================================================== */

import { supabase } from "../supabase.js";
import { FUNCTIONS } from "../config.js";

const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function toBase64(blob) {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  return btoa(binary);
}

function fromBase64(base64, type) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function askConverter(file, to) {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTIONS.convertDocument, {
      body: { to, base64: await toBase64(file) },
    });
    if (error) {
      let body = null;
      try {
        body = await error.context?.json?.();
      } catch {
        body = null;
      }
      return { ok: false, state: body?.state ?? "unreachable", reason: body?.reason ?? "" };
    }
    if (!data?.ok || !data.base64) return { ok: false, state: data?.state ?? "failed", reason: data?.reason ?? "" };
    return { ok: true, blob: fromBase64(data.base64, MIME[to]) };
  } catch {
    return { ok: false, state: "unreachable", reason: "" };
  }
}
