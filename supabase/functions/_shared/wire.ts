/* ==========================================================================
   THE WIRE

   HOW TO SPEAK TO A VENDOR THAT DOES NOT SPEAK ANTHROPIC.

   WHY THIS FILE IS SEPARATE FROM brain.ts. brain.ts imports the Anthropic SDK,
   so node cannot load it without stubbing the SDK first, which is what six
   test harnesses were already doing the hard way. This module has NO imports
   at all: it is pure translation plus one fetch. That means it can be unit
   tested directly, with a faked fetch, and it cannot drag the SDK into a test.

   THE INTERNAL SHAPE IS ANTHROPIC'S, ON PURPOSE. The eight functions already
   speak Anthropic: they read `result.content`, they look for
   `block.type === "tool_use"`, and they read `usage.input_tokens`. Rather than
   rewrite eight working call sites, the adapter makes every other vendor look
   like Anthropic. One shape inside, many vendors outside.

   ⚠️ WHAT IT DOES NOT DO. It does not change any stage, prompt, gate or
   checkpoint. The search tools are still attached only in the research stage
   by assistant/index.ts, and nothing here can loosen that.

   ⚠️ OPENAI'S FORMAT IS THE SECOND ONE BECAUSE DEEPSEEK SPEAKS IT. One adapter
   covers both, and any future OpenAI-compatible vendor, which is why this is
   worth more than a DeepSeek-only shim.
   ========================================================================== */

/* Loose on purpose. These objects arrive from two different SDKs and are
   translated, so naming every field would be a typing exercise that buys
   nothing. The shapes that MATTER are asserted in the tests. */
type Json = Record<string, unknown>;
type Anthropicish = Record<string, unknown>;

/* ⚠️ A VERSION STRING, BECAUSE A LOGIC-ONLY CHANGE IS INVISIBLE TO THE DEPLOY
   CHECK. `scripts/check-deploy.mjs` proves a deployed bundle was built from a
   given source by finding that source's STRING LITERALS in it. A change that
   alters only a condition, and adds no new literal, cannot be told apart from
   the version before it. That is exactly the shape of the thinking fix below,
   so this string exists to make the difference findable.

   ⚠️ IT MUST BE OVER 40 CHARACTERS, because that is the length at which the
   check starts treating a literal as a marker. A short version string is
   extracted by nothing and proves nothing, which is how the first attempt at
   this failed.

   ⚠️ AND IT MUST BE USED, or esbuild strips it from the bundle and the check
   can never find it. It is carried on the client object returned below, which
   cannot be dropped because that object is what a caller receives. Do not
   remove it as dead code. Bump it whenever this file's behaviour changes. */
export const WIRE_VERSION = "wire-4: no thinking asked for now means thinking off";


/* --------------------------------------------------------------------------
   1. WHAT ANTHROPIC SENDS THAT OPENAI HAS NO FIELD FOR
   -------------------------------------------------------------------------- */

/* Anthropic marks content blocks for its own prompt cache with
   `cache_control`. The OpenAI format has no such field, and DeepSeek caches
   automatically with nothing to declare. Sending it anyway would be a 400 on
   some vendors and ignored on others, so it is stripped rather than passed. */
function stripCacheControl(block: Json): Json {
  const out: Json = { ...block };
  delete out.cache_control;
  return out;
}

/* --------------------------------------------------------------------------
   2. MESSAGES
   -------------------------------------------------------------------------- */

/* One Anthropic content block becomes one OpenAI content part. Only three
   kinds cross this wire in StellaXafe, and they were counted rather than
   guessed: text, a base64 image, and an image by url. */
function blockToPart(block: Json): Json | null {
  const type = block.type;

  if (type === "text") {
    return { type: "text", text: String(block.text ?? "") };
  }

  if (type === "image") {
    const source = (block.source ?? {}) as Json;
    if (source.type === "base64") {
      /* Anthropic keeps media type and bytes apart; OpenAI wants one data
         url. The media type is part of the url, not a sibling field. */
      const mt = String(source.media_type ?? "image/png");
      return { type: "image_url", image_url: { url: `data:${mt};base64,${source.data}` } };
    }
    if (source.type === "url") {
      return { type: "image_url", image_url: { url: String(source.url ?? "") } };
    }
    return null;
  }

  return null;
}

/* A tool result is a REPLY to a tool call, and the OpenAI format carries it as
   its own message with role "tool" rather than as a block inside a user turn.
   So this returns an array, not a single message: one Anthropic user turn can
   contain several tool results and each becomes its own. */
function toolResultMessages(block: Json): Json[] {
  const content = block.content;
  let text = "";
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    text = content
      .map((c) => (c && (c as Json).type === "text" ? String((c as Json).text ?? "") : ""))
      .join("");
  }
  return [{ role: "tool", tool_call_id: String(block.tool_use_id ?? ""), content: text }];
}

export function toWireMessages(
  system: unknown,
  messages: unknown,
): Json[] {
  const out: Json[] = [];

  /* Anthropic takes the system prompt as a field of its own. OpenAI takes it
     as the first message, so it is prepended here. */
  if (typeof system === "string" && system.length > 0) {
    out.push({ role: "system", content: system });
  } else if (Array.isArray(system)) {
    const text = system
      .map((b) => (b && (b as Json).type === "text" ? String((b as Json).text ?? "") : ""))
      .join("");
    if (text) out.push({ role: "system", content: text });
  }

  for (const raw of (messages ?? []) as Json[]) {
    const role = String(raw.role ?? "user");
    const content = raw.content;

    if (typeof content === "string") {
      out.push({ role, content });
      continue;
    }
    if (!Array.isArray(content)) continue;

    /* An assistant turn that called tools becomes tool_calls, which is a
       different field on the message, not content. */
    const toolUses = content.filter((b) => (b as Json).type === "tool_use") as Json[];
    const results = content.filter((b) => (b as Json).type === "tool_result") as Json[];

    if (results.length) {
      for (const r of results) out.push(...toolResultMessages(r));
      continue;
    }

    if (toolUses.length) {
      const text = content
        .filter((b) => (b as Json).type === "text")
        .map((b) => String((b as Json).text ?? ""))
        .join("");
      out.push({
        role: "assistant",
        content: text || null,
        tool_calls: toolUses.map((u) => ({
          id: String(u.id ?? ""),
          type: "function",
          function: { name: String(u.name ?? ""), arguments: JSON.stringify(u.input ?? {}) },
        })),
      });
      continue;
    }

    const parts = content
      .map((b) => blockToPart(stripCacheControl(b as Json)))
      .filter((p): p is Json => p !== null);
    if (parts.length) out.push({ role, content: parts });
  }

  return out;
}

/* --------------------------------------------------------------------------
   3. TOOLS, AND ASKING FOR ONE BY NAME
   -------------------------------------------------------------------------- */

export function toWireTools(tools: unknown): Json[] | undefined {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  return tools.map((t) => {
    const tool = t as Json;
    return {
      type: "function",
      function: {
        name: String(tool.name ?? ""),
        description: String(tool.description ?? ""),
        parameters: tool.input_schema ?? { type: "object", properties: {} },
      },
    };
  });
}

/* Six functions force one tool by name, which is how they get structured
   output back. Anthropic says `{type:"tool", name}`; OpenAI says
   `{type:"function", function:{name}}`. */
export function toWireToolChoice(choice: unknown): unknown {
  if (!choice || typeof choice !== "object") return undefined;
  const c = choice as Json;
  if (c.type === "tool") return { type: "function", function: { name: String(c.name ?? "") } };
  if (c.type === "any") return "required";
  if (c.type === "auto") return "auto";
  return undefined;
}

/* --------------------------------------------------------------------------
   4. THINKING
   -------------------------------------------------------------------------- */

/* Anthropic toggles thinking with `thinking: {type:"adaptive"|"disabled"}` and
   sets effort through `output_config`. DeepSeek toggles it with
   `thinking: {type:"enabled"|"disabled"}` and sets effort with
   `reasoning_effort`.

   ⚠️ THE RESCUE DEPENDS ON THIS. assistant/index.ts retries ONCE with
   thinking disabled when a turn spent its whole ceiling thinking and wrote
   nothing. DeepSeek does take a per-request switch, which is why that rescue
   survives a vendor change. `adaptive` and `enabled` both mean on.

   ⚠️⚠️ SENDING NOTHING MEANS TWO DIFFERENT THINGS, AND THAT BROKE SIX
   FUNCTIONS THE FIRST TIME THEY RAN. Anthropic leaves thinking OFF unless a
   request turns it on. DeepSeek turns it ON unless a request says otherwise.
   So a call that asked for no thinking got none on Anthropic and all of it on
   DeepSeek, and DeepSeek then REFUSED six of them outright:

     support model call failed Error: 400
     "Thinking mode does not support this tool_choice"

   Six of the eight functions force a tool by name and none of them sets
   thinking, so every one of them was broken the moment the company moved to
   DeepSeek. The assistant worked, which is how the fault hid: it DOES set
   thinking, and it does not force a tool.

   So the absence of a thinking request is now stated out loud as disabled.
   That is not a new opinion about the default, it is parity with the vendor
   this code was written against. A request that wants thinking says so. */
export function toWireThinking(thinking: unknown, outputConfig: unknown): Json {
  const out: Json = {};
  const t = (thinking ?? {}) as Json;

  if (t.type === "enabled" || t.type === "adaptive") out.thinking = { type: "enabled" };
  else out.thinking = { type: "disabled" };

  const effort = ((outputConfig ?? {}) as Json).effort;
  if (typeof effort === "string") out.reasoning_effort = effort;

  return out;
}

/* --------------------------------------------------------------------------
   5. THE REQUEST BODY
   -------------------------------------------------------------------------- */

export function toWireBody(params: Json, stream: boolean): Json {
  const body: Json = {
    model: params.model,
    messages: toWireMessages(params.system, params.messages),
  };

  /* DeepSeek calls it max_tokens and OpenAI now prefers
     max_completion_tokens. max_tokens is accepted by both, so one field is
     sent rather than a guess about which vendor wants which. */
  if (params.max_tokens != null) body.max_tokens = params.max_tokens;

  const tools = toWireTools(params.tools);
  if (tools) body.tools = tools;

  const choice = toWireToolChoice(params.tool_choice);
  if (choice !== undefined) body.tool_choice = choice;

  Object.assign(body, toWireThinking(params.thinking, params.output_config));

  if (stream) {
    body.stream = true;
    /* Without this the last chunk carries no usage, and the meter would charge
       nothing for the most expensive turns. */
    body.stream_options = { include_usage: true };
  }

  return body;
}

/* --------------------------------------------------------------------------
   6. THE REPLY, DRESSED AS ANTHROPIC'S
   -------------------------------------------------------------------------- */

const FINISH: Record<string, string> = {
  stop: "end_turn",
  length: "max_tokens",
  tool_calls: "tool_use",
  function_call: "tool_use",
  content_filter: "end_turn",
};

export function fromWireResponse(json: Json): Anthropicish {
  const choices = (json.choices ?? []) as Json[];
  const choice = choices[0] ?? {};
  const message = (choice.message ?? {}) as Json;

  const content: Json[] = [];
  const text = message.content;
  if (typeof text === "string" && text.length > 0) content.push({ type: "text", text });

  const calls = (message.tool_calls ?? []) as Json[];
  for (const c of calls) {
    const fn = (c.function ?? {}) as Json;
    let input: unknown = {};
    try {
      input = JSON.parse(String(fn.arguments ?? "{}"));
    } catch (_) {
      /* A model that emits malformed arguments should look like a tool call
         with nothing in it, not blow up the turn. The callers already treat a
         missing field as "no verdict". */
      input = {};
    }
    content.push({ type: "tool_use", id: String(c.id ?? ""), name: String(fn.name ?? ""), input });
  }

  const usage = (json.usage ?? {}) as Json;
  const details = (usage.prompt_tokens_details ?? {}) as Json;

  return {
    content,
    stop_reason: FINISH[String(choice.finish_reason ?? "stop")] ?? "end_turn",
    usage: {
      input_tokens: Number(usage.prompt_tokens ?? 0),
      output_tokens: Number(usage.completion_tokens ?? 0),
      /* Cached input is reported separately, and this is what makes the
         cheap rate provable in the log line. */
      cache_read_input_tokens: Number(details.cached_tokens ?? 0),
      /* ⚠️ ALWAYS ZERO, and it is not a bug. DeepSeek has no cache-write
         premium: a write bills as an ordinary miss and is already inside
         prompt_tokens. Anthropic reports it separately, which is why the
         field exists at all. */
      cache_creation_input_tokens: 0,
    },
  };
}

/* --------------------------------------------------------------------------
   7. THE CLIENT, SHAPED LIKE ANTHROPIC'S
   -------------------------------------------------------------------------- */

type TextHandler = (chunk: string) => void;

/* Deliberately tiny: only the two things any caller uses.
   `messages.create` and `messages.stream(...).on("text").finalMessage()`.
   Confirmed by reading all eight functions rather than assumed. */
export function makeOpenAiClient(baseUrl: string, apiKey: string) {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  async function create(params: Json): Promise<Anthropicish> {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(toWireBody(params, false)),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`${res.status} ${detail.slice(0, 400)}`);
    }
    return fromWireResponse((await res.json()) as Json);
  }

  function stream(params: Json) {
    const handlers: TextHandler[] = [];
    const parts: string[] = [];
    const calls = new Map<number, { id: string; name: string; args: string }>();
    let usage: Json = {};
    let finish = "stop";

    const pump = (async () => {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(toWireBody(params, true)),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(`${res.status} ${detail.slice(0, 400)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        /* Server-sent events arrive as `data: {...}` separated by blank lines.
           The tail is kept because a chunk can split a line in half. */
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          let evt: Json;
          try {
            evt = JSON.parse(payload) as Json;
          } catch (_) {
            continue;
          }
          const choices = (evt.choices ?? []) as Json[];
          const c = choices[0] ?? {};
          const delta = (c.delta ?? {}) as Json;
          if (typeof delta.content === "string" && delta.content.length > 0) {
            parts.push(delta.content);
            for (const h of handlers) h(delta.content);
          }
          /* Tool arguments stream in fragments and must be joined by index. */
          for (const tc of (delta.tool_calls ?? []) as Json[]) {
            const idx = Number(tc.index ?? 0);
            const cur = calls.get(idx) ?? { id: "", name: "", args: "" };
            if (tc.id) cur.id = String(tc.id);
            const fn = (tc.function ?? {}) as Json;
            if (fn.name) cur.name = String(fn.name);
            if (fn.arguments) cur.args += String(fn.arguments);
            calls.set(idx, cur);
          }
          if (c.finish_reason) finish = String(c.finish_reason);
          if (evt.usage) usage = evt.usage as Json;
        }
      }
    })();

    return {
      on(event: string, handler: TextHandler) {
        if (event === "text") handlers.push(handler);
        return this;
      },
      async finalMessage(): Promise<Anthropicish> {
        await pump;
        const tool_calls = [...calls.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => ({ id: v.id, type: "function", function: { name: v.name, arguments: v.args } }));
        return fromWireResponse({
          choices: [{ message: { content: parts.join(""), tool_calls }, finish_reason: finish }],
          usage,
        });
      },
    };
  }

  return { messages: { create, stream }, wireVersion: WIRE_VERSION };
}
