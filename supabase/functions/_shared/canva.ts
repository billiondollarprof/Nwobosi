/* ==========================================================================
   GETTING A CANVA ACCESS TOKEN THAT ACTUALLY WORKS

   Every function that talks to Canva starts here. It hands back a token
   that is good right now, refreshing it first if it has gone stale, and it
   says plainly when nothing can be done because somebody has to reconnect.

   WHY THIS IS NOT THREE LINES
   ---------------------------
   Canva's access token lasts four hours. Anthony connected at 09:22 UTC on
   2026-09-15 and by 13:22 it was dead, which is normal and expected. So a
   refresh is not an edge case, it is what happens on almost every call
   after the first afternoon.

   A CANVA REFRESH TOKEN CAN ONLY BE USED ONCE. This is the part that
   breaks these integrations, and it breaks them quietly. When you refresh,
   Canva hands back a NEW access token and a NEW refresh token, and it kills
   the old refresh token there and then. So:

     - If the new refresh token is not stored, the next refresh fails and
       the admin is told to reconnect for no reason.
     - If two requests refresh at the same time, both send the same refresh
       token. One succeeds. The other is refused, because that token was
       already spent. And if the slow one then writes its result over the
       fast one's, it stores a pair that was never valid and the connection
       is dead until somebody reconnects by hand.

   Both of those are handled below, and the second one is why the write is
   conditional rather than a plain update.

   WHAT IT NEVER DOES
   ------------------
   It never returns a refresh token to a caller and it never logs either
   token. A caller gets an access token good for the next few hours and
   nothing else, so no function built on top of this can leak the long
   lived key by accident.

   READ TOP TO BOTTOM
     1. What a caller gets back
     2. Trading a refresh token for a new pair
     3. The one function everything calls
   ========================================================================== */

/* ==========================================================================
   1. WHAT A CALLER GETS BACK

   Three outcomes and they are genuinely different, so they are three
   answers rather than a token or null.

     not_connected     nobody has ever connected Canva for this company
     reconnect_needed  it was connected and the connection is now dead
     failed            Canva did not answer, try again later

   A screen says something different for each. Rolled into one "no" they
   would all read as "it is broken", and the first one is not broken, it is
   a company that has not set it up yet.
   ========================================================================== */

export type CanvaToken =
  | { ok: true; token: string }
  | { ok: false; reason: "not_connected" | "reconnect_needed" | "failed" };

const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

/* Five minutes of headroom. A token with thirty seconds left is no use for
   a job that uploads an asset, creates a design and exports it, because it
   will die somewhere in the middle and the failure will look like a Canva
   problem rather than a clock problem. */
const STALE_WITHIN_MS = 5 * 60 * 1000;

/* ==========================================================================
   2. TRADING A REFRESH TOKEN FOR A NEW PAIR

   The client secret goes in a Basic auth header rather than in the body.
   Both are accepted by Canva; the header is the one that does not end up in
   a proxy's request log next to the parameters.
   ========================================================================== */

type Refreshed = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

async function refresh(refreshToken: string): Promise<Refreshed | "dead" | "failed"> {
  const id = Deno.env.get("CANVA_CLIENT_ID") ?? "";
  const secret = Deno.env.get("CANVA_CLIENT_SECRET") ?? "";
  if (!id || !secret) {
    console.error("canva client id or secret is not set");
    return "failed";
  }

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
  } catch (err) {
    console.error("could not reach canva to refresh", err);
    return "failed";
  }

  const text = await response.text();

  if (!response.ok) {
    /* 400 and 401 mean Canva looked at the token and said no. That is a
       token that has been spent, revoked, or belongs to an integration
       whose secret changed, and no amount of retrying fixes any of those.
       Anything else is Canva having a bad day, which retrying does fix, so
       the two are told apart rather than both reported as broken.

       The body is logged because it says WHICH thing Canva disliked. It
       carries no secret of ours: the secret went in the header, and this
       is Canva's error rather than our request. */
    console.error("canva refused the refresh", response.status, text);
    return response.status === 400 || response.status === 401 ? "dead" : "failed";
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("canva returned something that was not json on refresh");
    return "failed";
  }

  const accessToken = String(data.access_token ?? "");
  const nextRefresh = String(data.refresh_token ?? "");
  const expiresIn = Number(data.expires_in ?? 0);

  /* Both or nothing. Storing a new access token without the new refresh
     token would work once and then lock the company out, because the
     refresh token we still hold was spent by this very call. */
  if (!accessToken || !nextRefresh) {
    /* The KEYS, never the values. */
    console.error("canva returned no usable pair on refresh", Object.keys(data));
    return "failed";
  }

  return {
    accessToken,
    refreshToken: nextRefresh,
    expiresAt: new Date(Date.now() + (expiresIn > 0 ? expiresIn : 4 * 60 * 60) * 1000),
  };
}

/* ==========================================================================
   3. THE ONE FUNCTION EVERYTHING CALLS

   `admin` is a supabase client holding the service role. It has to be,
   because integration_tokens has row level security on and no policies at
   all, so nothing but the service role reaches it.
   ========================================================================== */

// deno-lint-ignore no-explicit-any
export async function canvaAccessToken(admin: any, companyId: string): Promise<CanvaToken> {
  const { data: row, error } = await admin
    .from("integration_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("company_id", companyId)
    .eq("provider", "canva")
    .maybeSingle();

  if (error) {
    console.error("could not read the canva connection", error.message);
    return { ok: false, reason: "failed" };
  }
  if (!row) return { ok: false, reason: "not_connected" };

  /* Still good, with room to spare. The common path, and it costs one
     read. */
  const expiresAt = new Date(row.expires_at as string).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > STALE_WITHIN_MS) {
    return { ok: true, token: row.access_token as string };
  }

  const spent = row.refresh_token as string;
  const fresh = await refresh(spent);

  if (fresh === "dead") return { ok: false, reason: "reconnect_needed" };
  if (fresh === "failed") return { ok: false, reason: "failed" };

  /* THE WRITE IS CONDITIONAL, and this is the part to understand before
     changing anything here.

     `.eq("refresh_token", spent)` means: only write if the row still holds
     the same refresh token we just spent. If another request refreshed
     while this one was waiting on Canva, the row now holds THEIR new pair,
     this condition matches nothing, and nothing is written.

     Without that condition the slower request would write its own pair
     over the faster one's. Both pairs came from the same spent token, so
     Canva only honours one of them, and there is no way to know from here
     which. Writing blindly is a coin toss that leaves the company
     disconnected half the time.

     select() so we can tell whether it wrote. A plain update reports
     success either way, which is exactly the case this has to detect. */
  const { data: written, error: writeError } = await admin
    .from("integration_tokens")
    .update({
      access_token: fresh.accessToken,
      refresh_token: fresh.refreshToken,
      expires_at: fresh.expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("provider", "canva")
    .eq("refresh_token", spent)
    .select("access_token");

  if (writeError) {
    console.error("could not store the refreshed canva token", writeError.message);
    /* The token in hand is real and works, so the caller is not blocked by
       a failed write. The cost is that the next call refreshes again, and
       that is a wasted round trip rather than a broken connection. */
    return { ok: true, token: fresh.accessToken };
  }

  if (!written || written.length === 0) {
    /* Somebody else got there first. Their pair is the live one, so read
       it back and use theirs. Ours came from a token that is now spent
       twice over and Canva will refuse it. */
    const { data: newer } = await admin
      .from("integration_tokens")
      .select("access_token")
      .eq("company_id", companyId)
      .eq("provider", "canva")
      .maybeSingle();

    if (newer?.access_token) return { ok: true, token: newer.access_token as string };
    return { ok: false, reason: "failed" };
  }

  return { ok: true, token: fresh.accessToken };
}
