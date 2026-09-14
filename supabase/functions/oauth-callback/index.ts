/* ==========================================================================
   OAUTH CALLBACK, THE END OF ANY HANDSHAKE

   Where an outside service sends a person back once they have said yes. It
   takes the one time code in the query string, trades it for a pair of
   tokens, keeps them, and shows a plain page saying it worked.

   ONE CALLBACK, NOT ONE PER SERVICE
   ---------------------------------
   Canva is the only one today. It is named for the job rather than for the
   service on purpose, because the next one, Drive most likely, needs the
   identical thirty lines of state checking and PKCE, and a second copy of
   those thirty lines is a second place for the security to be subtly
   different.

   The provider is read off the oauth_pending row rather than off the query
   string, so a caller cannot pick which service they are completing. That
   column was in the table from the day it was written, for this.

   PROVIDERS below is the whole list. Adding one is a few lines in that
   object and nothing else in this file moves.

   THIS IS THE ONLY FUNCTION IN THE PROJECT A STRANGER CAN REACH
   -------------------------------------------------------------
   Every other one checks who is calling. This one cannot: Canva sends the
   person's browser here with a GET, carrying no session of ours at all.
   Anybody who knows the address can hit it.

   So the proof is not "who are you", it is "did I start this":

     1. `state` must match a row this deployment wrote minutes ago. Without
        it, somebody could feed us a code they obtained elsewhere.
     2. The row carries the PKCE verifier, and Canva will only accept the
        code if the verifier matches the fingerprint sent at the start.
     3. The row is DELETED the moment it is read, so the same state cannot
        be replayed even seconds later.

   All three are needed. Any one of them alone leaves a hole.

   WHAT IT WRITES, AND WHY THAT ROW IS THE MOST DANGEROUS ONE HERE
   ---------------------------------------------------------------
   A refresh token is a long lived key to Anthony's Canva account. It lives
   in integration_tokens, which has row level security on and no policies,
   so only the service role reaches it. It is never returned to a browser,
   never logged, and never put in the page below.

   IT SENDS THEM BACK, IT DOES NOT PARK THEM
   -----------------------------------------
   Anthony, 2026-09-14: "it doesn't open a different tab, but rather
   preserves the page. When the person clicks to connect, as it connects, it
   returns back, like a callback. It returns back to where the person was,
   exactly."

   So the happy path is a redirect to the screen they left, carrying a
   marker so it can say what happened. The address was written down when
   the handshake started, and it was checked against a list of places this
   product is served from before it was stored. It is checked AGAIN here,
   because a row in a database is not a promise about what is in it.

   The HTML page below is now only the fallback: something went wrong, or
   there is no address to go back to. A person looking at a failure needs
   words, not a redirect to a screen that looks like nothing happened.

   READ TOP TO BOTTOM
     1. The page it shows
     2. Trading the code for tokens
     3. The request
   ========================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeReturnTo, withOutcome } from "../_shared/returnTo.ts";

/* Must be character for character what the start of the handshake sent and
   what the provider's portal has registered. They compare the string, and a
   mismatch is refused with an error that does not say which part is wrong.

   Built from one constant used by both halves, so the two cannot drift. */
const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

/* Everything that differs between one service and the next. The rest of this
   file is the same work whichever one it is. */
const PROVIDERS: Record<string, { label: string; tokenUrl: string; idEnv: string; secretEnv: string }> = {
  canva: {
    label: "Canva",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    idEnv: "CANVA_CLIENT_ID",
    secretEnv: "CANVA_CLIENT_SECRET",
  },
};

/* ==========================================================================
   1. THE PAGE IT SHOWS

   Deliberately plain and self contained. No stylesheet to fetch, no script,
   nothing that could fail and leave somebody staring at unstyled text after
   a step that actually worked.

   The message is escaped before it goes in. Nothing here is attacker
   controlled today, but this is a page built by string concatenation and
   that is exactly how the first hole gets made later.
   ========================================================================== */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, detail: string, good: boolean) {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#05060D;color:#F4F4F6;
       font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px}
  .card{max-width:420px;text-align:center}
  h1{font-size:20px;font-weight:500;margin:0 0 10px}
  p{margin:0;color:#8A8A95;font-size:14.5px}
  .dot{width:10px;height:10px;border-radius:50%;margin:0 auto 18px;
       background:${good ? "#16B04A" : "#E8980A"}}
</style>
</head><body><div class="card">
  <div class="dot"></div>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(detail)}</p>
</div></body></html>`;

  return new Response(html, {
    status: good ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/* ==========================================================================
   2. TRADING THE CODE FOR TOKENS

   The client secret goes in a Basic auth header rather than the body. Both
   are accepted; the header is the one that does not end up in a proxy's
   request log alongside the parameters.
   ========================================================================== */

async function exchange(provider: typeof PROVIDERS[string], params: Record<string, string>) {
  const id = Deno.env.get(provider.idEnv) ?? "";
  const secret = Deno.env.get(provider.secretEnv) ?? "";

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    },
    body: new URLSearchParams(params).toString(),
  });

  const text = await response.text();
  if (!response.ok) {
    /* The body is logged because it says WHICH parameter Canva disliked,
       and that is the difference between fixing this in a minute and
       guessing for an hour. It carries no secret of ours: the secret went
       in the header, and this is Canva's error, not our request. */
    console.error(`${provider.label} refused the exchange`, response.status, text);
    return { ok: false as const, status: response.status };
  }

  try {
    return { ok: true as const, data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    console.error(`${provider.label} returned something that was not json`, text.slice(0, 300));
    return { ok: false as const, status: 502 };
  }
}

/* ==========================================================================
   3. THE REQUEST
   ========================================================================== */

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  /* Canva sends the person back with an error in the query string when they
     press cancel. That is a normal thing for somebody to do and it is not a
     failure worth a red screen. */
  /* Named generically, because the provider is not known yet: the row that
     says which service this was has not been read, and reading it here
     would delete it on a path that never needed it. */
  const refused = url.searchParams.get("error");
  if (refused) {
    return page(
      "Not connected",
      "You cancelled, so nothing changed. You can close this tab and try again whenever you want.",
      false,
    );
  }

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";

  if (!code || !state) {
    return page("Something is missing", "That link is incomplete. Start again from the admin screen.", false);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* --- Did we start this? ---------------------------------------------

     DELETE and return the row in one statement. Reading it and deleting it
     afterwards leaves a window where two requests carrying the same state
     both find the row and both proceed. One statement, and only one of them
     gets a row back. */
  const { data: pending, error: pendingError } = await admin
    .from("oauth_pending")
    .delete()
    .eq("state", state)
    .select("provider, code_verifier, created_at, return_to")
    .maybeSingle();

  if (pendingError || !pending) {
    return page(
      "That did not match",
      "This link has already been used, or it did not come from here. Start again from the admin screen.",
      false,
    );
  }

  /* Ten minutes. Long enough to read Canva's approval screen, short enough
     that a link left open in a tab overnight is dead. */
  const age = Date.now() - new Date(pending.created_at as string).getTime();
  if (age > 10 * 60 * 1000) {
    return page("That took too long", "The link ran out. Start again from the admin screen.", false);
  }

  /* CHECKED AGAIN, on the way out of the database.

     It was checked before it was stored, so this looks like belt and
     braces. It is not. Between those two moments the value sat in a row,
     and a check that only happens on the way in trusts every path that
     could ever write to that row: a migration, a fixture, a future function
     nobody has written yet, somebody with console access. The redirect is
     the dangerous act, so the check belongs next to it. */
  const returnTo = safeReturnTo(pending.return_to);

  /* One place that decides how this ends, so the happy path and every
     failure agree about it. */
  const finish = (outcome: string, title: string, detail: string, good: boolean) => {
    if (returnTo) {
      return new Response(null, {
        status: 303,
        headers: { Location: withOutcome(returnTo, outcome) },
      });
    }
    return page(title, detail, good);
  };

  /* WHICH SERVICE, read off the row and never off the query string. The row
     was written by the function that started this, so it is the only party
     that gets to say what is being completed. */
  const provider = PROVIDERS[String(pending.provider)];
  if (!provider) {
    console.error("a handshake came back for a provider this function does not know", pending.provider);
    return page("That did not match", "Start again from the admin screen.", false);
  }

  /* --- Trade it -------------------------------------------------------- */

  const traded = await exchange(provider, {
    grant_type: "authorization_code",
    code,
    code_verifier: pending.code_verifier as string,
    redirect_uri: REDIRECT_URI,
  });

  if (!traded.ok) {
    return finish("failed", `${provider.label} would not finish that`, "Nothing was connected. Start again from the admin screen.", false);
  }

  const accessToken = String(traded.data.access_token ?? "");
  const refreshToken = String(traded.data.refresh_token ?? "");
  const expiresIn = Number(traded.data.expires_in ?? 0);

  if (!accessToken || !refreshToken) {
    /* The KEYS, never the values. A token in a log is a token in every
       backup of that log. */
    console.error(`${provider.label} returned no usable token pair`, Object.keys(traded.data));
    return finish("failed", `${provider.label} would not finish that`, "Nothing was connected. Start again from the admin screen.", false);
  }

  /* --- Keep it ---------------------------------------------------------

     upsert on provider, so connecting a second time replaces the first
     rather than leaving two rows and a coin toss about which gets used.

     expires_at is worked out here rather than stored as a duration, because
     a duration is only meaningful next to the moment it was issued, and the
     next function to read this row will not have that moment. Four hours is
     what Canva gives today; this uses what they actually said. */
  const expiresAt = new Date(Date.now() + (expiresIn > 0 ? expiresIn : 4 * 60 * 60) * 1000);

  const { error: keepError } = await admin
    .from("integration_tokens")
    .upsert({
      provider: String(pending.provider),
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      scopes: typeof traded.data.scope === "string" ? traded.data.scope : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });

  if (keepError) {
    /* The keys are logged, never the values. A refresh token in a log is a
       refresh token in every backup of that log. */
    console.error(`could not store the ${provider.label} connection`, keepError.message);
    return finish("failed", "Connected, but not saved", "Something went wrong storing it. Start again from the admin screen.", false);
  }

  return finish(
    "canva",
    `${provider.label} is connected`,
    "You can close this tab. Nothing else to do.",
    true,
  );
});
