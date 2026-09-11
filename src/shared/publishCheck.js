/* ==========================================================================
   READING A FILE BEFORE IT GOES TO CUSTOMERS
   The browser half of the read-before-publish edge function.

   WHY THE TEXT IS SENT RATHER THAN AN ID
   At upload the file has just been read here and is not in the database
   yet, so there is nothing to point at. For something already in the list
   the chunks are read back under the admin's own session, which keeps the
   function unable to reach anything the caller could not already reach.

   THE ANSWER IS ADVICE, NEVER A DECISION
   Nothing in this file writes customer_visible. It returns a reading and
   the admin decides. Every failure comes back as "unknown", which the
   dialog shows differently from "clear", because a check that did not run
   is not a file that passed.
   ========================================================================== */

import { supabase } from "./supabase.js";
import { FUNCTIONS } from "./config.js";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/* Long enough for a real read of a long document, short enough that
   nobody sits looking at a spinner wondering if it broke. Past this the
   answer is "nobody has checked it", which is true and is something they
   can act on. */
const READ_TIMEOUT_MS = 25000;

const UNKNOWN = {
  state: "unknown",
  note: "Could not read this one, so nobody has checked it yet.",
};

export async function readBeforePublish({ text, name }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return UNKNOWN;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);

  try {
    const response = await fetch(`${FUNCTIONS_BASE}/${FUNCTIONS.readBeforePublish}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, name }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return UNKNOWN;

    const state = payload.state === "clear" || payload.state === "warn" ? payload.state : "unknown";
    return { state, note: String(payload.note ?? UNKNOWN.note) };
  } catch (err) {
    /* An abort is the timeout above, not a bug worth shouting about. */
    if (err?.name !== "AbortError") console.error("read-before-publish failed", err);
    return UNKNOWN;
  } finally {
    clearTimeout(timer);
  }
}

/* Pull a saved source's own text back so it can be read. Runs under the
   admin's session, so row level security decides what comes back. */
export async function loadSourceText(sourceId) {
  /* Ordered by created_at, which is as good as this table can do, and it
     is worth knowing why it is not perfect.

     knowledge_chunks holds id, source_id, company_id, content, embedding
     and created_at. Every chunk of one file is written in a single insert,
     so they all take the same transaction timestamp and their order within
     that file is not recoverable from any column here. id is a random
     uuid, so it does not help either.

     created_at still earns its place: it keeps separate writes to the same
     source in the order they happened. And for the job this text is being
     read for, whether the document holds a card number or a salary table,
     paragraphs arriving out of order changes nothing. If a feature ever
     needs the true start of a long file, this table needs a position
     column first. */
  const { data, error } = await supabase
    .from("knowledge_chunks")
    .select("content")
    .eq("source_id", sourceId)
    .order("created_at", { ascending: true })
    .limit(12);

  if (error) {
    console.error("could not read that source back", error);
    return "";
  }
  return (data ?? []).map((row) => row.content).join("\n\n");
}
