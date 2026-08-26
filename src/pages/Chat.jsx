/* ==========================================================================
   CHAT PAGE
   The surface staff actually use. Read top to bottom:

     1.  Interview helpers
     2.  Component state
     3.  Interview flow
     4.  Generation
     5.  File uploads
     6.  Sidebar and library
     7.  Top nav
     8.  Greeting
     9.  Conversation
     10. Composer
     11. Message bubbles
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp,
  X,
  Plus,
  Check,
  FileText,
  Download,
  Lock,
  LogOut,
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
  File as FileIcon,
  AlertCircle,
  UploadCloud,
  LayoutGrid,
  Library,
  Cloud,
  ExternalLink,
  Search,
  Shield,
  Info,
} from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
import { useSpeechToText } from "../shared/useSpeechToText.js";
import { sendTurn, toApiMessages } from "../shared/assistantApi.js";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import {
  PageShell,
  FloatingNav,
  ThemeToggle,
  TypewriterText,
  TypingDots,
  IconBtn,
  PrimaryButton,
  GhostButton,
  Spinner,
  StatusPill,
} from "../shared/ui.jsx";
import {
  ASSISTANT_NAME,
  COMPANY,
  CURRENT_USER,
  DAILY_LIMIT,
  MAX_UPLOAD_KB,
  TEMPLATES,
  SKILL_BY_TYPE,
  SKILL_LABELS,
  SKILL_META,
  QUICK_ACTIONS,
  WORKFLOW_TOOLS,
  WORKFLOW_PLAN_NOTE,
  SAMPLE_CONNECTOR_NOTE,
} from "../shared/config.js";

/* ==========================================================================
   1. INTERVIEW HELPERS
   Small pure functions the interview leans on. Kept at the top so the
   component below reads as flow rather than plumbing.
   ========================================================================== */

function guessProjectType(text) {
  const t = text.toLowerCase();
  if (t.includes("pitch") || t.includes("deck") || t.includes("presentation")) return "deck";
  if (t.includes("finance") || t.includes("report") || t.includes("numbers") || t.includes("revenue"))
    return "finance";
  if (t.includes("social") || t.includes("post") || t.includes("graphic")) return "social";
  if (t.includes("proposal") || t.includes("one pager") || t.includes("one-pager")) return "proposal";
  return "other";
}

function isSmallTalk(text) {
  return /^\s*(hi|hey|hello|how are you|how's it going|hows it going|what's up|whats up|sup|yo)\b/i.test(
    text
  );
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

/* ==========================================================================
   CHAT PAGE COMPONENT
   ========================================================================== */

export default function Chat() {
  const navigate = useNavigate();

  /* ------------------------------------------------------------------------
     2. COMPONENT STATE
     ------------------------------------------------------------------------ */

  /* Shell */
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);

  /* Which cosmetic connector is currently explaining itself. One at a
     time, so the menu does not turn into a wall of paragraphs. */
  const [demoNoteFor, setDemoNoteFor] = useState(null);
  const [planNoteOpen, setPlanNoteOpen] = useState(false);

  /* Connectors and skills */
  const [connectors, setConnectors] = useState({
    canva: false,
    email: false,
    drive: false,
    slack: false,
  });
  const [autoSkill, setAutoSkill] = useState(null);
  const [skillJustDetected, setSkillJustDetected] = useState(false);

  /* Greeting */
  const [hasGreetedBefore, setHasGreetedBefore] = useState(false);
  const [greetingText, setGreetingText] = useState(() => buildGreetingText(true));

  /* Usage and feedback */
  const [dailyUsed, setDailyUsed] = useState(0);
  const [feedback, setFeedback] = useState({});

  /* Attachments */
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadError, setUploadError] = useState("");

  /* Library */
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFiles, setLibraryFiles] = useState([
    { id: "seed-1", title: "Finance Report Q series", skill: "excel", driveSynced: true, when: "Aug 20" },
    { id: "seed-2", title: "Investor Pitch Deck v3", skill: "ppt", driveSynced: true, when: "Aug 18" },
  ]);

  /* Conversation */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState({});
  const [typing, setTyping] = useState(false);

  /* Which model actually ran the last turn, reported by the server rather
     than assumed here. The ladder is a real feature, so it gets shown. */
  const [activeTier, setActiveTier] = useState(null);

  /* Lets a turn be cancelled. Leaving the page or sending again while one
     is still streaming would otherwise keep it running and billing. */
  const abortTurnRef = useRef(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  /* Speech to text. What was already typed when the mic was tapped stays
     put, the transcript lands after it, so talking never wipes out typing. */
  const speechBaseRef = useRef("");
  const { supported: micSupported, listening, start: startListening, stop: stopListening } = useSpeechToText({
    onResult: (transcript, isFinal) => {
      const base = speechBaseRef.current;
      setInput(`${base}${base && transcript ? " " : ""}${transcript}`);
      if (isFinal) speechBaseRef.current = `${base}${base && transcript ? " " : ""}${transcript}`;
    },
  });

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    speechBaseRef.current = input.trim();
    startListening();
  }

  const conversationStarted = messages.length > 0;

  /* Slash quick starts, only at the very start of a conversation */
  const slashActive = step === 0 && input.trim().startsWith("/");
  const slashQuery = slashActive ? input.trim().slice(1).toLowerCase() : "";
  const slashMatches = slashActive
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(slashQuery))
    : [];

  /* Flash the skill badge the first moment a skill is detected */
  useEffect(() => {
    if (!autoSkill) return;
    setSkillJustDetected(true);
    const t = setTimeout(() => setSkillJustDetected(false), 900);
    return () => clearTimeout(t);
  }, [autoSkill]);

  useEffect(() => {
    setHasGreetedBefore(true);
  }, []);

  /* A stream left running after the page is gone still costs money and
     still counts against the company's budget. Cut it. */
  useEffect(() => () => abortTurnRef.current?.(), []);

  /* The mic control disappears once step reaches 3, stop listening with it
     rather than leaving a session open with nothing showing it is live. */
  useEffect(() => {
    if (step >= 3 && listening) stopListening();
  }, [step, listening, stopListening]);

  /* Keep the conversation pinned to the newest message */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  /* Close the profile menu on an outside click */
  useEffect(() => {
    if (!profileOpen) return;
    function onDown(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  /* ------------------------------------------------------------------------
     3. INTERVIEW FLOW
     The assistant asks only what it does not already know, then hands a
     finished brief to the summary card for the staff member to confirm.
     ------------------------------------------------------------------------ */

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

  /* The real thing. Everything the conversation has said so far goes to
     the assistant function, which decides the model, checks the budget,
     and answers as this company's assistant.

     The interview is not scripted here any more. The system prompt tells
     the model to ask only what it does not know and to read the brief
     back before producing anything, so the questions come from the model
     reading the room rather than from a fixed list of three. That is the
     difference between an interview and a form. */
  function handleUserReply(text) {
    /* Skill detection still runs locally. It is a badge, not a decision,
       and guessing it instantly beats waiting on a round trip to show it. */
    const guessed = SKILL_BY_TYPE[guessProjectType(text)];
    if (guessed && !autoSkill) setAutoSkill(guessed);

    setTyping(true);

    /* The bubble the reply streams into. Created empty and filled as
       chunks arrive, so words appear rather than a spinner resolving into
       a wall of text. */
    const replyId = nextId();
    let started = false;

    const history = toApiMessages([
      ...messages,
      { role: "user", content: text },
    ]);

    abortTurnRef.current = sendTurn({
      stage: "interview",
      messages: history,

      onMeta: ({ tier }) => setActiveTier(tier),

      onText: (chunk) => {
        if (!started) {
          started = true;
          setTyping(false);
          setMessages((prev) => [...prev, { id: replyId, role: "assistant", type: "text", content: "" }]);
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m))
        );
      },

      onDone: () => {
        setTyping(false);
        abortTurnRef.current = null;
      },

      onError: ({ reason, message }) => {
        setTyping(false);
        abortTurnRef.current = null;

        /* Running out is not a failure, it is the end of a trial, and the
           message that comes back with it is written to say so. */
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            type: reason === "out_of_budget" ? "text" : "error",
            content: message,
          },
        ]);
      },
    });
  }

  /* ------------------------------------------------------------------------
     4. GENERATION
     Runs once the staff member confirms the brief. The finished file is
     written to their Drive rather than kept in the chat.
     ------------------------------------------------------------------------ */

  function handleGenerate() {
    addMessage({ role: "assistant", type: "generating" });

    setTimeout(() => {
      setMessages((prev) => {
        const withoutGenerating = prev.filter((m) => m.type !== "generating");
        return [...withoutGenerating, { id: nextId(), role: "assistant", type: "result" }];
      });
      setDailyUsed((n) => Math.min(n + 1, DAILY_LIMIT));

      /* Add to the Library, then flip it to synced once the Drive write lands */
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
    abortTurnRef.current?.();
    abortTurnRef.current = null;
    setTyping(false);
    setActiveTier(null);
    setMessages([]);
    setGreetingText(buildGreetingText(!hasGreetedBefore));
    setStep(0);
    setBrief({});
    setAutoSkill(null);
    setPendingAttachments([]);
    setUploadError("");
    setSidebarOpen(false);
  }

  /* ------------------------------------------------------------------------
     5. FILE UPLOADS
     Small files go straight through. Anything over the cap is pushed to
     Drive instead, which keeps large files out of the model context.
     ------------------------------------------------------------------------ */

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

      /* Files are described and cached once so later references reuse it */
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

  function toggleFeedback(id, kind) {
    setFeedback((prev) => ({ ...prev, [id]: prev[id] === kind ? null : kind }));
  }

  function copyText(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  }

  function handleLogout() {
    setSidebarOpen(false);
    setProfileOpen(false);
    navigate("/auth");
  }

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */

  const visibleLibrary = librarySearch.trim()
    ? libraryFiles.filter((f) => f.title.toLowerCase().includes(librarySearch.trim().toLowerCase()))
    : libraryFiles;

  return (
    <PageShell>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      {/* ====================================================================
          6. SIDEBAR AND LIBRARY
          New chat, the Library of generated files, recent chats, log out.
          ==================================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className="fixed top-0 left-0 bottom-0 z-40 w-72 border-r flex flex-col transition-transform duration-300 backdrop-blur-2xl"
        style={{
          backgroundColor: "var(--surface-solid)",
          borderColor: "var(--border)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div
          className="h-14 flex items-center justify-between px-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-bold text-[14px]" style={{ fontFamily: FONTS.display }}>
              {ASSISTANT_NAME}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70"
            aria-label="Close menu"
          >
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

        {/* Library */}
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
                style={{
                  color: "var(--text-3)",
                  transform: libraryOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </span>
          </button>
        </div>

        {libraryOpen && (
          <div className="px-3 pb-2 space-y-1" style={{ animation: "sx-rise 0.25s ease" }}>
            {/* Search only appears once the list is long enough to need it */}
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

            {libraryFiles.length === 0 && (
              <div className="rounded-[10px] px-3.5 py-2 text-[12.5px]" style={{ color: "var(--text-3)" }}>
                Nothing generated yet
              </div>
            )}

            {libraryFiles.length > 0 && visibleLibrary.length === 0 && (
              <div className="rounded-[10px] px-3.5 py-2 text-[12.5px]" style={{ color: "var(--text-3)" }}>
                No files match "{librarySearch}"
              </div>
            )}

            {visibleLibrary.map((f) => {
              const Icon = SKILL_META[f.skill]?.icon || FileText;
              return (
                <button
                  key={f.id}
                  className="w-full flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:opacity-80"
                  style={{ backgroundColor: "var(--surface)" }}
                  title={f.driveSynced ? "Synced to Drive, open there" : "Saving to Drive"}
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
                          <Cloud size={10} style={{ color: BRAND.green }} />
                          Synced to Drive, {f.when}
                        </>
                      ) : (
                        <>
                          <Spinner size={10} />
                          Saving to Drive
                        </>
                      )}
                    </span>
                  </span>
                  {f.driveSynced && <ExternalLink size={12} style={{ color: "var(--text-3)" }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Recent chats */}
        <div className="px-4 pt-2 pb-1">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-3)" }}
          >
            Recent
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <button
            onClick={() => {
              setSidebarOpen(false);
              if (textareaRef.current) textareaRef.current.focus();
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

        <div className="p-3 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--text-2)" }}
          >
            <Shield size={15} />
            Admin dashboard
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:opacity-80"
            style={{ color: BRAND.red }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      {/* ====================================================================
          7. TOP NAV
          Floating glass pill. Menu and assistant name on the left, the
          skill badge beside it, profile and theme on the right.
          ==================================================================== */}

      <FloatingNav>
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
            <span className="font-bold text-[15px] tracking-tight" style={{ fontFamily: FONTS.display }}>
              {ASSISTANT_NAME}
            </span>
            {autoSkill && (
              <span
                className="text-[11.5px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(20,32,160,0.12)",
                  color: BRAND.accentSoft,
                  animation: skillJustDetected
                    ? "sx-rise 0.35s ease, sx-skill-flash 0.9s ease-out"
                    : "sx-rise 0.35s ease",
                }}
              >
                {SKILL_LABELS[autoSkill]} mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Profile and usage */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: GRADIENTS.brand }}
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
                <div
                  className="mb-1 flex items-center justify-between text-[12px]"
                  style={{ color: "var(--text-2)" }}
                >
                  <span>Outputs today</span>
                  <span>
                    {dailyUsed} of {DAILY_LIMIT}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden mb-4"
                  style={{ backgroundColor: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(dailyUsed / DAILY_LIMIT) * 100}%`,
                      background: GRADIENTS.meter,
                    }}
                  />
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ color: BRAND.red }}
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

          <ThemeToggle />
        </div>
      </FloatingNav>

      {/* ====================================================================
          8. GREETING
          Shown until the first message is sent.
          ==================================================================== */}

      {!conversationStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <LogoMark size={40} />
          <h1
            className="text-[26px] sm:text-[32px] font-semibold text-center mt-5 max-w-lg leading-snug"
            style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
          >
            <TypewriterText text={greetingText} />
          </h1>
        </div>
      ) : (
        /* ==================================================================
           9. CONVERSATION
           ================================================================== */
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
            {typing && <TypingDots />}
          </div>
        </div>
      )}

      {/* ====================================================================
          10. COMPOSER
          Upload and workflow tools under the plus control, slash quick
          starts above, mic always present, send appears beside it.
          ==================================================================== */}

      <div className="shrink-0 px-4 sm:px-6 pb-5 pt-2 relative z-10">
        <div className="max-w-2xl mx-auto relative">
          {uploadError && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 mb-2.5 text-[12.5px]"
              style={{ backgroundColor: "rgba(229,62,62,0.1)", color: BRAND.red }}
            >
              <AlertCircle size={14} className="shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Staged attachments */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {pendingAttachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 border text-[12px]"
                  style={{
                    backgroundColor: "var(--chip)",
                    borderColor: "var(--border)",
                    color: "var(--text-1)",
                  }}
                >
                  <FileIcon size={13} style={{ color: "var(--text-3)" }} />
                  <span className="max-w-[110px] truncate">{a.name}</span>
                  {a.status === "processing" ? (
                    <Spinner size={12} />
                  ) : (
                    <span className="flex items-center gap-1 shrink-0" style={{ color: BRAND.green }}>
                      <Check size={12} />
                      {a.reducedPct}% smaller
                    </span>
                  )}
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="ml-0.5 hover:opacity-70"
                    aria-label="Remove file"
                  >
                    <X size={12} style={{ color: "var(--text-3)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Slash quick starts */}
          {slashActive && slashMatches.length > 0 && (
            <div
              className="absolute bottom-full left-0 mb-2.5 w-64 rounded-[18px] border shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
              style={{
                backgroundColor: "var(--surface-solid)",
                borderColor: "var(--border)",
                animation: "sx-rise 0.2s ease",
              }}
            >
              <div
                className="px-4 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-3)" }}
              >
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

          {/* Plus menu: upload and workflow tools */}
          {plusMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setPlusMenuOpen(false);
                  setWorkflowExpanded(false);
                }}
              />
              <div
                className="absolute bottom-full left-0 mb-2.5 w-72 rounded-[20px] border shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
                style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.click();
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
                    style={{
                      color: "var(--text-3)",
                      transform: workflowExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {workflowExpanded && (
                  <div className="pb-2" style={{ animation: "sx-rise 0.25s ease" }}>
                    {WORKFLOW_TOOLS.map((tool) => (
                      <div key={tool.id}>
                        <button
                          onClick={() =>
                            tool.state === "connectable"
                              ? toggleConnector(tool.id)
                              : setDemoNoteFor((open) => (open === tool.id ? null : tool.id))
                          }
                          className="w-full flex items-center justify-between pl-9 pr-4 py-2.5 hover:opacity-80 transition-opacity"
                        >
                          <span className="flex items-center gap-2.5">
                            <tool.icon size={18} />
                            <span className="text-[13.5px] text-left" style={{ color: "var(--text-1)" }}>
                              {tool.label}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5 shrink-0">
                            {tool.state === "connected" && <StatusPill tone="ok">Connected</StatusPill>}
                            {tool.state === "connectable" && (
                              <StatusPill tone={connectors[tool.id] ? "ok" : "neutral"}>
                                {connectors[tool.id] ? "Connected" : "Connect"}
                              </StatusPill>
                            )}
                            {tool.state === "sample" && <StatusPill tone="neutral">Sample</StatusPill>}

                            {/* Anything with more to say carries the info dot,
                                including the connected one. Green on its own
                                would imply the viewer's own Canva is attached. */}
                            {(tool.note || tool.state !== "connectable") && (
                              <Info size={13} style={{ color: "var(--text-3)" }} />
                            )}
                          </span>
                        </button>

                        {demoNoteFor === tool.id && (
                          <p
                            className="pl-9 pr-4 pb-3 text-[12.5px] leading-relaxed"
                            style={{ color: "var(--text-3)", animation: "sx-rise 0.2s ease" }}
                          >
                            {tool.note ?? `${tool.hint}. ${SAMPLE_CONNECTOR_NOTE}`}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* The question a sharp person in the room is already
                        forming: are these real, or is this a picture of a
                        product. One control, one honest answer. */}
                    <button
                      onClick={() => setPlanNoteOpen((o) => !o)}
                      className="w-full flex items-center gap-1.5 pl-9 pr-4 pt-1 pb-2 hover:opacity-80 transition-opacity"
                    >
                      <Info size={12} style={{ color: "var(--text-3)" }} />
                      <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                        About these tools
                      </span>
                    </button>

                    {planNoteOpen && (
                      <p
                        className="pl-9 pr-4 pb-3 text-[12.5px] leading-relaxed"
                        style={{ color: "var(--text-3)", animation: "sx-rise 0.2s ease" }}
                      >
                        {WORKFLOW_PLAN_NOTE}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Message box */}
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
                style={{
                  color: "var(--text-2)",
                  transform: plusMenuOpen ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
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
              placeholder={
                listening
                  ? "Listening..."
                  : !conversationStarted
                  ? `Ask ${ASSISTANT_NAME}, or type / for quick starts`
                  : step === 0
                  ? "Type what you want to build, or /"
                  : "Type your answer"
              }
              className="flex-1 bg-transparent outline-none resize-none text-[15.5px] py-1.5"
              style={{ color: "var(--text-1)" }}
            />

            {step < 3 && (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mic stays on screen at all times, when the browser
                    actually has speech recognition to offer. Nothing is
                    worse than a control that looks live and cannot work. */}
                {micSupported && (
                  <div className="relative w-9 h-9 shrink-0">
                    {listening ? (
                      <span
                        className="absolute -inset-[4px] rounded-full pointer-events-none"
                        style={{
                          background: `radial-gradient(circle, ${BRAND.red}55 0%, transparent 70%)`,
                          animation: "sx-mic-listening 1s ease-in-out infinite",
                        }}
                      />
                    ) : (
                      !(input.trim() || pendingAttachments.length > 0) && (
                        <span
                          className="absolute -inset-[4px] rounded-full pointer-events-none"
                          style={{
                            background: GRADIENTS.micRing,
                            filter: "blur(3px)",
                            opacity: 0.95,
                            animation: "sx-mic-spin 4s linear infinite",
                          }}
                        />
                      )
                    )}
                    <button
                      onClick={toggleListening}
                      className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                      style={
                        listening
                          ? { backgroundColor: BRAND.red, color: "#fff" }
                          : input.trim() || pendingAttachments.length > 0
                          ? { backgroundColor: "var(--chip)", color: "var(--text-2)" }
                          : {
                              backgroundColor: "var(--surface-solid)",
                              color: "var(--text-1)",
                              animation: "sx-mic-pulse 2.4s ease-in-out infinite",
                            }
                      }
                      aria-label={listening ? "Stop listening" : "Voice input"}
                    >
                      <Mic size={15} />
                    </button>
                  </div>
                )}

                {/* Send appears beside the mic rather than replacing it */}
                {(input.trim() || pendingAttachments.length > 0) && (
                  <button
                    onClick={handleSend}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: GRADIENTS.action,
                      color: "#fff",
                      animation: "sx-rise 0.2s ease",
                    }}
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
    </PageShell>
  );
}

/* ==========================================================================
   11. MESSAGE BUBBLES
   Four shapes: the brief read back, the generating state, the finished
   result, and plain text. Assistant text reads as flowing text with no
   avatar, staff messages sit in a neutral capsule on the right.
   ========================================================================== */

function ChatBubble({ message, brief, onGenerate, onReset, feedback, onFeedback, onCopy }) {
  const isUser = message.role === "user";
  const riseStyle = { animation: "sx-rise 0.35s ease" };

  /* --- The brief, read back for confirmation --- */
  if (message.type === "summary") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
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
                <span
                  className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide pt-0.5"
                  style={{ color: "var(--text-3)" }}
                >
                  {label}
                </span>
                <span className="text-[14.5px]" style={{ color: "var(--text-1)" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
          <PrimaryButton onClick={onGenerate}>Generate</PrimaryButton>
        </div>
      </div>
    );
  }

  /* --- Building it now --- */
  if (message.type === "generating") {
    const stepLabel =
      brief.skill === "word"
        ? "Compiling document"
        : brief.skill === "excel"
        ? "Structuring spreadsheet"
        : "Checking for a connected Canva account";

    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Spinner size={16} />
            <span className="text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
              Building it now
            </span>
          </div>
          <ul className="space-y-1.5 text-[13px] pl-6" style={{ color: "var(--text-3)" }}>
            <li className="flex items-center gap-2">
              <Check size={12} style={{ color: BRAND.green }} /> Applied brand kit and template
            </li>
            <li className="flex items-center gap-2">
              <Check size={12} style={{ color: BRAND.green }} /> Structured layout
            </li>
            <li className="flex items-center gap-2" style={{ color: "var(--text-1)" }}>
              {stepLabel}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  /* --- The finished file --- */
  if (message.type === "result") {
    const meta = SKILL_META[brief.skill] || {
      icon: FileText,
      note: "Generated directly, no design connector needed",
    };
    const Icon = meta.icon;

    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-[15.5px] mb-4" style={{ color: "var(--text-1)" }}>
            Done. Here is your result.
          </p>
          <div
            className="aspect-[4/3] rounded-[14px] border flex flex-col items-center justify-center gap-2 mb-2"
            style={{
              borderColor: "var(--border)",
              background: "linear-gradient(135deg, var(--surface-2), var(--surface))",
            }}
          >
            <Icon size={24} style={{ color: BRAND.navy }} />
            <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
              {brief.template}
            </span>
          </div>
          <p className="text-[11.5px] mb-4" style={{ color: "var(--text-3)" }}>
            {meta.note}
          </p>
          <div className="flex gap-3">
            <PrimaryButton className="flex items-center gap-2 text-[13.5px] px-4">
              <Download size={14} />
              Download
            </PrimaryButton>
            <GhostButton onClick={onReset}>Start something new</GhostButton>
          </div>
        </div>
      </div>
    );
  }

  /* --- Staff message --- */
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
                  style={{
                    backgroundColor: "var(--chip)",
                    borderColor: "var(--border)",
                    color: "var(--text-2)",
                  }}
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
              style={{
                backgroundColor: "var(--chip)",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
            >
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --- Assistant text --- */
  return (
    <div style={riseStyle}>
      <p className="text-[15.5px] leading-relaxed max-w-[85%]" style={{ color: "var(--text-1)" }}>
        {message.content}
      </p>
      <div className="flex items-center gap-1 mt-2.5 -ml-1.5">
        <IconBtn active={feedback === "up"} onClick={() => onFeedback("up")} activeColor={BRAND.green} label="Good response">
          <ThumbsUp size={14} />
        </IconBtn>
        <IconBtn active={feedback === "down"} onClick={() => onFeedback("down")} activeColor={BRAND.red} label="Bad response">
          <ThumbsDown size={14} />
        </IconBtn>
        <IconBtn label="Retry">
          <RotateCw size={14} />
        </IconBtn>
        <IconBtn label="Share">
          <Share2 size={14} />
        </IconBtn>
        <IconBtn onClick={onCopy} label="Copy">
          <Copy size={14} />
        </IconBtn>
        <IconBtn label="More">
          <MoreHorizontal size={14} />
        </IconBtn>
      </div>
    </div>
  );
}
