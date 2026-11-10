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
import { FUNCTIONS } from "./config.js";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/* Supabase's gateway wants both headers on every call to an edge
   function: the publishable key to say which project, and the caller's
   token to say who they are. supabase.functions.invoke adds the first
   one for you, and this file uses raw fetch so it can stream, so it has
   to add it itself. Leaving it out gets the request refused at the door,
   which the browser then reports as a connection problem, sending
   everybody looking at their wifi instead of at this line. */
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

/* --------------------------------------------------------------------------
   SECTION: A conversation has to end on their turn

   THE BUG THIS EXISTS TO STOP, 2026-09-10, seen in production on the
   preview build. The interview finished, said "Got it, that's everything I
   need", and the app immediately ran the analysis with that line appended.
   So the conversation sent to the model ended with the assistant speaking.
   The reply was a 400:

     "This model does not support assistant message prefill. The
      conversation must end with a user message."

   The person saw "The assistant could not finish that. Try again." at the
   exact moment the work should have started. Every question they had just
   answered was still there, and none of it went anywhere.

   Putting somebody's own words in their mouth to fix it was tempting and
   wrong. A made up "Go ahead." would read to the model as something they
   said. So the trailing assistant turns are simply dropped. What they
   actually said is still the last thing in the conversation, which is the
   truth, and the stage instruction in the system prompt already says what
   to do next.

   THIS SITS AT THE BOUNDARY ON PURPOSE. It could have been fixed at the one
   call site that caused it. Then the next handoff anybody writes brings it
   straight back. Every turn goes through here, so this is the one place
   that can make it impossible.
   -------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   SECTION: A turn that never comes back

   THE BUG THIS EXISTS TO STOP, 2026-09-10, seen on the preview build.
   Anthony sent a message and nothing came back. Not an error, not a
   spinner that gave up. Silence, for as long as he was willing to sit
   there. It had happened before.

   The reading loop below used to be:

     while (true) {
       const { value, done } = await reader.read();
       if (done) break;
       ...
     }

   Read that break again. The server closes the stream, the loop stops, the
   function returns, and NOBODY IS TOLD. onDone only ever fired when the
   server sent an explicit `done` event. So any ending that was not a
   polite one, the edge worker being killed at its limit, the connection
   dropping, the gateway hanging up, ended with the browser holding
   `typing = true` forever. The screen said it was working. Nothing was.

   Two things stop it now, and they are deliberately different in kind:

     1. A TERMINAL EVENT IS COMPULSORY. `settled` below tracks whether the
        caller was told anything at all. If the stream ends without a done
        or an error, this file invents one. It cannot false alarm, because
        it only ever speaks when the stream is already over and the caller
        would otherwise hear nothing.

     2. A WATCHDOG, for the other shape of the same failure: the stream
        stays open and nothing ever arrives. This one CAN false alarm, so
        it is deliberately slow, and it warns long before it gives up. A
        turn killed at 30 seconds because it was thinking hard would be a
        worse bug than the one being fixed.

   The numbers are in STALL below and the reasoning is with them.
   -------------------------------------------------------------------------- */

/* Quiet for this long and the person is TOLD it is slow, and nothing else
   happens. The turn is still running and still worth waiting for. */
const STALL_WARN_MS = 25_000;

/* Quiet for this long and it is given up on. Chosen against what the work
   actually does, not by taste:

     - `meta` is the first thing the function sends, before it calls the
       model at all, so bytes arrive almost immediately on a healthy turn.
       Silence this long means nothing is coming.
     - The research stage is the exception and gets its own number. It runs
       searches without streaming a word, and a long one with several
       continuations genuinely says nothing for minutes. Killing that would
       throw away work somebody approved and paid for. */
const STALL_GIVE_UP_MS = 120_000;
const STALL_GIVE_UP_RESEARCH_MS = 300_000;

/* A private marker for "the timer won, not the stream". An object compared
   by identity, because any string or number could in principle be a value
   the stream produced, and mistaking a chunk for a timeout would drop it. */
const TICK = Symbol("stall-tick");

function endingOnTheirTurn(list) {
  const out = [...list];
  while (out.length && out[out.length - 1].role === "assistant") out.pop();

  /* Nothing left means there was never a user turn to begin with, which is
     a different bug. Send the original and let the server say so, rather
     than sending an empty list and turning a clear error into a silent one. */
  return out.length ? out : list;
}

function sendTurnOnce({ stage = "orient", askedSoFar = 0, brief = "", findings = "", revision = false, sources = null, messages, onMeta, onText, onDone, onError, onStall }) {
  const controller = new AbortController();
  messages = endingOnTheirTurn(messages);

  /* Has the caller been told anything final yet. Every path that ends a
     turn sets this, and the read loop checks it on the way out so a stream
     that simply stops can never leave the page waiting. */
  let settled = false;
  const finish = (fn, payload) => {
    if (settled) return;
    settled = true;
    fn?.(payload);
  };

  (async () => {
    /* The caller's own session. The edge function reads who they are from
       this, never from anything the page could put in the body. */
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      finish(onError, {
        reason: "signed_out",
        message: "Sign in to keep going.",
      });
      return;
    }

    let response;
    try {
      response = await fetch(`${FUNCTIONS_BASE}/${FUNCTIONS.assistant}`, {
        method: "POST",
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage, askedSoFar, brief, findings, revision, sources, messages }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("assistant stream request failed", err);

      /* The streamed request did not even get a reply. That is almost
         never the person's connection: it is the browser refusing the
         response, or the function failing before it could answer. Ask the
         same question again through the SDK, which is not streamed and so
         is not subject to the same refusal. If that works they get their
         answer anyway, and if it does not, its error says what is really
         wrong instead of blaming their wifi. */
      const { data, error } = await supabase.functions.invoke(FUNCTIONS.assistant, {
        body: { stage, askedSoFar, brief, findings, revision, sources, messages },
      });

      if (error) {
        console.error("assistant fallback failed", error);
        finish(onError, {
          reason: "network",
          message: "The assistant did not answer. Send it again in a moment.",
        });
        return;
      }

      /* invoke gives the whole body at once. It arrives as the same event
         stream, so it is read with the same parser rather than a second
         one that could drift from it. */
      /* invoke decides how to unwrap the body from its content type, and
         an event stream is not a shape it knows, so it can arrive as
         text, a Blob, or bytes. Read all three rather than assume. */
      let whole = "";
      if (typeof data === "string") whole = data;
      else if (data instanceof Blob) whole = await data.text();
      else if (data instanceof ArrayBuffer) whole = new TextDecoder().decode(data);
      else if (data) whole = String(data);

      if (!whole.includes("event:")) {
        console.error("assistant fallback returned an unreadable body", data);
        finish(onError, { reason: "network", message: "The assistant did not answer. Send it again in a moment." });
        return;
      }

      for (const block of whole.split("\n\n")) {
        const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
        const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
        if (!eventLine || !dataLine) continue;
        let parsed;
        try {
          parsed = JSON.parse(dataLine.slice(5).trim());
        } catch {
          continue;
        }
        const event = eventLine.slice(6).trim();
        if (event === "meta") onMeta?.(parsed);
        else if (event === "text") onText?.(parsed.text);
        else if (event === "done") finish(onDone, parsed);
        else if (event === "error") finish(onError, { reason: "failed", message: parsed.reason });
      }

      /* Same rule as the streamed path: a body that carried text but never
         a done or an error still has to end the turn on screen. */
      finish(onDone, { stopReason: "end_without_done" });
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
      finish(onError, {
        reason: payload?.reason ?? "failed",
        message:
          payload?.message ??
          payload?.reason ??
          (response.status === 429
            ? "Too many requests at once. Give it a minute, then send it again."
            : "The assistant could not answer just now. Send it again in a moment."),
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

    /* THE WATCHDOG. reader.read() returns a promise that a dead connection
       never settles, so waiting on it alone is waiting for ever. Racing it
       against a timer is the only way to get control back.

       Two timers, not one. The warn fires once and only tells the person it
       is slow. The give up aborts. Both are reset by any byte at all, so a
       turn that is streaming steadily never sees either. */
    let warned = false;
    const giveUpAfter = stage === "research" ? STALL_GIVE_UP_RESEARCH_MS : STALL_GIVE_UP_MS;
    let quietSince = Date.now();

    async function readOrGiveUp() {
      /* ONE read promise, created here and raced repeatedly.

         Calling reader.read() again on each round would be the obvious
         way to write this and it would silently lose data. Concurrent
         reads are legal and they queue: five reads while waiting means
         five chunks resolve, and a race that keeps only the first winner
         throws the other four away. So the promise is made once, outside
         the loop, and the loop only ever races the same one. */
      const pending = reader.read();

      while (true) {
        const quietFor = Date.now() - quietSince;

        if (quietFor >= giveUpAfter) return { gaveUp: true };

        if (!warned && quietFor >= STALL_WARN_MS) {
          warned = true;
          onStall?.();
        }

        /* Wake up either when the chunk lands or when the next threshold is
           due, whichever comes first, so the warning is not held back until
           a chunk that may never arrive. */
        const nextCheck = warned ? giveUpAfter - quietFor : STALL_WARN_MS - quietFor;

        let timer;
        const tick = new Promise((resolve) => {
          timer = setTimeout(() => resolve(TICK), Math.max(250, nextCheck));
        });

        const winner = await Promise.race([pending, tick]);
        clearTimeout(timer);

        if (winner === TICK) continue;

        quietSince = Date.now();
        warned = false;
        return winner;
      }
    }

    try {
      while (true) {
        const result = await readOrGiveUp();

        if (result.gaveUp) {
          controller.abort();
          finish(onError, {
            reason: "stalled",
            /* Says what happened and nothing more. An earlier draft of this
               line said nothing had been charged, which this file has no way
               of knowing: the turn may well have run and billed before it
               went quiet. A comforting sentence that might be false is worse
               than a plain one that is true. */
            message: "That one stopped answering. Send it again.",
          });
          return;
        }

        const { value, done } = result;
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
          else if (event === "done") finish(onDone, data);
          else if (event === "error") finish(onError, { reason: "failed", message: data.reason });
        }
      }

      /* THE LINE THE WHOLE SECTION HEADER IS ABOUT. The loop above breaks
         when the stream ends, and until today that was the end of it: if the
         server never sent a done, the caller was never told, and the page
         sat there saying it was working.

         finish() has already fired if a done or an error came through, and
         it only speaks once, so this changes nothing about a healthy turn.
         It only catches the ending nobody sent. */
      finish(onDone, { stopReason: "end_without_done" });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("assistant stream broke", err);
      finish(onError, { reason: "stream", message: "The reply stopped partway. Try again." });
    }
  })();

  return () => controller.abort();
}

/* --------------------------------------------------------------------------
   SECTION: One quiet retry

   Anthony, 2026-11-10: "a failure says so and retries once." A turn that
   fails BEFORE a single word came back is asked again, once, on its own,
   and the person is told it is trying again (onRetry). Nothing they typed
   is lost and they do not have to press anything.

   NEVER RETRIED:
     - a turn that already showed words. Asking again would write a second
       answer underneath the first half of one.
     - a refusal that will say the same thing twice: out of budget, signed
       out, a paused account, too much to send, searching without a yes.
     - a turn the page cancelled itself.
   Only the failures that are about the connection or the model having a
   bad moment get the second go.
   -------------------------------------------------------------------------- */

const RETRY_REASONS = new Set(["network", "stalled", "stream", "failed"]);

export function sendTurn(args) {
  const { onText, onError, onRetry } = args;
  let wroteSomething = false;
  let tried = 0;
  let abortCurrent = () => {};
  let cancelled = false;

  const attempt = () => {
    tried += 1;
    abortCurrent = sendTurnOnce({
      ...args,
      onText: (t) => {
        if (t) wroteSomething = true;
        onText?.(t);
      },
      onError: (err) => {
        if (cancelled) return;
        if (tried < 2 && !wroteSomething && RETRY_REASONS.has(err?.reason)) {
          onRetry?.();
          attempt();
          return;
        }
        onError?.(err);
      },
    });
  };

  attempt();
  return () => {
    cancelled = true;
    abortCurrent();
  };
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
