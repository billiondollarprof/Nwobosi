import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Sun,
  Moon,
  Monitor,
  X,
  Plus,
  Check,
  FileText,
  Download,
  Lock,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  PenSquare,
  Mic,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Share2,
  Copy,
  MoreHorizontal,
  Volume2,
  File as FileIcon,
  AlertCircle,
  UploadCloud,
  LayoutGrid,
  FileType,
  Sheet,
  Presentation,
  Library,
  Cloud,
  ExternalLink,
  Search,
} from "lucide-react";

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');";

const KEYFRAMES = `
@keyframes bfp-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes bfp-dot {
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
@keyframes bfp-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes bfp-spin {
  to { transform: rotate(360deg); }
}
@keyframes bfp-glow-a {
  0%, 100% { opacity: 0.55; transform: translate(-10%, -10%) scale(1); }
  50% { opacity: 0.85; transform: translate(-6%, -14%) scale(1.15); }
}
@keyframes bfp-glow-b {
  0%, 100% { opacity: 0.45; transform: translate(8%, 10%) scale(1); }
  50% { opacity: 0.75; transform: translate(4%, 6%) scale(1.1); }
}
@keyframes bfp-mic-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(124,58,237,0.32), 0 0 0 0 rgba(20,32,160,0.22);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(124,58,237,0.10), 0 0 16px 5px rgba(20,32,160,0.28);
  }
}
@keyframes bfp-mic-spin {
  to { transform: rotate(360deg); }
}
@keyframes bfp-nav-glow {
  0%, 100% { opacity: 0.8; background-position: 0% 50%; }
  50% { opacity: 1; background-position: 100% 50%; }
}
@keyframes bfp-skill-flash {
  0% { box-shadow: 0 0 0 0 rgba(88,112,248,0.55); transform: scale(1); }
  35% { box-shadow: 0 0 0 6px rgba(88,112,248,0); transform: scale(1.06); }
  100% { box-shadow: 0 0 0 6px rgba(88,112,248,0); transform: scale(1); }
}
`;

const THEME_VARS = {
  dark: {
    "--bg": "#000000",
    "--surface": "rgba(255, 255, 255, 0.05)",
    "--surface-solid": "#0A0A0A",
    "--surface-2": "rgba(255, 255, 255, 0.035)",
    "--nav-surface": "rgba(0, 0, 0, 0.62)",
    "--chip": "#1C1C1E",
    "--border": "rgba(255, 255, 255, 0.1)",
    "--border-2": "rgba(255, 255, 255, 0.18)",
    "--text-1": "#F5F5F7",
    "--text-2": "#9A9AA5",
    "--text-3": "#6E6E76",
  },
  light: {
    "--bg": "#F6F7FC",
    "--surface": "rgba(255, 255, 255, 0.8)",
    "--surface-solid": "#FFFFFF",
    "--surface-2": "rgba(249, 250, 255, 0.75)",
    "--nav-surface": "rgba(255, 255, 255, 0.78)",
    "--chip": "#EEF0F8",
    "--border": "rgba(232, 234, 242, 0.9)",
    "--border-2": "rgba(208, 213, 232, 0.9)",
    "--text-1": "#0A0F2E",
    "--text-2": "#424668",
    "--text-3": "#7880A8",
  },
};

// Company branding is a single configurable value — change COMPANY.name to rebrand
// the whole app (nav label, greeting, disclaimer, etc. all derive from it automatically).
const COMPANY = { name: "BuildFest" };
const ASSISTANT_NAME = COMPANY.name ? `${COMPANY.name.split(" ")[0]} AI` : "BuildFest AI";

const TEMPLATES = {
  deck: "Investor Pitch Deck v3",
  finance: "Finance Report Q series",
  social: "Social Announcement",
  proposal: "Client One Pager",
  other: "Custom layout",
};

const SKILL_BY_TYPE = { deck: "ppt", social: "ppt", finance: "excel", proposal: "word", other: null };
const SKILL_LABELS = { ppt: "PowerPoint", word: "Word", excel: "Excel" };

const QUICK_ACTIONS = [
  { id: "deck", label: "New pitch deck", seed: "New investor pitch deck", icon: Presentation },
  { id: "finance", label: "Q3 report", seed: "Q3 finance report", icon: Sheet },
  { id: "social", label: "Social announcement", seed: "Social announcement graphic", icon: LayoutGrid },
  { id: "proposal", label: "Client one pager", seed: "Client one pager proposal", icon: FileType },
];

const CURRENT_USER = { name: "Anthony", role: "Marketing associate" };
const DAILY_LIMIT = 5;
const MAX_UPLOAD_KB = 1024;

function guessProjectType(text) {
  const t = text.toLowerCase();
  if (t.includes("pitch") || t.includes("deck") || t.includes("presentation")) return "deck";
  if (t.includes("finance") || t.includes("report") || t.includes("numbers") || t.includes("revenue")) return "finance";
  if (t.includes("social") || t.includes("post") || t.includes("graphic")) return "social";
  if (t.includes("proposal") || t.includes("one pager") || t.includes("one-pager")) return "proposal";
  return "other";
}

function isSmallTalk(text) {
  return /^\s*(hi|hey|hello|how are you|how's it going|hows it going|what's up|whats up|sup|yo)\b/i.test(text);
}

function smallTalkAck(text) {
  if (/how are you|how's it going|hows it going/i.test(text)) return "I'm doing well, thanks for asking.";
  return "Hey there.";
}

function timePhrase() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { kind: "greeting", word: "Good morning" };
  if (hour >= 12 && hour < 17) return { kind: "greeting", word: "Good afternoon" };
  if (hour >= 17) return { kind: "greeting", word: "Good evening" };
  return { kind: "casual" };
}

function buildGreetingText(isFirstTime) {
  const phrase = timePhrase();
  if (isFirstTime) {
    return phrase.kind === "greeting"
      ? `Welcome, ${CURRENT_USER.name}. ${phrase.word}. What are we building today?`
      : `Welcome, ${CURRENT_USER.name}. Hi, what's up? What are we building today?`;
  }
  return phrase.kind === "greeting"
    ? `${phrase.word}, ${CURRENT_USER.name}. What are we building today?`
    : `Hi, ${CURRENT_USER.name}. What's up? What are we building today?`;
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return idCounter;
}

function GmailIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#FFFFFF" stroke="#E0E0E0" />
      <path d="M2 6l10 7 10-7" fill="none" stroke="#EA4335" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DriveIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points="8.5,3 15.5,3 22,14 15,14" fill="#FFC107" />
      <polygon points="8.5,3 15,14 8,21 1.5,14" fill="#4285F4" />
      <polygon points="1.5,14 8,21 19,21 15,14" fill="#34A853" />
    </svg>
  );
}

function SlackIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="9" y="2" width="4" height="9" rx="2" fill="#36C5F0" />
      <rect x="13" y="13" width="4" height="9" rx="2" fill="#2EB67D" />
      <rect x="13" y="2" width="9" height="4" rx="2" fill="#ECB22E" />
      <rect x="2" y="13" width="9" height="4" rx="2" fill="#E01E5A" />
    </svg>
  );
}

function CanvaIconGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="url(#bfp-canva-grad)" />
      <defs>
        <linearGradient id="bfp-canva-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#8B3EFF" />
          <stop offset="100%" stopColor="#00C4CC" />
        </linearGradient>
      </defs>
      <path d="M7 13.2c0 2.1 1.6 3.4 3.6 3.4 1.1 0 2-.4 2.6-1v.7h1.9V9.6h-1.9v4.6c-.4.6-1.1 1-1.9 1-1 0-1.7-.6-1.7-1.9V9.6H7.6z" fill="#fff" />
    </svg>
  );
}

const WORKFLOW_TOOLS = [
  { id: "canva", label: "Canva", icon: CanvaIconGlyph, hint: "Design and brand assets" },
  { id: "email", label: "Gmail", icon: GmailIconGlyph, hint: "Search email for source material" },
  { id: "drive", label: "Google Drive", icon: DriveIconGlyph, hint: "Point the assistant at a file" },
  { id: "slack", label: "Slack", icon: SlackIconGlyph, hint: "Pull context from team channels" },
];

export default function BuildfestChat() {
  const [themeChoice, setThemeChoice] = useState("dark");
  const [systemPref, setSystemPref] = useState("dark");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [connectors, setConnectors] = useState({ canva: false, email: false, drive: false, slack: false });
  const [autoSkill, setAutoSkill] = useState(null);
  const [hasGreetedBefore, setHasGreetedBefore] = useState(false);
  const [greetingText, setGreetingText] = useState(() => buildGreetingText(true));
  const [loggedOut, setLoggedOut] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [feedback, setFeedback] = useState({});
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [skillJustDetected, setSkillJustDetected] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState([
    { id: "seed-1", title: "Finance Report Q series", skill: "excel", driveSynced: true, when: "Aug 20" },
    { id: "seed-2", title: "Investor Pitch Deck v3", skill: "ppt", driveSynced: true, when: "Aug 18" },
  ]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState({});
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationStarted = messages.length > 0;

  const slashActive = step === 0 && input.trim().startsWith("/");
  const slashQuery = slashActive ? input.trim().slice(1).toLowerCase() : "";
  const slashMatches = slashActive
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(slashQuery))
    : [];

  useEffect(() => {
    if (autoSkill) {
      setSkillJustDetected(true);
      const t = setTimeout(() => setSkillJustDetected(false), 900);
      return () => clearTimeout(t);
    }
  }, [autoSkill]);

  useEffect(() => {
    setHasGreetedBefore(true);
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemPref(mq.matches ? "dark" : "light");
      const handler = (e) => setSystemPref(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const effectiveTheme = themeChoice === "system" ? systemPref : themeChoice;
  const vars = THEME_VARS[effectiveTheme];

  function addMessage(msg) {
    setMessages((prev) => [...prev, { id: nextId(), ...msg }]);
  }

  function replyAfterDelay(msg, delay = 700) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage(msg);
    }, delay);
  }

  function handleSend() {
    const text = input.trim();
    if (!text && pendingAttachments.length === 0) return;
    addMessage({ role: "user", type: "text", content: text, attachments: pendingAttachments });
    setInput("");
    setPendingAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (text) handleUserReply(text);
  }

  function quickStart(seedText) {
    setInput("");
    addMessage({ role: "user", type: "text", content: seedText, attachments: [] });
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
    handleUserReply(seedText);
  }

  function handleUserReply(text) {
    if (isSmallTalk(text) && step < 3) {
      const pending =
        step === 0
          ? "What are we building today?"
          : step === 1
          ? "Anyway, who is this actually going to?"
          : "Anyway, should I pull anything from a connected workflow tool, or do you already have everything I need?";
      replyAfterDelay({ role: "assistant", type: "text", content: `${smallTalkAck(text)} ${pending}` });
      return;
    }

    if (step === 0) {
      const type = guessProjectType(text);
      const template = TEMPLATES[type];
      const skillKey = SKILL_BY_TYPE[type];
      setAutoSkill(skillKey);
      setBrief({ project: text, template, skill: skillKey });
      const label = type === "deck" ? "pitch deck" : type === "other" ? "new kind of project" : type;
      replyAfterDelay({
        role: "assistant",
        type: "text",
        content: `Got it. Sounds like a ${label} for ${COMPANY.name}. I will use "${template}" as the template unless you would rather use something else. Who is this actually going to?`,
      });
      setStep(1);
      return;
    }
    if (step === 1) {
      setBrief((prev) => ({ ...prev, audience: text }));
      replyAfterDelay({
        role: "assistant",
        type: "text",
        content: "Understood. Should I pull anything from a connected workflow tool, or do you already have everything I need?",
      });
      setStep(2);
      return;
    }
    if (step === 2) {
      const pulling = /yes|search|inbox|pull|email|drive|slack|canva/i.test(text) && !/no/i.test(text);
      setBrief((prev) => ({ ...prev, source: pulling ? text : "Manual input only" }));
      replyAfterDelay({ role: "assistant", type: "summary" });
      setStep(3);
      return;
    }
  }

  function handleGenerate() {
    addMessage({ role: "assistant", type: "generating" });
    setTimeout(() => {
      setMessages((prev) => {
        const withoutGenerating = prev.filter((m) => m.type !== "generating");
        return [...withoutGenerating, { id: nextId(), role: "assistant", type: "result" }];
      });
      setDailyUsed((n) => Math.min(n + 1, DAILY_LIMIT));
      const fileId = nextId();
      setLibraryFiles((prev) => [
        { id: fileId, title: brief.template, skill: brief.skill, driveSynced: false, when: "Just now" },
        ...prev,
      ]);
      setTimeout(() => {
        setLibraryFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, driveSynced: true } : f)));
      }, 1600);
    }, 2200);
  }

  function handleNewChat() {
    setMessages([]);
    setGreetingText(buildGreetingText(!hasGreetedBefore));
    setStep(0);
    setBrief({});
    setAutoSkill(null);
    setPendingAttachments([]);
    setUploadError("");
    setSidebarOpen(false);
  }

  function handleTextareaInput(e) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    files.forEach((file) => {
      const sizeKB = Math.round(file.size / 1024);
      if (sizeKB > MAX_UPLOAD_KB) {
        setUploadError(
          `${file.name} is ${(sizeKB / 1024).toFixed(1)} MB, over the 1 MB direct upload limit. Connect Google Drive from workflow tools and point me at it instead.`
        );
        setTimeout(() => setUploadError(""), 5500);
        return;
      }
      const id = nextId();
      setPendingAttachments((prev) => [...prev, { id, name: file.name, sizeKB, status: "processing" }]);
      setTimeout(() => {
        const reducedPct = 30 + Math.round(Math.random() * 25);
        setPendingAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "cached", reducedPct } : a))
        );
      }, 900 + Math.random() * 700);
    });
  }

  function removeAttachment(id) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function toggleConnector(key) {
    setConnectors((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleLogout() {
    setLoggedOut(true);
    setSidebarOpen(false);
    setProfileOpen(false);
  }

  function handleLoginBack() {
    setLoggedOut(false);
    handleNewChat();
  }

  function toggleFeedback(id, kind) {
    setFeedback((prev) => ({ ...prev, [id]: prev[id] === kind ? null : kind }));
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  if (loggedOut) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center transition-colors duration-300"
        style={{ ...vars, backgroundColor: "var(--bg)", color: "var(--text-1)", fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{FONT_IMPORT}</style>
        <div className="text-center px-6">
          <div className="flex justify-center mb-4">
            <LogoMark size={34} />
          </div>
          <h2 className="text-[18px] font-bold mb-1.5" style={{ fontFamily: "'Sora', sans-serif" }}>
            You are logged out
          </h2>
          <p className="text-[13.5px] mb-6" style={{ color: "var(--text-3)" }}>
            Your {ASSISTANT_NAME} session for {COMPANY.name} has ended.
          </p>
          <button
            onClick={handleLoginBack}
            className="px-5 py-2.5 rounded-[12px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #08113A, #1420A0)" }}
          >
            Log back in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col transition-colors duration-300 relative isolate overflow-hidden"
      style={{ ...vars, backgroundColor: "var(--bg)", color: "var(--text-1)", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{FONT_IMPORT}{KEYFRAMES}</style>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-[-10%] left-[10%] w-[60vw] h-[60vw] max-w-[560px] max-h-[560px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(66,90,240,0.5) 0%, rgba(66,90,240,0) 70%)",
            filter: "blur(60px)",
            animation: "bfp-glow-a 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-15%] right-[5%] w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(180,70,220,0.4) 0%, rgba(180,70,220,0) 70%)",
            filter: "blur(60px)",
            animation: "bfp-glow-b 11s ease-in-out infinite",
          }}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className="fixed top-0 left-0 bottom-0 z-40 w-72 border-r flex flex-col transition-transform duration-300 backdrop-blur-2xl"
        style={{
          backgroundColor: "var(--surface-solid)",
          borderColor: "var(--border)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-bold text-[14px]" style={{ fontFamily: "'Sora', sans-serif" }}>
              {ASSISTANT_NAME}
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70" aria-label="Close menu">
            <X size={16} style={{ color: "var(--text-2)" }} />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium border transition-colors hover:opacity-85"
            style={{ borderColor: "var(--border-2)", color: "var(--text-1)" }}
          >
            <Plus size={15} />
            Start new chat
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={() => setLibraryOpen((o) => !o)}
            className="w-full flex items-center justify-between rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:opacity-85"
            style={{ color: "var(--text-1)" }}
          >
            <span className="flex items-center gap-2">
              <Library size={15} style={{ color: "var(--text-3)" }} />
              Library
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {libraryFiles.length}
              </span>
              <ChevronRight
                size={13}
                style={{ color: "var(--text-3)", transform: libraryOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </span>
          </button>
        </div>

        {libraryOpen && (
          <div className="px-3 pb-2 space-y-1" style={{ animation: "bfp-rise 0.25s ease" }}>
            {libraryFiles.length > 4 && (
              <div
                className="flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 mb-1"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <Search size={12} style={{ color: "var(--text-3)" }} />
                <input
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search library"
                  className="flex-1 bg-transparent outline-none text-[12px]"
                  style={{ color: "var(--text-1)" }}
                />
              </div>
            )}
            {(() => {
              const visible = librarySearch.trim()
                ? libraryFiles.filter((f) => f.title.toLowerCase().includes(librarySearch.trim().toLowerCase()))
                : libraryFiles;
              if (libraryFiles.length === 0) {
                return (
                  <div className="rounded-[10px] px-3.5 py-2 text-[12.5px]" style={{ color: "var(--text-3)" }}>
                    Nothing generated yet
                  </div>
                );
              }
              if (visible.length === 0) {
                return (
                  <div className="rounded-[10px] px-3.5 py-2 text-[12.5px]" style={{ color: "var(--text-3)" }}>
                    No files match "{librarySearch}"
                  </div>
                );
              }
              return visible.map((f) => {
                const Icon = SKILL_META[f.skill]?.icon || FileText;
                return (
                  <button
                    key={f.id}
                    className="w-full flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:opacity-80"
                    style={{ backgroundColor: "var(--surface)" }}
                    title={f.driveSynced ? "Synced to Drive — open there" : "Saving to Drive"}
                  >
                    <span
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--chip)" }}
                    >
                      <Icon size={13} style={{ color: "var(--text-2)" }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] truncate" style={{ color: "var(--text-1)" }}>
                        {f.title}
                      </span>
                      <span className="flex items-center gap-1 text-[10.5px]" style={{ color: "var(--text-3)" }}>
                        {f.driveSynced ? (
                          <>
                            <Cloud size={10} style={{ color: "#16B04A" }} />
                            Synced to Drive · {f.when}
                          </>
                        ) : (
                          <>
                            <span
                              className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent shrink-0"
                              style={{ borderColor: "#E8980A", borderTopColor: "transparent", animation: "bfp-spin 0.8s linear infinite" }}
                            />
                            Saving to Drive
                          </>
                        )}
                      </span>
                    </span>
                    {f.driveSynced && <ExternalLink size={12} style={{ color: "var(--text-3)" }} />}
                  </button>
                );
              });
            })()}
          </div>
        )}

        <div className="px-4 pt-2 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
            Recent
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <button
            onClick={() => {
              setSidebarOpen(false);
              textareaRef.current && textareaRef.current.focus();
            }}
            className="w-full text-left rounded-[10px] px-3 py-3 transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--surface)" }}
          >
            <span className="block text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
              Nothing here yet
            </span>
            <span className="block text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
              Start your first output above
            </span>
          </button>
        </div>

        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:opacity-80"
            style={{ color: "#E53E3E" }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      <div className="shrink-0 px-3 sm:px-5 pt-5 pb-3 relative z-20">
        <div className="relative max-w-3xl mx-auto">
          <div
            className="absolute -inset-[14px] rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(90deg, #7C3AED, #4C1D95, #0B1149, #4C1D95, #7C3AED)",
              backgroundSize: "300% 100%",
              filter: "blur(16px)",
              opacity: 1,
              animation: "bfp-nav-glow 5s ease-in-out infinite",
            }}
          />
          <header
            className="relative h-14 flex items-center justify-between px-4 sm:px-5 rounded-full border backdrop-blur-2xl transition-colors duration-300"
            style={{
              backgroundColor: "var(--nav-surface)",
              borderColor: "var(--border-2)",
            }}
          >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)" }}
            aria-label="Open menu"
          >
            <Menu size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
          </button>
          <div className="flex items-center gap-2 ml-1.5">
            <span className="font-bold text-[15px] tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              {ASSISTANT_NAME}
            </span>
            {autoSkill && (
              <span
                className="text-[11.5px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(20,32,160,0.12)",
                  color: "#5870F8",
                  animation: skillJustDetected
                    ? "bfp-rise 0.35s ease, bfp-skill-flash 0.9s ease-out"
                    : "bfp-rise 0.35s ease",
                }}
              >
                {SKILL_LABELS[autoSkill]} mode
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1420A0, #7C3AED)" }}
              aria-label="Profile"
            >
              {CURRENT_USER.name.charAt(0)}
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-11 rounded-2xl border shadow-2xl z-50 w-64 backdrop-blur-2xl p-4"
                style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
              >
                <p className="text-[14.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                  {CURRENT_USER.name}
                </p>
                <p className="text-[12.5px] mb-3" style={{ color: "var(--text-3)" }}>
                  {CURRENT_USER.role} at {COMPANY.name}
                </p>
                <div className="mb-1 flex items-center justify-between text-[12px]" style={{ color: "var(--text-2)" }}>
                  <span>Outputs today</span>
                  <span>{dailyUsed} of {DAILY_LIMIT}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(dailyUsed / DAILY_LIMIT) * 100}%`, background: "linear-gradient(90deg, #1420A0, #7C3AED)" }}
                  />
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ color: "#E53E3E" }}
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleNewChat}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-dashed transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-2)" }}
            aria-label="New chat"
          >
            <PenSquare size={15} style={{ color: "var(--text-2)" }} />
          </button>
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:opacity-80"
              style={{ borderColor: "var(--border-2)" }}
              aria-label="Change theme"
            >
              {effectiveTheme === "dark" ? (
                <Moon size={15} style={{ color: "var(--text-2)" }} />
              ) : (
                <Sun size={15} style={{ color: "var(--text-2)" }} />
              )}
            </button>
            {themeMenuOpen && (
              <div
                className="absolute right-0 top-11 rounded-2xl border shadow-2xl overflow-hidden z-50 w-40 backdrop-blur-2xl"
                style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
              >
                {[
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "Device", icon: Monitor },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setThemeChoice(opt.id);
                      setThemeMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[13.5px] hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-1)" }}
                  >
                    <span className="flex items-center gap-2.5">
                      <opt.icon size={14} style={{ color: "var(--text-3)" }} />
                      {opt.label}
                    </span>
                    {themeChoice === opt.id && <Check size={13} style={{ color: "#1420A0" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
          </header>
        </div>
      </div>

      {!conversationStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <LogoMark size={40} />
          <h1
            className="text-[26px] sm:text-[32px] font-semibold text-center mt-5 max-w-lg leading-snug"
            style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-1)" }}
          >
            <TypewriterText text={greetingText} />
          </h1>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-7">
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                brief={brief}
                onGenerate={handleGenerate}
                onReset={handleNewChat}
                feedback={feedback[m.id]}
                onFeedback={(kind) => toggleFeedback(m.id, kind)}
                onCopy={() => copyText(m.content)}
              />
            ))}
            {typing && <TypingBubble />}
          </div>
        </div>
      )}

      <div className="shrink-0 px-4 sm:px-6 pb-5 pt-2 relative z-10">
        <div className="max-w-2xl mx-auto relative">
          {uploadError && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 mb-2.5 text-[12.5px]"
              style={{ backgroundColor: "rgba(229,62,62,0.1)", color: "#E53E3E" }}
            >
              <AlertCircle size={14} />
              {uploadError}
            </div>
          )}

          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {pendingAttachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 border text-[12px]"
                  style={{ backgroundColor: "var(--chip)", borderColor: "var(--border)", color: "var(--text-1)" }}
                >
                  <FileIcon size={13} style={{ color: "var(--text-3)" }} />
                  <span className="max-w-[110px] truncate">{a.name}</span>
                  {a.status === "processing" ? (
                    <span
                      className="w-3 h-3 rounded-full border-2 border-t-transparent shrink-0"
                      style={{ borderColor: "#E8980A", borderTopColor: "transparent", animation: "bfp-spin 0.8s linear infinite" }}
                    />
                  ) : (
                    <span className="flex items-center gap-1 shrink-0" style={{ color: "#16B04A" }}>
                      <Check size={12} />
                      {a.reducedPct}% smaller
                    </span>
                  )}
                  <button onClick={() => removeAttachment(a.id)} className="ml-0.5 hover:opacity-70" aria-label="Remove file">
                    <X size={12} style={{ color: "var(--text-3)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {slashActive && slashMatches.length > 0 && (
            <div
              className="absolute bottom-full left-0 mb-2.5 w-64 rounded-[18px] border shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
              style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)", animation: "bfp-rise 0.2s ease" }}
            >
              <div className="px-4 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                Quick start
              </div>
              {slashMatches.map((a) => (
                <button
                  key={a.id}
                  onClick={() => quickStart(a.seed)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-1)" }}
                >
                  <a.icon size={15} style={{ color: "var(--text-3)" }} />
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {plusMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setPlusMenuOpen(false); setWorkflowExpanded(false); }} />
              <div
                className="absolute bottom-full left-0 mb-2.5 w-72 rounded-[20px] border shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
                style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => {
                    fileInputRef.current && fileInputRef.current.click();
                    setPlusMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-1)" }}
                >
                  <UploadCloud size={17} style={{ color: "var(--text-3)" }} />
                  Upload file
                </button>
                <div className="h-px" style={{ backgroundColor: "var(--border)" }} />
                <button
                  onClick={() => setWorkflowExpanded((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-1)" }}
                >
                  <span className="flex items-center gap-3">
                    <LayoutGrid size={17} style={{ color: "var(--text-3)" }} />
                    Workflow tools
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-3)", transform: workflowExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                  />
                </button>
                {workflowExpanded && (
                  <div className="pb-2" style={{ animation: "bfp-rise 0.25s ease" }}>
                    {WORKFLOW_TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => toggleConnector(tool.id)}
                        className="w-full flex items-center justify-between pl-9 pr-4 py-2.5 hover:opacity-80 transition-opacity"
                      >
                        <span className="flex items-center gap-2.5">
                          <tool.icon size={18} />
                          <span className="text-[13.5px] text-left" style={{ color: "var(--text-1)" }}>
                            {tool.label}
                          </span>
                        </span>
                        <span
                          className="text-[10.5px] font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={
                            connectors[tool.id]
                              ? { backgroundColor: "rgba(22,176,74,0.12)", color: "#16B04A" }
                              : { backgroundColor: "var(--chip)", color: "var(--text-3)" }
                          }
                        >
                          {connectors[tool.id] ? "Connected" : "Connect"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div
            className="flex items-end gap-1.5 rounded-full border px-3 py-2 backdrop-blur-2xl shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-[rgba(20,32,160,0.35)]"
            style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border-2)" }}
          >
            <button
              onClick={() => setPlusMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors hover:opacity-80"
              style={{ borderColor: "var(--border-2)" }}
              aria-label="Attach and workflow tools"
            >
              <Plus
                size={16}
                style={{ color: "var(--text-2)", transform: plusMenuOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={!conversationStarted ? `Ask ${ASSISTANT_NAME}, or type / for quick starts` : step === 0 ? "Type what you want to build, or /" : "Type your answer"}
              className="flex-1 bg-transparent outline-none resize-none text-[15.5px] py-1.5"
              style={{ color: "var(--text-1)" }}
            />
            {step < 3 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative w-9 h-9 shrink-0">
                  {!(input.trim() || pendingAttachments.length > 0) && (
                    <span
                      className="absolute -inset-[4px] rounded-full pointer-events-none"
                      style={{
                        background: "conic-gradient(from 0deg, #1420A0, #7C3AED, #00C4CC, #1420A0)",
                        filter: "blur(3px)",
                        opacity: 0.95,
                        animation: "bfp-mic-spin 4s linear infinite",
                      }}
                    />
                  )}
                  <button
                    className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                    style={
                      input.trim() || pendingAttachments.length > 0
                        ? { backgroundColor: "var(--chip)", color: "var(--text-2)" }
                        : {
                            backgroundColor: "var(--surface-solid)",
                            color: "var(--text-1)",
                            animation: "bfp-mic-pulse 2.4s ease-in-out infinite",
                          }
                    }
                    aria-label="Voice input"
                  >
                    <Mic size={15} />
                  </button>
                </div>
                {(input.trim() || pendingAttachments.length > 0) && (
                  <button
                    onClick={handleSend}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #08113A, #1420A0)", color: "#fff", animation: "bfp-rise 0.2s ease" }}
                    aria-label="Send"
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center mt-2.5">
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
              <Lock size={10} />
              {ASSISTANT_NAME} can make mistakes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 28" fill="none">
      <circle cx="15" cy="14" r="12" fill="#1420A0" fillOpacity="0.85" />
      <circle cx="25" cy="14" r="12" fill="#7C3AED" fillOpacity="0.85" style={{ mixBlendMode: "screen" }} />
    </svg>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-center gap-1.5" style={{ animation: "bfp-rise 0.35s ease" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--text-3)", animation: "bfp-dot 1.1s ease infinite", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function TypewriterText({ text, speed = 18 }) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setShown("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return (
    <>
      {shown}
      {!done && <span style={{ animation: "bfp-blink 0.9s step-start infinite" }}>|</span>}
    </>
  );
}

const SKILL_META = {
  ppt: { icon: Presentation, note: "Generated with Canva, connected for this task" },
  word: { icon: FileType, note: "Formatted as a Word document, ready to export as PDF" },
  excel: { icon: Sheet, note: "Structured as a spreadsheet" },
};

function ChatBubble({ message, brief, onGenerate, onReset, feedback, onFeedback, onCopy }) {
  const isUser = message.role === "user";
  const riseStyle = { animation: "bfp-rise 0.35s ease" };

  if (message.type === "summary") {
    return (
      <div style={riseStyle}>
        <div className="rounded-[18px] border p-5 backdrop-blur-xl" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[15.5px] mb-4" style={{ color: "var(--text-1)" }}>
            Here is what I have got. Let me know if anything needs to change.
          </p>
          <div className="space-y-0 mb-5">
            {[
              ["Project", brief.project],
              ["Template", brief.template],
              ["Audience", brief.audience],
              ["Source", brief.source],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide pt-0.5" style={{ color: "var(--text-3)" }}>
                  {label}
                </span>
                <span className="text-[14.5px]" style={{ color: "var(--text-1)" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onGenerate}
            className="px-5 py-2.5 rounded-[12px] text-[14px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #08113A, #1420A0)" }}
          >
            Generate
          </button>
        </div>
      </div>
    );
  }

  if (message.type === "generating") {
    const stepLabel = brief.skill === "word" ? "Compiling document" : brief.skill === "excel" ? "Structuring spreadsheet" : "Checking for a connected Canva account";
    return (
      <div style={riseStyle}>
        <div className="rounded-[18px] border p-5 backdrop-blur-xl" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="w-4 h-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#E8980A", borderTopColor: "transparent", animation: "bfp-spin 0.8s linear infinite" }}
            />
            <span className="text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
              Building it now
            </span>
          </div>
          <ul className="space-y-1.5 text-[13px] pl-6" style={{ color: "var(--text-3)" }}>
            <li className="flex items-center gap-2">
              <Check size={12} style={{ color: "#16B04A" }} /> Applied brand kit and template
            </li>
            <li className="flex items-center gap-2">
              <Check size={12} style={{ color: "#16B04A" }} /> Structured layout
            </li>
            <li className="flex items-center gap-2" style={{ color: "var(--text-1)" }}>
              {stepLabel}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  if (message.type === "result") {
    const meta = SKILL_META[brief.skill] || { icon: FileText, note: "Generated directly, no design connector needed" };
    const Icon = meta.icon;
    return (
      <div style={riseStyle}>
        <div className="rounded-[18px] border p-5 backdrop-blur-xl" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[15.5px] mb-4" style={{ color: "var(--text-1)" }}>
            Done. Here is your result.
          </p>
          <div
            className="aspect-[4/3] rounded-[14px] border flex flex-col items-center justify-center gap-2 mb-2"
            style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--surface-2), var(--surface))" }}
          >
            <Icon size={24} style={{ color: "#1420A0" }} />
            <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
              {brief.template}
            </span>
          </div>
          <p className="text-[11.5px] mb-4" style={{ color: "var(--text-3)" }}>
            {meta.note}
          </p>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #08113A, #1420A0)" }}
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2.5 rounded-[12px] border text-[13.5px] transition-colors hover:opacity-80"
              style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
            >
              Start something new
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end" style={riseStyle}>
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {message.attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-full pl-2.5 pr-2 py-1 border text-[11px]"
                  style={{ backgroundColor: "var(--chip)", borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  <FileIcon size={11} />
                  <span className="max-w-[100px] truncate">{a.name}</span>
                </div>
              ))}
            </div>
          )}
          {message.content && (
            <div
              className="rounded-[20px] px-4 py-2.5 text-[15.5px] leading-relaxed border"
              style={{ backgroundColor: "var(--chip)", borderColor: "var(--border)", color: "var(--text-1)" }}
            >
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={riseStyle}>
      <p className="text-[15.5px] leading-relaxed max-w-[85%]" style={{ color: "var(--text-1)" }}>
        {message.content}
      </p>
      <div className="flex items-center gap-1 mt-2.5 -ml-1.5">
        <IconBtn active={feedback === "up"} onClick={() => onFeedback("up")} activeColor="#16B04A">
          <ThumbsUp size={14} />
        </IconBtn>
        <IconBtn active={feedback === "down"} onClick={() => onFeedback("down")} activeColor="#E53E3E">
          <ThumbsDown size={14} />
        </IconBtn>
        <IconBtn>
          <RotateCw size={14} />
        </IconBtn>
        <IconBtn>
          <Share2 size={14} />
        </IconBtn>
        <IconBtn onClick={onCopy}>
          <Copy size={14} />
        </IconBtn>
        <IconBtn>
          <Volume2 size={14} />
        </IconBtn>
        <IconBtn>
          <MoreHorizontal size={14} />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, active, activeColor = "#1420A0" }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
      style={{ color: active ? activeColor : "var(--text-3)" }}
    >
      {children}
    </button>
  );
}
