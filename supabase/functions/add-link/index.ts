/* ==========================================================================
   ADD LINK
   An admin gives an address. This reads that page once, turns it into
   text, and stores it as a knowledge source like an uploaded file.

   WHY THIS EXISTS AT ALL
   ---------------------
   The assistant cannot browse, and that is deliberate. It is also the one
   real limit on a rule the whole product rests on: nothing reaches a
   draft unless a person put it there.

   Reading a page here does not break that rule, it completes it. An admin
   is a person, adding it is vouching for it, and the fetch happens once,
   at that moment, on a server. What gets stored is what the page said
   then. The assistant reads stored text and still cannot open a link, so
   a page that changes next week cannot quietly change what the assistant
   believes, and a link pasted into the chat is still just text.

   verify_jwt must be ON. Only a signed in admin of a company may add to
   that company's knowledge base, and the check is here rather than in the
   browser because a browser can be told to say anything.
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* Ten seconds, then give up. A page that has not answered by then is a
   page that will make an admin think the app has hung. */
const FETCH_TIMEOUT_MS = 10000;

/* A page's worth of text, not a book's. Anything past this is almost
   always navigation, footers, and comment threads. */
const MAX_PAGE_CHARS = 60000;
const CHUNK_CHARS = 4000;

/* --------------------------------------------------------------------------
   SECTION: Turning a page into text
   No parser library, on purpose. This runs on every link an admin adds
   and a dependency that breaks takes the feature down with it. Strip the
   parts that are definitely not prose, unwrap the rest, tidy the spaces.
   -------------------------------------------------------------------------- */

function htmlToText(html: string) {
  let text = html;

  /* Script and style hold code, not content, and their contents would
     otherwise read as a wall of nonsense the model tries to make sense of. */
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  /* Block ends become paragraph breaks before the tags go, so the split
     into chunks later has real boundaries to cut on rather than one
     unbroken river of words. */
  text = text.replace(/<\/(p|div|section|article|h[1-6]|li|tr|blockquote)>/gi, "\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  text = text.replace(/<[^>]+>/g, " ");

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

function titleFrom(html: string, url: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/\s+/g, " ").trim();
  if (title) return title.slice(0, 120);
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`.slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

function splitIntoChunks(text: string) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_CHARS) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < paragraph.length; i += CHUNK_CHARS) {
        chunks.push(paragraph.slice(i, i + CHUNK_CHARS));
      }
      continue;
    }
    if (current.length + paragraph.length + 2 > CHUNK_CHARS) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim());
}

/* Addresses that are not out on the internet at all. A server fetching a
   URL on someone's behalf will happily fetch its own neighbourhood, so
   without this an admin could type a private address and use this
   function as a window into whatever sits behind it. That is server side
   request forgery, and the fix is to refuse rather than to trust that
   nobody will try.

   Names are checked as written rather than resolved first, because
   resolving here and fetching later is two lookups that can disagree.
   This blocks the obvious shapes; a public hostname that resolves to a
   private address anyway is a residual risk worth naming rather than
   hiding, and the isolated runtime this lives in has little on those
   addresses to reach. */
function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;

  /* No dot at all means a bare machine name on some internal network,
     never a site out on the public internet. */
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

/* An address a person typed, made into one a server can fetch. Bare
   hostnames are what people actually write, so assume https rather than
   refusing. Anything that is not http or https is refused outright:
   file: and similar would ask this server to read its own disk. */
function normaliseUrl(raw: string) {
  const trimmed = raw.trim();
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

/* -------------------------------------------------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, reason: "Use POST." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ ok: false, reason: "Sign in again to add a link." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "Something went wrong. Try again." }, 400);
  }

  const url = normaliseUrl(String(body?.url ?? ""));
  const description = String(body?.description ?? "").trim();
  if (!url) {
    return json({ ok: false, reason: "That does not look like a public web address." }, 400);
  }
  if (!description) return json({ ok: false, reason: "Say in one line what the page holds." }, 400);

  /* Who they are, read under their own identity so the database decides
     rather than this function taking the browser's word for it. */
  const { data: staff, error: staffError } = await asUser
    .from("staff")
    .select("id, company_id, access_level")
    .eq("id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    return json({ ok: false, reason: "Your account is not set up on a company yet." }, 403);
  }

  if (staff.access_level !== "admin") {
    return json({ ok: false, reason: "Only an admin can add to the knowledge base." }, 403);
  }

  /* ------------------------------------------------------------------
     READ THE PAGE
     ------------------------------------------------------------------ */

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    /* Redirects are followed by hand, checking every hop. Letting fetch
       follow them would allow a public address to bounce straight to a
       private one, which is the hole the check above just closed,
       reopened by the fetch itself. */
    let current = url;
    let pageResponse: Response | null = null;

    for (let hop = 0; hop < 5; hop += 1) {
      pageResponse = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "StellaXafe/1.0 (knowledge base import)" },
      });

      if (pageResponse.status < 300 || pageResponse.status >= 400) break;

      const next = pageResponse.headers.get("location");
      if (!next) break;

      const resolved = normaliseUrl(new URL(next, current).toString());
      if (!resolved) {
        clearTimeout(timer);
        return json({ ok: false, reason: "That address redirects somewhere this will not follow." }, 400);
      }
      current = resolved;
      pageResponse = null;
    }

    clearTimeout(timer);

    if (!pageResponse) {
      return json({ ok: false, reason: "That address redirected too many times." }, 400);
    }

    if (!pageResponse.ok) {
      return json({ ok: false, reason: `That page answered with ${pageResponse.status}. Check the address.` }, 400);
    }

    const type = pageResponse.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/json|text\/markdown/i.test(type)) {
      return json({ ok: false, reason: "That address is not a page this can read. Try the page it sits on." }, 400);
    }

    html = await pageResponse.text();
  } catch (err) {
    console.error("could not fetch link", err);
    return json({ ok: false, reason: "Could not open that page. Check the address and try again." }, 400);
  }

  const name = titleFrom(html, url);
  const text = htmlToText(html).slice(0, MAX_PAGE_CHARS);

  if (text.length < 80) {
    return json(
      { ok: false, reason: "That page had almost no readable text. It may need a browser to load. Paste what matters instead." },
      400,
    );
  }

  /* ------------------------------------------------------------------
     STORE IT
     Same shape as an uploaded file, because from here on there is no
     difference between them and nothing downstream should have to care.
     ------------------------------------------------------------------ */

  const { data: source, error: sourceError } = await asUser
    .from("knowledge_sources")
    .insert({
      company_id: staff.company_id,
      name,
      description,
      kind: "link",
      location: url,
      status: "pending",
      added_by: user.id,
    })
    .select()
    .single();

  if (sourceError || !source) {
    console.error("could not add link source", sourceError);
    return json({ ok: false, reason: "Could not save that. Try again." }, 500);
  }

  const chunks = splitIntoChunks(text);

  const { error: chunkError } = await asUser.from("knowledge_chunks").insert(
    chunks.map((content) => ({ source_id: source.id, company_id: staff.company_id, content })),
  );

  if (chunkError) {
    console.error("could not save link text", chunkError);
    await asUser.from("knowledge_sources").update({ status: "failed" }).eq("id", source.id);
    return json({ ok: false, reason: "Read the page but could not save it. Try again." }, 500);
  }

  await asUser.from("knowledge_sources").update({ status: "ready" }).eq("id", source.id);

  console.log(`add-link company=${staff.company_id} url=${url} chars=${text.length} chunks=${chunks.length}`);

  return json({ ok: true, name, chunks: chunks.length });
});
