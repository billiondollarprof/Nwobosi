/* Slides written at the same time (src/shared/slideParts.js). Anthony,
   2026-11-26: "Do the slides written in parallel." */
import assert from "node:assert/strict";
import { slidePlanParts, joinParts, sendTurnInParts, AT_ONCE } from "../../src/shared/slideParts.js";

let n = 0;
const t = async (name, fn) => { await fn(); n += 1; };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

const BRIEF = [
  "WHAT IS BEING MADE: a deck",
  "Slides: exactly 5",
  "Slide 1: Cover. Headline **Hotel pricing**.",
  "Slide 2: The plans, cards.",
  "- three cards",
  "Slide 3: How it works, steps.",
  "**Slide 4** - Results, a stat.",
  "Slide 5: Next step, statement.",
  "",
  "VOICE:",
  "Plain.",
].join("\n");

await t("the plan splits into its slides, each with its own lines", () => {
  const parts = slidePlanParts(BRIEF);
  assert.equal(parts.length, 5);
  assert.match(parts[1], /^Slide 2: The plans, cards\.\n- three cards$/);
  assert.match(parts[3], /Slide 4/);
  assert.ok(!parts[4].includes("VOICE"), "the last slide stops before the next part of the brief");
});
await t("fewer than four slides, or gaps, means no split", () => {
  assert.equal(slidePlanParts("Slide 1: a\nSlide 2: b\nSlide 3: c"), null);
  assert.equal(slidePlanParts("Slide 1: a\nSlide 2: b\nSlide 4: c\nSlide 5: d"), null);
  assert.equal(slidePlanParts("no slides here"), null);
});
await t("joining keeps one title, in order", () => {
  const out = joinParts(["# Deck\nLine.\n\n## One\nA", "# Deck\n## Two\nB", ":::style dark | #112233\n## Three\nC"]);
  assert.equal((out.match(/^# /gm) ?? []).length, 1);
  assert.ok(out.indexOf("## One") < out.indexOf("## Two") && out.indexOf("## Two") < out.indexOf("## Three"));
  assert.ok(!out.includes(":::style"), "only the first part may set the look");
});

/* A fake sendTurn: answers each part after a delay, slowest first. */
function fakeSend(log, { fail = -1, cutOff = -1 } = {}) {
  return (args) => {
    log.push(args.part ? `part ${args.part.index}` : "whole");
    const k = args.part ? args.part.index : 0;
    const delay = args.part ? (10 - k) * 3 : 5;
    const timer = setTimeout(() => {
      if (k === fail) return args.onError?.({ reason: "failed" });
      args.onText?.(k ? (k === 1 ? `# Deck\n\n## Slide ${k}` : `## Slide ${k}`) : "# Deck\n\n## Whole");
      args.onDone?.({ stopReason: k === cutOff ? "max_tokens" : "end_turn" });
    }, delay);
    return () => clearTimeout(timer);
  };
}

await t("at most four at once, all written, handed on in order", async () => {
  const log = []; let text = ""; let done = null;
  sendTurnInParts({ parts: ["a", "b", "c", "d", "e", "f"], send: fakeSend(log), onText: (c) => { text += c; }, onDone: (d) => { done = d; } });
  assert.equal(log.length, AT_ONCE, "four start together");
  await tick(80);
  assert.equal(log.length, 6);
  assert.equal(done?.stopReason, "end_turn");
  const order = [...text.matchAll(/## Slide (\d)/g)].map((m) => Number(m[1]));
  assert.deepEqual(order, [1, 2, 3, 4, 5, 6]);
});
await t("one slide failing before anything is shown: the deck is written whole", async () => {
  const log = []; let text = ""; let done = null;
  sendTurnInParts({ parts: ["a", "b", "c", "d"], send: fakeSend(log, { fail: 1 }), onText: (c) => { text += c; }, onDone: (d) => { done = d; } });
  await tick(80);
  assert.ok(log.includes("whole"));
  assert.equal(text, "# Deck\n\n## Whole");
  assert.equal(done?.stopReason, "end_turn");
});
await t("a slide cut off: written whole as well", async () => {
  const log = []; let text = "";
  sendTurnInParts({ parts: ["a", "b", "c", "d"], send: fakeSend(log, { cutOff: 2 }), onText: (c) => { text += c; }, onDone: () => {} });
  await tick(80);
  assert.ok(log.includes("whole"));
});

console.log(`slide parts: ${n} passed`);
