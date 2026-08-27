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
  Copy,
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
  MAX_TEXT_UPLOAD_KB,
  MAX_IMAGE_UPLOAD_KB,
  MAX_FILES_PER_MESSAGE,
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

/* --------------------------------------------------------------------------
   HANDSHAKE MARKERS
   The app cannot read the model's mind, so the model says when it is done
   by ending its last message with a word nobody would type. That word is
   never shown. It is stripped here, including while it is still arriving
   one character at a time, so it never flashes on screen and then vanishes.
   -------------------------------------------------------------------------- */

const MARKER = {
  interviewDone: "INTERVIEW_COMPLETE",
  needInput: "NEED_INPUT",
  readbackDone: "READBACK_COMPLETE",
};

const MARKER_WORDS = Object.values(MARKER);

function visibleText(raw) {
  let out = raw;
  for (const word of MARKER_WORDS) out = out.split(word).join("");

  /* A marker arrives in pieces. Anything trailing that could still grow
     into one is held back for a beat rather than shown and yanked away. */
  const tail = out.match(/[A-Z_]+$/);
  if (tail && MARKER_WORDS.some((word) => word.startsWith(tail[0]) && word !== tail[0])) {
    out = out.slice(0, out.length - tail[0].length);
  }

  return out.replace(/\s+$/, "");
}

/* --------------------------------------------------------------------------
   FILES HANDED OVER IN THE CHAT
   One of the ways a fact is allowed to reach a draft. The others are the
   company's own approved sources and what the person types. There is no
   fourth: the assistant cannot search, cannot open a link, and cannot go
   and fetch anything.

   So a file only counts once its text is actually in the turn. Anything
   this cannot read says so on the chip rather than sitting there looking
   attached, because a file that appears attached but never arrives is how
   a confident, invented draft gets written.
   -------------------------------------------------------------------------- */

/* Formats a browser can turn into text on its own. A PDF or a Word file
   needs a parser that does not exist here yet, and pretending otherwise
   would be the exact lie this is guarding against. */
const READABLE_EXTENSIONS = ["txt", "md", "markdown", "csv", "tsv", "json", "log", "rtf"];

/* Images the model can genuinely see. This is what makes "screenshot the
   part that shows the figure" a real instruction rather than a dead end. */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];

/* Roughly ten thousand tokens per file, and sixty thousand characters
   across one message however the files are split. Enough for anything a
   person pastes in during a conversation, small enough that four of them
   cannot quietly eat the context or the budget. */
const MAX_FILE_CHARS = 40000;
const MAX_TURN_CHARS = 60000;

/* The long edge the model works at anyway. Anything bigger is downscaled
   before it is looked at, so sending a 4000 pixel screenshot only costs
   upload time and buys nothing. Shrinking to this first is free quality:
   what arrives is exactly what the model would have seen.

   It matters more than it sounds. An image costs about width times height
   over 750 in tokens, so a full size phone screenshot runs into thousands
   of tokens, resent on every single turn. Shrunk, a screenshot is about
   fifteen hundred. */
const MAX_IMAGE_EDGE = 1568;
const IMAGE_QUALITY = 0.85;

function fileKind(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (READABLE_EXTENSIONS.includes(ext)) return "text";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  return "unreadable";
}

/* Draws the image smaller and re-encodes it. Done here, in the browser,
   because a five megabyte photo that becomes two hundred kilobytes before
   it leaves the device is faster for them and cheaper for the company, and
   the model sees no difference. */
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const longest = Math.max(img.width, img.height);
      const scale = longest > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longest : 1;
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
      const data = dataUrl.split(",")[1] ?? "";
      if (!data) {
        reject(new Error("empty canvas"));
        return;
      }
      resolve({ media_type: "image/jpeg", data, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image this browser can open"));
    };

    img.src = url;
  });
}

/* The turn as the model receives it. Plain text when nothing was attached
   or only text files were, so the common case stays a simple string.
   Images make it a list of blocks, pictures first, which is the order the
   API wants and the order that reads correctly: here is what I am looking
   at, and here is what I am asking about it. */
function buildTurnContent(text, attachments) {
  const ready = attachments.filter((a) => a.status === "ready");
  const textFiles = ready.filter((a) => a.text);
  const imageFiles = ready.filter((a) => a.image);

  let budget = MAX_TURN_CHARS;
  const blocks = [];

  for (const a of textFiles) {
    if (budget <= 0) break;
    const slice = a.text.slice(0, budget);
    budget -= slice.length;
    const cut = a.truncated || slice.length < a.text.length;
    blocks.push(
      `--- FILE: ${a.name}${cut ? " (first part only, it was too long to include in full)" : ""} ---\n` +
        `${slice}\n` +
        "--- END FILE ---"
    );
  }

  const written = [text, ...blocks].filter(Boolean).join("\n\n");

  if (!imageFiles.length) return written;

  return [
    ...imageFiles.map((a) => ({
      type: "image",
      source: { type: "base64", media_type: a.image.media_type, data: a.image.data },
    })),
    {
      type: "text",
      text: written || `Here is ${imageFiles.map((a) => a.name).join(" and ")}.`,
    },
  ];
}

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

function buildGreetingText() {
  const phrase = timePhrase();
  const opener = phrase.kind === "greeting" ? `${phrase.word}, ${CURRENT_USER.name}.` : `Hi ${CURRENT_USER.name}.`;
  return `${opener} What are we working on today?`;
}

/* A filename from the first thing the staff member asked for. Better than
   "document" and better than making them name it before they have seen it. */
function docTitle(messages) {
  const first = messages.find((m) => m.role === "user" && m.content?.trim());
  if (!first) return "Untitled";
  return first.content.trim().replace(/\s+/g, " ").slice(0, 60);
}

function slugForFile(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "document";
}

/* Hands the finished document over as a real file. Built in the browser
   from text already on screen, so there is no round trip and nothing to
   store server side, which is the point: the chat is not a filing
   cabinet. */
function downloadDocument(title, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugForFile(title)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const [greetingText, setGreetingText] = useState(() => buildGreetingText());

  /* Usage and feedback */
  const [dailyUsed, setDailyUsed] = useState(0);
  const [feedback, setFeedback] = useState({});

  /* Attachments */
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadError, setUploadError] = useState("");

  /* Library */
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  /* Starts empty on purpose. It used to hold two invented files marked as
     synced to a Drive nobody has connected, which is a small lie sitting
     in the sidebar of a product whose whole argument is that it does not
     make things up. */
  const [libraryFiles, setLibraryFiles] = useState([]);

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

  /* Stops a second Build press stacking a second paid generation. */
  const [generating, setGenerating] = useState(false);

  /* Where the conversation is in the flow. This is the stage the next turn
     runs at, which is also what decides the model, so it is the difference
     between a cheap question and an expensive one.

       interview  the cheap model, asking a few short questions
       analyse    the stronger model, reading the company sources, either
                  coming back for something missing or reading the brief back

     It moves up by itself the moment the interview model says it is done.
     Nobody presses anything to make that happen. */
  const [flowStage, setFlowStage] = useState("interview");

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

    /* Two versions of the same turn. `content` is what the person sees, a
       short line and a file chip. `apiContent` is that plus the actual
       contents of anything readable they attached, which is the only way a
       file they handed over becomes something the model can work from
       rather than a name it has to guess about. */
    const attachments = pendingAttachments;
    const apiContent = buildTurnContent(text, attachments);

    addMessage({ role: "user", type: "text", content: text, apiContent, attachments });
    setInput("");
    setPendingAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (apiContent?.length) handleUserReply(text, apiContent);
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

     One function runs every turn, whatever stage it is. The stage is what
     changes: it picks the model and the instruction, and the server caps it
     against what this staff member is allowed. */
  function runTurn(stage, history) {
    setTyping(true);

    /* The bubble the reply streams into. Created empty and filled as
       chunks arrive, so words appear rather than a spinner resolving into
       a wall of text. */
    const replyId = nextId();
    let started = false;
    let raw = "";

    abortTurnRef.current = sendTurn({
      stage,
      messages: history,

      onMeta: ({ tier }) => setActiveTier(tier),

      onText: (chunk) => {
        raw += chunk;
        if (!started) {
          started = true;
          setTyping(false);
          setMessages((prev) => [...prev, { id: replyId, role: "assistant", type: "text", content: "" }]);
        }
        const shown = visibleText(raw);
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: shown } : m)));
      },

      onDone: () => {
        setTyping(false);
        abortTurnRef.current = null;

        const clean = visibleText(raw);
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: clean } : m)));

        /* The conversation has what it came for. Move up a tier and go
           straight into the check, without the staff member pressing
           anything. From their side they answered a question and the next
           thing they see is a read back. */
        if (stage === "interview" && raw.includes(MARKER.interviewDone)) {
          setFlowStage("analyse");
          runTurn("analyse", [...history, { role: "assistant", content: clean }]);
          return;
        }

        if (stage === "analyse") {
          /* It read the sources and found a hole. Anything that needs a
             person is a conversation, so it drops back to the cheap model
             for the back and forth rather than charging Sonnet rates to
             collect a file name. It comes back up the moment that
             conversation says it is done. */
          if (raw.includes(MARKER.needInput)) {
            setFlowStage("interview");
            return;
          }

          /* Nothing missing. This is the read back, and it is the only
             thing that earns the Build card. */
          if (raw.includes(MARKER.readbackDone)) {
            setMessages((prev) => [...prev, { id: nextId(), role: "assistant", type: "build" }]);
          }
        }
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

  function handleUserReply(text, apiContent = text) {
    /* Skill detection still runs locally. It is a badge, not a decision,
       and guessing it instantly beats waiting on a round trip to show it. */
    const guessed = SKILL_BY_TYPE[guessProjectType(text)];
    if (guessed && !autoSkill) setAutoSkill(guessed);

    /* Anything typed after a read back is a correction, and a correction is
       a conversation, so it drops back to the cheap model. Working it out
       here rather than reading it back off state matters: setting state
       does not change it in time for the line below. */
    setMessages((prev) => prev.filter((m) => m.type !== "build"));
    const stage = flowStage === "analyse" ? "interview" : flowStage;
    if (stage !== flowStage) setFlowStage(stage);

    runTurn(stage, toApiMessages([...messages, { role: "user", content: apiContent }]));
  }

  /* ------------------------------------------------------------------------
     4. GENERATION
     Runs once the staff member confirms the brief. The finished file is
     written to their Drive rather than kept in the chat.
     ------------------------------------------------------------------------ */

  /* The moment the conversation becomes a deliverable. Same function as
     the interview, different stage, which is what moves it up to a model
     that can actually write the thing.

     The instruction is appended as a normal user turn rather than being
     hidden in the system prompt, because everything agreed in the
     conversation above is the brief. Restating it would risk contradicting
     it. */
  function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setMessages((prev) => prev.filter((m) => m.type !== "build"));

    const resultId = nextId();
    let started = false;
    let finished = "";

    const history = toApiMessages([
      ...messages,
      {
        role: "user",
        content:
          "Write the finished piece now, in full, based on everything agreed above. " +
          "Output only the document itself, formatted with markdown headings and lists. " +
          "No preamble, no explanation of what you are about to do, no closing commentary.",
      },
    ]);

    addMessage({ role: "assistant", type: "generating" });

    abortTurnRef.current = sendTurn({
      stage: "generate",
      messages: history,

      onMeta: ({ tier }) => setActiveTier(tier),

      onText: (chunk) => {
        finished += chunk;
        if (!started) {
          started = true;
          setMessages((prev) => [
            ...prev.filter((m) => m.type !== "generating"),
            { id: resultId, role: "assistant", type: "result", content: "", title: docTitle(messages) },
          ]);
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === resultId ? { ...m, content: m.content + chunk } : m))
        );
      },

      onDone: () => {
        setGenerating(false);
        abortTurnRef.current = null;
        setDailyUsed((n) => Math.min(n + 1, DAILY_LIMIT));

        /* Into the library, so it is somewhere other than this one
           conversation. driveSynced stays false because Drive is not
           connected, and claiming otherwise would be a lie in the UI. */
        setLibraryFiles((prev) => [
          {
            id: nextId(),
            title: docTitle(messages),
            skill: autoSkill,
            driveSynced: false,
            when: "Just now",
            content: finished,
          },
          ...prev,
        ]);
      },

      onError: ({ reason, message }) => {
        setGenerating(false);
        abortTurnRef.current = null;
        setMessages((prev) => [
          ...prev.filter((m) => m.type !== "generating"),
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

  /* Throw away a reply and ask for another one. Everything before it is
     untouched, so this is the same turn again rather than a new question,
     which is what a person means when they press it. */
  function handleRetry(messageId) {
    if (typing || generating) return;
    const index = messages.findIndex((m) => m.id === messageId);
    if (index < 0) return;

    const before = messages.slice(0, index);
    setMessages(before);
    runTurn(flowStage, toApiMessages(before));
  }

  /* "Something needs changing" is not a stage of its own. It just takes the
     card away, puts them back in conversation, and hands them the cursor.
     What they type next is the correction, and the loop carries it back up
     to the analysis by itself. */
  function handleAdjust() {
    setMessages((prev) => prev.filter((m) => m.type !== "build"));
    setFlowStage("interview");
    textareaRef.current?.focus();
  }

  function handleNewChat() {
    abortTurnRef.current?.();
    abortTurnRef.current = null;
    setTyping(false);
    setActiveTier(null);
    setMessages([]);
    setGreetingText(buildGreetingText());
    setFlowStage("interview");
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

    /* Counted against what is already staged, not against this batch, so
       picking two then two more hits the same wall as picking four. */
    let room = MAX_FILES_PER_MESSAGE - pendingAttachments.length;
    if (files.length > room) {
      showUploadError(
        room > 0
          ? `You can attach ${MAX_FILES_PER_MESSAGE} files at a time. Taking the first ${room}.`
          : `You already have ${MAX_FILES_PER_MESSAGE} files attached. Send these first.`
      );
    }

    files.forEach((file) => {
      if (room <= 0) return;

      const sizeKB = Math.round(file.size / 1024);
      const kind = fileKind(file.name);

      /* Pictures get the generous cap and text gets the strict one. A
         picture shrinks to almost nothing before it is sent, so its size
         on disk barely matters. Text does not shrink, so a file far past
         what we can read would be accepted and then mostly ignored, and
         being told no is better than being quietly half heard. */
      const capKB = kind === "image" ? MAX_IMAGE_UPLOAD_KB : MAX_TEXT_UPLOAD_KB;
      if (kind !== "unreadable" && sizeKB > capKB) {
        showUploadError(
          kind === "image"
            ? `${file.name} is ${(sizeKB / 1024).toFixed(1)} MB, over the ${Math.round(
                capKB / 1024
              )} MB limit for a picture.`
            : `${file.name} is ${sizeKB} KB, over the ${capKB} KB limit for a text file. Paste the part that matters instead, or split it up.`
        );
        return;
      }

      room -= 1;
      const id = nextId();

      /* A file type nothing here can actually open. Saying so now is the
         whole point: a chip that claims a file is ready when its contents
         never reach the model is how a draft ends up invented. */
      if (kind === "unreadable") {
        setPendingAttachments((prev) => [
          ...prev,
          { id, name: file.name, sizeKB, status: "unreadable" },
        ]);
        return;
      }

      setPendingAttachments((prev) => [...prev, { id, name: file.name, sizeKB, status: "reading" }]);

      if (kind === "image") {
        shrinkImage(file)
          .then((image) => {
            setPendingAttachments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, status: "ready", image } : a))
            );
          })
          .catch(() => {
            setPendingAttachments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, status: "unreadable" } : a))
            );
          });
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const full = String(reader.result ?? "");
        const text = full.slice(0, MAX_FILE_CHARS);
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "ready", text, truncated: full.length > MAX_FILE_CHARS }
              : a
          )
        );
      };

      reader.onerror = () => {
        setPendingAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "unreadable" } : a))
        );
      };

      reader.readAsText(file);
    });
  }

  function showUploadError(message) {
    setUploadError(message);
    setTimeout(() => setUploadError(""), 5500);
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
                  onClick={() => downloadDocument(f.title, f.content)}
                  className="w-full flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:opacity-80"
                  style={{ backgroundColor: "var(--surface)" }}
                  title="Download again"
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
                onAdjust={handleAdjust}
                onReset={handleNewChat}
                onRetry={() => handleRetry(m.id)}
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
                  {a.status === "reading" ? (
                    <Spinner size={12} />
                  ) : a.status === "ready" ? (
                    <span className="flex items-center gap-1 shrink-0" style={{ color: BRAND.green }}>
                      <Check size={12} />
                      {a.truncated ? "Part read" : "Read"}
                    </span>
                  ) : (
                    <span className="shrink-0" style={{ color: BRAND.amber }}>
                      Cannot read
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

function ChatBubble({ message, brief, onGenerate, onAdjust, onReset, onRetry, feedback, onFeedback, onCopy }) {
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

  /* --- Ready to build ---
     Only ever rendered after a read back the person has just seen, so it
     is the one moment where pressing a button spends real money on their
     behalf and they know exactly what for. */
  if (message.type === "build") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* The question first, then what each answer does, then the two
              buttons in the same words. Someone who has never seen this
              screen should not have to work out what the buttons mean. */}
          <p className="text-[15.5px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
            Did I get that right?
          </p>
          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            If yes, go ahead and build. If not, tell me what is missing.
          </p>
          <PrimaryButton onClick={onGenerate} className="w-full flex items-center justify-center gap-2">
            <FileText size={15} />
            Go ahead, build it
          </PrimaryButton>
          <button
            onClick={onAdjust}
            className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            Something is missing
          </button>
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
  /* The real document, on screen, as it is written. No placeholder
     preview: what is in this box is exactly what downloads. */
  if (message.type === "result") {
    const title = message.title || "Your document";

    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} style={{ color: BRAND.accentSoft }} />
            <span className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {title}
            </span>
          </div>

          <div
            className="rounded-[14px] border p-4 mb-4 max-h-[380px] overflow-y-auto"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
          >
            <pre
              className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans"
              style={{ color: "var(--text-2)" }}
            >
              {message.content}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton
              onClick={() => downloadDocument(title, message.content)}
              className="flex items-center gap-2 text-[13.5px] px-4"
            >
              <Download size={14} />
              Download
            </PrimaryButton>
            <GhostButton onClick={() => navigator.clipboard?.writeText(message.content)}>
              Copy
            </GhostButton>
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
              className="rounded-[20px] px-4 py-2.5 text-[15.5px] leading-relaxed border whitespace-pre-wrap"
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

  /* --- Assistant text ---
     Line breaks are kept. A read back is a list of four short things, and
     collapsing it into one paragraph is what turns the moment that proves
     it understood into a block nobody reads. */
  return (
    <div style={riseStyle}>
      <p
        className="text-[15.5px] leading-relaxed max-w-[85%] whitespace-pre-wrap"
        style={{ color: "var(--text-1)" }}
      >
        {message.content}
      </p>
      <div className="flex items-center gap-1 mt-2.5 -ml-1.5">
        <IconBtn active={feedback === "up"} onClick={() => onFeedback("up")} activeColor={BRAND.green} label="Good response">
          <ThumbsUp size={14} />
        </IconBtn>
        <IconBtn active={feedback === "down"} onClick={() => onFeedback("down")} activeColor={BRAND.red} label="Bad response">
          <ThumbsDown size={14} />
        </IconBtn>
        <IconBtn onClick={onRetry} label="Try that again">
          <RotateCw size={14} />
        </IconBtn>
        <IconBtn onClick={onCopy} label="Copy">
          <Copy size={14} />
        </IconBtn>
      </div>
    </div>
  );
}
