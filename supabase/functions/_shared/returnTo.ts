/* ==========================================================================
   WHERE A HANDSHAKE IS ALLOWED TO SEND SOMEBODY BACK TO

   Shared by the two halves of every OAuth handshake. One half writes the
   address down, the other half redirects to it, and both use this to decide
   whether it is allowed at all.

   WHY THIS FILE EXISTS RATHER THAN AN IF STATEMENT
   ------------------------------------------------
   Redirecting to an address that came from a browser, without checking it,
   is an open redirect. It is not an abstract risk. It is how a convincing
   phishing link gets built out of somebody else's real domain: the link
   starts on an address the person trusts, so they follow it, and they land
   somewhere else entirely.

   The fix is never to sanitise the address. It is to have a list of places
   this product is served from and refuse everything else.

   TWO CHECKS AND BOTH ARE NEEDED
   ------------------------------
     1. The scheme. Only http and https. Without this, javascript: and
        data: are addresses too.
     2. The host, against the list. Exact matches, plus the one wildcard
        this product genuinely needs, which is a Cloudflare Pages preview
        branch.

   WHAT IT NEVER DOES
   ------------------
   It never repairs a bad address. Anything that does not pass comes back as
   null, and the caller falls back to a page it controls. An address that is
   nearly right is not right.
   ========================================================================== */

/* Exact hosts. Anything not on this list or matched by the pattern below is
   refused, including a subdomain of one of these. */
const ALLOWED_HOSTS = new Set([
  "stellaxafe.com",
  "www.stellaxafe.com",
  "stellaxafe01.pages.dev",
  "localhost",
  "127.0.0.1",
]);

/* Cloudflare Pages gives every branch its own address, so previews cannot
   be listed one by one. Anchored at both ends, and the label before it
   cannot contain a dot, so a deeper subdomain fails too. */
const PREVIEW = /^[a-z0-9-]+\.stellaxafe01\.pages\.dev$/i;

export function safeReturnTo(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    /* Not an absolute address at all. A relative one is refused too: this
       runs in a place with no origin of its own to resolve against, and
       guessing one is how the check gets bypassed. */
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  /* http only for a machine on this computer. A plain http address anywhere
     else means somebody is sent to a page readable in transit, straight
     after approving access to their account. */
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "http:" && !local) return null;

  if (!ALLOWED_HOSTS.has(url.hostname) && !PREVIEW.test(url.hostname)) return null;

  /* Rebuilt from the parts allowed to survive, rather than handing back the
     original string. Credentials in an address are a known way to make a
     link read as one host while going to another, and they have no business
     here. */
  return new URL(`${url.protocol}//${url.host}${url.pathname}${url.search}`).toString();
}

/* Adds a marker to an allowed address, so the screen somebody lands on can
   say what just happened instead of looking identical to the one they
   left. */
export function withOutcome(returnTo: string, outcome: string): string {
  try {
    const url = new URL(returnTo);
    url.searchParams.set("connected", outcome);
    return url.toString();
  } catch {
    return returnTo;
  }
}
