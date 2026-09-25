/* ==========================================================================
   THE WIRE, TESTED WITHOUT A NETWORK

   WHAT THIS PROVES AND WHAT IT DOES NOT.
   It proves the translation: what goes out for each vendor, and what comes
   back inside the shape the eight functions already read. It does NOT prove
   DeepSeek's real reply matches these fakes, because this container cannot
   read the DEEPSEEK_API_KEY secret (the token here is Logs only). The live
   proof is one real turn after the code is deployed, and that is said plainly
   rather than implied.

   WHY IT CAN BE TESTED AT ALL. `_shared/wire.ts` has no imports, so node can
   load it directly. brain.ts cannot be loaded this way because it imports the
   Anthropic SDK, which is why the interesting logic lives in wire.ts.
   ========================================================================== */

import { build } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* ⚠️ THE MODULE IS BUILT FIRST, BECAUSE NODE CANNOT IMPORT A .ts FILE.
   No imports are stubbed here for the same reason wire.ts needs none: the
   translation is pure and the only outside thing it touches is fetch, which
   the client tests replace. */
const dir = mkdtempSync(join(tmpdir(), "wire-"));
await build({
  entryPoints: ["supabase/functions/_shared/wire.ts"],
  outfile: join(dir, "wire.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});
const {
  fromWireResponse, makeOpenAiClient, toWireBody, toWireMessages,
  toWireThinking, toWireToolChoice, toWireTools,
} = await import(join(dir, "wire.mjs"));

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* --------------------------------------------------------------------------
   1. MESSAGES
   -------------------------------------------------------------------------- */

const sysMsgs = toWireMessages("You are Stella.", [{ role: "user", content: "hello" }]);
check("the system prompt becomes the first message",
  eq(sysMsgs[0], { role: "system", content: "You are Stella." }));
check("and the user turn follows it", eq(sysMsgs[1], { role: "user", content: "hello" }));

const sysBlocks = toWireMessages([{ type: "text", text: "A" }, { type: "text", text: "B" }], []);
check("a system prompt given as blocks is joined",
  eq(sysBlocks[0], { role: "system", content: "AB" }));

const img = toWireMessages(null, [{
  role: "user",
  content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "AAA" } }],
}]);
check("a base64 image becomes a data url",
  img[0].content[0].image_url.url === "data:image/png;base64,AAA");

const urlImg = toWireMessages(null, [{
  role: "user",
  content: [{ type: "image", source: { type: "url", url: "https://x/y.png" } }],
}]);
check("an image by url stays a url",
  urlImg[0].content[0].image_url.url === "https://x/y.png");

const cached = toWireMessages(null, [{
  role: "user",
  content: [
    { type: "text", text: "hi", cache_control: { type: "ephemeral", ttl: "1h" } },
  ],
}]);
check("cache_control is stripped, because the OpenAI format has no such field",
  cached[0].content[0].cache_control === undefined && cached[0].content[0].text === "hi");

const asstTool = toWireMessages(null, [{
  role: "assistant",
  content: [{ type: "tool_use", id: "t1", name: "verdict", input: { ok: true } }],
}]);
check("an assistant tool call becomes tool_calls, not content",
  asstTool[0].role === "assistant" && asstTool[0].tool_calls[0].function.name === "verdict" &&
  asstTool[0].tool_calls[0].function.arguments === '{"ok":true}');

const toolRes = toWireMessages(null, [{
  role: "user",
  content: [{ type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text: "found" }] }],
}]);
check("a tool result becomes its own message with role tool",
  toolRes[0].role === "tool" && toolRes[0].tool_call_id === "t1" && toolRes[0].content === "found");

/* --------------------------------------------------------------------------
   2. TOOLS AND FORCED CHOICE
   -------------------------------------------------------------------------- */

const tools = toWireTools([{
  name: "verdict", description: "Say what you think.",
  input_schema: { type: "object", properties: { ok: { type: "boolean" } } },
}]);
check("a tool becomes a function tool, with the schema renamed",
  tools[0].type === "function" && tools[0].function.name === "verdict" &&
  tools[0].function.parameters.type === "object");
check("no tools means the field is omitted, not sent empty",
  toWireTools([]) === undefined && toWireTools(undefined) === undefined);

check("forcing a tool by name is translated",
  eq(toWireToolChoice({ type: "tool", name: "verdict" }), { type: "function", function: { name: "verdict" } }));
check("any becomes required, auto stays auto",
  toWireToolChoice({ type: "any" }) === "required" && toWireToolChoice({ type: "auto" }) === "auto");

/* --------------------------------------------------------------------------
   3. THINKING, WHICH THE RESCUE DEPENDS ON
   -------------------------------------------------------------------------- */

check("adaptive thinking means on", eq(toWireThinking({ type: "adaptive" }, null), { thinking: { type: "enabled" } }));
check("the rescue's disabled survives the translation",
  eq(toWireThinking({ type: "disabled" }, null), { thinking: { type: "disabled" } }));

/* ⚠️⚠️ THE BUG THIS GUARDS, AND IT REACHED A REAL PERSON.
   Anthropic leaves thinking OFF unless a request turns it on. DeepSeek turns
   it ON unless a request says otherwise. So a call that asked for no thinking
   got none on Anthropic and all of it on DeepSeek, and DeepSeek refused it:

     support model call failed Error: 400
     "Thinking mode does not support this tool_choice"

   Six of the eight functions force a tool by name and none sets thinking, so
   every one of them broke the moment a company moved to DeepSeek. The
   assistant hid it, because it does set thinking and does not force a tool.
   Asking for nothing must mean OFF. */
check("no thinking asked for means OFF, to match Anthropic's default",
  eq(toWireThinking(undefined, undefined), { thinking: { type: "disabled" } }));
check("and an explicitly disabled request still means off",
  eq(toWireThinking({ type: "disabled" }, undefined), { thinking: { type: "disabled" } }));
check("effort is carried across as reasoning_effort",
  toWireThinking({ type: "adaptive" }, { effort: "high" }).reasoning_effort === "high");

/* --------------------------------------------------------------------------
   4. THE WHOLE BODY
   -------------------------------------------------------------------------- */

const body = toWireBody({
  model: "deepseek-flash", max_tokens: 300, system: "S",
  messages: [{ role: "user", content: "u" }],
  tools: [{ name: "verdict", input_schema: { type: "object" } }],
  tool_choice: { type: "tool", name: "verdict" },
  thinking: { type: "adaptive" }, output_config: { effort: "high" },
}, false);
check("a full request carries model, messages, tools and thinking",
  body.model === "deepseek-flash" && body.max_tokens === 300 &&
  body.messages[0].role === "system" && body.tools[0].function.name === "verdict" &&
  body.tool_choice.function.name === "verdict" && body.thinking.type === "enabled" &&
  body.reasoning_effort === "high");
check("a non-streaming request does not ask for a stream", body.stream === undefined);

const sbody = toWireBody({ model: "m", messages: [] }, true);
check("a streaming request asks for usage in the last chunk, or the meter charges nothing",
  sbody.stream === true && sbody.stream_options.include_usage === true);

/* THE EXACT SHAPE THAT WAS REFUSED IN PRODUCTION: a forced tool and no thinking
   asked for. This is the body support-ask builds, and the vendors' disagreement
   about the default is what turned it into a 400. */
const forced = toWireBody({
  model: "deepseek-flash",
  messages: [{ role: "user", content: "u" }],
  tools: [{ name: "reply", input_schema: { type: "object" } }],
  tool_choice: { type: "tool", name: "reply" },
}, false);
check("a forced tool no longer collides with thinking, which is what broke support",
  forced.thinking.type === "disabled" && forced.tool_choice.function.name === "reply");

/* --------------------------------------------------------------------------
   5. THE REPLY, DRESSED AS ANTHROPIC'S
   -------------------------------------------------------------------------- */

const textReply = fromWireResponse({
  choices: [{ message: { content: "hello" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 10, completion_tokens: 4 },
});
check("text comes back as a text block", textReply.content[0].type === "text" && textReply.content[0].text === "hello");
check("stop maps to end_turn", textReply.stop_reason === "end_turn");
check("usage maps to Anthropic's names",
  textReply.usage.input_tokens === 10 && textReply.usage.output_tokens === 4);

const toolReply = fromWireResponse({
  choices: [{
    message: { tool_calls: [{ id: "c1", function: { name: "verdict", arguments: '{"ok":false,"note":"bad"}' } }] },
    finish_reason: "tool_calls",
  }],
  usage: { prompt_tokens: 5, completion_tokens: 2 },
});
check("a tool call comes back as tool_use, with the arguments parsed",
  toolReply.content[0].type === "tool_use" && toolReply.content[0].name === "verdict" &&
  toolReply.content[0].input.ok === false && toolReply.content[0].input.note === "bad");
check("tool_calls maps to tool_use", toolReply.stop_reason === "tool_use");

const badJson = fromWireResponse({
  choices: [{ message: { tool_calls: [{ id: "c", function: { name: "v", arguments: "{not json" } }] }, finish_reason: "tool_calls" }],
});
check("malformed tool arguments become an empty input rather than throwing",
  typeof badJson.content[0].input === "object" && Object.keys(badJson.content[0].input).length === 0);

const cachedReply = fromWireResponse({
  choices: [{ message: { content: "x" }, finish_reason: "length" }],
  usage: { prompt_tokens: 100, completion_tokens: 9, prompt_tokens_details: { cached_tokens: 80 } },
});
check("cached input is reported, which is what makes the cheap rate provable",
  cachedReply.usage.cache_read_input_tokens === 80);
check("cache write is always zero for this vendor, and that is not a bug",
  cachedReply.usage.cache_creation_input_tokens === 0);
check("length maps to max_tokens, which is what the rescue watches for",
  cachedReply.stop_reason === "max_tokens");

/* --------------------------------------------------------------------------
   6. THE CLIENT ITSELF
   -------------------------------------------------------------------------- */

const calls = [];
function fakeFetch(body, { status = 200, sse = null } = {}) {
  return async (url, init) => {
    calls.push({ url, init, sent: JSON.parse(init.body) });
    if (sse) {
      const enc = new TextEncoder();
      const stream = new ReadableStream({
        start(c) { for (const chunk of sse) c.enqueue(enc.encode(chunk)); c.close(); },
      });
      return new Response(stream, { status, headers: { "Content-Type": "text/event-stream" } });
    }
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}

const realFetch = globalThis.fetch;

globalThis.fetch = fakeFetch({
  choices: [{ message: { content: "hi" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 3, completion_tokens: 2 },
});
const client = makeOpenAiClient("https://api.deepseek.com", "KEY");
const made = await client.messages.create({ model: "deepseek-flash", messages: [{ role: "user", content: "u" }] });
check("create posts to the vendor's chat completions path",
  calls[0].url === "https://api.deepseek.com/chat/completions");
check("and sends the key as a bearer token",
  calls[0].init.headers.Authorization === "Bearer KEY");
check("and returns a message with the text in it", made.content[0].text === "hi");

globalThis.fetch = fakeFetch(null, {
  sse: [
    'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":7,"completion_tokens":3}}\n\n',
    "data: [DONE]\n\n",
  ],
});
const streamed = [];
const run = client.messages.stream({ model: "deepseek-flash", messages: [] });
run.on("text", (c) => streamed.push(c));
const final = await run.finalMessage();
check("streamed text arrives at the handler as it comes",
  eq(streamed, ["Hel", "lo"]));
check("and the final message holds the whole text", final.content[0].text === "Hello");
check("and the usage from the last chunk is kept, or the turn would bill nothing",
  final.usage.input_tokens === 7 && final.usage.output_tokens === 3);

globalThis.fetch = fakeFetch(null, {
  sse: [
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"verdict","arguments":"{\\"ok\\":"}}]}}]}\n\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"true}"}}]}}]}\n\n',
    'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":1,"completion_tokens":1}}\n\n',
  ],
});
const run2 = client.messages.stream({ model: "m", messages: [] });
const final2 = await run2.finalMessage();
check("tool arguments split across chunks are joined back together",
  final2.content[0].type === "tool_use" && final2.content[0].input.ok === true);

globalThis.fetch = async () => new Response("boom", { status: 400 });
let threw = null;
try { await client.messages.create({ model: "m", messages: [] }); } catch (e) { threw = String(e); }
check("an http error is raised with the status and the vendor's own words",
  threw != null && threw.includes("400") && threw.includes("boom"));

globalThis.fetch = realFetch;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
