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

export async function listSources(companyId) {
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("id, name, description, kind, status, location, created_at")
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
export async function addTextSource({ companyId, userId, name, description, text, kind = "file", location = null }) {
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

export async function removeSource(id) {
  /* Chunks first. A source row with orphaned chunks behind it is
     recoverable; chunks with no source to explain them are litter the
     assistant could still be handed. */
  await supabase.from("knowledge_chunks").delete().eq("source_id", id);
  const { error } = await supabase.from("knowledge_sources").delete().eq("id", id);
  if (error) console.error("could not remove source", error);
  return !error;
}
