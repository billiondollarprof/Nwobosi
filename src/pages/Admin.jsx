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
} from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
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
  SelectInput,
  Spinner,
} from "../shared/ui.jsx";
import { loadMe, listSources, addTextSource, removeSource } from "../shared/session.js";
import { fetchLinkSource } from "../shared/linkApi.js";
import {
  PRODUCT,
  COMPANY,
  MAX_TEXT_UPLOAD_KB,
  WORKFLOW_TOOLS,
  MODEL_TIERS,
  MODEL_ORDER,
  DEFAULT_MODEL_CEILING,
} from "../shared/config.js";

/* --------------------------------------------------------------------------
   Seed data
   Stands in for Supabase until the backend is wired up.
   -------------------------------------------------------------------------- */

const SEED_KNOWLEDGE = [
  {
    id: 1,
    name: "Brand guidelines 2026",
    description: "Colors, fonts, logo rules, and tone of voice",
    kind: "file",
    status: "indexed",
  },
  {
    id: 2,
    name: "Investor Pitch Deck v3",
    description: "Approved deck template and slide order",
    kind: "file",
    status: "indexed",
  },
  {
    id: 3,
    name: "Company profile",
    description: "What we do, our sector, positioning, and the words we use",
    kind: "file",
    status: "indexed",
  },
  {
    id: 4,
    name: "Finance Report Q series",
    description: "Quarterly report layout and standard tables",
    kind: "file",
    status: "indexed",
  },
  {
    id: 5,
    name: "buildfest.com/about",
    description: "Public company description, kept in sync",
    kind: "link",
    status: "indexed",
  },
];

const SEED_STAFF = [
  {
    id: 1,
    name: "Anthony Okafor",
    email: "anthony@buildfest.com",
    role: "Marketing associate",
    ceiling: "sonnet-5",
    limit: 5,
    used: 2,
  },
  {
    id: 2,
    name: "Grace Ade",
    email: "grace@buildfest.com",
    role: "Head of finance",
    ceiling: "opus-5",
    limit: 12,
    used: 7,
  },
  {
    id: 3,
    name: "Daniel Eze",
    email: "daniel@buildfest.com",
    role: "Sales lead",
    ceiling: "sonnet-5",
    limit: 5,
    used: 5,
  },
];

const SEED_REQUESTS = [
  { id: 1, name: "Chidi Nwosu", email: "chidi@buildfest.com", when: "2 hours ago" },
  { id: 2, name: "Ife Bello", email: "ife@buildfest.com", when: "Yesterday" },
];

const SEED_HISTORY = [
  { id: 1, who: "Grace Ade", task: "Q3 finance report", credits: 34, when: "Today, 09:12" },
  { id: 2, who: "Anthony Okafor", task: "Investor pitch deck", credits: 58, when: "Today, 08:40" },
  { id: 3, who: "Daniel Eze", task: "Client one pager", credits: 19, when: "Yesterday, 16:22" },
  { id: 4, who: "Grace Ade", task: "Board summary", credits: 41, when: "Yesterday, 11:05" },
];

/* What the admin side can turn into text on its own. Same list as the
   chat, and the same reason: a PDF needs a parser that does not exist
   here yet, and a source that lists a file it never actually read is
   worse than no source at all. */
const ADMIN_READABLE = ["txt", "md", "markdown", "csv", "tsv", "json", "log"];

function isReadableAdminFile(name) {
  return ADMIN_READABLE.includes(name.split(".").pop()?.toLowerCase() ?? "");
}

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
      setMe(who);
      setLoadingMe(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const companyName = me?.company?.name ?? COMPANY.name;

  return (
    <PageShell scroll>
      <FloatingNav maxWidth="max-w-5xl">
        <div className="flex items-center gap-2.5">
          {/* An admin is already a real account with a real password, so
              they never request access to their own workspace. This is
              the door, and it says so rather than being an arrow you have
              to guess at. */}
          <button
            onClick={() => navigate(me?.company?.slug ? `/${me.company.slug}` : "/chat")}
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
            <StatusPill tone="accent">{companyName}</StatusPill>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </FloatingNav>

      <div className="relative z-10 px-4 sm:px-6 pb-16">
        <div className="max-w-5xl mx-auto">
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

          {tab === "knowledge" && <KnowledgeSection me={me} loading={loadingMe} />}
          {tab === "connectors" && <ConnectorsSection />}
          {tab === "access" && <AccessSection />}
          {tab === "usage" && <UsageSection />}
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

  function show(message) {
    setError(message);
    setTimeout(() => setError(""), 6000);
  }

  function pickFiles(e) {
    const file = (e.target.files || [])[0];
    e.target.value = "";
    if (!file) return;

    if (!isReadableAdminFile(file.name)) {
      show(`${file.name} is not a kind of file this can read yet. Plain text, Markdown, CSV or JSON.`);
      return;
    }
    if (file.size > MAX_TEXT_UPLOAD_KB * 1024) {
      show(`${file.name} is over the ${MAX_TEXT_UPLOAD_KB} KB limit. Split it up, or paste the part that matters.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setStaged({
        fileName: file.name,
        name: file.name.replace(/\.[^.]+$/, ""),
        description: "",
        text: String(reader.result ?? ""),
      });
    };
    reader.onerror = () => show(`Could not read ${file.name}.`);
    reader.readAsText(file);
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
    });
    setSaving(false);

    if (!result.ok) {
      show(result.reason);
      return;
    }

    setItems((prev) => [result.source, ...prev]);
    setJustAdded(`${result.source.name}, ${result.chunks} ${result.chunks === 1 ? "piece" : "pieces"} of text`);
    setStaged(null);
  }

  /* The link goes to an edge function rather than being fetched here,
     because a browser cannot read another site's page and a server can.
     That split is the whole design: a link is read once, by the server,
     when an admin vouches for it. The assistant never fetches anything. */
  async function addLink(e) {
    e.preventDefault();
    if (!linkUrl.trim() || !linkNote.trim() || !me?.company?.id) return;

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

  async function remove(id) {
    const ok = await removeSource(id);
    if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
    else show("Could not remove that. Try again.");
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
        <p className="text-[14.5px]" style={{ color: "var(--text-2)" }}>
          Sign in as an admin of this workspace to manage its knowledge base.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-5" style={{ animation: "sx-rise 0.3s ease" }}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.markdown,.csv,.tsv,.json,.log"
        onChange={pickFiles}
      />

      {error && (
        <div
          className="flex items-start gap-2 rounded-[12px] px-3.5 py-3 text-[13px]"
          style={{ backgroundColor: "rgba(229,62,62,0.1)", color: BRAND.red }}
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

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
        <SectionHeading hint="Brand guidelines, templates, letterheads, past work, and reference material. Give every file a clear name and a one line description so the assistant can find it.">
          Add company knowledge
        </SectionHeading>

        {staged ? (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              Read {staged.fileName}. Name it and say what it holds.
            </p>
            <Field label="Name">
              <TextInput
                value={staged.name}
                onChange={(e) => setStaged({ ...staged, name: e.target.value })}
                placeholder="Brand guidelines 2026"
              />
            </Field>
            <Field label="What it holds">
              <TextInput
                value={staged.description}
                onChange={(e) => setStaged({ ...staged, description: e.target.value })}
                placeholder="Colors, fonts, logo rules, and tone of voice"
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton
                onClick={saveStaged}
                disabled={saving}
                className="flex items-center gap-2 justify-center"
              >
                {saving && <Spinner size={13} color="#fff" />}
                {saving ? "Saving" : "Add to knowledge base"}
              </PrimaryButton>
              <GhostButton onClick={() => setStaged(null)}>Cancel</GhostButton>
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
              Choose a file
            </p>
            <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
              Plain text, Markdown, CSV or JSON, up to {MAX_TEXT_UPLOAD_KB} KB
            </p>
            <GhostButton onClick={() => fileInputRef.current?.click()}>Browse files</GhostButton>
          </div>
        )}
      </GlassPanel>

      {/* Add a link */}
      <GlassPanel className="p-6">
        <SectionHeading hint="Give the assistant a page to learn from. It is read once, now, and what it says is saved here. The assistant never opens a link itself.">
          Add a link
        </SectionHeading>

        <form onSubmit={addLink} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Address">
            <TextInput
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="company.com/about"
            />
          </Field>
          <Field label="What it holds">
            <TextInput
              value={linkNote}
              onChange={(e) => setLinkNote(e.target.value)}
              placeholder="Short description"
            />
          </Field>
          <div className="mb-4">
            <PrimaryButton
              type="submit"
              disabled={saving}
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
        <SectionHeading hint="This is the assistant's entire world. Nothing outside this list is read.">
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
              className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
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

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                  {item.name}
                </p>
                <p className="text-[12.5px] truncate" style={{ color: "var(--text-3)" }}>
                  {item.description}
                </p>
              </div>

              {item.status === "ready" ? (
                <StatusPill tone="ok">Ready</StatusPill>
              ) : item.status === "failed" ? (
                <StatusPill tone="error">Could not read</StatusPill>
              ) : (
                <StatusPill tone="pending">Being read</StatusPill>
              )}

              <button
                onClick={() => remove(item.id)}
                className="shrink-0 p-1.5 rounded-[8px] transition-opacity hover:opacity-70"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={15} style={{ color: "var(--text-3)" }} />
              </button>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function ConnectorsSection() {
  const [connected, setConnected] = useState({ canva: false, email: false, drive: true, slack: false });

  function toggle(id) {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
                <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                  {tool.hint}
                </p>
              </div>

              <button
                onClick={() => toggle(tool.id)}
                className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium border transition-colors hover:opacity-80 shrink-0"
                style={
                  connected[tool.id]
                    ? { borderColor: "rgba(22,176,74,0.35)", color: BRAND.green }
                    : { borderColor: "var(--border-2)", color: "var(--text-2)" }
                }
              >
                {connected[tool.id] ? "Connected" : "Connect"}
              </button>
            </div>
          ))}
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

function AccessSection() {
  const [requests, setRequests] = useState(SEED_REQUESTS);
  const [staff, setStaff] = useState(SEED_STAFF);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteCeiling, setInviteCeiling] = useState(DEFAULT_MODEL_CEILING);

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

  function sendInvite(e) {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setStaff((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole.trim() || "Not set",
        ceiling: inviteCeiling,
        limit: 5,
        used: 0,
      },
    ]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("");
    setInviteCeiling(DEFAULT_MODEL_CEILING);
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
                    {req.email}, {req.when}
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
          <Field label="Full name">
            <TextInput value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Their name" />
          </Field>
          <Field label="Work email">
            <TextInput
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="them@company.com"
            />
          </Field>
          <Field label="Job role">
            <TextInput
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              placeholder="Marketing associate"
            />
          </Field>
          <Field label="Model ceiling" hint="How far up the assistant may go for this person.">
            <SelectInput value={inviteCeiling} onChange={(e) => setInviteCeiling(e.target.value)}>
              {MODEL_ORDER.map((key) => (
                <option key={key} value={key}>
                  {MODEL_TIERS[key].label}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="flex items-center gap-2">
              <Plus size={15} />
              Send invite
            </PrimaryButton>
          </div>
        </form>
      </GlassPanel>

      {/* Staff list */}
      <GlassPanel className="p-6">
        <SectionHeading hint="Change anyone's model ceiling at any time, or revoke their access.">
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
                  {MODEL_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {MODEL_TIERS[key].label}
                    </option>
                  ))}
                </SelectInput>
              </div>

              <div className="shrink-0 w-[92px]">
                <UsageMeter used={person.used} limit={person.limit} />
              </div>

              <button
                onClick={() => revoke(person.id)}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium border transition-colors hover:opacity-80 shrink-0"
                style={{ borderColor: "var(--border-2)", color: BRAND.red }}
              >
                Revoke
              </button>
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

function UsageSection() {
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
          {SEED_HISTORY.map((row) => (
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
                  {row.task}
                </p>
                <p className="text-[12.5px] truncate" style={{ color: "var(--text-3)" }}>
                  {row.who}, {row.when}
                </p>
              </div>

              <StatusPill tone="neutral">{row.credits} credits</StatusPill>
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
