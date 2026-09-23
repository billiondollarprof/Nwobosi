/* A TURN THAT ONLY THOUGHT GETS ONE MORE GO, WITHOUT THINKING.

   THE BUG, 2026-09-23. Anthony pressed "Go ahead, build it" three times and
   got "The plan for this ran out of room, so nothing was built" three
   times. The logs said `usage stage=brief ... out=2000`, exactly on the
   ceiling. The model thought until the allowance was gone and never wrote
   the brief. Same input, same result, so the button was a loop.

   This runs the real streamWithRoomToWrite from the assistant function
   against a fake model that behaves the way the real one did. */

import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const SOURCE = "supabase/functions/assistant/index.ts";

/* The real function, with the remote imports cut out and Deno.serve made
   to do nothing, so the helper under test is the one that ships. */
const dir = mkdtempSync(join(tmpdir(), "room-"));
await build({
  entryPoints: [SOURCE], outfile: join(dir, "fn.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});
let code = readFileSync(join(dir, "fn.mjs"), "utf8")
  .replace(/import \{ createClient \} from "[^"]+";/, "const createClient = () => ({});")
  .replace(/import Anthropic from "[^"]+";/, "class Anthropic {}")
  .replace(/import "[^"]*edge-runtime[^"]*";/, "")
  .replace(/^import .*$/gm, "");
code = code.replace("async function streamWithRoomToWrite", "export async function streamWithRoomToWrite");
code += "\nexport { MAX_OUTPUT };\n";
writeFileSync(join(dir, "fn2.mjs"), code);
globalThis.Deno = { serve: () => {}, env: { get: () => "" } };
const realWarn = console.warn;
console.warn = () => {};

const { streamWithRoomToWrite, MAX_OUTPUT } = await import(join(dir, "fn2.mjs"));

/* A fake model. Each call is scripted: what text it writes, how it stops,
   and what it used. Every request it receives is kept, so the test can see
   whether thinking was switched off on the second go. */
function fakeModel(script) {
  const requests = [];
  return {
    requests,
    messages: {
      stream(req) {
        requests.push(req);
        const turn = script[requests.length - 1];
        const handlers = [];
        return {
          on(ev, fn) { if (ev === "text") handlers.push(fn); },
          async finalMessage() {
            for (const chunk of turn.text) handlers.forEach((h) => h(chunk));
            return { stop_reason: turn.stop, usage: turn.usage, content: [] };
          },
        };
      },
    },
  };
}

const THINKING = { thinking: { type: "adaptive" }, output_config: { effort: "high" } };
const REQ = { model: "m", max_tokens: 2000, system: [], messages: [] };
const used = (i, o) => ({ input_tokens: i, cache_creation_input_tokens: 0, cache_read_input_tokens: 100, output_tokens: o });

/* --------------------------------------------------------------------------
   1. THE BUG ITSELF: all thinking, no text, stopped on the ceiling
   -------------------------------------------------------------------------- */
{
  const model = fakeModel([
    { text: [], stop: "max_tokens", usage: used(1010, 2000) },
    { text: ["# Brief\n", "Audience: finance"], stop: "end_turn", usage: used(1010, 300) },
  ]);
  let shown = "";
  const final = await streamWithRoomToWrite(model, REQ, THINKING, "brief", (c) => { shown += c; });

  check("IT ASKS AGAIN instead of handing back nothing", model.requests.length === 2);
  check("the first go had thinking on", "thinking" in model.requests[0]);
  /* ASKS FOR THE SETTING NOW, RATHER THAN FOR ITS ABSENCE. Anthony approved
     this on 2026-09-23, option D of four. The second go used to pass an empty
     object and simply leave the thinking setting out, which only HOPES the
     model reads that as off. His logs showed it does not: the retry failed
     twice out of four, and a failed retry is billed at twice the ceiling, so
     the second go thought as well. It now says disabled outright, so this
     check is stricter than the one it replaces rather than weaker. */
  check("THE SECOND GO HAS THINKING OFF, SAID OUT LOUD",
    model.requests[1].thinking?.type === "disabled");
  check("and no effort setting either", !("output_config" in model.requests[1]));
  check("the second go keeps the same ceiling", model.requests[1].max_tokens === 2000);
  check("the person gets the brief", shown === "# Brief\nAudience: finance");
  check("it reports a clean finish, so the chat does not say ran out of room",
    final.stop_reason === "end_turn");
  check("BOTH CALLS ARE CHARGED: output added up", final.usage.output_tokens === 2300);
  check("input added up too", final.usage.input_tokens === 2020);
  check("cache reads added up too", final.usage.cache_read_input_tokens === 200);
}

/* --------------------------------------------------------------------------
   2. A NORMAL TURN IS LEFT ALONE
   -------------------------------------------------------------------------- */
{
  const model = fakeModel([{ text: ["Hello"], stop: "end_turn", usage: used(10, 5) }]);
  const final = await streamWithRoomToWrite(model, REQ, THINKING, "orient", () => {});
  check("a normal turn is one call", model.requests.length === 1);
  check("and its usage is untouched", final.usage.output_tokens === 5);
}

/* --------------------------------------------------------------------------
   3. SOME TEXT WAS WRITTEN, THEN IT RAN OUT: no second answer underneath
   -------------------------------------------------------------------------- */
{
  const model = fakeModel([{ text: ["Half a doc"], stop: "max_tokens", usage: used(10, 2000) }]);
  const final = await streamWithRoomToWrite(model, REQ, THINKING, "generate", () => {});
  check("text already on screen is not followed by a second answer", model.requests.length === 1);
  check("the chat is still told it ran out of room", final.stop_reason === "max_tokens");
}

/* --------------------------------------------------------------------------
   4. NO THINKING TO SWITCH OFF: asking again would give the same thing
   -------------------------------------------------------------------------- */
{
  const model = fakeModel([{ text: [], stop: "max_tokens", usage: used(10, 1100) }]);
  await streamWithRoomToWrite(model, REQ, {}, "orient", () => {});
  check("a level without thinking is not asked twice", model.requests.length === 1);
}

/* --------------------------------------------------------------------------
   5. THE CEILINGS THEMSELVES
   The brief at 2000 was the cause. Anybody lowering these again should
   meet this test first.
   -------------------------------------------------------------------------- */
check("brief has room to think and write (was 2000)", MAX_OUTPUT.brief >= 8000);
check("generate has room for a long document (was 8000)", MAX_OUTPUT.generate >= 16000);
check("analyse has room (it used 3162 of 4000)", MAX_OUTPUT.analyse >= 8000);
check("research has room", MAX_OUTPUT.research >= 8000);
check("orient stays low, so it cannot write a document into the chat", MAX_OUTPUT.orient <= 1100);
check("interview stays low for the same reason", MAX_OUTPUT.interview <= 1100);

/* --------------------------------------------------------------------------
   6. THE HANDLER ACTUALLY USES IT
   -------------------------------------------------------------------------- */
const src = readFileSync(SOURCE, "utf8");
check("the streamed call goes through the retry",
  /final = await streamWithRoomToWrite\(/.test(src));
check("no bare stream call is left outside the helper",
  (src.match(/anthropic\.messages\.stream\(/g) ?? []).length === 1);

console.warn = realWarn;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
