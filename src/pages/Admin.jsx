/* ==========================================================================
   ADMIN PAGE
   The brain of the system. Everything the assistant knows about the
   company lives here. Read top to bottom:

     1. Page shell and tabs
     2. Knowledge base
     3. Connectors
     4. Access control
     5. Permissions and usage
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Cloud,
  FileText,
  Link2,
  Plus,
  Shield,
  Trash2,
  UploadCloud,
  Users,
  AlertCircle,
  AlertTriangle,
  X,
  Sparkles,
  LogOut,
  Info,
} from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
import PublishGate from "../shared/PublishGate.jsx";
import ConfirmDelete from "../shared/ConfirmDelete.jsx";
import RefreshOrKeep from "../shared/RefreshOrKeep.jsx";
import AudienceControl from "../shared/AudienceControl.jsx";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import {
  PageShell,
  FloatingNav,
  ThemeToggle,
  PrimaryButton,
  GhostButton,
  GlassPanel,
  SectionHeading,
  StatusPill,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  Spinner,
} from "../shared/ui.jsx";
import {
  loadMe,
  listSources,
  addTextSource,
  addImageSource,
  setSupportAccess,
  removeSource,
  setSourceVisibility,
  listContradictions,
  resolveContradiction,
  listStaff,
  listWork,
  signOutCompletely,
} from "../shared/session.js";
import { adminSessionExpired } from "../shared/adminClock.js";
import { readFileAsText, canBecomeText, fileKind } from "../shared/readFile.js";
import { shrinkImage } from "../shared/shrinkImage.js";
import { describeSource } from "../shared/describeSource.js";
import { fetchLinkSource } from "../shared/linkApi.js";
import { readBeforePublish, loadSourceText } from "../shared/publishCheck.js";
import { findByName, findByAddress, whenAdded } from "../shared/duplicates.js";
import { inviteStaff, timeLeft } from "../shared/inviteApi.js";
import {
  PRODUCT,
  MAX_SOURCE_UPLOAD_KB,
  MAX_SOURCE_CHARS,
  WORKFLOW_TOOLS,
  WORKFLOW_PLAN_NOTE,
  CAPABILITY_LEVELS,
  SKILL_LABELS,
  LEVEL_ORDER,
  OFFERED_LEVELS,
  DEFAULT_LEVEL,
  levelOf,
  BRAND_ASSET_EDGE,
  SUPPORT_LEVEL,
} from "../shared/config.js";

/* --------------------------------------------------------------------------
   Seed data
   Stands in for Supabase until the backend is wired up.
   -------------------------------------------------------------------------- */

/* No seeded people, and no invented usage. A dashboard that opens
   showing four strangers and their spending is a dashboard nobody can
   trust the numbers on. These load from the database or they show
   nothing. */

const TABS = [
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "connectors", label: "Connectors", icon: Link2 },
  /* ONE TAB, NOT TWO, since 2026-09-15.

     Anthony: "the subsection access is supposed to be merged with usage
     since some things are repeated there... The explanation of the
     capability can be at the bottom of the access section."

     The overlap was real. Usage opened with Company defaults, which set
     the daily limit and the capability ceiling for everybody, and the
     people list in Access set those same two things per person. So to
     answer one question, what is this person allowed to do, an admin had
     to hold two screens in their head.

     Now it reads in the order somebody actually works. Who is asking to
     get in, invite them, set the default for everyone, tune the people
     who need tuning, see what they used, and last the explanation of what
     the levels mean, which is reference rather than a control. */
  { id: "access", label: "Access", icon: Users },
];

/* ==========================================================================
   1. PAGE SHELL AND TABS
   ========================================================================== */

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("knowledge");

  /* Loaded once here and passed down, rather than each section asking
     again. Who is signed in decides what every tab is allowed to show, so
     it belongs at the top. */
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const who = await loadMe();
      if (!alive) return;

      /* Nobody signed in on this browser. Send them to the sign in page
         rather than showing a panel that says "sign in" and then offers
         no way to. A session lives in one browser; the workspace lives in
         the database and is waiting for them. */
      if (!who) {
        navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`, { replace: true });
        return;
      }

      /* Signed in, but not an admin. The database already refuses every
         write on this page, because each policy is scoped by is_admin(),
         so the worst they could do was watch saves fail. Still wrong to
         let the panel open at all: hiding the link is a courtesy, this is
         the check. Send them to their own side. */
      if (who.staff?.access_level !== "admin") {
        navigate("/workspace?view=assistant", { replace: true });
        return;
      }

      /* An admin session lasts a day. A laptop left open in an office
         stops being an admin console overnight. See adminClock.js for what
         this is and, more importantly, what it is not. */
      if (await adminSessionExpired(true)) {
        if (!alive) return;
        navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`, { replace: true });
        return;
      }

      setMe(who);
      setLoadingMe(false);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const companyName = me?.company?.name ?? "";

  /* The same sign out the chat uses, from the same place, so the two cannot
     drift. replace: true so the workspace is not left in the history for the
     back button to walk into. */
  async function handleLogout() {
    await signOutCompletely();
    navigate("/auth", { replace: true });
  }

  return (
    <PageShell scroll>
      <FloatingNav maxWidth="max-w-5xl">
        <div className="flex items-center gap-2.5">
          {/* An admin is already a real account with a real password, so
              they never request access to their own workspace. This is
              the door, and it says so rather than being an arrow you have
              to guess at. */}
          <button
            onClick={() => navigate("/workspace?view=assistant")}
            className="h-9 rounded-[10px] flex items-center gap-1.5 px-2.5 border transition-colors hover:opacity-80 shrink-0"
            style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)" }}
            aria-label="Open the assistant"
          >
            <ArrowLeft size={16} style={{ color: "var(--text-2)" }} />
            <span className="text-[13px] hidden sm:inline" style={{ color: "var(--text-2)" }}>
              Assistant
            </span>
          </button>
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-bold text-[15px] tracking-tight" style={{ fontFamily: FONTS.display }}>
              Admin
            </span>
            {companyName && <StatusPill tone="accent">{companyName}</StatusPill>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Added 2026-09-09. There was no way out of this screen at all.
              An admin could reach the chat and use the one there, or wait
              twenty four hours for adminClock to expire them, and neither
              is a person finding a door. The icon stands alone under 640px
              because the header is already tight there. */}
          <button
            onClick={handleLogout}
            className="h-9 rounded-[10px] flex items-center gap-1.5 px-2.5 border transition-colors hover:opacity-80 shrink-0"
            style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)" }}
            aria-label="Log out"
          >
            <LogOut size={15} style={{ color: "var(--text-2)" }} />
            <span className="text-[13px] hidden sm:inline" style={{ color: "var(--text-2)" }}>
              Log out
            </span>
          </button>
          <ThemeToggle />
        </div>
      </FloatingNav>

      {/* w-full is load bearing, it is not decoration.

         PageShell is a column flex container, so this div is a flex item.
         A flex line takes the width of its widest item and stretch only
         grows items up to that line, it never shrinks them. So one long
         file name in the knowledge list, held on one line by `truncate`,
         made this div 512px wide inside a 320px phone. PageShell clips
         rather than scrolls, so the page still measured clean while the
         Ready pill and the bin on every row sat off the right edge,
         invisible and unreachable.

         width:100% makes the width definite, so nothing inside can push it
         wider. min-w-0 alone does not fix it, that was tried. */}
      <div className="relative z-10 w-full min-w-0 px-4 sm:px-6 pb-16">
        <div className="max-w-5xl mx-auto min-w-0">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium whitespace-nowrap border transition-all"
                  style={
                    active
                      ? { background: GRADIENTS.action, color: "#fff", borderColor: "transparent" }
                      : {
                          backgroundColor: "var(--surface)",
                          color: "var(--text-2)",
                          borderColor: "var(--border)",
                        }
                  }
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* The way into the thing they just set up. The arrow in the
              corner was not enough: somebody who has finished setup is
              looking for a door, not an icon. */}
          {me?.company?.slug && (
            <div className="mb-5">
              <PrimaryButton
                onClick={() => navigate("/workspace?view=assistant")}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                Open {me.company.name} AI
              </PrimaryButton>
            </div>
          )}

          {tab === "knowledge" && <KnowledgeSection me={me} loading={loadingMe} />}
          {tab === "connectors" && <ConnectorsSection />}
          {tab === "access" && <AccessSection me={me} />}
        </div>
      </div>
    </PageShell>
  );
}

/* ==========================================================================
   2. KNOWLEDGE BASE
   One index, and the admin decides what is in it. Every entry carries a
   name and a short description, which is what lets the assistant pull
   only what a task needs instead of sweeping everything.
   ========================================================================== */

/* ALREADY THERE

   Red text under the box somebody is typing in, the moment what they typed
   matches something they already have. No dialog, nothing to dismiss, and it
   never stops the upload.

   Anthony's design and the reasoning is his: a name comparison costs nothing
   and answers instantly, so it has no business waiting on a model. "Instead
   of burning tokens to start reading the file to know whether it is... the
   only time the system should actually read file is first of all when you
   are toggling to customer facing."

   It warns and leaves the decision alone, because somebody adding a second
   version on purpose is not doing anything wrong, and a product that argues
   with a person about their own files is one they work around. */
function AlreadyThere({ match, what, advice }) {
  if (!match) return null;
  const added = whenAdded(match);

  return (
    <p
      className="text-[12.5px] leading-relaxed mt-1.5 flex items-start gap-1.5"
      style={{ color: "var(--danger)" }}
      role="status"
    >
      <AlertCircle size={13} className="shrink-0 mt-0.5" />
      <span>
        {what}
        {added ? `, added ${added}` : ""}. {advice}
      </span>
    </p>
  );
}

/* ==========================================================================
   WHERE YOUR OWN MATERIAL DISAGREES WITH ITSELF

   Written by support-ask while it answers a real customer, so everything in
   here has already reached somebody outside the company. That is what makes
   it worth a panel rather than a page nobody visits.

   Anthony asked for it in these terms: "so they don't say that it's the AI
   that is at fault. So if they uploaded this, the AI sees contradictory
   files, it names them and it's logged."

   The panel does not appear at all when there is nothing in it. A dashboard
   that always shows a section headed "problems" with nothing under it trains
   people to skip that part of the screen, and then the day it has something
   in it, nobody looks.

   Only open ones. A resolved row is kept for the record, not for the screen.
   ========================================================================== */

function Disagreements({ items, onResolve, busyId }) {
  if (!items.length) return null;

  return (
    <GlassPanel className="p-6">
      <SectionHeading hint="Your assistant found two of your own sources saying different things while answering a real customer. It went with the newer one. Fix the older one, or take it out.">
        Your material disagrees with itself
      </SectionHeading>

      <div className="space-y-2">
        {items.map((row) => (
          <div
            key={row.id}
            className="rounded-[12px] px-3.5 py-3 border"
            style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--caution)" }} />
              <p className="text-[14px] font-medium min-w-0" style={{ color: "var(--text-1)" }}>
                {row.topic}
              </p>
            </div>

            {/* Both sides, named, in the order the assistant saw them. The
                one it answered from is marked, so nobody has to work out
                which of the two reached the customer. */}
            <div className="mt-2.5 space-y-1.5 sm:pl-[26px]">
              {[
                { source: row.source_a, said: row.said_a },
                { source: row.source_b, said: row.said_b },
              ].map((side, index) => {
                const used = row.answered_with && row.answered_with === side.source;
                return (
                  <p key={index} className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                    <span style={{ color: used ? "var(--text-1)" : "var(--text-2)" }}>{side.source}</span>
                    {used ? (
                      <span style={{ color: "var(--all-clear)" }}> (used)</span>
                    ) : null}
                    {side.said ? `: ${side.said}` : ""}
                  </p>
                );
              })}
            </div>

            <div className="mt-2.5 sm:pl-[26px] flex items-center gap-3 flex-wrap">
              <GhostButton
                onClick={() => onResolve(row.id)}
                disabled={busyId === row.id}
                className="text-[12.5px] py-1.5 px-3"
              >
                {busyId === row.id ? "Saving" : "Sorted it"}
              </GhostButton>
              {row.times_seen > 1 ? (
                <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  Come up {row.times_seen} times
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function KnowledgeSection({ me, loading: loadingMe }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* A file waiting for its name and description. The admin has to write
     both, because those two lines are how the assistant decides whether a
     source is worth opening. A file called final_v3.txt with no
     description is a file the assistant will never choose. */
  const [staged, setStaged] = useState(null);

  /* True while the model is reading a file to name it. It drives one line
     under the two fields and nothing else: no disabled button, no spinner
     over the form. Somebody who knows what to call it types straight over
     the top, and waiting is never made into their problem. */
  const [naming, setNaming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [justAdded, setJustAdded] = useState("");

  /* Pasting is the main way in, not the fallback. Most company material
     lives in a PDF or a Word file that nothing here can open yet, and
     telling somebody to convert a document before they can use their own
     product is a worse answer than a box they can paste into. */
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteNote, setPasteNote] = useState("");
  const [pasteText, setPasteText] = useState("");

  /* Which file is being pulled apart right now, so a big PDF shows work
     happening rather than a page that looks stuck. */
  const [reading, setReading] = useState("");

  /* Files chosen together and still waiting their turn. */
  const [queue, setQueue] = useState([]);

  /* THE ONE THING THAT CAN SEND A FILE OUT OF THE BUILDING

     Holds whatever an admin has asked to open up, until they answer the
     question. Null means no question is on screen.

       { target: "row", id, name }   a file already in the list
       { target: "staged", name }    a file being uploaded right now
       { target: "paste", name }     text being pasted in right now

     A row writes to the database on yes, so it needs `gateBusy` to lock the
     buttons while that write is in flight. The two forms only set a choice
     that will be written when the form is saved, so they answer instantly.

     See src/shared/PublishGate.jsx for why any of this exists. */
  const [gate, setGate] = useState(null);
  const [gateBusy, setGateBusy] = useState(false);

  /* THE BIN USED TO FIRE ON ONE TAP

     No question, no undo, and on a phone it sits a few millimetres from the
     file name in a list people scroll with a thumb. Anthony found it by
     looking: somebody can delete a file and never know they did.

     Holds the row somebody asked to remove until they answer. */
  const [doomed, setDoomed] = useState(null);
  const [doomedBusy, setDoomedBusy] = useState(false);

  /* The link being added when the same address is already in the list.
     Holds the existing row so Replace knows what to take away afterwards. */
  const [refresh, setRefresh] = useState(null);

  /* Read once with the sources. It is a short list and it only changes when
     a customer asks something, so there is nothing to poll for. */
  const [clashes, setClashes] = useState([]);
  const [clashBusy, setClashBusy] = useState(null);

  /* WHAT THE READER FOUND, IF ANYTHING

     A model opens the material and says what is actually in it, which is
     worth more than any checklist written in advance. It is shown inside
     the gate and nowhere else.

     THE READING CAN ONLY EVER ADD A WARNING, NEVER REMOVE ONE
     This is the rule the whole design turns on, so it is written here
     rather than left to be inferred. The gate opens for every file, every
     time, whatever the reader says or fails to say. A clean reading does
     not skip the question, it just leaves the dialog quiet. Anything else
     would let a model that got it wrong wave a payroll file through, and a
     model that can wave something through will eventually wave the wrong
     thing through at three in the morning with nobody watching.

     So: it adds friction, it never removes it, and it never encourages.

     `readingFor` is the gate the reading belongs to. A read that comes
     back after somebody has cancelled and opened a different file must not
     paint its answer onto that one. */
  const [review, setReview] = useState(null);
  const readingFor = useRef(0);

  /* Started the moment a file is read into the browser, long before
     anybody asks to publish it, so the answer is usually already sitting
     there when the gate opens instead of making somebody wait. */
  const stagedReading = useRef(null);

  async function runReview(work) {
    const token = readingFor.current + 1;
    readingFor.current = token;
    setReview({ state: "reading" });

    const result = await work;
    if (readingFor.current !== token) return;
    setReview(result);
  }

  /* The audience chosen inside the upload forms, before anything is saved.

     WHY THE FORMS HAVE THIS AT ALL
     Anthony's point, and he is right: somebody uploading a page for
     customers should be able to say so while they are uploading it, not
     have to save it, find it in the list, and turn it on as a second job.
     The list still works exactly as before, so forgetting here costs
     nothing. Two ways in, neither of them redundant.

     Both start false. Opening a file up is always a deliberate act. */
  const [stagedVisible, setStagedVisible] = useState(false);
  const [pasteVisible, setPasteVisible] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (loadingMe) return;
    let alive = true;
    (async () => {
      if (me?.company?.id) {
        const [rows, disagreements] = await Promise.all([
          listSources(me.company.id),
          listContradictions(me.company.id),
        ]);
        if (!alive) return;
        setItems(rows);
        setClashes(disagreements);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadingMe, me?.company?.id]);

  const ready = items.filter((i) => i.status === "ready").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const linkCount = items.filter((i) => i.kind === "link").length;

  const errorRef = useRef(null);

  /* Placing the message near the control is not enough on a phone, where
     the control itself can be below the fold. Bring it into view, so a
     refused file is something you are told rather than something you have
     to go looking for. */
  function show(message) {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setTimeout(() => setError(""), 9000);
  }

  async function pickFiles(e) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = "";
    if (!chosen.length) return;

    /* Several at once is normal, so take them all and work through them
       one at a time. Each still gets its own name and description,
       because those two lines are how the assistant decides which source
       to open, and a batch cannot write them for you. */
    setQueue(chosen.slice(1));
    await stageFile(chosen[0]);
  }

  /* Reads whatever was handed over and gets it ready to be named.

     TWO KINDS OF THING ARRIVE HERE AND THEY SPLIT EARLY. A document
     becomes text, gets chunked, and the file itself is thrown away. A
     picture stays a picture: the whole point of a logo is the picture, so
     it is shrunk, kept, and uploaded when the admin saves.

     Everything after the split is the same, which is why the split is at
     the top rather than sprinkled through. */
  async function stageFile(file) {
    if (fileKind(file.name) === "image") {
      await stageImage(file);
      return;
    }

    if (!canBecomeText(file.name)) {
      show(`${file.name} is not a kind of file this can read. PDF, Word, plain text, Markdown, CSV or JSON, or a picture.`);
      return;
    }
    if (file.size > MAX_SOURCE_UPLOAD_KB * 1024) {
      show(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ` +
          `${Math.round(MAX_SOURCE_UPLOAD_KB / 1024)} MB limit. Split it up, or paste the part that matters.`
      );
      return;
    }

    /* A large PDF takes a moment to pull apart, and a dead button while
       that happens reads as broken. */
    setReading(file.name);
    const result = await readFileAsText(file, { maxChars: MAX_SOURCE_CHARS });
    setReading("");

    if (!result.ok) {
      show(result.reason);
      return;
    }

    setStagedVisible(false);
    /* The admin is about to spend half a minute writing a name and a line
       about what it holds. That is time the reading can use. */
    stagedReading.current = readBeforePublish({ text: result.text, name: file.name });

    setStaged({
      fileName: file.name,
      name: file.name.replace(/\.[^.]+$/, ""),
      description: "",
      text: result.text,
      truncated: result.truncated,
    });

    nameItFor({ name: file.name, text: result.text });
  }

  /* ------------------------------------------------------------------
     A PICTURE

     Shrunk here, in the browser, before it goes anywhere. A five megabyte
     phone photo becomes a couple of hundred kilobytes and nothing that
     uses it can tell the difference. It is also converted to WebP on the
     way, which halves it again. See shrinkImage for the trap in that.

     BRAND_ASSET_EDGE rather than the 1568 the chat uses. A brand asset is
     used to BUILD things, so it ends up on a title slide or in a printed
     deck, and 1568 across is soft the moment it does.
     ------------------------------------------------------------------ */
  async function stageImage(file) {
    if (file.size > MAX_SOURCE_UPLOAD_KB * 1024) {
      show(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ` +
          `${Math.round(MAX_SOURCE_UPLOAD_KB / 1024)} MB limit.`
      );
      return;
    }

    setReading(file.name);
    let picture;
    try {
      picture = await shrinkImage(file, { maxEdge: BRAND_ASSET_EDGE });
    } catch {
      setReading("");
      show(`${file.name} could not be opened as a picture. Try a PNG, a JPG or a WebP.`);
      return;
    }
    setReading("");

    setStagedVisible(false);
    /* A picture has nothing to read before publishing, so the gate has
       nothing to wait on. Cleared rather than left holding the last
       document's answer, which would attach one file's reading to a
       different file. */
    stagedReading.current = null;

    setStaged({
      fileName: file.name,
      name: file.name.replace(/\.[^.]+$/, ""),
      description: "",
      text: "",
      truncated: false,
      picture,
      preview: URL.createObjectURL(picture.blob),
    });

    nameItFor({ name: file.name, image: { media_type: picture.media_type, data: picture.data } });
  }

  /* ------------------------------------------------------------------
     NAMING IT, SO THE ADMIN DOES NOT HAVE TO

     Anthony, 2026-09-15: "is it not better that when admin is uploading
     the work, admin doesn't need to write the title or description?"

     Fired and not awaited, on purpose. The form is already on screen and
     usable, so somebody who knows exactly what they want to call it can
     type over the top without waiting. The answer lands in the fields
     when it lands, or it does not land and they type, which is what they
     did before this existed.

     IT ONLY FILLS A FIELD THE ADMIN HAS NOT TOUCHED. The check below
     compares against the file name it staged with, so if they started
     typing while it was thinking, their words win. Nothing is more
     annoying than a form that overwrites you.
     ------------------------------------------------------------------ */
  async function nameItFor({ name, text, image }) {
    setNaming(true);
    const suggestion = await describeSource({ name, text, image });
    setNaming(false);
    if (!suggestion.title) return;

    const untouched = name.replace(/\.[^.]+$/, "");
    setStaged((current) => {
      if (!current || current.fileName !== name) return current;
      return {
        ...current,
        name: current.name === untouched ? suggestion.title : current.name,
        description: current.description === "" ? suggestion.description : current.description,
      };
    });
  }

  /* A NAME ALREADY IN USE ASKS A QUESTION INSTEAD OF TELLING SOMEBODY OFF.

     Anthony, 2026-09-21: "when the file still exists... better still
     suggest a replacement."

     A link that was already here has offered Replace or Keep both for a
     while. A file only got a red line saying pick a different name, which
     is the product arguing with somebody about their own files. Same
     question, so the same dialog, with its own words.

     `pending` holds what to do once they answer: a function that takes the
     row being replaced, or null for keep both. The save runs the same way
     either way, and the removal is the only difference.

     THE ORDER IS ADD FIRST, REMOVE SECOND, and it is not an implementation
     detail. Backwards, a save that fails takes the working copy with it and
     leaves the company with nothing. */
  const [nameClash, setNameClash] = useState(null);

  function guardName(name, run) {
    const existing = findByName(items, name);
    if (existing) {
      setNameClash({ existing, run });
      return;
    }
    run(null);
  }

  /* Replacing removes the old row only once the new one is safely stored,
     and says so plainly when the removal fails rather than pretending. */
  async function dropReplaced(replacing) {
    if (!replacing) return;
    const removed = await removeSource(replacing.id);
    if (!removed) {
      show("Added the new one, but could not remove the old copy. Remove it from the list yourself.");
    }
  }

  async function savePasted(e) {
    e.preventDefault();
    if (!me?.company?.id) return;

    if (!pasteName.trim() || !pasteNote.trim() || !pasteText.trim()) {
      show("Give it a name, one line saying what it holds, and the text itself.");
      return;
    }

    guardName(pasteName.trim(), (replacing) => runSavePasted(replacing));
  }

  async function runSavePasted(replacing) {
    setSaving(true);
    const result = await addTextSource({
      companyId: me.company.id,
      userId: me.user.id,
      name: pasteName.trim(),
      description: pasteNote.trim(),
      text: pasteText,
      kind: "file",
      customerVisible: pasteVisible,
    });
    setSaving(false);

    if (!result.ok) {
      show(result.reason);
      return;
    }

    await dropReplaced(replacing);
    setNameClash(null);

    /* Read back from the database rather than adding to the list by hand.
       A replacement changes two rows, and a list stitched together locally
       is exactly how a deleted file kept its name in the first place. */
    setItems(await listSources(me.company.id));
    setJustAdded(`${result.source.name}, ${result.chunks} ${result.chunks === 1 ? "piece" : "pieces"} of text`);
    setPasteName("");
    setPasteNote("");
    setPasteText("");
    setPasteVisible(false);
    setPasteOpen(false);
  }

  async function saveStaged() {
    if (!staged || !me?.company?.id) return;
    if (!staged.name.trim() || !staged.description.trim()) {
      show("Give it a name and one line saying what it holds.");
      return;
    }

    guardName(staged.name.trim(), (replacing) => runSaveStaged(replacing));
  }

  async function runSaveStaged(replacing) {
    setSaving(true);
    /* A picture goes to the bucket and a document becomes rows of text.
       Both come back in the same shape, so everything after this line
       does not care which it was. */
    const result = staged.picture
      ? await addImageSource({
          companyId: me.company.id,
          userId: me.user.id,
          name: staged.name.trim(),
          description: staged.description.trim(),
          blob: staged.picture.blob,
          extension: staged.picture.extension,
          mediaType: staged.picture.media_type,
          customerVisible: stagedVisible,
        })
      : await addTextSource({
          companyId: me.company.id,
          userId: me.user.id,
          name: staged.name.trim(),
          description: staged.description.trim(),
          text: staged.text,
          kind: "file",
          customerVisible: stagedVisible,
        });
    setSaving(false);

    if (!result.ok) {
      show(result.reason);
      return;
    }

    await dropReplaced(replacing);
    setNameClash(null);

    setItems(await listSources(me.company.id));
    setJustAdded(
      staged.picture
        ? `${result.source.name}, ready to use in designs and documents`
        : `${result.source.name}, ${result.chunks} ${result.chunks === 1 ? "piece" : "pieces"} of text`
    );
    /* The preview holds a blob URL, and a blob URL that is never revoked
       holds the whole picture in memory for as long as the tab is open.
       Uploading four logos in a row without this leaks all four. */
    if (staged.preview) URL.revokeObjectURL(staged.preview);
    setStaged(null);

    /* The audience choice does NOT carry over to the next file in the
       batch. Somebody who opened up a price list should not silently open
       up the payroll file behind it because the control kept its answer. */
    setStagedVisible(false);

    /* Straight on to the next one they chose, so a batch feels like a
       batch rather than something that quietly dropped everything after
       the first file. */
    const [next, ...rest] = queue;
    if (next) {
      setQueue(rest);
      await stageFile(next);
    }
  }

  /* The link goes to an edge function rather than being fetched here,
     because a browser cannot read another site's page and a server can.
     That split is the whole design: a link is read once, by the server,
     when an admin vouches for it. The assistant never fetches anything. */
  async function addLink(e) {
    e.preventDefault();
    if (!linkUrl.trim() || !me?.company?.id) return;

    /* Already have this address? Then this is a refresh, not a duplicate, and
       the only real question is what happens to the reading already stored.
       Ask before spending a fetch on it. */
    const existing = findByAddress(items, linkUrl);
    if (existing) {
      setRefresh(existing);
      return;
    }

    await readLink({ replacing: null });
  }

  /* THE ONE PLACE A LINK IS ACTUALLY FETCHED

     `replacing` is the row to remove once the new reading is safely in, or
     null to just add.

     THE ORDER IS LOAD BEARING. The new copy goes in first and the old one is
     only removed once that has worked. Backwards, a page that fails to fetch
     would take the working copy with it and leave the company with nothing
     about that page at all. */
  async function readLink({ replacing }) {
    if (!me?.company?.id) return;

    setSaving(true);
    const result = await fetchLinkSource({ url: linkUrl.trim(), description: linkNote.trim() });

    if (!result.ok) {
      setSaving(false);
      setRefresh(null);
      show(result.message);
      return;
    }

    if (replacing) {
      const removed = await removeSource(replacing.id);
      /* The new reading is already saved, so a failure here is untidy rather
         than lost. Say so plainly instead of pretending it worked. */
      if (!removed) {
        show("Read the page, but could not remove the old copy. Remove it from the list yourself.");
      }
    }

    setSaving(false);
    setItems(await listSources(me.company.id));
    setJustAdded(result.name);
    setLinkUrl("");
    setLinkNote("");
    setRefresh(null);
  }

  async function markSorted(id) {
    setClashBusy(id);
    const ok = await resolveContradiction(id);
    setClashBusy(null);

    if (!ok) {
      show("Could not save that. Try again.");
      return;
    }
    setClashes((prev) => prev.filter((row) => row.id !== id));
  }

  function askBeforeRemoving(item) {
    setDoomed(item);
  }

  async function confirmRemoving() {
    if (!doomed) return;
    setDoomedBusy(true);
    const ok = await removeSource(doomed.id);
    setDoomedBusy(false);

    if (!ok) {
      setDoomed(null);
      show("Could not remove that. Try again.");
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== doomed.id));
    setDoomed(null);
  }

  /* TURNING A SOURCE OVER TO THE SUPPORT SIDE, OR TAKING IT BACK

     The two directions are not the same action and must never be treated
     as one.

     TAKING IT BACK is safe, so it happens on the spot. It is written to
     the row straight away and reflected in the list, because a switch that
     waits for a round trip before it moves reads as broken and gets
     clicked twice. If the write fails the switch goes back and the admin
     is told.

     OPENING IT UP is the only action in this whole admin that can put a
     company's own material in front of a stranger, so it never happens on
     one tap. It opens the gate and waits for a deliberate answer. Every
     file, every time, including the ones that look harmless. */
  async function hide(id) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, customer_visible: false } : i)));
    const ok = await setSourceVisibility(id, false);
    if (!ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, customer_visible: true } : i)));
      show("Could not change that. Try again.");
    }
  }

  function askBeforeShowing(item) {
    setGate({ target: "row", id: item.id, name: item.name });
    /* This one is already saved, so its text has to be read back out of
       the knowledge base before anything can look at it. */
    runReview(
      loadSourceText(item.id).then((text) => readBeforePublish({ text, name: item.name })),
    );
  }

  /* The gate wants something to call the file. A form is often answered
     before the name box is, so fall back to the file itself rather than
     asking "turn this on for customers?" about a blank. */
  function askBeforeStaged() {
    setGate({ target: "staged", name: staged?.name.trim() || staged?.fileName || "this file" });
    /* Almost always finished by now, because it started when the file was
       chosen. If it somehow is not, the gate shows it working. */
    runReview(
      stagedReading.current ??
        readBeforePublish({ text: staged?.text ?? "", name: staged?.name ?? "" }),
    );
  }

  function askBeforePaste() {
    setGate({ target: "paste", name: pasteName.trim() || "this text" });
    /* Pasted text has no earlier moment to start from, so this is it. */
    runReview(readBeforePublish({ text: pasteText, name: pasteName.trim() }));
  }

  async function confirmShowing() {
    if (!gate) return;

    /* A form has saved nothing yet, so yes only sets the choice. The write
       happens when they add it, through addTextSource. */
    if (gate.target === "staged") {
      setStagedVisible(true);
      closeGate();
      return;
    }
    if (gate.target === "paste") {
      setPasteVisible(true);
      closeGate();
      return;
    }

    /* A row is live, so this writes now. The optimistic update used
       everywhere else is deliberately not used here: on the way out of the
       building the list must only ever show what the database actually
       accepted. */
    setGateBusy(true);
    const ok = await setSourceVisibility(gate.id, true);
    setGateBusy(false);

    if (!ok) {
      closeGate();
      show("Could not change that. Try again.");
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === gate.id ? { ...i, customer_visible: true } : i)));
    closeGate();
  }

  /* One place to close it, so the reading from the last file can never be
     left on screen above the next one. */
  function closeGate() {
    readingFor.current += 1;
    setReview(null);
    setGate(null);
  }

  if (loading || loadingMe) {
    return (
      <div className="flex items-center gap-2.5 py-10 justify-center" style={{ color: "var(--text-3)" }}>
        <Spinner size={16} />
        <span className="text-[14px]">Loading your knowledge base</span>
      </div>
    );
  }

  if (!me?.company?.id) {
    return (
      <GlassPanel className="p-6">
        <p className="text-[14.5px] mb-4" style={{ color: "var(--text-2)" }}>
          This account is not on a workspace yet. Ask whoever set it up to add you.
        </p>
        <GhostButton onClick={() => navigate("/auth")}>Sign in as someone else</GhostButton>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-5" style={{ animation: "sx-rise 0.3s ease" }}>
      {/* PICTURES WERE MISSING UNTIL 2026-09-15, which meant a company
          could put its brand guidelines in and not its own logo.

          The extensions are listed out rather than written as "image/*",
          so that what this picker offers and what the brand-assets bucket
          accepts are two lists a person can read against each other. A
          wildcard here and a fixed list in the bucket is how somebody
          ends up choosing a file that is refused after they picked it. */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.log,.rtf,.xml,.html,.png,.jpg,.jpeg,.webp"
        onChange={pickFiles}
      />

      {/* Summary */}
      {/* THREE ACROSS AT EVERY WIDTH, INCLUDING A PHONE

          They used to stack, so on a phone three small numbers took most of
          the first screen and pushed the thing people came here to do, which
          is add knowledge, below the fold. Anthony: "they are eating space...
          they are pushing the part where you start uploading the knowledge
          downwards."

          A count is a glance, not a paragraph. Three glances belong side by
          side. See StatTile for how it survives a 320px phone. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Ready to use" value={ready} tone="ok" />
        <StatTile label="Being read" value={pending} tone="pending" />
        <StatTile
          label={failed ? "Could not be read" : "Outside sources"}
          value={failed || 0}
          tone={failed ? "pending" : "neutral"}
          hint={failed ? "Remove these and add them again" : "The assistant reads nothing else"}
        />
      </div>

      {/* THE TWO WAYS IN, SIDE BY SIDE ON A BIG SCREEN.

          Until 2026-09-14 the whole admin had exactly one breakpoint, sm:
          at 640px. So a tablet and a 1280px desktop got the identical phone
          layout, stretched. Measured: 1817px of page on a tablet and 1797px
          on a desktop, the same column, just wider panels. "Add a link" was
          242px tall spanning 1024px, which is a strip of empty space where
          a person expects density.

          md: at 768, which is where a tablet starts. lg: was tried first
          and left the tablet exactly as it was, 1817px of the same single
          column, which is the width Anthony asked about by name. At 768 the
          container is 720px, so each panel is about 350px. That is narrow
          but it is a real column, and the form inside stacks at the same
          breakpoint so nothing is squeezed. */}
      <div className="grid gap-5 md:grid-cols-2 md:items-start">

      {/* Upload */}
      <GlassPanel className="p-6">
        {/* THE OLD LINE TOLD THEM TO DO A JOB THAT IS NOW DONE FOR THEM.

            It read "Give each one a clear name and a line saying what it
            holds, because that is how it decides which to open." True
            until 2026-09-15, and now it is an instruction to do work the
            screen has already done, which makes the product look like it
            has not noticed what it does. */}
        <SectionHeading hint="Brand guidelines, templates, logos, past work, anything the assistant should write from. Drop it in and it gets read and named for you. Change the name or the line underneath if you want to.">
          Add company knowledge
        </SectionHeading>

        {/* ==============================================================
            WHERE THIS WORKSPACE IS RUNNING

            This sits above the upload controls, which is the only place it
            can do its job. Somebody about to hand over a payroll file has
            to read it before they choose the file, not after.

            IT DOES NOT SAY "DEMO", AND THAT IS THE POINT.
            A shared workspace is a real product for a company that cannot
            fund its own cloud, and plenty of them can run on this one
            exactly as it stands. Calling it a demo would price that work at
            nothing and talk a paying customer out of a thing that already
            works for them. So it says where the workspace is hosted, which
            is the fact somebody needs, and it says the limit lifts on a
            deployment rather than dangling a warning with no way out.

            One line, one time, in a quiet band. A warning repeated on every
            screen stops being read on the second screen.
            ============================================================== */}
        <div
          className="flex items-start gap-3 rounded-[12px] border px-4 py-3 mb-5"
          style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface-2)" }}
        >
          <Shield size={15} className="shrink-0 mt-0.5" style={{ color: BRAND.accentSoft }} />
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            This workspace is hosted by us for now, so use it with real work but leave out
            anything you would not want outside your office. That limit goes when it runs
            inside your own systems.
          </p>
        </div>

        {/* Paste first, because it is the path that always works. A file
            only helps if it is a format a browser can read as text, and
            most of a company's material is not. */}
        {!staged && (
          <div className="mb-4">
            {pasteOpen ? (
              <form onSubmit={savePasted} className="space-y-3">
                <Field label="Name" required>
                  <TextInput
                    value={pasteName}
                    onChange={(e) => setPasteName(e.target.value)}
                    placeholder="Brand voice guide"
                  />
                  {/* Says the name is taken and stops there. It no longer
                      tells anybody to pick a different name, because the
                      dialog on save now offers to replace instead. */}
                  <AlreadyThere
                    match={findByName(items, pasteName)}
                    what="You already have something called this"
                    advice="Save it and you will be asked whether to replace the old one."
                  />
                </Field>
                <Field label="What it holds" required>
                  <TextInput
                    value={pasteNote}
                    onChange={(e) => setPasteNote(e.target.value)}
                    placeholder="How we write, the words we use and avoid"
                  />
                </Field>
                {/* SET IT HERE, OR SET IT LATER, BOTH WORK
                    It starts on Staff only and picking the other half goes
                    through the same gate as the list does, so there is no
                    quiet way into the customer side no matter which screen
                    somebody uses. */}
                <Field label="Who can read it">
                  <div className="-mx-1 px-1 overflow-x-auto py-0.5">
                    <AudienceControl
                      on={pasteVisible}
                      label={pasteName.trim() || "this text"}
                      onPick={(open) => (open ? askBeforePaste() : setPasteVisible(false))}
                    />
                  </div>
                </Field>

                <Field label="The text" required>
                  <TextArea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={8}
                    placeholder="Paste it here. Straight out of a PDF, a Word file, an email, anywhere."
                  />
                </Field>
                {/* Full width primary, everything else on its own line
                    below. Three things side by side wrapped the button
                    onto two lines on a phone. */}
                <PrimaryButton
                  type="submit"
                  disabled={saving || !pasteName.trim() || !pasteNote.trim() || !pasteText.trim()}
                  className="w-full flex items-center gap-2 justify-center"
                >
                  {saving && <Spinner size={13} color="#fff" />}
                  {saving ? "Saving" : "Add to knowledge base"}
                </PrimaryButton>

                <div className="flex items-center justify-between">
                  <GhostButton
                    onClick={() => {
                      setPasteOpen(false);
                      setPasteText("");
                    }}
                  >
                    Cancel
                  </GhostButton>
                  {pasteText.trim() && (
                    <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                      {pasteText.trim().length.toLocaleString()} characters
                    </span>
                  )}
                </div>
              </form>
            ) : (
              <button
                onClick={() => setPasteOpen(true)}
                className="w-full rounded-[14px] border border-dashed py-4 text-[14px] transition-colors hover:opacity-80"
                style={{ borderColor: "var(--border-2)", color: "var(--text-1)" }}
              >
                Paste text instead
              </button>
            )}
          </div>
        )}

        {staged ? (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              {queue.length > 0 && (
                <span style={{ color: "var(--text-2)" }}>
                  {queue.length + 1} files chosen. This one first.{" "}
                </span>
              )}
              {staged.picture
                ? `Read ${staged.fileName}, and it is ready to use in designs and documents.`
                : `Read ${staged.fileName}${
                    staged.truncated ? ", the first part of it, which was as much as fits" : ""
                  }.`}{" "}
              {naming ? "Naming it now." : "Change either line if you want to."}
            </p>

            {/* THE PICTURE ITSELF, because a name is not enough to tell two
                logos apart and an admin uploading four of them should be
                able to see which one they are looking at.

                Sized off the shrunk copy rather than the original, so what
                is on screen is what was actually kept. Contained rather
                than cropped: a logo cropped to fill a box is a logo with
                its edges cut off, which is exactly the thing a brand guide
                exists to prevent. The chequer behind it is there so a
                transparent PNG reads as transparent instead of as a white
                rectangle. */}
            {staged.preview && (
              <div
                className="rounded-[12px] border p-3 flex items-center justify-center"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  /* A chequer, so a transparent PNG reads as transparent
                     rather than as a white rectangle somebody has to guess
                     about. Drawn from a fixed low-opacity white rather
                     than from a theme token: --chip is nearly the same
                     value as the surface behind it in both themes, so the
                     squares came out invisible and the whole point of
                     them went with it. */
                  backgroundImage:
                    "repeating-conic-gradient(rgba(255,255,255,0.10) 0% 25%, transparent 0% 50%)",
                  backgroundSize: "18px 18px",
                }}
              >
                <img
                  src={staged.preview}
                  alt={`${staged.fileName}, as it will be kept`}
                  className="max-h-[160px] w-auto max-w-full object-contain"
                />
              </div>
            )}
            <Field label="Name" required>
              <TextInput
                value={staged.name}
                onChange={(e) => setStaged({ ...staged, name: e.target.value })}
                placeholder="Brand guidelines 2026"
              />
              <AlreadyThere
                match={findByName(items, staged.name)}
                what="You already have something called this"
                advice="Save it and you will be asked whether to replace the old one."
              />
            </Field>
            <Field label="What it holds" required>
              <TextInput
                value={staged.description}
                onChange={(e) => setStaged({ ...staged, description: e.target.value })}
                placeholder="Colors, fonts, logo rules, and tone of voice"
              />
            </Field>
            {/* SET IT HERE, OR SET IT LATER, BOTH WORK
                It starts on Staff only and picking the other half goes
                through the same gate as the list does, so there is no
                quiet way into the customer side no matter which screen
                somebody uses. */}
            <Field label="Who can read it">
              <div className="-mx-1 px-1 overflow-x-auto py-0.5">
                <AudienceControl
                  on={stagedVisible}
                  label={staged.name.trim() || staged.fileName}
                  onPick={(open) => (open ? askBeforeStaged() : setStagedVisible(false))}
                />
              </div>
            </Field>

            <div className="flex gap-2">
              <PrimaryButton
                onClick={saveStaged}
                disabled={saving || !staged.name.trim() || !staged.description.trim()}
                className="flex items-center gap-2 justify-center"
              >
                {saving && <Spinner size={13} color="#fff" />}
                {saving ? "Saving" : "Add to knowledge base"}
              </PrimaryButton>
              <GhostButton
                onClick={() => {
                  /* Same reason as the save path: a blob URL that is never
                     revoked holds the whole picture until the tab closes,
                     and cancelling is the easiest way to do it four times
                     in a row. */
                  if (staged.preview) URL.revokeObjectURL(staged.preview);
                  setStaged(null);
                  setQueue([]);
                  stagedReading.current = null;
                }}
              >
                Cancel
              </GhostButton>
            </div>
          </div>
        ) : (
          /* p-8 everywhere made this a 230px tall dashed box spanning the
             full width of a desktop, to say "or choose a file". The padding
             now comes down as the screen grows, because the thing it is
             asking for does not get bigger with the window. */
          <div
            className="rounded-[14px] border border-dashed p-8 md:p-6 text-center transition-colors"
            style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface-2)" }}
          >
            <div className="flex justify-center mb-3">
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
              >
                <UploadCloud size={20} style={{ color: BRAND.accentSoft }} />
              </div>
            </div>
            <p className="text-[14.5px] font-medium mb-1" style={{ color: "var(--text-1)" }}>
              Or choose a file
            </p>
            <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
              PDF, Word, plain text, Markdown, CSV, JSON, or a picture, up to{" "}
              {Math.round(MAX_SOURCE_UPLOAD_KB / 1024)} MB
            </p>
            {reading ? (
              <span className="inline-flex items-center gap-2 text-[13.5px]" style={{ color: "var(--text-2)" }}>
                <Spinner size={14} />
                Reading {reading}
              </span>
            ) : (
              <GhostButton onClick={() => fileInputRef.current?.click()}>Browse files</GhostButton>
            )}

            {/* Right under the button that failed. It used to render at the
                top of the page, which on a phone is a screen and a half
                above where somebody is looking, so a refused file looked
                like a button doing nothing at all. */}
            {error && (
              <div
                ref={errorRef}
                className="flex items-start gap-2 rounded-[12px] px-3.5 py-3 mt-4 text-[13px] text-left"
                style={{ backgroundColor: "rgba(229,62,62,0.1)", color: BRAND.red }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}
      </GlassPanel>

      {/* Add a link */}
      <GlassPanel className="p-6">
        {/* No audience control on this one, and that is not an oversight.
            A link is created by the add-link edge function, which is
            deployed and working, and this build does not rewrite a working
            function from the repo. A link therefore arrives staff only and
            is opened up from the list below, which is one tap and now says
            plainly what it does. The hint says so rather than leaving
            somebody hunting for a control that is not there. */}
        <SectionHeading hint="Give the assistant a page to learn from. It is read once, now, and what it says is saved here. The assistant never opens a link itself. A link starts as staff only, set who can read it in the list below.">
          Add a link
        </SectionHeading>

        {/* Three across on a phone turned tablet, stacked again once this
            panel is sharing the row at 1024 and up. The widths are the
            reason, not a preference: three columns inside 470px squeezes
            the address field to nothing. */}
        <form onSubmit={addLink} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end md:grid-cols-1 md:items-stretch">
          <Field label="Address" required>
            <TextInput
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="company.com/about"
            />
            {/* A QUIET NOTE, NOT A WARNING, AND THE DIFFERENCE IS THE WHOLE
                POINT ON THIS ONE FORM

                A link is a photograph of a page taken when it was added, and
                nothing ever re-reads it. So adding the same address again is
                almost never a mistake, it is somebody refreshing a page they
                have edited since. The first build put red text here and told
                them off for doing the right thing.

                Pressing Add asks what should happen to the old reading.
                See RefreshOrKeep.jsx. */}
            {findByAddress(items, linkUrl) && (
              <p className="text-[12.5px] leading-relaxed mt-1.5" style={{ color: "var(--text-3)" }}>
                You already have this page from{" "}
                {whenAdded(findByAddress(items, linkUrl)) ?? "before"}. Adding it reads the page
                again, and we will ask what to do with the old copy.
              </p>
            )}
          </Field>
          {/* No longer required. The page is read when it is added, and a
              name and a line come back with it. Somebody who wants to say
              it in their own words still can, and their words win. */}
          <Field label="What it holds" hint="Leave this empty and it will be filled in from the page.">
            <TextInput
              value={linkNote}
              onChange={(e) => setLinkNote(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <div className="mb-4">
            <PrimaryButton
              type="submit"
              disabled={saving || !linkUrl.trim()}
              /* Full width on a phone, sized to its text when the form is
                 three across, and full width again once the form stacks in
                 the narrow column at 768 and up. Left to sm:w-auto it sat
                 small and alone at the bottom of a 350px column with space
                 all round it, which reads as an unfinished form. */
              className="flex items-center gap-2 w-full sm:w-auto md:w-full justify-center"
            >
              {saving ? <Spinner size={14} color="#fff" /> : <Plus size={15} />}
              {saving ? "Reading it" : "Add"}
            </PrimaryButton>
          </div>
        </form>

        {justAdded && (
          <p className="text-[13px] mt-1" style={{ color: BRAND.green }}>
            Added {justAdded}. {items.length} {items.length === 1 ? "source" : "sources"} in the knowledge base,{" "}
            {linkCount} {linkCount === 1 ? "link" : "links"}.
          </p>
        )}
      </GlassPanel>

      </div>

      <Disagreements items={clashes} onResolve={markSorted} busyId={clashBusy} />

      {/* What is in the index */}
      <GlassPanel className="p-6">
        <SectionHeading hint="This is the assistant's entire world. Nothing outside this list is read. Your staff read all of it. Customers only ever see what you switch on.">
          In the knowledge base
        </SectionHeading>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-[13.5px] py-6 text-center" style={{ color: "var(--text-3)" }}>
              Nothing added yet. The assistant has nothing to work from.
            </p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[12px] px-3.5 py-3 border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--chip)" }}
                >
                  {item.kind === "link" ? (
                    <Link2 size={15} style={{ color: "var(--text-2)" }} />
                  ) : (
                    <FileText size={15} style={{ color: "var(--text-2)" }} />
                  )}
                </span>

                {/* The name wraps to two lines rather than truncating on
                    the first. Somebody about to decide whether strangers
                    can read a file has to be able to tell which file it
                    is, and on a phone "Executive brief wit..." and
                    "Executive brief for the board" cut to the same thing.
                    The description below it still truncates, because that
                    is a hint, not an identity. */}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[14px] font-medium"
                    style={{
                      color: "var(--text-1)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.name}
                  </p>
                  <p className="text-[12.5px] truncate" style={{ color: "var(--text-3)" }}>
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => askBeforeRemoving(item)}
                  className="shrink-0 p-1.5 rounded-[8px] transition-opacity hover:opacity-70"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={15} style={{ color: "var(--text-3)" }} />
                </button>
              </div>

              {/* SECOND LINE: the decision, and the state of the file

                  Both moved off the row above so the file name gets that
                  whole width. The name is the only thing that says which
                  file this is, and it was being cut to eighteen characters
                  to make room for a pill saying "Ready", which is the same
                  on nearly every row.

                  The audience control scrolls sideways on its own under
                  about 380px, where the two options together are wider
                  than the card. Clipping the second option would hide the
                  very thing that makes this control readable without
                  being taught, and the whole point of it is that nobody
                  has to be taught. */}
              <div className="mt-2.5 sm:pl-12 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 max-w-full overflow-x-auto -my-1 py-1">
                  <AudienceControl
                    on={item.customer_visible === true}
                    label={item.name}
                    onPick={(open) => (open ? askBeforeShowing(item) : hide(item.id))}
                  />
                </div>

                {/* A pill only when something is wrong or still working.

                   Every row used to carry a green "Ready", which is the
                   normal state of nearly every file, so it said nothing
                   and took the width the decision needed. A list where
                   every line shouts the same word is a list people stop
                   reading, and then the one row that says "Could not
                   read" goes past unnoticed. How many are ready is
                   already counted in the tile at the top of this tab. */}
                {item.status === "failed" ? (
                  <StatusPill tone="error">Could not read</StatusPill>
                ) : item.status !== "ready" ? (
                  <StatusPill tone="pending">Being read</StatusPill>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {refresh && (
        <RefreshOrKeep
          address={refresh.location ?? linkUrl}
          addedWhen={whenAdded(refresh)}
          busy={saving}
          onCancel={() => setRefresh(null)}
          onReplace={() => readLink({ replacing: refresh })}
          onKeepBoth={() => readLink({ replacing: null })}
        />
      )}

      {/* THE SAME NAME, ON A FILE OR ON PASTED TEXT. Same dialog as the
          link above, its own words. Replace swaps the old one out once the
          new one is safely in; keep both leaves two. */}
      {nameClash && (
        <RefreshOrKeep
          busy={saving}
          title="You already have something called this"
          lead={
            <>
              <span className="break-words" style={{ color: "var(--text-1)" }}>
                {nameClash.existing.name}
              </span>{" "}
              was added {whenAdded(nameClash.existing) ? `on ${whenAdded(nameClash.existing)}` : "before"}.
              Replacing it swaps what your assistant reads for the new one.
            </>
          }
          note="Keeping both leaves two files under the same name, and nobody looking at the list later can tell which one the answer came from."
          replaceLabel="Replace the old one"
          busyLabel="Saving"
          onCancel={() => setNameClash(null)}
          onReplace={() => nameClash.run(nameClash.existing)}
          onKeepBoth={() => nameClash.run(null)}
        />
      )}

      {doomed && (
        <ConfirmDelete
          name={doomed.name}
          note={
            doomed.customer_visible
              ? "Your customers can currently read this one."
              : null
          }
          busy={doomedBusy}
          onCancel={() => setDoomed(null)}
          onConfirm={confirmRemoving}
        />
      )}

      {gate && (
        <PublishGate
          name={gate.name}
          review={review}
          busy={gateBusy}
          onCancel={closeGate}
          onConfirm={confirmShowing}
        />
      )}
    </div>
  );
}

function ConnectorsSection() {
  return (
    <div className="space-y-5" style={{ animation: "sx-rise 0.3s ease" }}>
      <GlassPanel className="p-6">
        <SectionHeading hint="These serve the whole company. Each staff member also connects their own from the chat, so nobody shares an account.">
          Company connectors
        </SectionHeading>

        <div className="space-y-2">
          {/* Canva is filtered out here because it has its own panel below,
              with a real button. Listing it twice, once as "Set up" and once
              as connected, is two answers to the same question. */}
          {WORKFLOW_TOOLS.filter((tool) => tool.id !== "canva").map((tool) => (
            <div
              key={tool.id}
              className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <span
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--chip)" }}
              >
                <tool.icon size={18} />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
                  {tool.label}
                </p>
                <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {tool.note ?? tool.hint}
                </p>
              </div>

              {/* No toggle. It used to flip to "Connected" while nothing
                  happened behind it, which is a button that lies to the one
                  person who most needs to know what is real.

                  EVERY ONE OF THESE SAYS THE SAME THING, 2026-09-15. It
                  used to split them into "Set up" and "Example" off an
                  internal state field, which told a customer which parts
                  of our build are further along. That is our business, not
                  theirs, and a row of tiles graded by how finished they
                  are reads as a product in progress.

                  Canva is not in this list. It has its own panel with a
                  real Connect button, so it is the one that says
                  Connected, and it says it because it is. */}
              <StatusPill tone="neutral">Coming soon</StatusPill>
            </div>
          ))}

          <p className="text-[12.5px] leading-relaxed pt-1" style={{ color: "var(--text-3)" }}>
            {WORKFLOW_PLAN_NOTE}
          </p>
        </div>
      </GlassPanel>

      {/* CANVA IS NOT HERE ANY MORE, removed 2026-09-16.

          There was a Design panel on this screen with a Connect button on
          it, and an admin connected one Canva account for everybody.
          Anthony took it out and he is right about why:

            "Admin is not creating any design. And what is even the
             function of admin connecting Canva in the first place? Admin
             only connects knowledge bases... But Canva, it's not knowledge
             base. It's a place for work."

          This tab is for what the company knows. Canva is where a person
          does their work, so it sits with the other connectors in the
          chat, and whoever has the design job connects their own. That
          also fixes the thing that made the old shape wrong: a design made
          on the admin's account cannot be opened by the staff member who
          asked for it. */}
    </div>
  );
}

/* ==========================================================================
   4. ACCESS CONTROL
   Invites, access requests raised from the login screen, and the staff
   list. Nobody gets in without an invite or an approved request.
   ========================================================================== */

/* Exported for scripts/__harness, which renders this one section on its
   own so the layout can be checked at every width without a signed in
   workspace. Nothing else imports it. */
export function AccessSection({ me }) {
  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);

  /* Real work, or nothing. A usage panel showing invented spend is the
     one number an admin would act on, so it is the last place to put a
     placeholder. */
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!me?.company?.id) return;
    let alive = true;
    (async () => {
      const rows = await listWork(me.company.id);
      if (!alive) return;
      setHistory(rows);
    })();
    return () => {
      alive = false;
    };
  }, [me?.company?.id]);

  const [defaultLimit, setDefaultLimit] = useState(5);
  const [defaultCeiling, setDefaultCeiling] = useState(DEFAULT_LEVEL);

  /* The real people on this company, read under the admin's own
     identity so row level security decides who is visible. Email is not
     here on purpose: it lives in the auth tables, which the browser
     cannot read, and inventing one to fill the row would be worse than
     leaving it out. */
  useEffect(() => {
    if (!me?.company?.id) return;
    let alive = true;
    (async () => {
      const rows = await listStaff(me.company.id);
      if (!alive) return;
      setStaff(
        rows.map((r) => ({
          id: r.id,
          name: r.name ?? "Unnamed",
          email: "",
          role: r.role ?? "Not set",
          ceiling: levelOf(r.model_ceiling),
          canSupport: r.can_support === true,
          limit: r.daily_limit ?? 5,
          used: 0,
        }))
      );
    })();
    return () => {
      alive = false;
    };
  }, [me?.company?.id]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteCeiling, setInviteCeiling] = useState(DEFAULT_LEVEL);
  const [inviteLimit, setInviteLimit] = useState(5);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  /* Its own message, not the invite form's. A support toggle that failed
     has nothing to do with inviting somebody, and putting the words in
     that panel sends an admin to look at the wrong control. */
  const [staffNote, setStaffNote] = useState("");
  const [invited, setInvited] = useState(null);

  /* Every required box filled. The button reads this rather than waiting
     for a press to tell somebody what they missed. */
  const inviteReady =
    inviteName.trim() && inviteEmail.trim().includes("@") && inviteRole.trim();

  function approve(req) {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setStaff((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: req.name,
        email: req.email,
        role: "Not set",
        ceiling: DEFAULT_LEVEL,
        canSupport: false,
        limit: 5,
        used: 0,
      },
    ]);
  }

  function decline(req) {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  }

  async function sendInvite(e) {
    e.preventDefault();
    if (!inviteReady || inviting) return;

    setInviting(true);
    setInviteError("");
    setInvited(null);

    const result = await inviteStaff({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole.trim(),
      ceiling: inviteCeiling,
      dailyLimit: Number(inviteLimit) || 5,
    });

    setInviting(false);

    if (!result.ok) {
      setInviteError(result.reason);
      return;
    }

    /* The account is real, so the list is reloaded from the database
       rather than having a row pushed into memory that disappears the
       moment somebody changes tab. */
    if (me?.company?.id) {
      const rows = await listStaff(me.company.id);
      setStaff(
        rows.map((r) => ({
          id: r.id,
          name: r.name ?? "Unnamed",
          email: "",
          role: r.role ?? "Not set",
          ceiling: levelOf(r.model_ceiling),
          limit: r.daily_limit ?? 5,
          used: 0,
        }))
      );
    }

    setInvited(result);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("");
    setInviteCeiling(DEFAULT_LEVEL);
    setInviteLimit(5);
  }

  function revoke(id) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  /* Optimistic, then corrected if the write fails. A toggle that waits for
     a round trip before it moves feels broken, and this one is reversible
     in one tap, so showing the change immediately costs nothing. */
  async function toggleSupport(person) {
    const next = !person.canSupport;
    setStaff((prev) => prev.map((x) => (x.id === person.id ? { ...x, canSupport: next } : x)));
    const result = await setSupportAccess(person.id, next);
    if (!result.ok) {
      setStaff((prev) => prev.map((x) => (x.id === person.id ? { ...x, canSupport: !next } : x)));
      setStaffNote(result.reason);
      setTimeout(() => setStaffNote(""), 6000);
    }
  }

  function setCeiling(id, ceiling) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ceiling } : s)));
  }

  return (
    <div className="space-y-5" style={{ animation: "sx-rise 0.3s ease" }}>
      {/* Access requests */}
      <GlassPanel className="p-6">
        <SectionHeading hint="Raised from the login screen by people with no account. Approving turns a request into a normal invited account.">
          Access requests
        </SectionHeading>

        {requests.length === 0 ? (
          <p className="text-[13.5px] py-4" style={{ color: "var(--text-3)" }}>
            Nothing waiting on you.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center gap-3 rounded-[12px] px-3.5 py-3 border"
                style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                  style={{ background: GRADIENTS.brand }}
                >
                  {req.name.charAt(0)}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {req.name}
                  </p>
                  <p className="text-[12.5px] truncate" style={{ color: "var(--text-3)" }}>
                    {[req.email, req.when].filter(Boolean).join(", ")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approve(req)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium border transition-colors hover:opacity-80"
                    style={{ borderColor: "rgba(22,176,74,0.35)", color: BRAND.green }}
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => decline(req)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium border transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--border-2)", color: "var(--text-3)" }}
                  >
                    <X size={13} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Invite */}
      <GlassPanel className="p-6">
        <SectionHeading hint="Name and role matter. They are what let the assistant greet someone properly from their first session.">
          Invite a staff member
        </SectionHeading>

        <form onSubmit={sendInvite} className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required>
            <TextInput value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Their name" />
          </Field>
          <Field label="Work email" required>
            <TextInput
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="them@company.com"
            />
          </Field>
          <Field label="Job role" required>
            <TextInput
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              placeholder="Marketing associate"
            />
          </Field>
          <Field label="Outputs a day" hint="How many finished pieces this person may make each day.">
            <SelectInput value={inviteLimit} onChange={(e) => setInviteLimit(e.target.value)}>
              {[3, 5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} a day
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            label="How far they can go"
            hint="The most this person's work is allowed to reach. Deeper and Deepest are held back in this demo to keep costs down. Your own deployment decides what to offer."
          >
            {/* OFFERED_LEVELS, not every level. The two this deployment
                holds back were listed once, and choosing one would have
                been accepted by the screen and refused by the server,
                which is a promise the product cannot keep. */}
            <LevelSelect
              value={inviteCeiling}
              onChange={(e) => setInviteCeiling(e.target.value)}
              options={OFFERED_LEVELS}
            />
          </Field>

          <div className="sm:col-span-2">
            <PrimaryButton
              type="submit"
              disabled={!inviteReady || inviting}
              className="flex items-center gap-2"
            >
              {inviting ? <Spinner size={14} color="#fff" /> : <Plus size={15} />}
              {inviting ? "Creating the account" : "Send invite"}
            </PrimaryButton>

            {inviteError && (
              <p className="text-[13px] mt-3" style={{ color: BRAND.red }}>
                {inviteError}
              </p>
            )}

            {/* The invitation itself. It is emailed, and the link is also
                shown here for the times email is slow, held by a filter, or
                simply easier to paste into a chat. Shown once: it is a way
                into the company's workspace, so it is not kept on screen or
                fetched again later. */}
            {invited && <InviteIssued invited={invited} />}
          </div>
        </form>
      </GlassPanel>

      {/* Staff list */}
      {/* Company defaults */}
      <GlassPanel className="p-6">
        <SectionHeading hint="Applies to every new staff member automatically. Anyone without a custom setting falls back to this.">
          Company defaults
        </SectionHeading>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Outputs per day" hint="Raise or lower it for everyone at once.">
            <TextInput
              type="number"
              min="1"
              value={defaultLimit}
              onChange={(e) => setDefaultLimit(e.target.value)}
            />
          </Field>
          <Field label="How far anyone can go by default" hint="Applies to a person with no setting of their own.">
            <LevelSelect
              value={defaultCeiling}
              onChange={(e) => setDefaultCeiling(e.target.value)}
              options={LEVEL_ORDER}
            />
          </Field>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <SectionHeading hint="Change anyone's ceiling or daily limit, give them the support queue, or revoke their access. You cannot revoke yourself.">
          Staff
        </SectionHeading>

        {staffNote && (
          <p className="text-[12.5px] mb-3" role="alert" style={{ color: "var(--caution)" }}>
            {staffNote}
          </p>
        )}

        <div className="space-y-2">
          {staff.map((person) => (
            <div
              key={person.id}
              className="flex flex-wrap items-center gap-3 rounded-[12px] px-3.5 py-3 border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                style={{ background: GRADIENTS.brand }}
              >
                {person.name.charAt(0)}
              </span>

              <div className="flex-1 min-w-[140px]">
                <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                  {person.name}
                </p>
                <p className="text-[12.5px] truncate" style={{ color: "var(--text-3)" }}>
                  {person.role}
                </p>
              </div>

              {/* 132px was measured against "Standard" and never against
                  "Conversational", which is the longest label in the list
                  and the one that got cut to "Conversatior" on a tablet.

                  A select shows its own arrow inside that width, so the
                  text has about 18px less than the box suggests, which is
                  why it looked fine in the markup and wrong on screen.
                  156px fits the longest label with the arrow, checked at
                  768 and 1024. */}
              <div className="shrink-0 w-[156px]">
                <LevelSelect
                  value={person.ceiling}
                  onChange={(e) => setCeiling(person.id, e.target.value)}
                  options={OFFERED_LEVELS}
                  compact
                  className="py-1.5 text-[12.5px]"
                  ariaLabel={`How far ${person.name} can go`}
                />
              </div>

              {/* SUPPORT, as a toggle on the person.

                  It reads "Support" either way and fills in when it is on,
                  so the control says what it is rather than what pressing
                  it would do. A button labelled by its action is the thing
                  an admin has to think about twice.

                  Off for everybody until somebody turns it on, admins
                  included, because running the company and answering its
                  customers are two different jobs. */}
              <button
                onClick={() => toggleSupport(person)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium border transition-colors hover:opacity-80"
                style={
                  person.canSupport
                    ? { borderColor: BRAND.green, color: BRAND.green, backgroundColor: "rgba(22,176,74,0.10)" }
                    : { borderColor: "var(--border-2)", color: "var(--text-3)" }
                }
                aria-pressed={person.canSupport}
                title={person.canSupport
                  ? `${person.name} can answer support. Tap to take it away.`
                  : `Let ${person.name} answer support.`}
              >
                Support
              </button>

              <div className="shrink-0 w-[92px]">
                <UsageMeter used={person.used} limit={person.limit} />
              </div>

              {/* An admin cannot revoke themselves. Doing so would lock the
                  only person who can let anybody back in out of their own
                  company, with no way to undo it from any screen. */}
              {person.id !== me?.user?.id && (
              <button
                onClick={() => revoke(person.id)}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium border transition-colors hover:opacity-80 shrink-0"
                style={{ borderColor: "var(--border-2)", color: BRAND.red }}
              >
                Revoke
              </button>
              )}
            </div>
          ))}
        </div>
      </GlassPanel>
      {/* History */}
      <GlassPanel className="p-6">
        <SectionHeading hint="What each person worked on, and what it drew down.">
          Recent work
        </SectionHeading>

        <div className="space-y-2">
          {history.length === 0 && (
            <p className="text-[13.5px] py-4" style={{ color: "var(--text-3)" }}>
              Nothing made yet.
            </p>
          )}

          {history.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-[12px] px-3.5 py-3 border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <span
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--chip)" }}
              >
                <Cloud size={15} style={{ color: "var(--text-2)" }} />
              </span>

              <div className="flex-1 min-w-[150px]">
                <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                  {row.title}
                </p>
                <p className="text-[12.5px] truncate" style={{ color: "var(--text-3)" }}>
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>

              <StatusPill tone="neutral">{SKILL_LABELS[row.skill] ?? "Document"}</StatusPill>
            </div>
          ))}
        </div>
      </GlassPanel>

    </div>
  );
}

/* ==========================================================================
   CHOOSING HOW FAR SOMEBODY CAN GO

   WHY THE DESCRIPTION LIVES HERE AND NOT IN A PANEL OF ITS OWN

   There used to be a panel at the bottom of this screen called "What the
   assistant can be allowed to do", listing all four levels with what each
   one is for. Anthony, 2026-09-15: "that place is pointless, because that
   capability description can just be part of the selector... when admin
   clicks it, he sees the line completely as he's selecting, so he knows
   what he's selecting."

   He is right, and the reason is about when a person needs the answer. An
   admin picking a level needs to know what Deeper means AT THE MOMENT THEY
   PICK IT. A reference block further down the page is read by nobody,
   because by the time you scroll to it you have already chosen, and a
   description you read after choosing has not helped you choose.

   So the meaning travels with the control. Pick a level and the line under
   it changes to say what that level is for.

   TWO LENGTHS, because two places need different amounts of room.
   A form has a column to itself and gets the full sentence. A row in the
   staff list has three other controls beside it, so it gets the short
   line, which is still the answer to "what is this for".
   ========================================================================== */

function LevelSelect({ value, onChange, options, compact = false, ariaLabel, className = "" }) {
  const level = CAPABILITY_LEVELS[value];

  return (
    <>
      <SelectInput value={value} onChange={onChange} aria-label={ariaLabel} className={className}>
        {/* THE SUPPORT LEVEL SITS AT THE TOP, GREEN AND LOCKED.

            It is not a choice anybody makes. Support runs at it on its
            own, so an admin selecting it for a staff member would be
            answering a question that is already answered. But taking it
            out of the ladder altogether left a gap, and a gap is a thing
            somebody has to be told about instead of shown.

            disabled, so it cannot be picked by mouse, keyboard or a
            screen reader. The green is set inline because option styling
            through a class is ignored by most browsers. */}
        <option
          value={SUPPORT_LEVEL}
          disabled
          style={{ color: BRAND.green }}
        >
          {CAPABILITY_LEVELS[SUPPORT_LEVEL].label} — support
        </option>
        {options.map((key) => (
          <option key={key} value={key}>
            {CAPABILITY_LEVELS[key].label}
          </option>
        ))}
      </SelectInput>

      {/* aria-live, so somebody using a screen reader hears the meaning
          change when they change the choice. Without it the description
          updates silently and only a person looking at it benefits. */}
      {/* Said in words as well as shown in the list, for the person who
          never opens the dropdown. Only where there is room for it. */}
      {!compact && (
        <p className="text-[11.5px] mt-1.5 flex items-center gap-1.5" style={{ color: BRAND.green }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND.green }} />
          Support answers customers at Conversational. Nobody sets that.
        </p>
      )}

      {level && (
        <p
          className={compact ? "text-[11.5px] mt-1 leading-snug" : "text-[12px] mt-1.5 leading-relaxed"}
          style={{ color: "var(--text-3)" }}
          aria-live="polite"
        >
          {compact ? level.use : level.detail}
        </p>
      )}
    </>
  );
}

/* ==========================================================================
   SHARED PIECES
   Small parts used by more than one section above.
   ========================================================================== */

/* ONE OF THREE COUNTS, SITTING IN A THIRD OF A PHONE

   Three of these share the width at every size, so at 320px each one gets
   about 90px and roughly 66px of that is usable after the padding. Every
   choice below is that number.

     THE NUMBER COMES FIRST. In a narrow column the count is the thing worth
     seeing, and a label above it makes the eye read two lines before it
     reaches the point. On the old stacked layout the label first read fine,
     because it had the whole width.

     THE LABEL IS ALLOWED TWO LINES. "Outside sources" cannot fit on one at
     this width and shortening it to "Outside" would leave a word that means
     nothing. The grid makes every tile as tall as the tallest, so a wrapped
     label costs nothing but a little height.

     TRACKING GOES ON LARGER SCREENS ONLY. Letter spacing is what makes a
     small uppercase label look considered, and it is also what pushes it
     onto a third line on a phone.

     THE HINT IS HIDDEN ON A PHONE. "The assistant reads nothing else" is a
     sentence, and a sentence does not belong in a 66px column. It comes
     back at sm, where there is room for it.

   min-w-0 is load bearing. A grid item defaults to a minimum width of its
   own content, so without it a long label pushes its column wider and drags
   the other two out of alignment. */
function StatTile({ label, value, tone = "neutral", hint }) {
  const colors = {
    ok: BRAND.green,
    pending: BRAND.amber,
    neutral: "var(--text-1)",
  };

  return (
    <GlassPanel className="p-3 sm:p-5 min-w-0">
      <p
        className="text-[22px] sm:text-[28px] font-bold leading-none"
        style={{ fontFamily: FONTS.display, color: colors[tone] }}
      >
        {value}
      </p>
      <p
        className="text-[10px] sm:text-[11px] font-semibold uppercase sm:tracking-wide mt-1.5 sm:mt-2 leading-tight"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      {hint && (
        <p className="hidden sm:block text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
          {hint}
        </p>
      )}
    </GlassPanel>
  );
}

/* --------------------------------------------------------------------------
   ONE RUNG OF THE LADDER

   Name, one line saying what it is for, and an information button that
   opens the fuller explanation underneath.

   WHY TAP AND NOT HOVER
   A hover tooltip does not exist on a phone. It either never appears or it
   appears on the first tap and swallows the second, which reads as a broken
   control. So this is a plain disclosure: press it, the text appears below,
   press it again and it goes. It works the same with a mouse, a finger, or
   a keyboard.

   The button carries aria-expanded and points at the text it opens, so a
   screen reader announces the state rather than reading a lone icon.
   -------------------------------------------------------------------------- */


function UsageMeter({ used, limit }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const full = used >= limit;

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: "var(--text-3)" }}>
        <span>Used</span>
        <span style={{ color: full ? BRAND.amber : "var(--text-3)" }}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: full ? BRAND.amber : GRADIENTS.meter }}
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   AN ISSUED INVITATION
   What the admin sees the moment somebody is added.

   Three facts, in the order they matter: they are on the team, the email
   has gone (or has not), and here is the link with how long it lasts.

   The link is a way into the company's workspace, so it is treated like
   one. Shown once, never re-fetched, and the copy button exists so nobody
   has to select 80 characters of hex by hand and get it wrong.
   ========================================================================== */

function InviteIssued({ invited }) {
  const [copied, setCopied] = useState(false);
  const link = invited.link;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard is blocked in some browsers unless the page is focused.
         The link is on screen and selectable either way. */
      setCopied(false);
    }
  }

  return (
    <div
      className="rounded-[12px] px-3.5 py-3 mt-3 text-[13px] leading-relaxed"
      style={{ backgroundColor: "rgba(22,176,74,0.1)", color: "var(--text-1)" }}
    >
      <span className="font-semibold" style={{ color: BRAND.green }}>
        {invited.name} is on your team.
      </span>
      <br />
      {invited.emailed
        ? `We emailed their invitation to ${invited.email}.`
        : `We could not email ${invited.email}, so send them this link yourself.`}

      {link && (
        <>
          <div
            className="flex items-center gap-2 mt-2.5 rounded-[10px] px-2.5 py-2 border"
            style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
          >
            <code
              className="flex-1 min-w-0 truncate text-[12px]"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              title={link}
            >
              {link}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-[8px] border px-2.5 py-1 text-[12px] font-medium transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <span className="block mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
            It works once and runs out in {timeLeft(invited.expiresAt)}. After that they sign in
            with their email.
          </span>
        </>
      )}
    </div>
  );
}
