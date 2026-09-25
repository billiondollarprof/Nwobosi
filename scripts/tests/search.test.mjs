/* ==========================================================================
   THE SEARCH, TESTED WITHOUT A NETWORK

   WHY THIS FILE EXISTS, 2026-09-25. The research stage used to borrow
   Anthropic's hosted web tools, and that is the only reason search worked on
   Anthropic and did nothing at all on DeepSeek. It failed silently: no
   error, no crash, nothing in the logs, and the person was told "I searched
   and found nothing usable for this" when the truth was that no search ran.

   Anthony's instruction was that the tool must work for ANY model. So the
   search is now ours, in `_shared/search.ts`, and this file holds the things
   that would put the hole back:

     1. A result that reaches the person must be one that was really
        received, with the address the thing itself lives at.
     2. A missing key or a failed provider must never read as "nothing is
        published on this". Those are different facts.
     3. The stage must answer EVERY tool call, because a vendor speaking
        OpenAI's format rejects the whole next request if one is left
        unanswered.
     4. The tool ceiling must be counted in code, not asked for in a prompt.

   WHAT THIS DOES NOT PROVE. It does not prove the live endpoint answers,
   because that is the network and a suite that needs one is a suite that
   goes red for reasons that are not the code. The live call was made by hand
   on 2026-09-25 across seven queries in seven regions and is recorded in
   `SESSIONS.md`.
   ========================================================================== */

import { build } from "esbuild";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* search.ts reads Deno.env, so the runner is given one that reads process.env.
   Node has no Deno, and without this the module throws before a test runs. */
globalThis.Deno = { env: { get: (key) => process.env[key] } };

const dir = mkdtempSync(join(tmpdir(), "search-"));
await build({
  entryPoints: ["supabase/functions/_shared/search.ts"],
  outfile: join(dir, "search.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});
const {
  parseKeylessResults, normaliseUrl, isPrivateHost, htmlToText,
  providerName, providerReady, describeProviders, webSearch,
  SEARCH_TOOL_SCHEMAS, MAX_SEARCHES, MAX_FETCHES, SEARCH_VERSION,
} = await import(join(dir, "search.mjs"));

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

/* --------------------------------------------------------------------------
   1. READING A RESULT PAGE

   The shape below is copied from a real answer, including the wrapped
   address, which is the part that would otherwise send a person to
   duckduckgo.com instead of to the thing they asked about.
   -------------------------------------------------------------------------- */

const PAGE = `
<div class="result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnairametrics.com%2Flagos-hotels&amp;rut=abc">Lagos hotel projects hit pause</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">33% of projects remain on hold, the report says.</a>
</div>
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.jdpower.com%2Fstudies%2Fhotel">2026 Guest Satisfaction Index</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=y">Guest satisfaction rose for a third year.</a>
</div>
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnairametrics.com%2Flagos-hotels&amp;rut=abc">Lagos hotel projects hit pause</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">A duplicate of the first one.</a>
</div>
<div class="result">
  <a class="result__a" href="https://duckduckgo.com/y.js?ad_provider=bing">An advert</a>
</div>
<div class="result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fduckduckgo.com%2Fy.js%3Fad_domain%3Dkayak.com&amp;rut=z">A wrapped advert</a>
</div>
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fapos">It&#x27;s a test of entities</a>
</div>
`;

/* The lite endpoint marks results differently: single quoted classes, and the
   address comes BEFORE the class on the anchor. Both shapes have to work, and
   the advertisement below is the one that really got through on 2026-09-25:
   it carries the same class as a result and only gives itself away once its
   wrapper is unwrapped. */
const LITE = `
<tr><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fduckduckgo.com%2Fy.js%3Fad_domain%3Dkayak.com&amp;rut=a">Hotel Deals From $11</a></td></tr>
<tr><td class='result-snippet'>An advertisement, not a source.</td></tr>
<tr><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.booking.com%2Fcity%2Fng%2Flagos.html&amp;rut=b" class='result-link'><span class='link-text'>10 Best Lagos Hotels</span></a></td></tr>
<tr><td class='result-snippet'>Compare prices across 2,000,000 properties.</td></tr>
<tr><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Flagos.cool%2Fhotels&amp;rut=c" class='result-link'><span class='link-text'>Lagos Hotel Prices 2026</span></a></td></tr>
<tr><td class='result-snippet'>Budget to five star, compared.</td></tr>
`;

const hits = parseKeylessResults(PAGE, 10);
check("the wrapped address is unwrapped to the real one",
  hits[0].url === "https://nairametrics.com/lagos-hotels");
check("and the second one is unwrapped too",
  hits[1].url === "https://www.jdpower.com/studies/hotel");
check("the title comes through", hits[0].title === "Lagos hotel projects hit pause");
check("the snippet is paired with its own result",
  hits[0].snippet === "33% of projects remain on hold, the report says.");
check("and the second snippet with the second result",
  hits[1].snippet === "Guest satisfaction rose for a third year.");
check("a repeated address is only shown once",
  hits.filter((h) => h.url === "https://nairametrics.com/lagos-hotels").length === 1);
check("an advertising link is not shown as a source",
  !hits.some((h) => h.url.includes("ad_provider")));
check("an advert wrapped in a redirect is dropped once unwrapped",
  !hits.some((h) => h.url.includes("duckduckgo.com") || h.title === "A wrapped advert"));
check("a numeric entity is decoded, not left raw",
  hits.some((h) => h.title.includes("It's a test of entities"))
  && !hits.some((h) => /&#/.test(h.title + h.snippet)));
check("the list stops at the limit asked for", parseKeylessResults(PAGE, 2).length === 2);
check("an empty page is an empty list, not a throw",
  parseKeylessResults("<html><body>nothing</body></html>").length === 0);

const lite = parseKeylessResults(LITE, 10);
check("the lite shape is read too, single quotes and all", lite.length === 2);
check("its title comes out of the nested span",
  lite[0].title === "10 Best Lagos Hotels");
check("its snippet is paired with it",
  lite[0].snippet === "Compare prices across 2,000,000 properties.");
check("and the second lite result keeps its own pair",
  lite[1].url === "https://lagos.cool/hotels" && lite[1].snippet === "Budget to five star, compared.");
check("the lite advert is dropped as well, which it was not before",
  !lite.some((l) => l.title === "Hotel Deals From $11"));

/* --------------------------------------------------------------------------
   2. THE GUARD ON OPENING A PAGE

   The address now comes from a search result and from a model, neither of
   which a person chose, so this is the check that matters most.
   -------------------------------------------------------------------------- */

for (const bad of [
  "http://localhost/admin", "http://127.0.0.1/", "http://10.0.0.5/",
  "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data/",
  "http://172.16.4.4/", "http://[::1]/", "http://intranet/",
  "file:///etc/passwd", "javascript:alert(1)", "http://0.0.0.0/",
]) {
  check(`refused: ${bad}`, normaliseUrl(bad) === null);
}
check("a normal public address is allowed",
  normaliseUrl("https://nairametrics.com/x") === "https://nairametrics.com/x");
check("a bare hostname is given https rather than refused",
  normaliseUrl("nairametrics.com") === "https://nairametrics.com/");
check("a private host is recognised on its own",
  isPrivateHost("169.254.169.254") && !isPrivateHost("nairametrics.com"));

/* --------------------------------------------------------------------------
   3. TURNING A PAGE INTO TEXT
   -------------------------------------------------------------------------- */

const TEXT = htmlToText(`<html><head><style>.a{color:red}</style>
<script>var secret = "do not send me";</script></head>
<body><h1>Lagos hotels</h1><p>33% of projects are on hold.</p>
<p>Second&nbsp;line &amp; more.</p></body></html>`);
check("the script contents never reach the model",
  !TEXT.includes("do not send me") && !TEXT.includes("var secret"));
check("the style contents never reach the model", !TEXT.includes("color:red"));
check("the prose is kept", TEXT.includes("33% of projects are on hold."));
check("paragraph breaks are kept", TEXT.includes("\n\n"));
check("entities are turned back into characters",
  TEXT.includes("Second line & more."));
check("tags are gone", !/<[a-z]/i.test(TEXT));

/* --------------------------------------------------------------------------
   4. THE PROVIDER IS A SETTING, AND A MISSING KEY IS LOUD

   The bug this whole file exists for was a search that failed and read as
   "nothing is published on this". A provider that cannot run must say so.
   -------------------------------------------------------------------------- */

delete process.env.SEARCH_PROVIDER;
check("with nothing set, the provider is the one needing no account",
  providerName() === "keyless");
check("and it is ready with no key at all", providerReady() === true);

process.env.SEARCH_PROVIDER = "brave";
delete process.env.BRAVE_API_KEY;
check("a paid provider is chosen when asked for", providerName() === "brave");
check("and it reports itself not ready with no key", providerReady() === false);
check("the provider list names every one and its state",
  /keyless: ready/.test(describeProviders()) && /brave/.test(describeProviders()));

process.env.SEARCH_PROVIDER = "something-else";
check("an unknown provider falls back rather than throwing",
  providerName() === "keyless");
delete process.env.SEARCH_PROVIDER;

const noKey = await webSearch("lagos hotels");
check("a ready provider is actually used for a real search",
  noKey.provider === "keyless" && typeof noKey.ok === "boolean");
check("an empty query is refused rather than searched for",
  (await webSearch("   ")).ok === false);

/* --------------------------------------------------------------------------
   5. THE STAGE, READ FROM THE REAL SOURCE

   These are the assertions that would have caught the DeepSeek hole on the
   day it was written, so they are deliberately about the shape of the stage
   rather than about behaviour a fake cannot show.
   -------------------------------------------------------------------------- */

const server = readFileSync("supabase/functions/assistant/index.ts", "utf8");

check("the tools are declared as plain functions any vendor can be given",
  SEARCH_TOOL_SCHEMAS.length === 2
  && SEARCH_TOOL_SCHEMAS[0].name === "web_search"
  && SEARCH_TOOL_SCHEMAS[1].name === "web_fetch"
  && SEARCH_TOOL_SCHEMAS.every((t) => t.input_schema?.type === "object"));
check("no Anthropic-only hosted tool is left in the stage",
  !server.includes("web_search_20260209") && !server.includes("web_fetch_20260209"));
/* The name survives in a comment explaining what used to happen, which is
   worth keeping. What must be gone is reading the sources out of it. */
check("the hosted result block is no longer what the sources come from",
  !/block\.type === "web_search_tool_result"/.test(server));
check("the stage runs the search itself",
  /await webSearch\(/.test(server) && /await readPage\(/.test(server));
check("every tool call is answered, which OpenAI-format vendors require",
  server.includes('results.push({ type: "tool_result", tool_use_id: id, content })'));
check("the loop turns on whether a tool was asked for, not on a vendor's stop reason",
  /if \(!asked\.length\) break;/.test(server));
check("the ceilings are counted in code, not only written in the prompt",
  server.includes("searches >= MAX_SEARCHES") && server.includes("fetches >= MAX_FETCHES")
  && MAX_SEARCHES === 20 && MAX_FETCHES === 12);
check("a failed search is told apart from an empty one",
  /This is a failure, not an absence of information/.test(server));
check("the sources are still written from what was received",
  server.includes("Where this came from"));
check("the tools are still attached on the research stage only",
  /const searchTools = stage === "research"/.test(server)
  && (server.match(/tools: searchTools/g) ?? []).length === 1);
check("a long marker exists for the deploy check", SEARCH_VERSION.length >= 40);

/* --------------------------------------------------------------------------
   6. THE PAGE READER IS THE SAME ONE add-link USES

   Two copies of an address guard drift, and the copy that drifts is the one
   nobody is looking at. The bodies are compared with comments and whitespace
   stripped, so a comment can be rewritten freely and a changed CHECK cannot.
   `add-link` keeps its own copy on purpose: it is live and working, and this
   change was not allowed to reach into it.
   -------------------------------------------------------------------------- */

const guardBody = (source) => {
  const match = source.match(/function isPrivateHost\(hostname: string\)[^{]*\{([\s\S]*?)\n\}/);
  if (!match) return null;
  return match[1]
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const addLinkGuard = guardBody(readFileSync("supabase/functions/add-link/index.ts", "utf8"));
const searchGuard = guardBody(readFileSync("supabase/functions/_shared/search.ts", "utf8"));
check("add-link still has its guard", Boolean(addLinkGuard));
check("the search has one too", Boolean(searchGuard));
check("and they are the same check, not a second version that can drift",
  addLinkGuard === searchGuard);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
