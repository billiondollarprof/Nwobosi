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
import { BRAND_ASSETS_BUCKET, FUNCTIONS } from "./config.js";
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

/* ==========================================================================
   ADDING AN IMAGE: A LOGO, A PRODUCT SHOT, A BRAND ASSET
   ==========================================================================

   WHY THIS IS NOT addTextSource WITH A FLAG
   -----------------------------------------
   A document becomes rows of text and the file itself is thrown away. An
   image cannot: the whole point of a logo is the picture, so the file has
   to survive, and it goes in the brand-assets bucket rather than into
   knowledge_chunks. Different storage, different failure modes, different
   clean up. Bolting it onto the text path as a branch would mean one
   function where half the lines never run.

   THE ORDER MATTERS AND IT IS FILE FIRST
   --------------------------------------
   Upload the picture, then write the row that points at it. Do it the
   other way and a failed upload leaves a row in the list pointing at
   nothing, which looks like a broken source rather than a failed upload.
   This way a failed upload leaves an orphan file in the bucket that
   nobody sees, and that costs bytes rather than confusion.

   THE PATH IS WHAT THE SECURITY IS BUILT ON
   -----------------------------------------
   Every object is <company_id>/<uuid>.<ext>, and every storage policy
   reads that first folder to decide who may touch it. So the company id
   here is not decoration, it is the thing that stops one company reading
   another's assets. The database refuses a path that does not match the
   caller's own company, so getting this wrong fails loudly rather than
   leaking.
   ========================================================================== */

export async function addImageSource({
  companyId,
  userId,
  name,
  description,
  blob,
  extension,
  mediaType,
  customerVisible = false,
  /* What the picture says, where somebody has already looked. The batch
     grouping reads every picture while it is deciding which belong
     together, so passing that here stops the same picture being sent to a
     model a second time. Empty means nobody has read it yet. */
  knownReading = "",
}) {
  const path = `${companyId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(path, blob, { contentType: mediaType, upsert: false });

  if (uploadError) {
    console.error("could not upload the image", uploadError);
    return { ok: false, reason: "Could not upload that picture. Try again." };
  }

  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      company_id: companyId,
      name,
      description,
      kind: "image",
      location: null,
      asset_path: path,
      asset_mime: mediaType,
      /* BEING READ, NOT READY, since 2026-09-21.

         "pending" IS THE WORD, AND GETTING IT WRONG BROKE UPLOADS.
         This said "processing" for a few hours on 2026-09-21. The column
         only accepts pending, ready and failed, so every insert was
         rejected and adding any picture failed with "Could not save that",
         right after it had been analysed. Anthony hit it within the hour.
         There are three status values in this product and they are the
         three the rest of this file already uses. Check, never invent.


         It used to go straight to ready, because there was no text to pull
         apart and no second step to wait for. There is now: read-image
         looks at the picture and stores what it says, so a screenshot is a
         source the assistant can quote instead of a name it can only
         mention. Until that has run there IS something to wait for, and
         the screen should say so rather than claim it is done.

         read-image sets it back to ready on every path out of itself,
         including the ones where the reading failed, because the picture
         still works in a design either way. */
      status: "pending",
      added_by: userId,
      customer_visible: customerVisible === true,
    })
    .select()
    .single();

  if (sourceError || !source) {
    console.error("could not add image source", sourceError);
    /* Take the file back out. Its own try, and its failure is ignored:
       the admin is already being told the save failed, and a second
       message about tidying up tells them nothing they can act on. */
    try {
      await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([path]);
    } catch (err) {
      console.error("could not remove the orphaned upload", err);
    }
    return { ok: false, reason: "Could not save that. Try again." };
  }

  /* THE READING, AND ITS FAILURE IS NOT THE UPLOAD'S FAILURE.

     The picture is saved and usable the moment the lines above finish.
     Reading it is the extra that makes it answerable, so it gets its own
     try and never turns a successful upload into an error on screen.
     read-image is the one that puts the row back to ready, whatever
     happens inside it, so nothing is left saying "being read" forever. */
  let read = 0;
  try {
    if (knownReading.trim()) {
      /* Store what was already read and mark it done, rather than paying
         to look at the same picture twice. */
      const { error } = await supabase.from("knowledge_chunks").insert({
        source_id: source.id,
        company_id: companyId,
        content: knownReading.trim(),
      });
      if (error) throw error;
      await supabase.from("knowledge_sources").update({ status: "ready" }).eq("id", source.id);
      read = 1;
    } else {
      const result = await readImageSource(source.id);
      read = result.chunks ?? 0;
    }
  } catch (err) {
    console.error("could not read the picture after uploading it", err);
    /* Never leave it saying it is still being read. The picture is saved
       and usable in a design whatever happened to the reading. */
    await supabase.from("knowledge_sources").update({ status: "ready" }).eq("id", source.id);
  }

  return { ok: true, source: { ...source, status: "ready" }, chunks: read };
}

/* ASKS WHICH OF THE PICTURES ARE PAGES OF THE SAME THING.

   Anthony, 2026-09-21: "let the model decide, build it, so even if it's
   ten images and only 7 is one file while others have different contents
   so it's able to tell them apart."

   One call for the whole batch, because the question is about how the
   pictures relate to each other and nothing looking at them one at a time
   can answer it. It reads each group out at the same time, since it is
   already looking.

   NULL MEANS TREAT THEM SEPARATELY. Every failure lands there: no answer,
   a refusal, a grouping that lost a picture. One entry per picture is what
   happened before any of this existed, so it is never wrong, only tedious,
   and it is the right thing to fall back to. */
export async function groupImages(pictures) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTIONS.groupImages}`,
      {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: pictures.map((p) => ({ name: p.name, media_type: p.media_type, data: p.data })),
        }),
      },
    );

    if (!response.ok) {
      console.error("group-images refused", response.status);
      return null;
    }
    const result = await response.json();
    return Array.isArray(result?.groups) ? result.groups : null;
  } catch (err) {
    console.error("could not group the pictures", err);
    return null;
  }
}

/* Asks the server to look at a picture already in the bucket and store
   what it says. Separate from the upload above so it can be run again for
   one that was added before any of this existed. */
export async function readImageSource(sourceId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, chunks: 0 };

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTIONS.readImage}`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceId }),
    },
  );

  if (!response.ok) {
    console.error("read-image refused", response.status);
    return { ok: false, chunks: 0 };
  }
  return await response.json();
}

/* GIVING SOMEBODY THE SUPPORT QUEUE, OR TAKING IT BACK.

   A flag on the person, not a second account and not a second address.
   Anthony's design, and the reason it beats a separate support site: a
   second site is a second door, a second sign in, and a second place for
   the access rules to drift apart from these ones.

   So the support person signs in at /workspace like everybody else, and
   what they get is one extra switch between their own work and the queue.
   Taking it away is this same call with false, rather than hunting down an
   account on another system.

   ADMINS ARE NOT AUTOMATICALLY SUPPORT. Running the company and answering
   its customers are two different jobs, and an admin who wants both turns
   it on for themselves like anybody else.
   ========================================================================== */

export async function setSupportAccess(staffId, canSupport) {
  const { data, error } = await supabase
    .from("staff")
    .update({ can_support: canSupport === true })
    .eq("id", staffId)
    .select("id");

  if (error) {
    console.error("could not change support access", error);
    return { ok: false, reason: "Could not change that. Try again." };
  }

  /* SELECTED BACK, AND THAT IS THE WHOLE POINT. See removeSource for the
     day this was learned: an update that row level security filters out
     comes back with no error and no rows, so it reads as success and
     changes nothing. The toggle moves on screen, the database does not,
     and nobody finds out until a refresh. */
  if (!data?.length) {
    console.error("support access update matched no row", staffId);
    return { ok: false, reason: "That did not save. You may not have permission." };
  }
  return { ok: true };
}

/* --------------------------------------------------------------------------
   HOW MANY FINISHED PIECES SOMEBODY MAY MAKE IN A DAY

   Anthony, 2026-09-22: "is it possible that the per person one can be
   changed to increase after the invite?"

   It was not. The number was set once on the invite form and there was no
   way to touch it again short of the database, so somebody who needed more
   on a busy week had to be deleted and invited back.

   Same shape as setSupportAccess above, including the select back, and for
   the same reason.

   CLAMPED HERE AS WELL AS IN THE PICKER. The picker offers a fixed list, but
   a browser is not something this file is allowed to trust, and this writes
   a number that decides what somebody is allowed to spend.
   -------------------------------------------------------------------------- */

export async function setDailyLimit(staffId, limit) {
  const wanted = Math.min(Math.max(Math.floor(Number(limit) || 0), 1), 100);

  const { data, error } = await supabase
    .from("staff")
    .update({ daily_limit: wanted })
    .eq("id", staffId)
    .select("id, daily_limit");

  if (error) {
    console.error("could not change the daily limit", error);
    return { ok: false, reason: "Could not change that. Try again." };
  }
  if (!data?.length) {
    console.error("daily limit update matched no row", staffId);
    return { ok: false, reason: "That did not save. You may not have permission." };
  }

  /* The number the database actually holds, handed back so the screen shows
     what was stored rather than what was asked for. */
  return { ok: true, limit: data[0].daily_limit };
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

/* A DELETE THAT MATCHES NOTHING IS NOT AN ERROR, AND THAT IS THE TRAP.

   Anthony, 2026-09-21: "I noticed the system still remembers deleted file
   name... it's telling you that you already have this name."

   This used to read `return !error`, and no error is not the same thing as
   a row being gone. When RLS (a database rule deciding which rows you may
   touch) filters a delete, Postgres deletes nothing and reports success,
   because from its side the statement ran fine and matched no rows. So
   this returned true, the screen took the file out of the list, and the
   row sat there in the database. The name stayed taken, the file came back
   on the next page load, and nothing anywhere said a word about it.

   `.select("id")` makes the statement hand back what it actually removed.
   An empty array means nothing was deleted, and that is now a failure, so
   the screen says "could not remove that" instead of lying.

   This does not fix a policy that blocks the delete. It makes a blocked
   delete visible, which is the difference between a bug somebody can see
   and a bug that quietly rots the knowledge base. */
export async function removeSource(id) {
  /* Chunks first. A source row with orphaned chunks behind it is
     recoverable; chunks with no source to explain them are litter the
     assistant could still be handed. */
  await supabase.from("knowledge_chunks").delete().eq("source_id", id);

  const { data, error } = await supabase
    .from("knowledge_sources")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("could not remove source", error);
    return false;
  }

  if (!data || data.length === 0) {
    console.error(
      "the delete for source", id, "removed nothing. The row is still there, " +
      "most likely because a row level security policy filtered it out.",
    );
    return false;
  }

  return true;
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

/* `staffId` narrows it to one person's own documents, which is what the
   chat's Library shows. Anthony, 2026-09-23: "no two staffs gets reminded
   what another staff is doing in the same company." Before this the chat
   asked for the whole company's documents and relied on row level security
   alone to narrow it. The admin screen still asks for the whole company,
   on purpose, by leaving staffId out. */
export async function listWork(companyId, staffId) {
  let query = supabase
    .from("work_history")
    .select("id, title, skill, summary, created_at")
    .eq("company_id", companyId);
  if (staffId) query = query.eq("staff_id", staffId);

  const { data, error } = await query
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
    .select("id, name, role, access_level, model_ceiling, daily_limit, can_support")
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

   NOTHING HERE DELETES A CONVERSATION ANY MORE, since 2026-09-23.

   It used to keep only the newest three and delete the rest every time a
   new one was saved. Anthony then set the rule: "deleting a chat doesn't
   delete its memory." A conversation row IS the memory for now. Its
   resume log, its brief and its messages are what the per person memory
   in DIRECTION.md ("Memory, instead of keeping the file") will be built
   from. Deleting rows would have thrown that away before it existed.

   So a person deleting a chat HIDES it (hidden_at is set). It leaves their
   list and nobody sees it in the app again, but the row stays, under the
   same row level security as before: their own rows, their own company.

   THE COLUMN MAY NOT EXIST YET. hidden_at is added by the migration
   20260923120000_conversation_hidden_at.sql, which Anthony runs by hand.
   Until then the list falls back to showing everything, and hiding says
   plainly that it could not, rather than breaking the sidebar.
   -------------------------------------------------------------------------- */

/* How many chats the sidebar lists. A list to pick up from, not an archive
   to browse, so it stops at twenty. Older ones are still kept. */
export const SHOW_RECENT = 20;

/* True when the error is the database saying hidden_at does not exist yet.
   42703 is Postgres for "no such column". */
function noHiddenColumn(error) {
  return Boolean(error) && (error.code === "42703" || /hidden_at/.test(error.message ?? ""));
}

export async function listConversations(staffId) {
  const { data, error } = await supabase
    .from("conversations")
    /* `state` rides along so the page can tell, without a second fetch,
       whether the most recent conversation was finished and downloaded. It
       is a working note of a few hundred characters and this asks for three
       rows, so it costs nothing. See src/shared/resumeWindow.js. */
    .select("id, title, stage, updated_at, state")
    .eq("staff_id", staffId)
    .is("hidden_at", null)
    .order("updated_at", { ascending: false })
    .limit(SHOW_RECENT);

  /* Before the migration has run: list them all, exactly as before. */
  if (noHiddenColumn(error)) {
    const again = await supabase
      .from("conversations")
      .select("id, title, stage, updated_at, state")
      .eq("staff_id", staffId)
      .order("updated_at", { ascending: false })
      .limit(SHOW_RECENT);
    if (again.error) {
      console.error("could not list conversations", again.error);
      return [];
    }
    return again.data ?? [];
  }

  if (error) {
    console.error("could not list conversations", error);
    return [];
  }
  return data ?? [];
}

/* TAKE CHATS OFF SOMEBODY'S LIST, and keep them. See the section header for
   why this hides rather than deletes.

   Checked by reading back, not by the absence of an error. Row level
   security filters an update it refuses rather than raising: no error, no
   rows. Five controls in this app looked like they worked for exactly that
   reason. So the ids that come back are the ids that were really hidden,
   and anything short of all of them is reported as a failure.

   staff_id is matched as well as the id. RLS already stops anybody hiding
   another person's chat; this makes the intent plain in the query too. */
export async function hideConversations(staffId, ids) {
  const wanted = (Array.isArray(ids) ? ids : []).filter(Boolean);
  if (!wanted.length) return { ok: true, hidden: [] };

  const { data, error } = await supabase
    .from("conversations")
    .update({ hidden_at: new Date().toISOString() })
    .in("id", wanted)
    .eq("staff_id", staffId)
    .select("id");

  if (noHiddenColumn(error)) {
    return { ok: false, hidden: [], reason: "not_ready" };
  }
  if (error) {
    console.error("could not hide conversations", error);
    return { ok: false, hidden: [], reason: "failed" };
  }

  const hidden = (data ?? []).map((r) => r.id);
  return { ok: hidden.length === wanted.length, hidden, reason: hidden.length === wanted.length ? null : "partial" };
}

export async function loadConversation(id) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, stage, messages, brief, state")
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
export async function saveConversation({ id, companyId, staffId, title, stage, messages, brief, state }) {
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

  /* The resume log, same rule as the brief. Undefined leaves the column
     alone; an object replaces it whole. The column is `not null default
     '{}'`, so it is never null and a caller does not have to think about
     that. See src/shared/resumeLog.js for what goes in it and why. */
  if (state !== undefined) row.state = state;

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

  /* THE OLD TIDY UP IS GONE. Every save used to delete all but the newest
     three conversations. That deleted the memory Anthony wants kept, so it
     was removed on 2026-09-23. See the section header. */

  return data?.id ?? null;
}
