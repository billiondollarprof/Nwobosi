/* ==========================================================================
   SUPPORT
   The queue, for a staff member an admin has given support access to.

   WHY THIS IS A VIEW AND NOT A SITE
   ---------------------------------
   A second support site would mean a second door, a second sign in, and a
   second place for the access rules to drift out of step with these ones.
   So support is a flag on a person instead. They sign in at /workspace
   like everybody else and get one extra switch.

   Anthony's design, 2026-09-15, and the escalation path he wants next: the
   email that flags a conversation carries a link straight into this
   screen, and from here the person answers by email or by WhatsApp
   depending on whether the customer left an email. That second half is not
   built yet. What is built is the queue and the reading of it.

   WHAT IT NEVER DOES
   ------------------
   It never sends on its own. Every reply is a person pressing send, the
   same rule the rest of this product runs on.

   WHAT IT SHOWS WHEN YOU OPEN A THREAD
   -----------------------------------
   The question that was flagged, and nothing else. Anthony, 2026-09-16:
   "why not the actual message that was flagged instead of the entire
   conversation?" An escalation is raised per question and the row keeps the
   customer's own words, so that one sentence is what somebody working this
   queue is actually here to answer. The rest of the conversation is one
   click away for the times the question alone is not enough.

   Read top to bottom:
     1. Loading the queue, and what was flagged in it
     2. The list
     3. One conversation
   ========================================================================== */

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Mail, Phone } from "lucide-react";

import { supabase } from "../shared/supabase.js";
import { FUNCTIONS } from "../shared/config.js";
import { GlassPanel, SectionHeading, Spinner, StatusPill, GhostButton, PrimaryButton, TextArea } from "../shared/ui.jsx";
import { FONTS, BRAND } from "../shared/tokens";
import WorkSwitch from "../shared/WorkSwitch.jsx";

/* ==========================================================================
   1. LOADING THE QUEUE
   ========================================================================== */

async function listThreads(companyId) {
  const { data, error } = await supabase
    .from("support_threads")
    .select("id, channel, customer_ref, customer_name, customer_email, created_at, last_message_at")
    .eq("company_id", companyId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("could not read the support queue", error);
    return [];
  }
  return data ?? [];
}

async function listMessages(threadId) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, author_role, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("could not read that conversation", error);
    return [];
  }
  return data ?? [];
}

/* WHAT WAS ACTUALLY FLAGGED.

   Anthony, 2026-09-16: "the messages that get sent to the support is
   really very plenty. Why not the actual message that was flagged instead
   of the entire conversation?"

   He is right, and the database already knew the answer. An escalation is
   raised per question, not per conversation, and the row carries the
   customer's own words in `question`. So the one thing support has to read
   was sitting there whilst the screen printed every message in the thread
   instead.

   Open ones first, newest first, because an open question is the job. The
   closed ones are kept in the same list so a thread that was answered an
   hour ago still shows what it was about. */
async function listFlagged(threadId) {
  const { data, error } = await supabase
    .from("escalations")
    .select("id, question, raised_at, closed_at")
    .eq("thread_id", threadId)
    .order("raised_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("could not read what was flagged", error);
    return [];
  }
  return data ?? [];
}

/* THE ONE THING THIS SCREEN SHOWS BY DEFAULT.

   Takes the escalation rows and the conversation, and hands back the short
   list of questions worth reading, in the order they should be read: the
   open ones first, because an open question is somebody still waiting.

   The fallback matters as much as the main path. A thread can exist with
   no escalation row on it, either because it predates escalations being
   kept per question, or because a person opened a conversation that never
   got flagged. In that case the last thing the customer said stands in, so
   the screen always has a real sentence on it rather than a blank panel.

   Returns plain objects with the fields the render needs, so the render
   does not have to know which of the two shapes it came from. */
function askedHere(escalations, messages) {
  if (escalations.length > 0) {
    const open = escalations.filter((e) => !e.closed_at);
    const chosen = open.length > 0 ? open : escalations.slice(0, 1);
    return chosen.map((e) => ({
      key: e.id,
      question: e.question,
      at: e.raised_at,
      open: !e.closed_at,
    }));
  }

  /* Newest customer message. The list arrives oldest first, so it is the
     last one going forwards. */
  let last = null;
  for (const m of messages) if (m.author_role === "customer") last = m;
  if (!last) return [];

  return [{ key: last.id, question: last.body, at: last.created_at, open: false }];
}

/* SENDING A REPLY.

   It goes through an edge function rather than straight to the database,
   because the reply has to leave the building as well as be recorded, and
   sending needs a key that must never sit in a browser bundle.

   The function checks three things this file cannot: that the person has
   support access, that the thread belongs to their company, and that
   there is somewhere to send it. So a refusal here is a real answer worth
   showing rather than a network wobble. */
async function sendReply(threadId, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: "Sign in again." };

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTIONS.supportReply}`,
      {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ threadId, body }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!payload) return { ok: false, reason: "Nothing came back. Try again." };
    return payload;
  } catch {
    return { ok: false, reason: "Could not reach it just now. Try again." };
  }
}

/* Plain words rather than a timestamp. Somebody reading their own queue is
   not reading a log. */
function whenReadable(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ==========================================================================
   2. THE LIST
   ========================================================================== */

export default function Support({ me }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [reading, setReading] = useState(false);

  /* THE WHOLE CONVERSATION IS OFF BY DEFAULT.

     Opening a thread used to print every message in it, which on a real
     conversation is a wall of text somebody has to read through to find
     the one question they were called in for. Now the flagged question
     shows on its own, and the rest is one click away for the times it
     matters. Per thread, so opening one does not expand another. */
  const [showAll, setShowAll] = useState({});

  /* Kept per thread rather than as one string. Somebody half way through
     an answer who opens another conversation to check something should
     come back and still have their words. */
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(false);
  const [replyNote, setReplyNote] = useState("");

  const companyId = me?.company?.id;

  async function refresh() {
    if (!companyId) return;
    setLoading(true);
    setThreads(await listThreads(companyId));
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!companyId) { setLoading(false); return; }
      const rows = await listThreads(companyId);
      if (!alive) return;
      setThreads(rows);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [companyId]);

  async function reply(thread) {
    const body = (drafts[thread.id] ?? "").trim();
    if (!body || sending) return;

    setSending(true);
    setReplyNote("");
    const result = await sendReply(thread.id, body);
    setSending(false);

    if (!result.ok) {
      setReplyNote(result.reason ?? "Could not send that. Try again.");
      return;
    }

    /* Cleared only on a real send. A failed send that wiped the box would
       lose an answer somebody just wrote. */
    setDrafts((prev) => ({ ...prev, [thread.id]: "" }));
    setMessages(await listMessages(thread.id));
    setReplyNote("Sent.");
    setTimeout(() => setReplyNote(""), 4000);
  }

  async function open(thread) {
    if (openId === thread.id) { setOpenId(null); return; }
    setOpenId(thread.id);
    setReading(true);
    /* Both at once rather than one after the other, so opening a thread is
       one wait and not two. */
    const [asked, all] = await Promise.all([
      listFlagged(thread.id),
      listMessages(thread.id),
    ]);
    setFlagged(asked);
    setMessages(all);
    setReading(false);
  }

  return (
    <div className="space-y-5" style={{ animation: "sx-rise 0.3s ease" }}>
      <WorkSwitch me={me} current="support" />

      <GlassPanel className="p-6">
        <SectionHeading hint="Everything a customer has asked, newest first. The assistant has already answered what it could from the sources an admin opened up.">
          Support queue
        </SectionHeading>

        {loading ? (
          <div className="flex items-center gap-2 text-[13.5px]" style={{ color: "var(--text-3)" }}>
            <Spinner size={14} />
            Reading the queue
          </div>
        ) : threads.length === 0 ? (
          /* An empty queue is good news, so it is not dressed up as a
             failure. */
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            Nothing waiting. When a customer asks something the assistant cannot settle on its own,
            it lands here.
          </p>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <div key={thread.id}>
                <button
                  onClick={() => open(thread)}
                  className="w-full text-left rounded-[12px] border px-3.5 py-3 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <MessageSquare size={16} style={{ color: "var(--text-3)" }} className="shrink-0" />

                    <div className="flex-1 min-w-[140px]">
                      <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                        {thread.customer_name || thread.customer_ref || "Someone"}
                      </p>
                      <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                        {whenReadable(thread.last_message_at || thread.created_at)}
                      </p>
                    </div>

                    {/* HOW TO REACH THEM, and it is the whole reason this
                        is on the row rather than inside. Somebody working a
                        queue decides what to open next by whether they can
                        actually answer it. An email address means a reply
                        can go back; a WhatsApp number means it goes the
                        other way. */}
                    {thread.customer_email ? (
                      <StatusPill tone="ok">
                        <Mail size={11} /> Email
                      </StatusPill>
                    ) : (
                      <StatusPill tone="neutral">
                        <Phone size={11} /> {thread.channel === "whatsapp" ? "WhatsApp" : "No email"}
                      </StatusPill>
                    )}
                  </div>
                </button>

                {openId === thread.id && (
                  <div
                    className="mt-2 rounded-[12px] border p-4 space-y-3"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", animation: "sx-rise 0.2s ease" }}
                  >
                    {reading ? (
                      <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-3)" }}>
                        <Spinner size={13} />
                        Opening it
                      </div>
                    ) : messages.length === 0 && flagged.length === 0 ? (
                      <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                        Nothing in this one yet.
                      </p>
                    ) : (
                      <>
                        {/* WHAT THEY ACTUALLY ASKED, on its own.

                            This is the whole point of the screen. Somebody
                            opening a thread is answering one question, so
                            that question is the first and usually the only
                            thing they read.

                            Where there is no escalation row, which happens
                            on a thread raised before escalations were kept
                            per question, the last thing the customer said
                            stands in for it. Better a real sentence than an
                            empty card. */}
                        {askedHere(flagged, messages).map((item) => (
                          <div
                            key={item.key}
                            className="rounded-[10px] border-l-[3px] pl-3 py-1"
                            style={{ borderLeftColor: item.open ? BRAND.amber : "var(--border-2)" }}
                          >
                            <p
                              className="text-[11.5px] uppercase tracking-wide mb-1"
                              style={{ color: "var(--text-3)", fontFamily: FONTS.display }}
                            >
                              {item.open ? "Waiting on you" : "Asked"}
                              {"  "}
                              {whenReadable(item.at)}
                            </p>
                            <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                              {item.question}
                            </p>
                          </div>
                        ))}

                        {/* The rest of the conversation, for the times the
                            question alone is not enough. Off by default. */}
                        {messages.length > 0 && (
                          <button
                            onClick={() =>
                              setShowAll((prev) => ({ ...prev, [thread.id]: !prev[thread.id] }))
                            }
                            className="text-[12.5px] underline underline-offset-2 hover:opacity-80 transition-opacity"
                            style={{ color: "var(--text-3)" }}
                          >
                            {showAll[thread.id]
                              ? "Hide the conversation"
                              : `Read the whole conversation (${messages.length})`}
                          </button>
                        )}

                        {showAll[thread.id] &&
                          messages.map((m) => (
                            <div key={m.id}>
                              <p
                                className="text-[11.5px] uppercase tracking-wide mb-1"
                                style={{ color: "var(--text-3)", fontFamily: FONTS.display }}
                              >
                                {m.author_role === "customer" ? "Customer" : "Assistant"}
                                {"  "}
                                {whenReadable(m.created_at)}
                              </p>
                              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                                {m.body}
                              </p>
                            </div>
                          ))}
                      </>
                    )}

                    {/* THE REPLY BOX, and it only appears where a reply can
                        actually go somewhere.

                        A thread with no email has nowhere to send to, and a
                        WhatsApp thread cannot be answered from here yet. In
                        both cases the box is not drawn and the reason is
                        said instead, because a box that accepts a real
                        answer and then drops it is worse than no box. */}
                    <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      {thread.customer_email ? (
                        <>
                          <TextArea
                            value={drafts[thread.id] ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))
                            }
                            rows={4}
                            placeholder={`Write back to ${thread.customer_name || "them"}`}
                          />
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <PrimaryButton
                              onClick={() => reply(thread)}
                              disabled={sending || !(drafts[thread.id] ?? "").trim()}
                              className="flex items-center gap-2"
                            >
                              {sending && <Spinner size={13} color="#fff" />}
                              {sending ? "Sending" : "Send reply"}
                            </PrimaryButton>
                            <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                              Goes to {thread.customer_email}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                          {thread.channel === "whatsapp"
                            ? "This one came in on WhatsApp. Answering from here is not built yet, so reply in WhatsApp."
                            : "This person left no email address, so there is nowhere to send a reply."}
                        </p>
                      )}

                      {replyNote && (
                        <p
                          className="text-[12.5px] mt-2"
                          role="alert"
                          style={{ color: replyNote === "Sent." ? "var(--text-3)" : "var(--caution)" }}
                        >
                          {replyNote}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <GhostButton onClick={refresh} className="flex items-center gap-2">
            <RefreshCw size={13} />
            Check again
          </GhostButton>
        </div>
      </GlassPanel>
    </div>
  );
}
