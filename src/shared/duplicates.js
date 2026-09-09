/* ==========================================================================
   SPOTTING SOMETHING THAT IS ALREADY THERE

   WHY THIS EXISTS
   Three copies of the same landing page piled up in one company's knowledge
   base with nothing said. Two of them were switched on, so every support
   message carried the same 59,837 characters twice, and the older copy
   outranked the newer one because the read path ordered oldest first.

   ANTHONY'S DESIGN, AND IT IS THE CHEAP ONE ON PURPOSE
   No model runs here. Nothing is sent anywhere. It is a string comparison
   against a list the browser already has, so it costs nothing and answers
   instantly as somebody types.

   His words: "instead of burning tokens to start reading the file to know
   whether it is... the only time the system should actually read file is
   first of all when you are toggling to customer facing."

   That is the right split. A model is for judgement. Two identical names is
   not a judgement, it is an equals sign.

   IT WARNS AND NEVER BLOCKS
   Nothing here refuses an upload. Somebody who means to add a second version
   is not doing anything wrong, and a product that argues with a person about
   their own files is a product they work around. It says the name is taken,
   in red, and leaves the decision alone.

   WHAT IT DOES NOT CATCH, SAID PLAINLY
   The same document under a different name. Catching that needs a
   fingerprint of the content stored on the row, which is a schema change and
   a separate job. Until then this catches what actually happened twice
   today, which is somebody adding the same address again and somebody
   re-uploading a file they had forgotten.
   ========================================================================== */

import { tidyAddress } from "./linkApi.js";

/* Trimmed, lowercased, and inner runs of whitespace collapsed, so "Pricing
   update" and "pricing  update " are the same name. Nothing cleverer than
   that: a match has to be obvious to the person looking at both, or the
   warning reads as the product being confused. */
function normaliseName(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function findByName(items, name) {
  const wanted = normaliseName(name);
  if (!wanted) return null;
  return (items ?? []).find((item) => normaliseName(item.name) === wanted) ?? null;
}

/* Addresses go through the same tidying the server gets, so "amara.ng",
   "https://amara.ng" and "amara.ng," all count as the address that is
   already there. Without that, the trailing comma that wasted a round trip
   this morning would also have dodged this check. */
export function findByAddress(items, address) {
  const tidy = tidyAddress(address);
  if (!tidy.ok) return null;

  return (
    (items ?? []).find((item) => {
      if (item.kind !== "link" || !item.location) return null;
      const theirs = tidyAddress(item.location);
      return theirs.ok && theirs.url === tidy.url;
    }) ?? null
  );
}

/* "9 September", not "2026-09-09T08:15:30.029045+00:00". This goes on a
   screen next to a warning somebody has two seconds to read.

   en-GB rather than the device's own setting, deliberately. Left to the
   device an American phone renders "September 9", which reads as somebody
   else's product next to the rest of the copy in here. The whole product is
   written in British English, so the dates are too. */
export function whenAdded(item) {
  const raw = item?.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
