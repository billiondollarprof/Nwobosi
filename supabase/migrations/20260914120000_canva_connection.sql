-- =========================================================================
-- CANVA, THE TWO TABLES IT NEEDS TO HOLD A CONNECTION
--
-- WHY THIS EXISTS
-- Anthony, 2026-09-14: "I want the canva built." He is on a free personal
-- account, and the plan is that ONE Canva account, his, backs everybody who
-- uses the product. So this is not a token per person. It is one connection,
-- held by the deployment, used on everyone's behalf.
--
-- WHAT CANVA ACTUALLY GIVES BACK
--   an access token that expires after four hours
--   a refresh token that is long lived and is used to get a new access token
-- So the access token cannot be stored once and forgotten. Something has to
-- refresh it, and that something needs the refresh token to still be here.
--
-- WHY TWO TABLES AND NOT ONE
-- They have completely different lifetimes and completely different risks.
--
--   integration_tokens   long lived, holds the actual secret, must outlive
--                        everything, and is the most dangerous row in the
--                        database.
--   oauth_pending        lives for ten minutes, holds no secret worth
--                        stealing on its own, and exists only to carry one
--                        value across a redirect.
--
-- Putting the ten minute thing in the same table as the permanent thing is
-- how a cleanup job eventually deletes the connection.
--
-- WHY RLS WITH ZERO POLICIES ON BOTH
-- Row level security on, and not a single policy written. That is not an
-- oversight, it is the strongest setting there is: with RLS on and no policy,
-- NOBODY reaches these rows except the service role, which only the edge
-- functions hold. A signed in staff member cannot read them. An admin cannot
-- read them. The browser cannot read them.
--
-- `access_codes` is set the same way for the same reason, and CURRENT.md
-- says so.
--
-- THIS ONLY CREATES. It adds two tables that do not exist. It does not alter
-- or drop anything, and no existing row is touched.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. THE CONNECTION ITSELF
--
-- provider is the primary key, so there can only ever be one row per
-- service. Connecting Canva a second time replaces the first rather than
-- quietly leaving two rows and a coin toss about which one gets used.
-- -------------------------------------------------------------------------
create table if not exists public.integration_tokens (
  provider      text primary key,
  access_token  text        not null,
  refresh_token text        not null,
  -- When the access token dies. Checked before every use, and anything
  -- inside a minute of this is treated as already dead, because a token
  -- that expires mid request fails the request.
  expires_at    timestamptz not null,
  -- What the connection is allowed to do, as Canva granted it. Stored so a
  -- function can say "this cannot export" rather than finding out from a
  -- 403 halfway through somebody's document.
  scopes        text,
  -- Which Canva account this is, for the admin screen to show. A display
  -- name, never used to decide anything.
  account_label text,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.integration_tokens is
  'One row per outside service. Holds the live connection for the whole deployment, not per company and not per person. RLS on with no policies, so only the service role reaches it.';

comment on column public.integration_tokens.refresh_token is
  'The long lived credential. Canva access tokens die after four hours, so this is what keeps the connection alive. If this leaks, the connection is compromised until it is revoked in the Canva portal.';

alter table public.integration_tokens enable row level security;

-- -------------------------------------------------------------------------
-- 2. THE HALF FINISHED HANDSHAKE
--
-- Canva uses PKCE, which means the sign in starts by inventing a secret
-- (the verifier), sending only a fingerprint of it, and then proving
-- ownership at the end by producing the original. So the verifier has to
-- survive the round trip to Canva and back, and it cannot travel in the URL,
-- because the whole point is that it never leaves here.
--
-- `state` is the other half: a random value sent out and checked on the way
-- back in. A callback arriving with a state this table has never seen is
-- somebody else's request, or a forgery, and is refused.
-- -------------------------------------------------------------------------
create table if not exists public.oauth_pending (
  state         text primary key,
  provider      text        not null,
  code_verifier text        not null,
  created_at    timestamptz not null default now()
);

comment on table public.oauth_pending is
  'One row per sign in attempt, alive for minutes. Carries the PKCE verifier across the redirect to the provider and back. The callback deletes the row it used, and anything older than ten minutes is refused.';

alter table public.oauth_pending enable row level security;

-- An index on age, so clearing out abandoned attempts is a cheap delete
-- rather than a scan of every row that ever existed.
create index if not exists oauth_pending_created_at_idx
  on public.oauth_pending (created_at);
