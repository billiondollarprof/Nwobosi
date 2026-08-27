/* ==========================================================================
   ASSISTANT API
   The browser half of the brain. Talks to the `assistant` edge function
   and nothing else, because that function is the only thing holding the
   API key.

   WHY NOT supabase.functions.invoke
   ---------------------------------
   invoke() buffers the whole response before handing it back, which is
   fine for a yes or no and useless for a reply that takes twenty seconds
   to write. The staff member would watch a spinner and then get a wall of
   text. So this uses fetch directly and reads the stream as it arrives,
   which is the difference between the assistant feeling like it is
   thinking and feeling like it has hung.
   ========================================================================== */

import { supabase } from "./supabase.js";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/* --------------------------------------------------------------------------
   SECTION: Send a turn
   Calls back as things happen rather than resolving once at the end.

     onMeta   which model tier actually ran, before any text arrives
     onText   each chunk, append it
     onDone   finished cleanly
     onError  a reason already written for a person to read

   Returns a function that aborts the request, so leaving the page or
   sending again does not leave a stream running and billing quietly in
   the background.
   -------------------------------------------------------------------------- */

export function sendTurn({ stage = "interview", messages, onMeta, onText, onDone, onError }) {
  const controller = new AbortController();

  (async () => {
    /* The caller's own session. The edge function reads who they are from
       this, never from anything the page could put in the body. */
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      onError?.({
        reason: "signed_out",
        message: "Sign in to keep going.",
      });
      return;
    }

    let response;
    try {
      response = await fetch(`${FUNCTIONS_BASE}/assistant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage, messages }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("assistant fetch failed", err);
      onError?.({ reason: "network", message: "Could not reach the assistant. Check your connection." });
      return;
    }

    /* A refusal arrives as normal JSON with a status, not as a stream.
       Out of budget is the one worth naming, because it is not a fault
       and the message attached to it is a sales moment rather than an
       error. */
    if (!response.ok || !response.body) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        /* not JSON, fall through to the generic message */
      }
      onError?.({
        reason: payload?.reason ?? "failed",
        message: payload?.message ?? payload?.reason ?? "The assistant could not answer. Try again.",
      });
      return;
    }

    /* ------------------------------------------------------------------
       READ THE STREAM
       Server sent events arrive as blocks separated by a blank line. A
       chunk can split anywhere, including mid event, so whatever is left
       after the last blank line stays in the buffer for the next chunk
       rather than being parsed as if it were complete.
       ------------------------------------------------------------------ */

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
          const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(6).trim();
          let data;
          try {
            data = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }

          if (event === "meta") onMeta?.(data);
          else if (event === "text") onText?.(data.text);
          else if (event === "done") onDone?.(data);
          else if (event === "error") onError?.({ reason: "failed", message: data.reason });
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("assistant stream broke", err);
      onError?.({ reason: "stream", message: "The reply stopped partway. Try again." });
    }
  })();

  return () => controller.abort();
}

/* --------------------------------------------------------------------------
   SECTION: Turning chat state into what the API wants
   The page keeps richer message objects than the API takes, so this is
   the one place that shape is translated. Anything the model should not
   see, ids and feedback, is dropped here rather than being quietly
   carried along.

   `apiContent` is the exception, and the reason this is not a one liner.
   A turn where someone attached a file shows them a short line and a file
   chip, while the model needs that line plus the file's actual contents.
   Preferring apiContent is what keeps a handed over file readable on every
   later turn, not just the one it arrived on.
   -------------------------------------------------------------------------- */

export function toApiMessages(messages) {
  return messages
    .map((m) => ({ role: m.role, content: m.apiContent ?? m.content }))
    .filter((m) => {
      if (m.role !== "user" && m.role !== "assistant") return false;
      /* A turn carrying a screenshot is a list of blocks rather than a
         string, so emptiness has to be checked both ways. */
      if (Array.isArray(m.content)) return m.content.length > 0;
      return typeof m.content === "string" && m.content.trim().length > 0;
    });
}
