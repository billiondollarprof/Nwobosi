/* ==========================================================================
   SEARCH

   Finding pages on the web, and reading them, for ANY vendor.

   WHY THIS FILE EXISTS, 2026-09-25
   --------------------------------
   The research stage used to borrow Anthropic's own hosted tools,
   `web_search_20260209` and `web_fetch_20260209`. Anthropic ran the search
   on its side and handed back `web_search_tool_result` blocks, and the loop
   read the sources out of those blocks.

   That works, and it only works on Anthropic. Amara was moved onto DeepSeek
   and the search stopped doing anything at all: the adapter sent the two
   hosted tools as ordinary function tools, DeepSeek answered with a tool
   call, the stop reason was not `pause_turn`, so the loop broke on its first
   round. No result block ever arrived. No error, no crash, nothing in the
   logs. The person got the preamble, or "I searched and found nothing usable
   for this", and neither of them says the search did not happen.

   Anthony, 2026-09-25: "give it the search tool and can't there be a search
   tool usable for any model not just anthropic or DeepSeek". Yes, and this
   is it. The search is ours now: the model asks, this file does the work,
   and the answer goes back as a normal tool result. Same code for every
   vendor, so search cannot work on one company's brain and silently fail on
   the next one's.

   WHAT IT MUST NEVER DO
   ---------------------
   - NEVER invent a source. Every address the person is shown comes out of a
     result this file actually received, or a page it actually opened. The
     whole product turns on the read back being true.
   - NEVER fetch an address inside the network this runs in. `readPage`
     refuses private hosts and checks every redirect hop, because both the
     model and a public page can point at one.
   - NEVER pull a whole site into context. A search returns short snippets and
     a page returns capped text. The old hosted search billed 549,000 tokens
     of context for one search, which cost 45.8 cents. That was the results
     arriving whether or not they were read, and this file does not do it.
   - NEVER become an Anthropic-only or DeepSeek-only thing again. A provider
     is a setting, not a branch in the stage.

   THE PROVIDER IS PLUGGABLE, LIKE THE BRAIN
   -----------------------------------------
   A company deployed on its own may want the search to be one they pay for
   and can hold to an SLA. So the provider is chosen by an environment
   variable and the default needs nothing at all.

     SEARCH_PROVIDER=keyless   (default) no account, no key, no cost
     SEARCH_PROVIDER=brave     needs BRAVE_API_KEY
     SEARCH_PROVIDER=tavily    needs TAVILY_API_KEY

   ⚠️ THE KEYLESS DEFAULT IS FOR QUICK RESEARCH, AND IT IS NOT THE END STATE.
   Recorded on Anthony's instruction: "while deploying for clients we would be
   including others for better results." It was tested across geopolitical
   zones on 2026-09-25 and answered all of them (Nigeria, the UK, the US,
   India, Brazil, the Gulf, and a technical query) with ten results each in
   about 600ms, with no region blocking and no throttling. Its weakness is
   real and worth knowing: it leans on statistics aggregators such as
   worldmetrics, wifitalents and gitnux alongside the genuine sources. The
   research prompt already handles that, because it requires following a lead
   back to whoever published it first, but a paying customer should be moved
   onto Brave or Tavily.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: Which provider, and is it usable

   Missing keys are answered here rather than at the call site, so a stage
   can ask once and get a plain answer it can act on.
   -------------------------------------------------------------------------- */

export type SearchProvider = "keyless" | "brave" | "tavily";

/** A long marker for `scripts/check-deploy.mjs` (it matches long literals). */
export const SEARCH_VERSION =
  "search-1: the search runs in this function for every vendor, and every address shown comes from a result actually received";

const PROVIDERS: SearchProvider[] = ["keyless", "brave", "tavily"];

/** The key each provider needs. Keyless needs nothing, which is the point. */
const KEY_NAME: Record<SearchProvider, string | null> = {
  keyless: null,
  brave: "BRAVE_API_KEY",
  tavily: "TAVILY_API_KEY",
};

export function providerName(): SearchProvider {
  const asked = (Deno.env.get("SEARCH_PROVIDER") ?? "").trim().toLowerCase();
  return (PROVIDERS as string[]).includes(asked) ? (asked as SearchProvider) : "keyless";
}

function keyFor(provider: SearchProvider): string | undefined {
  const name = KEY_NAME[provider];
  if (!name) return undefined;
  const value = Deno.env.get(name)?.trim();
  return value ? value : undefined;
}

/** True when this provider can actually run right now. */
export function providerReady(provider = providerName()): boolean {
  return KEY_NAME[provider] === null || Boolean(keyFor(provider));
}

/** One line per provider, for a log line or a handover note. */
export function describeProviders(): string {
  return PROVIDERS.map((p) => {
    const name = KEY_NAME[p];
    const state = name === null ? "ready, needs no key" : keyFor(p) ? "ready" : `missing ${name}`;
    return `${p}: ${state}`;
  }).join("; ");
}

/* --------------------------------------------------------------------------
   SECTION 2: A result, and the shape every provider is normalised into

   Nothing outside this file knows which provider answered. That is what
   makes the choice a setting.
   -------------------------------------------------------------------------- */

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchOutcome = {
  ok: boolean;
  hits: SearchHit[];
  provider: SearchProvider;
  /** Written for a log, never for the person. The model gets the hits. */
  reason?: string;
};

const SEARCH_TIMEOUT_MS = 15000;
const MAX_HITS = 10;
const USER_AGENT = "StellaXafe/1.0 (+https://stellaxafe.com)";

/* Numeric entities, which the named ones below do not cover. A real search
   page carried `&#x27;` where an apostrophe belonged and it was reaching the
   model raw, which reads as a stray code in the middle of a sentence.
   `String.fromCodePoint` throws on a value out of range, so a malformed one
   keeps its original text rather than taking the whole search down. */
function safeCodePoint(value: number, fallback: string): string {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
}

function decodeNumericEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]{1,6});/gi, (whole, hex: string) => safeCodePoint(parseInt(hex, 16), whole))
    .replace(/&#(\d{1,7});/g, (whole, dec: string) => safeCodePoint(Number(dec), whole));
}

function tidy(value: unknown, limit: number): string {
  const text = decodeNumericEntities(String(value ?? ""));
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/* --------------------------------------------------------------------------
   SECTION 3: The keyless provider

   DuckDuckGo, which needs no account, no key and no bill. Its result links
   come back wrapped in a redirect of its own, so they are unwrapped here: an
   address shown to a person must be the address of the thing itself.

   TWO ENDPOINTS, AND THAT IS NOT DECORATION. Measured on 2026-09-25, this
   provider answers perfectly from an ordinary network and was refused from
   the edge runtime the function actually runs in. DuckDuckGo rate limits
   datacentre addresses, and Supabase's edge is one. So the second endpoint is
   tried before giving up, and every attempt is recorded in the failure, which
   is how the block was identified rather than guessed at.

   ⚠️ THE KEYLESS PROVIDER ALONE IS NOT ENOUGH FOR A PAYING CUSTOMER. Set
   `SEARCH_PROVIDER` to brave or tavily and give it a key. See the file
   header. The failure below says which of the two happened, so a block can
   never be mistaken for "nothing is published on this".
   -------------------------------------------------------------------------- */

/** Reads an attribute whichever way it is quoted. The two endpoints differ. */
function attr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i"));
  if (!match) return "";
  return match[1].replace(/^["']|["']$/g, "");
}

function unwrapResultLink(href: string): string {
  const raw = href.trim();
  if (!raw) return "";

  /* Scheme relative, which is how these arrive. */
  const absolute = raw.startsWith("//") ? `https:${raw}` : raw;

  try {
    const parsed = new URL(absolute, "https://duckduckgo.com");
    const wrapped = parsed.searchParams.get("uddg");
    const target = wrapped ?? parsed.toString();

    /* ⚠️ THE UNWRAPPED ADDRESS IS CHECKED TOO, AND THAT IS THE POINT. The
       lite page's advertisements carry the same `result-link` class as a real
       result, and their wrapper unwraps to `duckduckgo.com/y.js?ad_domain=...`
       rather than to the advertiser. Checking only the outer address let two
       adverts through as if they were sources on 2026-09-25. An advertisement
       is not evidence, and this product must never present one as if it were. */
    const final = new URL(target, "https://duckduckgo.com");

    if (/(^|\.)duckduckgo\.com$/.test(final.hostname)) return "";
    if (final.protocol !== "http:" && final.protocol !== "https:") return "";
    return final.toString();
  } catch {
    return "";
  }
}

/** Exported for the tests: the page is parsed, not the network.

    One parser for both endpoints, because the order is the only thing that
    ties a snippet to its result. The full page marks a result with
    `class="result__a"` and puts its snippet in an anchor of its own; the lite
    page marks one with `class='result-link'`, in single quotes, with the
    address BEFORE the class, and puts the snippet in a table cell.

    ⚠️ THE TWO SHAPES ARE MATCHED SEPARATELY AND THEN PUT IN DOCUMENT ORDER.
    They cannot be one alternation: a `<td>` that contains a result swallows
    the anchor inside it, so the result is never seen at all. Sorting by the
    position each match starts at gives the real reading order without either
    shape hiding the other.

    ⚠️ COUNTING WAS WRONG, AND IT WAS CAUGHT BY A TEST ON 2026-09-25. The
    first version collected the results and the snippets into two lists and
    paired them by index. An advert is dropped as a result, because an advert
    is not evidence, but its SNIPPET was still counted. So every snippet after
    an advert was attached to the wrong address, which shows a source against
    a claim it does not make. Pairing in document order is what makes an
    advert's snippet land on nothing instead of on somebody else's page. */
export function parseKeylessResults(html: string, limit = MAX_HITS): SearchHit[] {
  const LINK_CLASSES = /(^|\s)(result__a|result-link)(\s|$)/;
  const SNIPPET_CLASSES = /(^|\s)(result__snippet|result-snippet)(\s|$)/;

  type Token = { at: number; isSnippet: boolean; attrs: string; inner: string };
  const tokens: Token[] = [];

  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html))) {
    const classes = attr(match[1], "class");
    if (LINK_CLASSES.test(classes)) {
      tokens.push({ at: match.index, isSnippet: false, attrs: match[1], inner: match[2] });
    } else if (SNIPPET_CLASSES.test(classes)) {
      tokens.push({ at: match.index, isSnippet: true, attrs: match[1], inner: match[2] });
    }
  }

  /* Cells only, and only a cell that names itself a snippet. A cell with no
     result class is a container and nothing more, so reading its contents is
     left to the anchor pass above. */
  const cellRe = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi;
  while ((match = cellRe.exec(html))) {
    if (SNIPPET_CLASSES.test(attr(match[1], "class"))) {
      tokens.push({ at: match.index, isSnippet: true, attrs: match[1], inner: match[2] });
    }
  }

  tokens.sort((a, b) => a.at - b.at);

  const found: SearchHit[] = [];

  for (const token of tokens) {
    if (token.isSnippet) {
      /* The snippet goes on the result above it, and on nothing at all if
         there is no result above it. An orphan snippet belongs to something
         that was dropped, and giving it to the next page instead would put a
         source against a claim it does not make. */
      const last = found[found.length - 1];
      if (last && !last.snippet) last.snippet = tidy(token.inner, 400);
      continue;
    }

    const url = unwrapResultLink(attr(token.attrs, "href"));
    const title = tidy(token.inner, 200);
    if (url && title) found.push({ url, title, snippet: "" });
  }

  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const hit of found) {
    if (hits.length >= limit) break;
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    hits.push(hit);
  }

  return hits;
}

const KEYLESS_ENDPOINTS = [
  { label: "html", url: (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}` },
  { label: "lite", url: (q: string) => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}` },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function keylessSearch(query: string, limit: number): Promise<SearchHit[]> {
  /* What each attempt actually did, carried into the failure. A bare "it
     failed" is what made the original DeepSeek hole invisible for a day. */
  const attempts: string[] = [];

  for (const endpoint of KEYLESS_ENDPOINTS) {
    for (let tries = 0; tries < 2; tries += 1) {
      try {
        const response = await fetch(endpoint.url(query), {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html", "Accept-Language": "en-GB,en;q=0.9" },
          signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        });

        const html = await response.text();
        const hits = parseKeylessResults(html, limit);

        if (hits.length) return hits;

        /* A rate limit answers 200 with a page that has no results in it, so
           an empty parse is reported with what came back rather than as "no
           matches". Those are two different facts and the model must not be
           told either one when the other is true. */
        const blocked = /anomaly|unusual traffic|rate limit|too many requests/i.test(html);
        attempts.push(`${endpoint.label}:${response.status}/${Math.round(html.length / 1000)}k/${blocked ? "blocked" : "no-results"}`);

        /* One short pause before the second try, because a throttle is
           usually a rate and not a wall. */
        if (tries === 0) await sleep(600);
      } catch (error) {
        attempts.push(`${endpoint.label}:${error instanceof Error ? error.name : "error"}`);
        if (tries === 0) await sleep(600);
      }
    }
  }

  throw new Error(`every keyless search endpoint refused or returned nothing (${attempts.join(", ")})`);
}

/* --------------------------------------------------------------------------
   SECTION 4: The paid providers

   Same normalised shape, so nothing above this line changes when one is
   switched on.
   -------------------------------------------------------------------------- */

async function braveSearch(query: string, limit: number, key: string): Promise<SearchHit[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`brave answered with ${response.status}`);
  const body = await response.json() as { web?: { results?: Record<string, unknown>[] } };

  return (body.web?.results ?? []).slice(0, limit).map((row) => ({
    title: tidy(row.title, 200),
    url: String(row.url ?? ""),
    snippet: tidy(row.description, 400),
  })).filter((hit) => hit.url && hit.title);
}

async function tavilySearch(query: string, limit: number, key: string): Promise<SearchHit[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: limit,
      search_depth: "basic",
      include_answer: false,
    }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`tavily answered with ${response.status}`);
  const body = await response.json() as { results?: Record<string, unknown>[] };

  return (body.results ?? []).slice(0, limit).map((row) => ({
    title: tidy(row.title, 200),
    url: String(row.url ?? ""),
    snippet: tidy(row.content, 400),
  })).filter((hit) => hit.url && hit.title);
}

/* --------------------------------------------------------------------------
   SECTION 5: The one search every vendor gets

   It never throws. A search that failed comes back as `ok: false` with a
   reason, because the stage has to be able to tell the model "that search
   failed" instead of "there is nothing on this subject". Reporting the first
   as the second is how a document ends up with a made up number in it.
   -------------------------------------------------------------------------- */

export async function webSearch(
  query: string,
  { limit = MAX_HITS }: { limit?: number } = {},
): Promise<SearchOutcome> {
  const provider = providerName();
  const wanted = Math.max(1, Math.min(limit, MAX_HITS));
  const clean = String(query ?? "").replace(/\s+/g, " ").trim();

  if (!clean) {
    return { ok: false, hits: [], provider, reason: "empty query" };
  }
  if (clean.length > 400) {
    return { ok: false, hits: [], provider, reason: "query too long" };
  }

  const key = keyFor(provider);
  if (KEY_NAME[provider] !== null && !key) {
    return { ok: false, hits: [], provider, reason: `${KEY_NAME[provider]} is not set` };
  }

  try {
    let hits: SearchHit[] = [];
    if (provider === "brave") hits = await braveSearch(clean, wanted, key!);
    else if (provider === "tavily") hits = await tavilySearch(clean, wanted, key!);
    else hits = await keylessSearch(clean, wanted);

    /* Addresses that point inside the network are dropped here as well as in
       readPage, so a bad one can never reach the model in the first place. */
    const safe = hits.filter((hit) => {
      try {
        return normaliseUrl(hit.url) !== null;
      } catch {
        return false;
      }
    });

    return { ok: true, hits: safe, provider };
  } catch (error) {
    return {
      ok: false,
      hits: [],
      provider,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/* --------------------------------------------------------------------------
   SECTION 6: Reading a page

   Lifted from `add-link`, which has opened pages for the knowledge base since
   it shipped, and is deliberately the same code rather than a second version
   that can drift from it. The guards matter here MORE than they do there,
   because the address now comes from a search result and from a model,
   neither of which a person chose.
   -------------------------------------------------------------------------- */

const FETCH_TIMEOUT_MS = 10000;
const MAX_PAGE_CHARS = 60000;

/** Refuses anything that is not a public address. See `add-link`. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (!host.includes(".") && !host.includes(":")) return true;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }

  if (/^(fc|fd|fe80)/.test(host)) return true;
  return false;
}

/** An address made safe to fetch, or null. */
export function normaliseUrl(raw: string): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (isPrivateHost(parsed.hostname)) return null;
  return parsed.toString();
}

/** Exported for the tests. No parser library, same reasoning as `add-link`. */
export function htmlToText(html: string): string {
  let text = html;

  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  text = text.replace(/<\/(p|div|section|article|h[1-6]|li|tr|blockquote)>/gi, "\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");

  text = decodeNumericEntities(text);

  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, " ");

  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export function titleFrom(html: string, url: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/\s+/g, " ").trim();
  if (title) return title.slice(0, 160);
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`.slice(0, 160);
  } catch {
    return url.slice(0, 160);
  }
}

export type PageOutcome =
  | { ok: true; url: string; title: string; text: string; truncated: boolean }
  | { ok: false; reason: string };

export async function readPage(
  rawUrl: string,
  { maxChars = MAX_PAGE_CHARS }: { maxChars?: number } = {},
): Promise<PageOutcome> {
  const url = normaliseUrl(rawUrl);
  if (!url) return { ok: false, reason: "that address is not one this can open" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    /* Redirects are followed by hand, checking every hop. Letting fetch follow
       them would allow a public address to bounce straight to a private one,
       which is the guard above reopened by the fetch itself. */
    let current = url;
    let response: Response | null = null;

    for (let hop = 0; hop < 5; hop += 1) {
      response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT },
      });

      if (response.status < 300 || response.status >= 400) break;

      const next = response.headers.get("location");
      if (!next) break;

      const resolved = normaliseUrl(new URL(next, current).toString());
      if (!resolved) return { ok: false, reason: "that address redirects somewhere this will not follow" };

      current = resolved;
      response = null;
    }

    if (!response) return { ok: false, reason: "that address redirected too many times" };
    if (!response.ok) return { ok: false, reason: `the page answered with ${response.status}` };

    const type = response.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/json|text\/markdown/i.test(type)) {
      return { ok: false, reason: "that address is not a page this can read" };
    }

    const body = await response.text();

    /* JSON is handed over as it is. It is already text and the model reads it
       better than a stripped version of it. */
    const text = /application\/json/i.test(type)
      ? body.slice(0, maxChars).trim()
      : htmlToText(body).slice(0, maxChars);

    if (text.length < 80) {
      return { ok: false, reason: "that page had almost no readable text" };
    }

    return {
      ok: true,
      url: current,
      title: titleFrom(body, current),
      text,
      truncated: text.length >= maxChars,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, reason: aborted ? "that page took too long to answer" : "that page could not be opened" };
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------------------------------------------------
   SECTION 7: What the model is offered

   Plain function tools, in the shape every vendor understands, so the same
   two tools are declared whichever brain is answering. `assistant/index.ts`
   attaches them in the research stage and nowhere else.

   The names are deliberately the ones the research prompt already talks
   about, so switching the execution from Anthropic's hosted tools to this
   file did not need the prompt rewritten.
   -------------------------------------------------------------------------- */

export const MAX_SEARCHES = 20;
export const MAX_FETCHES = 12;

export const SEARCH_TOOL_SCHEMAS = [
  {
    name: "web_search",
    description:
      "Search the web. Returns a short list of results, each with a title, an address and a snippet. Use it to find where a claim or figure is published, then use web_fetch to read the page that carries it.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for. Be specific. Include the year when you want a recent figure.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description:
      "Open one page by its address and return its readable text. Use it on addresses that came back from web_search, to check a figure at its source.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full address of the page to open." },
      },
      required: ["url"],
    },
  },
] as const;
