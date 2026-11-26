/* ==========================================================================
   SLIDES WRITTEN AT THE SAME TIME

   What this is: a deck written slide by slide in parallel, up to four at
   once, then joined in order. Same callbacks as sendTurn, so the chat's
   build code does not change: it just gets the deck faster.

   Why. Anthony, 2026-11-22: every stage under two minutes, the build
   included. 2026-11-26: "Do the slides written in parallel." A ten slide
   deck written in one go takes as long as all ten slides; written together
   it takes about as long as the slowest one. Presenton does the same.

   How:
     1. The approved brief already plans the deck slide by slide ("Slide 3:
        ..."). slidePlanParts reads those lines. Fewer than four slides, or
        a brief that does not number them, and nothing here is used.
     2. Each slide goes to the writing stage with the whole brief and its
        own slide (body field `part`; the server's instruction is in
        supabase/functions/assistant/index.ts, "ONE SLIDE OF A DECK").
     3. Slides are handed on in order as soon as every slide before them is
        done, so the progress lines still read top to bottom.

   What it must never do:
     - Leave someone without a deck. If any slide fails or runs out of
       room, the whole deck is written again the normal way, once.
   ========================================================================== */

import { recordStageTime } from "./stageTimes.js";

export const MIN_SLIDES = 4;
export const AT_ONCE = 4;

/* "Slide 3: ...", "**Slide 3** - ...", "- Slide 3 (Pricing): ...", "3. Slide 3". */
const SLIDE_LINE = /^[\s>*_#-]*(?:\d+[.)]\s*)?[*_]*slide\s+(\d{1,2})\b/i;

/* The brief's plan for each slide, in order, or null when it does not plan
   at least MIN_SLIDES numbered slides one after another. */
export function slidePlanParts(brief) {
  const lines = String(brief ?? "").split("\n");
  const starts = [];
  lines.forEach((line, i) => {
    const m = line.match(SLIDE_LINE);
    if (m) starts.push({ i, n: Number(m[1]) });
  });
  if (starts.length < MIN_SLIDES) return null;
  /* Numbered in order with no gaps or repeats, from 1 or 2 (a cover counted
     as slide 1 is fine either way). */
  for (let k = 1; k < starts.length; k += 1) if (starts[k].n !== starts[k - 1].n + 1) return null;
  if (starts[0].n > 2) return null;
  return starts.map((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : planEnd(lines, s.i);
    return lines.slice(s.i, end).join("\n").trim();
  });
}

/* The last slide's plan ends at a blank line followed by something that is
   not part of it (the next heading of the brief), or at the end. */
function planEnd(lines, from) {
  for (let i = from + 1; i < lines.length; i += 1) {
    if (!lines[i].trim() && i + 1 < lines.length && /^[A-Z][A-Z ,'-]{3,}:?\s*$|^#{1,3}\s/.test(lines[i + 1].trim())) return i;
  }
  return lines.length;
}

/* Joins the slides in order. A part that repeats the title is trimmed, so
   the deck has one title whatever a writer did. */
export function joinParts(texts) {
  return texts
    .map((t, k) => {
      let text = String(t ?? "").trim();
      if (k > 0) text = text.split("\n").filter((l) => !/^#\s/.test(l) && !/^:::\s*style\b/i.test(l)).join("\n").trim();
      return text;
    })
    .filter(Boolean)
    .join("\n\n");
}

/* Same arguments and callbacks as sendTurn, plus `parts` (the slide plans)
   and `send` (sendTurn itself, handed in so this file can be tested without
   a network). Returns a cancel function, as sendTurn does. */
export function sendTurnInParts({ parts, send, ...args }) {
  const startedAt = Date.now();
  const total = parts.length;
  const texts = new Array(total).fill(null);
  const cancels = [];
  let handedOn = 0;
  let next = 0;
  let failed = false;
  let finished = false;
  let fallbackCancel = null;

  const handOn = () => {
    while (handedOn < total && texts[handedOn] !== null) {
      const piece = joinParts(texts.slice(0, handedOn + 1));
      const before = handedOn ? joinParts(texts.slice(0, handedOn)) : "";
      const added = before ? piece.slice(before.length) : piece;
      if (added) args.onText?.(added);
      handedOn += 1;
    }
    if (handedOn === total && !finished) {
      finished = true;
      recordStageTime("generate", Date.now() - startedAt);
      args.onDone?.({ stopReason: "end_turn" });
    }
  };

  /* The safety net: anything goes wrong, the deck is written whole. Only
     possible while nothing has been handed on, so a half deck never gets a
     second copy written under it. */
  const fallBack = () => {
    if (failed || finished) return;
    failed = true;
    cancels.forEach((c) => c());
    if (handedOn > 0) {
      finished = true;
      args.onDone?.({ stopReason: "max_tokens" });
      return;
    }
    fallbackCancel = send(args);
  };

  const start = () => {
    if (failed || next >= total) return;
    const k = next;
    next += 1;
    let text = "";
    cancels.push(send({
      ...args,
      noRecord: true,
      part: { index: k + 1, total, plan: parts[k] },
      onMeta: k === 0 ? args.onMeta : undefined,
      onRetry: undefined,
      onStall: undefined,
      onText: (chunk) => { text += chunk; },
      onDone: ({ stopReason } = {}) => {
        if (failed) return;
        if (stopReason === "max_tokens" || !text.trim()) { fallBack(); return; }
        texts[k] = text;
        handOn();
        start();
      },
      onError: () => fallBack(),
    }));
  };

  for (let i = 0; i < Math.min(AT_ONCE, total); i += 1) start();

  return () => {
    failed = true;
    cancels.forEach((c) => c());
    fallbackCancel?.();
  };
}
