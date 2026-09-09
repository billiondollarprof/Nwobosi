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
  Gauge,
  AlertCircle,
  X,
  Sparkles,
  LogOut,
} from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
import PublishGate from "../shared/PublishGate.jsx";
import ConfirmDelete from "../shared/ConfirmDelete.jsx";
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
  removeSource,
  setSourceVisibility,
  listStaff,
  listWork,
  signOutCompletely,
} from "../shared/session.js";
import { adminSessionExpired } from "../shared/adminClock.js";
import { readFileAsText, canBecomeText } from "../shared/readFile.js";
import { fetchLinkSource } from "../shared/linkApi.js";
import { readBeforePublish, loadSourceText } from "../shared/publishCheck.js";
import { inviteStaff, timeLeft } from "../shared/inviteApi.js";
import {
  PRODUCT,
  MAX_SOURCE_UPLOAD_KB,
  MAX_SOURCE_CHARS,
  WORKFLOW_TOOLS,
  WORKFLOW_PLAN_NOTE,
  MODEL_TIERS,
  SKILL_LABELS,
  MODEL_ORDER,
  INVITABLE_CEILINGS,
  DEFAULT_MODEL_CEILING,
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
  { id: "access", label: "Access", icon: Users },
  { id: "usage", label: "Usage", icon: Gauge },
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
          {tab === "usage" && <UsageSection me={me} />}
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

function KnowledgeSection({ me, loading: loadingMe }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* A file waiting for its name and description. The admin has to write
     both, because those two lines are how the assistant decides whether a
     source is worth opening. A file called final_v3.txt with no
     description is a file the assistant will never choose. */
  const [staged, setStaged] = useState(null);
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
        const rows = await listSources(me.company.id);
        if (!alive) return;
        setItems(rows);
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

  async function stageFile(file) {

    if (!canBecomeText(file.name)) {
      show(`${file.name} is not a kind of file this can read. PDF, Word, plain text, Markdown, CSV or JSON.`);
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
  }

  async function savePasted(e) {
    e.preventDefault();
    if (!me?.company?.id) return;

    if (!pasteName.trim() || !pasteNote.trim() || !pasteText.trim()) {
      show("Give it a name, one line saying what it holds, and the text itself.");
      return;
    }

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

    setItems((prev) => [result.source, ...prev]);
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

    setSaving(true);
    const result = await addTextSource({
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

    setItems((prev) => [result.source, ...prev]);
    setJustAdded(`${result.source.name}, ${result.chunks} ${result.chunks === 1 ? "piece" : "pieces"} of text`);
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

    setSaving(true);
    const result = await fetchLinkSource({ url: linkUrl.trim(), description: linkNote.trim() });
    setSaving(false);

    if (!result.ok) {
      show(result.message);
      return;
    }

    setItems(await listSources(me.company.id));
    setJustAdded(result.name);
    setLinkUrl("");
    setLinkNote("");
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
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.log,.rtf,.xml,.html"
        onChange={pickFiles}
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Ready to use" value={ready} tone="ok" />
        <StatTile label="Being read" value={pending} tone="pending" />
        <StatTile
          label={failed ? "Could not be read" : "Outside sources"}
          value={failed || 0}
          tone={failed ? "pending" : "neutral"}
          hint={failed ? "Remove these and add them again" : "The assistant reads nothing else"}
        />
      </div>

      {/* Upload */}
      <GlassPanel className="p-6">
        <SectionHeading hint="Brand guidelines, templates, past work, anything the assistant should write from. Give each one a clear name and a line saying what it holds, because that is how it decides which to open.">
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
              Read {staged.fileName}
              {staged.truncated ? ", the first part of it, which was as much as fits" : ""}. Name it and
              say what it holds.
            </p>
            <Field label="Name" required>
              <TextInput
                value={staged.name}
                onChange={(e) => setStaged({ ...staged, name: e.target.value })}
                placeholder="Brand guidelines 2026"
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
          <div
            className="rounded-[14px] border border-dashed p-8 text-center transition-colors"
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
              PDF, Word, plain text, Markdown, CSV or JSON, up to{" "}
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

        <form onSubmit={addLink} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Address" required>
            <TextInput
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="company.com/about"
            />
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
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
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
          {WORKFLOW_TOOLS.map((tool) => (
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
                  person who most needs to know what is real. */}
              {tool.state === "registered" ? (
                <StatusPill tone="pending">Set up</StatusPill>
              ) : (
                <StatusPill tone="neutral">Example</StatusPill>
              )}
            </div>
          ))}

          <p className="text-[12.5px] leading-relaxed pt-1" style={{ color: "var(--text-3)" }}>
            {WORKFLOW_PLAN_NOTE}
          </p>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <div className="flex gap-3">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(20,32,160,0.12)" }}
          >
            <Sparkles size={17} style={{ color: BRAND.accentSoft }} />
          </div>
          <div>
            <p className="text-[14px] font-medium mb-1" style={{ color: "var(--text-1)" }}>
              Canva is connected per person
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              There is nothing to manage centrally. The assistant asks a staff member to connect Canva at
              the exact moment a design task needs it, and a free account works.
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

/* ==========================================================================
   4. ACCESS CONTROL
   Invites, access requests raised from the login screen, and the staff
   list. Nobody gets in without an invite or an approved request.
   ========================================================================== */

function AccessSection({ me }) {
  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);

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
          ceiling: r.model_ceiling ?? DEFAULT_MODEL_CEILING,
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
  const [inviteCeiling, setInviteCeiling] = useState(DEFAULT_MODEL_CEILING);
  const [inviteLimit, setInviteLimit] = useState(5);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
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
        ceiling: DEFAULT_MODEL_CEILING,
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
          ceiling: r.model_ceiling ?? DEFAULT_MODEL_CEILING,
          limit: r.daily_limit ?? 5,
          used: 0,
        }))
      );
    }

    setInvited(result);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("");
    setInviteCeiling(DEFAULT_MODEL_CEILING);
    setInviteLimit(5);
  }

  function revoke(id) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
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
            label="Model ceiling"
            hint="How far up the assistant may go for this person. Opus 5, Fable 5 and other providers such as Gemini, GPT or DeepSeek are held back in this demo to keep credit costs down. Your own deployment runs whichever models you choose."
          >
            <SelectInput value={inviteCeiling} onChange={(e) => setInviteCeiling(e.target.value)}>
              {/* Only what this deployment actually allows. Opus and Fable
                  were listed and choosing one would have been accepted by a
                  screen and refused by the server, which is a promise the
                  product cannot keep. */}
              {INVITABLE_CEILINGS.map((key) => (
                <option key={key} value={key}>
                  {MODEL_TIERS[key].label}
                </option>
              ))}
            </SelectInput>
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
      <GlassPanel className="p-6">
        <SectionHeading hint="Change anyone's model ceiling or their daily limit at any time, or revoke their access. You cannot revoke yourself.">
          Staff
        </SectionHeading>

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

              <div className="shrink-0 w-[132px]">
                <SelectInput
                  value={person.ceiling}
                  onChange={(e) => setCeiling(person.id, e.target.value)}
                  className="py-1.5 text-[12.5px]"
                  aria-label={`Model ceiling for ${person.name}`}
                >
                  {INVITABLE_CEILINGS.map((key) => (
                    <option key={key} value={key}>
                      {MODEL_TIERS[key].label}
                    </option>
                  ))}
                </SelectInput>
              </div>

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
    </div>
  );
}

/* ==========================================================================
   5. PERMISSIONS AND USAGE
   Company defaults, the model ladder, and what each person has spent.
   ========================================================================== */

function UsageSection({ me }) {
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
  const [defaultCeiling, setDefaultCeiling] = useState(DEFAULT_MODEL_CEILING);

  return (
    <div className="space-y-5" style={{ animation: "sx-rise 0.3s ease" }}>
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
          <Field label="Default model ceiling" hint="How far the assistant may go without a role based grant.">
            <SelectInput value={defaultCeiling} onChange={(e) => setDefaultCeiling(e.target.value)}>
              {MODEL_ORDER.map((key) => (
                <option key={key} value={key}>
                  {MODEL_TIERS[key].label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </GlassPanel>

      {/* Model ladder */}
      <GlassPanel className="p-6">
        <SectionHeading hint="The assistant moves up only as far as a task needs. A simple chat never spends top tier cost.">
          Model tiers
        </SectionHeading>

        <div className="space-y-2">
          {MODEL_ORDER.map((key) => {
            const tier = MODEL_TIERS[key];
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-[12px] px-3.5 py-3 border"
                style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <div className="flex-1 min-w-[160px]">
                  <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
                    {tier.label}
                  </p>
                  <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                    {tier.use}
                  </p>
                </div>
                <span className="text-[12.5px] shrink-0" style={{ color: "var(--text-3)" }}>
                  ${tier.inputPer1M} in, ${tier.outputPer1M} out per million
                </span>
                {key === defaultCeiling && <StatusPill tone="accent">Default ceiling</StatusPill>}
              </div>
            );
          })}
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
   SHARED PIECES
   Small parts used by more than one section above.
   ========================================================================== */

function StatTile({ label, value, tone = "neutral", hint }) {
  const colors = {
    ok: BRAND.green,
    pending: BRAND.amber,
    neutral: "var(--text-1)",
  };

  return (
    <GlassPanel className="p-5">
      <p
        className="text-[11px] font-semibold uppercase tracking-wide mb-2"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      <p className="text-[28px] font-bold leading-none" style={{ fontFamily: FONTS.display, color: colors[tone] }}>
        {value}
      </p>
      {hint && (
        <p className="text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
          {hint}
        </p>
      )}
    </GlassPanel>
  );
}

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
