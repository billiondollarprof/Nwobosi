/* ==========================================================================
   TALKING TO GOOGLE DRIVE

   Two jobs, both through our own edge functions. The browser never sees a
   Google token.

     askDrive(intent)   status, start or disconnect. See drive-connect.
     fileInDrive(...)   put a finished file in the person's Drive. See
                        drive-upload.

   Same shape as canvaApi.js on purpose: a failed call reads the reason off
   the response rather than showing "Edge Function returned a non-2xx".
   ========================================================================== */

import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";

async function reasonFrom(error, fallback) {
  try {
    const body = await error.context?.json?.();
    if (body?.reason) return { reason: body.reason, state: body.state ?? "unreachable" };
  } catch {
    /* keep the fallback */
  }
  return { reason: fallback, state: "unreachable" };
}

export async function askDrive(intent) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.driveConnect, {
    body: {
      intent,
      /* Where to come back to. Checked against the product's own addresses
         at the other end, never trusted. */
      returnTo: intent === "start" ? window.location.href : undefined,
    },
  });
  if (error) return { ok: false, ...(await reasonFrom(error, "Could not reach Google Drive just now. Try again.")) };
  return data;
}

/* The blob goes as base64 in JSON. Every file this product makes is a few
   hundred kilobytes, well inside what one request carries. */
async function toBase64(blob) {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function fileInDrive({ blob, filename, mimeType }) {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.driveUpload, {
    body: { filename, mimeType, base64: await toBase64(blob) },
  });
  if (error) return { ok: false, ...(await reasonFrom(error, "Could not reach Google Drive just now. Try again.")) };
  return data;
}
