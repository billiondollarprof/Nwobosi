/* ==========================================================================
   SUPABASE CLIENT
   One client for the whole app. Auth, the database, and the knowledge
   index all go through here.

   The publishable key is meant to be in the browser. It grants nothing on
   its own. Every table has row level security on it, so what a signed in
   person can actually read is decided by the database, not by this key.
   ========================================================================== */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  /* Fail loudly in development rather than silently returning empty data. */
  console.error(
    "Supabase is not configured. Copy .env.example to .env.local and fill in the two values."
  );
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/* --------------------------------------------------------------------------
   SECTION: Who is signed in
   Returns the staff row joined with the limits that actually apply, so
   callers never have to remember the fall back to company defaults.
   -------------------------------------------------------------------------- */

export async function getCurrentStaff() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("staff_effective_limits")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load the signed in staff member", error);
    return null;
  }
  return data;
}

/* --------------------------------------------------------------------------
   SECTION: Retrieval
   Both of these run inside row level security, so a caller physically
   cannot reach another company's rows through them.
   -------------------------------------------------------------------------- */

/* Pull the company material this task needs. Each row carries the source
   name and description, so the written prompt can say where a fact came
   from. */
export async function matchKnowledge(queryEmbedding, matchCount = 8) {
  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });
  if (error) throw error;
  return data;
}

/* Find past work that resembles what is being asked for now. This is what
   lets the interview say "same setup as last time?" instead of asking
   everything again. */
export async function matchWorkHistory(queryEmbedding, matchCount = 5) {
  const { data, error } = await supabase.rpc("match_work_history", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });
  if (error) throw error;
  return data;
}
