/* ==========================================================================
   WHO IS SIGNED IN
   One place that answers "who is this and what company are they on".

   Every page needs it and none of them should ask the database in their
   own way, because the answer decides what the row level security lets
   them see. Read it once, pass it down.

   Everything here runs under the caller's own session, never a service
   key, so a person who tries to read another company's rows gets nothing
   back rather than an error to work around. The database decides, not
   this file.
   ========================================================================== */

import { supabase } from "./supabase.js";
import { clearAdminClock } from "./adminClock.js";

/* --------------------------------------------------------------------------
   SECTION: Load the signed in person and their company
   Returns null when nobody is signed in, which is a normal state and not
   a failure. The page decides what to show for it.
   -------------------------------------------------------------------------- */

export async function loadMe() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: staff, error: staffError } = await supabase
    .from("staff_effective_limits")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (staffError || !staff) {
    console.error("signed in but not on a company", staffError);
    return { user: session.user, staff: null, company: null };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", staff.company_id)
    .maybeSingle();

  if (companyError) console.error("could not load company", companyError);

  return { user: session.user, staff, company: company ?? null };
}

/* --------------------------------------------------------------------------
   SECTION: The knowledge base
   A source is a row in knowledge_sources. Its text lives in
   knowledge_chunks, split into pieces small enough to hand to a model
   without sending a whole book to answer one question.

   Splitting on paragraph breaks rather than at a fixed count keeps a
   thought whole. A chunk that stops mid sentence is a chunk that teaches
   the model something slightly wrong.
   -------------------------------------------------------------------------- */

const CHUNK_CHARS = 4000;

export function splitIntoChunks(text) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    /* A single paragraph longer than a whole chunk has to be cut somewhere,
       so cut it on its own rather than dragging its neighbours along. */
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

/* --------------------------------------------------------------------------
   SECTION: Leaving

   ONE PLACE, ON PURPOSE. Until 2026-09-09 the Log out button in the chat
   only called navigate("/auth"). It moved the person to the sign in screen
   and left their session completely intact, so pressing the browser back
   button put them straight back inside the workspace. On a shared machine
   that is somebody clicking Log out, walking away, and the next person
   being one back press from their company's files.

   The admin screen had no way out at all. An admin waited twenty four hours
   for the clock in adminClock.js to expire them.

   Both now call this. It lives here so a third screen cannot invent its own
   version that forgets a step.

   THE ADMIN CLOCK IS CLEARED FIRST. It is a timestamp in localStorage, and
   leaving it behind means the next person to sign in on this browser
   inherits a countdown that started during somebody else's session.
   -------------------------------------------------------------------------- */

export async function signOutCompletely() {
  clearAdminClock();

  const { error } = await supabase.auth.signOut();

  /* Reported and not thrown. A failure here is almost always the network,
     and the local token is already gone either way, so the person is out on
     this device. Leaving them stuck on a screen they asked to leave would be
     worse than a quiet log line. */
  if (error) console.error("sign out did not reach the server", error);
}

export async function listSources(companyId) {
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("id, name, description, kind, status, location, customer_visible, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("could not list sources", error);
    return [];
  }
  return data ?? [];
}

/* Writes the source first and its text second, because the row is what
   the admin sees and the chunks are what the assistant reads. If the
   chunks fail the source is marked failed rather than left sitting at
   ready with nothing behind it, which would be the worst of both: a
   knowledge base that lists something it cannot actually quote. */
/* `customerVisible` defaults to false and every call site has to pass true
   on purpose, so a missed argument can only ever close a file, never open
   one. The admin screen only passes true after the publish gate came back
   with a yes. */
export async function addTextSource({
  companyId,
  userId,
  name,
  description,
  text,
  kind = "file",
  location = null,
  customerVisible = false,
}) {
  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      company_id: companyId,
      name,
      description,
      kind,
      location,
      status: "pending",
      added_by: userId,
      customer_visible: customerVisible === true,
    })
    .select()
    .single();

  if (sourceError || !source) {
    console.error("could not add source", sourceError);
    return { ok: false, reason: "Could not save that. Try again." };
  }

  const chunks = splitIntoChunks(text);

  if (chunks.length) {
    const { error: chunkError } = await supabase.from("knowledge_chunks").insert(
      chunks.map((content) => ({
        source_id: source.id,
        company_id: companyId,
        content,
      }))
    );

    if (chunkError) {
      console.error("could not save source text", chunkError);
      await supabase.from("knowledge_sources").update({ status: "failed" }).eq("id", source.id);
      return { ok: false, reason: "Saved the name but could not read the file. Remove it and try again." };
    }
  }

  const { error: readyError } = await supabase
    .from("knowledge_sources")
    .update({ status: "ready" })
    .eq("id", source.id);

  if (readyError) console.error("could not mark source ready", readyError);

  return { ok: true, source: { ...source, status: "ready" }, chunks: chunks.length };
}

/* THE ONE SWITCH THAT DECIDES WHAT A STRANGER CAN BE TOLD
   Staff read everything in the knowledge base. Support reads only the
   sources with this turned on, and it is off until somebody deliberately
   turns it on.

   The rule is not enforced here. This writes an admin's decision; the
   enforcement is customer_knowledge() in the database, which the support
   function has to go through and which cannot be widened by a caller. A
   check in a browser is a label, not a lock. */
export async function setSourceVisibility(id, visible) {
  const { error } = await supabase
    .from("knowledge_sources")
    .update({ customer_visible: visible })
    .eq("id", id);

  if (error) console.error("could not change who can see that source", error);
  return !error;
}

/* --------------------------------------------------------------------------
   SECTION: Where the company's own material disagrees with itself

   Written by support-ask while it answers a customer, never from here. This
   only reads them and marks one dealt with, which is the only thing an admin
   is allowed to change about a log.

   Open ones only. A resolved contradiction is kept for the record, not for
   the screen, and a panel that lists everything ever fixed is a panel people
   stop reading.
   -------------------------------------------------------------------------- */

export async function listContradictions(companyId) {
  const { data, error } = await supabase
    .from("knowledge_contradictions")
    .select("id, topic, source_a, said_a, source_b, said_b, answered_with, times_seen, last_seen_at")
    .eq("company_id", companyId)
    .is("resolved_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("could not read the disagreements", error);
    return [];
  }
  return data ?? [];
}

/* Marks it dealt with. It comes back on its own if support hits the same
   disagreement again, because the log function clears resolved_at when it
   sees one a second time. Nothing here has to remember that. */
export async function resolveContradiction(id) {
  const { error } = await supabase
    .from("knowledge_contradictions")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("could not mark that as sorted", error);
  return !error;
}

export async function removeSource(id) {
  /* Chunks first. A source row with orphaned chunks behind it is
     recoverable; chunks with no source to explain them are litter the
     assistant could still be handed. */
  await supabase.from("knowledge_chunks").delete().eq("source_id", id);
  const { error } = await supabase.from("knowledge_sources").delete().eq("id", id);
  if (error) console.error("could not remove source", error);
  return !error;
}

/* --------------------------------------------------------------------------
   SECTION: Finished work
   A document that only exists in a browser tab is a document one refresh
   away from gone. Every finished piece is written to work_history against
   the person who made it, so the library survives the tab, the laptop and
   the day.

   Nothing else about a conversation is stored. The talking is not the
   deliverable, and keeping every draft of every chat would be storing a
   company's thinking without anybody asking for that.
   -------------------------------------------------------------------------- */

export async function listWork(companyId) {
  const { data, error } = await supabase
    .from("work_history")
    .select("id, title, skill, summary, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("could not list work", error);
    return [];
  }
  return data ?? [];
}

export async function saveWork({ companyId, staffId, title, skill, content, sourcesUsed = [], credits = 0 }) {
  const { data, error } = await supabase
    .from("work_history")
    .insert({
      company_id: companyId,
      staff_id: staffId,
      title,
      skill,
      summary: content,
      sources_used: sourcesUsed,
      credits,
    })
    .select("id, title, skill, summary, created_at")
    .single();

  if (error) {
    console.error("could not save work", error);
    return null;
  }
  return data;
}

/* The people on this company. Email is deliberately absent: it lives in
   the auth tables, which a browser cannot read, and a staff list is about
   who has access and how far they may go, not about contact details. */
export async function listStaff(companyId) {
  const { data, error } = await supabase
    .from("staff_effective_limits")
    .select("id, name, role, access_level, model_ceiling, daily_limit")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("could not list staff", error);
    return [];
  }
  return data ?? [];
}

/* --------------------------------------------------------------------------
   SECTION: Conversations
   A brief someone is halfway through is worth as much as a finished one,
   and it used to live only in a browser tab. Close the tab, change phone,
   run out of battery, and four questions of work were gone.

   Only the last few are kept. A staff member wants to pick up where they
   left off, not browse a year of their own talking, and storing every
   conversation forever is storing a company's thinking without anybody
   asking for that.
   -------------------------------------------------------------------------- */

export const KEEP_RECENT = 3;

export async function listConversations(staffId) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, stage, updated_at")
    .eq("staff_id", staffId)
    .order("updated_at", { ascending: false })
    .limit(KEEP_RECENT);

  if (error) {
    console.error("could not list conversations", error);
    return [];
  }
  return data ?? [];
}

export async function loadConversation(id) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, stage, messages")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("could not load conversation", error);
    return null;
  }
  return data;
}

/* Insert on the first save, update after that, so one conversation stays
   one row however many turns it runs to. Returns the id so the caller can
   hold on to it. */
export async function saveConversation({ id, companyId, staffId, title, stage, messages, brief }) {
  const row = {
    company_id: companyId,
    staff_id: staffId,
    title,
    stage,
    messages,
    updated_at: new Date().toISOString(),
  };

  /* Only written when there is one, so an ordinary turn does not wipe the
     brief a build already wrote. Undefined means "leave it alone", which is
     different from null, and that difference is the whole reason for the
     check rather than always setting the column. */
  if (brief !== undefined) row.brief = brief;

  if (id) {
    const { error } = await supabase.from("conversations").update(row).eq("id", id);
    if (error) console.error("could not update conversation", error);
    return id;
  }

  const { data, error } = await supabase.from("conversations").insert(row).select("id").single();
  if (error) {
    console.error("could not save conversation", error);
    return null;
  }

  /* Anything past the few we keep is dropped as soon as a new one is
     made, rather than by a job nobody remembers to run. */
  const { data: extra } = await supabase
    .from("conversations")
    .select("id")
    .eq("staff_id", staffId)
    .order("updated_at", { ascending: false })
    .range(KEEP_RECENT, KEEP_RECENT + 50);

  if (extra?.length) {
    await supabase.from("conversations").delete().in("id", extra.map((r) => r.id));
  }

  return data?.id ?? null;
}
