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
  History,
  LogOut,
  ChevronRight,
  Menu,
  MessagesSquare,
  PenSquare,
  Mic,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Copy,
  File as FileIcon,
  User,
  AlertCircle,
  UploadCloud,
  LayoutGrid,
  Library,
  Cloud,
  ExternalLink,
  Search,
  Globe,
  Shield,
  LifeBuoy,
  Info,
} from "lucide-react";

import { LogoMark } from "../shared/icons.jsx";
import { useSpeechToText } from "../shared/useSpeechToText.js";
import { sendTurn, toApiMessages } from "../shared/assistantApi.js";
import {
  loadMe,
  listWork,
  saveWork,
  listConversations,
  loadConversation,
  saveConversation,
  signOutCompletely,
} from "../shared/session.js";
import { readFileAsText, fileKind } from "../shared/readFile.js";
import { shrinkImage } from "../shared/shrinkImage.js";
import { askCanva } from "../shared/canvaApi.js";
import { downloadPdf, downloadDocx } from "../shared/download.js";
/* Each in its own file, and each loaded only when somebody actually asks
   for that format. The deck and spreadsheet libraries are megabytes, and
   a person who only ever makes reports should not download either one to
   open the chat. */
import { downloadPptx } from "../shared/downloadDeck.js";
import { downloadXlsx } from "../shared/downloadSheet.js";
import { toTables } from "../shared/structure.js";
import DocumentView from "../shared/DocumentView.jsx";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import {
  PageShell,
  FloatingNav,
  ThemeToggle,
  TypewriterText,
  Thinking,
  IconBtn,
  PrimaryButton,
  GhostButton,
  Spinner,
  StatusPill,
} from "../shared/ui.jsx";
import {
  assistantNameFor,
  DAILY_LIMIT,
  MAX_SOURCE_UPLOAD_KB,
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

/* The resume log. One small note per conversation saying where the work had
   got to, so somebody who walks away at lunch and comes back the next day
   gets their approved findings and their spent question allowance back, not
   just the messages. The shape lives in that file, never inline here. */
import { buildResumeLog, readResumeLog, resumeLine } from "../shared/resumeLog.js";

/* Gate two, in its own file. It grew a list and local state of its own the
   day it learned to keep some findings and not others, and a card with
   state belongs somewhere it can be read top to bottom. */
import FindingPicker from "../shared/FindingPicker.jsx";
import { withoutMarks } from "../shared/findings.js";

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
  offerInterview: "OFFER_INTERVIEW",
  needLookup: "NEED_LOOKUP",
  interviewDone: "INTERVIEW_COMPLETE",
  needInput: "NEED_INPUT",
  readbackDone: "READBACK_COMPLETE",
};

const MARKER_WORDS = Object.values(MARKER);

/* --------------------------------------------------------------------------
   WHAT THE RETURN KEY DOES
   At a laptop, Enter sends and Shift Enter makes a new line, which is what
   anybody typing at a keyboard expects. A phone has no Shift to hold, so
   Enter sending there leaves no way at all to write a second line. On a
   touch screen Enter makes the line, and the send button is the only thing
   that sends.
   -------------------------------------------------------------------------- */

const HAS_KEYBOARD =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* How many questions the interview gets before the app takes the decision
   out of its hands. The prompt asks for three to five. This is the line
   that makes it true: a model that keeps finding one more thing to ask is
   stopped here rather than trusted to stop itself. */
const MAX_INTERVIEW_TURNS = 5;

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

/* The encoder itself lives in src/shared/shrinkImage.js now, because the
   admin knowledge base needs the identical one for brand assets, and two
   copies of an encoder is two copies that drift. The quality it uses, the
   WebP fallback and the reason for both are in that file's header.

   The 1568 above stays here, because it is this screen's answer rather
   than a shared one: it is the long edge the model works at, so anything
   bigger costs upload time and buys nothing. A brand asset is kept larger
   because it goes into things that get printed and projected. */

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

/* "REPORT" IS NOT A SPREADSHEET, fixed 2026-09-21.

   It used to sit in the finance line, so "write me a one page report for
   the board" put "Excel mode" in the header of a Word document. The badge
   is only a badge, the Word button is always there and still works, but a
   screen that labels itself wrongly is a screen nobody trusts.

   Most people saying report mean something written. A spreadsheet is what
   they ask for when they say spreadsheet, budget, forecast, or numbers, so
   those are what the finance line looks for now. */
function guessProjectType(text) {
  const t = text.toLowerCase();
  if (t.includes("pitch") || t.includes("deck") || t.includes("presentation")) return "deck";
  if (
    t.includes("spreadsheet") || t.includes("finance") || t.includes("budget") ||
    t.includes("forecast") || t.includes("numbers") || t.includes("revenue")
  )
    return "finance";
  if (t.includes("social") || t.includes("post") || t.includes("graphic")) return "social";
  if (
    t.includes("proposal") || t.includes("report") || t.includes("one pager") ||
    t.includes("one-pager")
  )
    return "proposal";
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

/* Short, and it uses their name only when it knows it. "Good evening,
   Anthony." once signed in, "Good evening." while the page is still
   finding out. Never a stranger's name, and never a paragraph. */
function buildGreetingText(name) {
  const phrase = timePhrase();
  const greeting = phrase.kind === "greeting" ? phrase.word : "Hi";
  const opener = name ? `${greeting}, ${name}.` : `${greeting}.`;
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
/* The finished work leaves as a PDF or a Word file. It used to leave as
   Markdown, which is a text file full of hashes and stars: fine in a code
   editor, and nothing a phone will even open. A document nobody can open
   is not a document. Both writers live in shared/download.js and load only
   when a button is pressed. */

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
  /* Empty until we know who is signed in. It used to start without a name
     and be set again a moment later with one, and the typewriter took that
     as new text and typed the whole greeting a second time. */
  const [greetingText, setGreetingText] = useState("");

  /* Usage and feedback */
  const [dailyUsed, setDailyUsed] = useState(0);
  const [feedback, setFeedback] = useState({});
  const [toast, setToast] = useState("");

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

  /* WHAT IT SAYS WHILE IT WORKS.

     Anthony, 2026-09-10: "if it's still thinking or analyzing, there's no
     way a person knows... so a person can know it's still working and wait
     for it." Three grey dots cannot tell anybody whether it has been
     reading for two seconds or has been dead for two minutes, and the only
     safe reading of that is to press the button again.

       turnStage  which stage is running right now. NOT flowStage: that is
                  the stage the NEXT turn will run at, and the two differ
                  exactly when it matters, because runTurn("research") is
                  fired while flowStage says "analyse".
       stalled    the request has gone quiet for a long time. Set from
                  sendTurn's onStall, which knows how long quiet has been,
                  and cleared the moment anything arrives. */
  const [turnStage, setTurnStage] = useState("orient");
  const [stalled, setStalled] = useState(false);

  /* Which model actually ran the last turn, reported by the server rather
     than assumed here. The ladder is a real feature, so it gets shown. */
  const [activeTier, setActiveTier] = useState(null);

  /* Lets a turn be cancelled. Leaving the page or sending again while one
     is still streaming would otherwise keep it running and billing. */
  const abortTurnRef = useRef(null);

  /* How many questions the interview has asked in this run. Reset every
     time the work moves up a stage, so a correction after a read back
     gets its own short conversation rather than inheriting a spent
     allowance. */
  const interviewTurnsRef = useRef(0);

  /* HOW MANY TIMES THE FIRST TURN HAS ASKED TO GO AND LOOK, and it is
     allowed exactly one.

     The first turn is the only stage with no way out of its own. It leaves
     by offering the interview, and nothing else moves it. So a turn that
     ends by asking to search instead of offering has spent the turn and
     left the person where they started. Once is a reasonable thing to ask
     before agreeing the work. Twice is somebody stuck on the first screen,
     which is what happened between 2026-09-16 and 2026-09-21. After one,
     the offer goes up regardless. */
  const orientLookupsRef = useRef(0);

  /* Stops a second Build press stacking a second paid generation. */
  const [generating, setGenerating] = useState(false);

  /* WHAT WAS FOUND OUTSIDE AND ACCEPTED, one entry per thing they ticked.

     Anthony, 2026-09-10: "if they are giving a go-ahead, it can add the
     information and use it. Otherwise, if there is no go-ahead, it should
     not add it."

     So a rejected finding is never stored. It is not kept and greyed out,
     it does not sit in a list somewhere waiting to be reconsidered. It is
     dropped, and the only thing that ever leaves this browser is what
     somebody said yes to. */
  const [findings, setFindings] = useState([]);
  const findingsRef = useRef([]);

  /* THE THREE THINGS THE RESUME LOG NEEDS THAT NOTHING ELSE HELD.

     All three used to live only in this component, so closing the tab lost
     them silently while the messages came back looking complete.

       briefRef     the read back they confirmed, frozen at the moment they
                    pressed Build. The column was written and never read.
       declinedRef  how many outside findings they turned down. A count and
                    never the text, because a refused finding is not stored.
       missingRef   the last thing it said it still needs from them, so a
                    returning person is not asked to work out where they
                    were. Cleared the moment the read back lands. */
  const briefRef = useRef("");
  const declinedRef = useRef(0);
  const missingRef = useRef("");

  /* Where the conversation is in the flow. This is the stage the next turn
     runs at.

       orient     reads the request and the whole company knowledge base,
                  says what it already has, and offers the interview
       offered    not a stage the server knows about. It means the offer is
                  on screen and we are waiting for an answer.
       interview  asking a few short questions
       analyse    reading back what it understood, or coming back for
                  something that is genuinely missing

     THE ENTRY POINT USED TO BE THE INTERVIEW AND IT WAS BLIND. It could see
     the names of the company's files and nothing inside them, so it asked
     people for things their own company had already written down. Now the
     first turn reads everything, and the interview is offered rather than
     imposed.

     It moves up by itself. Nobody presses anything except at the offer and
     at the read back, which are the two moments that are genuinely theirs. */
  const [flowStage, setFlowStage] = useState("orient");

  /* Who is actually signed in, and which company this workspace belongs
     to. Until this arrives the page falls back to the config defaults, so
     it renders rather than flashing empty, but a real session replaces
     both. Without it a workspace built for Amara greeted its own admin as
     a different company entirely. */
  const [me, setMe] = useState(null);

  /* The row this conversation is being written to, and the few most
     recent ones offered in the sidebar. Held in a ref as well as state
     because a save fires from inside a stream callback, where reading
     state would give whatever it was when the turn started. */
  const conversationIdRef = useRef(null);
  const [recentChats, setRecentChats] = useState([]);

  /* The current conversation, readable from inside a stream callback
     without going through a state updater. */
  const messagesRef = useRef([]);

  const companyName = me?.company?.name ?? "";
  const assistantName = assistantNameFor(companyName);
  const personName = me?.staff?.name?.split(" ")[0] ?? "";
  const personRole = me?.staff?.role ?? "";

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

  /* Identity first, then everything this person has already made. The
     library used to live only in this tab, so a refresh threw away work
     somebody had spent real money generating. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const who = await loadMe();
      if (!alive) return;

      /* No session in this browser. The workspace is real and waiting in
         the database; what is missing is proof of who is asking. */
      if (!who) {
        navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`, { replace: true });
        return;
      }

      setMe(who);

      const recent = await listConversations(who.user.id);
      if (!alive) return;
      setRecentChats(recent);

      /* Land back in the conversation they were last in, rather than on a
         blank page with their work one menu away. A refresh, a dead
         battery or a second phone should all feel like picking the thread
         back up, which is the whole reason conversations are saved. */
      let restored = false;
      const latest = recent[0];
      if (latest && !conversationIdRef.current) {
        const row = await loadConversation(latest.id);
        if (!alive) return;
        if (row) {
          restoreFrom(row);
          restored = true;
        }
      }

      /* THE GREETING WAITS UNTIL WE KNOW THERE IS NOTHING TO GO BACK TO.

         It used to be set the moment the person loaded, before their
         history had even been fetched. So signing in typed out "Good
         evening, Anthony" letter by letter, and then their last
         conversation arrived and replaced it mid sentence. Two things
         competing for the same space, and the one that lost was the one
         that had already started.

         A greeting belongs to a blank page. Somebody picking a thread back
         up is not arriving, they are returning, and being greeted for it
         reads as software that was not paying attention. handleNewChat
         still greets, because that genuinely is a fresh start. */
      if (!restored) {
        setGreetingText(buildGreetingText(who.staff?.name?.split(" ")[0]));
      }

      if (who.company?.id) {
        const work = await listWork(who.company.id);
        if (!alive) return;
        setLibraryFiles(
          work.map((w) => ({
            id: w.id,
            title: w.title,
            skill: w.skill,
            savedToStorage: false,
            when: new Date(w.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            content: w.summary,
          }))
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  /* A stream left running after the page is gone still costs money and
     still counts against the company's budget. Cut it. */
  useEffect(() => () => abortTurnRef.current?.(), []);

  /* The mic control disappears once step reaches 3, stop listening with it
     rather than leaving a session open with nothing showing it is live. */
  useEffect(() => {
    if (step >= 3 && listening) stopListening();
  }, [step, listening, stopListening]);

  /* The toast takes itself off screen. Long enough to read one word,
     short enough that it is gone before it is in the way. */
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);

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

  /* One way in, and the ref is updated in the same breath as the state.
     React batches state, so a stream callback reading `messages` sees
     whatever it was when the turn started, and a save built from that is
     a save that is one turn short. This is the fix, and it is why nothing
     below calls setMessages directly. */
  function updateMessages(next) {
    const value = typeof next === "function" ? next(messagesRef.current) : next;
    messagesRef.current = value;
    setMessages(value);
    return value;
  }

  function addMessage(msg) {
    updateMessages((prev) => [...prev, { id: nextId(), ...msg }]);
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
    setTurnStage(stage);
    setStalled(false);

    /* The bubble the reply streams into. Created empty and filled as
       chunks arrive, so words appear rather than a spinner resolving into
       a wall of text. */
    const replyId = nextId();
    let started = false;
    let raw = "";

    abortTurnRef.current = sendTurn({
      stage,

      /* The server cannot count this from the messages: the orient turn and
         every turn of an earlier interview are in there too. This is the
         app's own counter, which resets whenever the work moves up. */
      askedSoFar: interviewTurnsRef.current,

      /* Read from the ref rather than from state, because a turn can be
         fired in the same tick that a finding was accepted and state has
         not caught up yet. The ref is written first, so it is the one that
         is always right. */
      findings: findingsRef.current.join("\n\n"),

      messages: history,

      onMeta: ({ tier }) => setActiveTier(tier),

      /* Quiet for a long time. The turn is still running, so this only
         changes what the line says. Nothing is cancelled here. */
      onStall: () => setStalled(true),

      onText: (chunk) => {
        raw += chunk;
        setStalled(false);
        if (!started) {
          started = true;
          setTyping(false);
          updateMessages((prev) => [...prev, { id: replyId, role: "assistant", type: "text", content: "" }]);
        }
        const shown = visibleText(raw);
        updateMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: shown } : m)));
      },

      onDone: ({ stopReason } = {}) => {
        setTyping(false);
        setStalled(false);
        abortTurnRef.current = null;

        const clean = visibleText(raw);

        /* A REPLY THAT RAN OUT OF ROOM IS NEVER HANDED OVER AS FINISHED.

           Every stage has a ceiling on how much it may write (MAX_OUTPUT in
           the assistant function). When a reply reaches that ceiling the
           model is cut off wherever it happens to be, which is usually mid
           sentence, and the turn still ends with a clean "done". Nothing
           here read that, so a chopped answer looked exactly like a
           finished one.

           Anthony hit it on 2026-09-16: the reply stopped at "that only
           happens if you press the" and the app presented it as the whole
           answer. The ceilings were raised, but a ceiling can always be
           reached, so the reply now carries a flag and says so on screen. */
        const cutOff = stopReason === "max_tokens";

        /* Built from the ref rather than inside a state updater. An
           updater has to be pure, and React deliberately calls it twice
           in development to catch exactly this: a save fired from inside
           one wrote the conversation to the database twice. */
        const next = updateMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: clean, cutOff } : m))
        );
        persist(next, stage);

        /* NO EARLY RETURN HERE, and that was a mistake on 2026-09-16.

           A reply cut off at the ceiling cannot carry a final marker, so
           the checks below simply do not match and the stage stays where it
           is. Returning early did the same thing whilst also skipping the
           interview counter, and it hid the fact that the real problem is
           being stuck rather than being chopped. The note on screen is what
           tells them; the flow carries on as normal. */

        /* THE OFFER. The first turn has read the request and the whole of
           the company's material, and has said what it already has. Now it
           asks whether they want to be interviewed.

           Two buttons rather than a sentence to answer, because a question
           with no visible answers is a question people ignore. Typing works
           too, and handleSend below sends that into the interview.

           No marker means it was not a piece of work, just conversation.
           The stage stays where it is and it reads again next time. */
        /* GATE ONE, AND WHERE IT IS ALLOWED TO INTERRUPT.

           Anthony, 2026-09-16: "I tried to tell it to search for something,
           which is supposed to spin up this thing for me to select, for me
           to approve, and then it will search. It doesn't only spin up when
           it decides. It can also spin up for me to approve when I decide."

           So it may be raised from more than the analysis, and it is, below.
           But it is raised INSIDE each stage and after that stage's own
           handshake, never above all of them.

           WHY, AND THIS BROKE THE PRODUCT FOR FIVE DAYS. The check used to
           sit here, above every stage, and return. At the same time the base
           prompt gained a section on how to ask for a search, and the base
           prompt is read by every stage including the first one. So the
           opening turn started ending with a request to search instead of
           with OFFER_INTERVIEW, this check fired, and the offer card was
           never made. The stage stayed on "orient", and handleUserReply
           leaves "orient" exactly where it is, so typing did not help
           either. The interview never started, so there was no read back, no
           brief, and no document. Anthony, 2026-09-21: "the agent can not
           even produce a word document. It doesn't even get to the read back
           stage."

           The rule now: a marker that moves the work forward always beats a
           request to go and look. The search can wait a turn. The work
           cannot wait forever. */

        if (stage === "orient") {
          /* The offer wins, every time, even if it also asked to search. */
          if (raw.includes(MARKER.offerInterview)) {
            setFlowStage("offered");
            const withOffer = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "offer" },
            ]);
            persist(withOffer, "offered");
            return;
          }

          /* It asked to go and look before it had offered anything. Allowed
             ONCE per piece of work, and once only, because this stage has no
             other way out. Two turns of asking to search would be a person
             stuck on the first screen with no route to a document. */
          if (raw.includes(MARKER.needLookup) && orientLookupsRef.current < 1) {
            orientLookupsRef.current += 1;
            updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "lookup", from: "orient" },
            ]);
            return;
          }

          /* THE WAY OUT, and without it this stage is a trap.

             We come back here after a search that was allowed or refused. If
             that turn still has not offered, the offer goes up anyway. The
             offer is only ever a question with two buttons, so putting it
             there costs nothing and it guarantees a route forward. */
          if (orientLookupsRef.current > 0) {
            setFlowStage("offered");
            const withOffer = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "offer" },
            ]);
            persist(withOffer, "offered");
          }

          /* No marker at all and no search behind us means it was not a
             piece of work, just conversation. The stage stays where it is
             and it reads again next time. */
          return;
        }

        /* It has been and looked. What came back is marked as outside
           material so it renders differently from the conversation, and the
           second gate goes underneath it. Nothing is stored yet. */
        if (stage === "research") {
          const withCard = updateMessages((prev) => [
            ...prev.map((m) => (m.id === replyId ? { ...m, type: "finding" } : m)),
            { id: nextId(), role: "assistant", type: "useFinding", content: clean },
          ]);
          persist(withCard, lookupReturnStage());
          return;
        }

        if (stage === "interview") {
          interviewTurnsRef.current += 1;

          /* The conversation has what it came for. Move up a tier and go
             straight into the check, without the staff member pressing
             anything. From their side they answered a question and the next
             thing they see is a read back.

             FIRST, above the search, for the reason written at the top of
             this block: finishing the interview is what gets them a
             document, and a request to look something up must never take
             that turn away from them. */
          if (raw.includes(MARKER.interviewDone)) {
            interviewTurnsRef.current = 0;
            setFlowStage("analyse");
            runTurn("analyse", [...history, { role: "assistant", content: clean }]);
            return;
          }

          /* Asked to go and look in the middle of the conversation, which is
             usually because the person asked it to. Safe here, unlike the
             first turn, because this stage always ends: either it says it is
             done, or handleUserReply moves it up at MAX_INTERVIEW_TURNS
             whatever the model thinks. */
          if (raw.includes(MARKER.needLookup)) {
            updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "lookup", from: "interview" },
            ]);
            return;
          }

          /* An ordinary question. Wait for them to answer it. */
          return;
        }

        if (stage === "analyse") {
          /* GATE ONE, where it has always lived and where it is safest. This
             stage reads, and it ends in one of three places every time: it
             asks to search, it asks them for something, or it reads back. */
          if (raw.includes(MARKER.needLookup)) {
            updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "lookup", from: "analyse" },
            ]);
            return;
          }

          /* It read the sources and found a hole. Anything that needs a
             person is a conversation, so it drops back to the cheap model
             for the back and forth rather than charging Sonnet rates to
             collect a file name. It comes back up the moment that
             conversation says it is done. */
          if (raw.includes(MARKER.needInput)) {
            /* A fresh, specific ask, so it gets its own allowance rather
               than inheriting one the first interview already spent. */
            interviewTurnsRef.current = 0;
            /* Kept for the resume log, so somebody coming back tomorrow is
               told what it was waiting on rather than reading back up the
               thread to work it out. */
            missingRef.current = clean;
            setFlowStage("interview");
            return;
          }

          /* Nothing missing. This is the read back, and it is the only
             thing that earns the Build card. */
          if (raw.includes(MARKER.readbackDone)) {
            /* Nothing is outstanding any more, so the note must not still
               claim there is. A stale "waiting on you" is worse than none. */
            missingRef.current = "";
            updateMessages((prev) => [...prev, { id: nextId(), role: "assistant", type: "build" }]);
          }
        }
      },

      onError: ({ reason, message }) => {
        setTyping(false);
        setStalled(false);
        abortTurnRef.current = null;

        /* Running out is not a failure, it is the end of a trial, and the
           message that comes back with it is written to say so. */
        const next = updateMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            type: reason === "out_of_budget" ? "text" : "error",
            content: message,
          },
        ]);

        /* Saved even though the turn failed. What somebody typed is
           theirs, and losing it because the answer never arrived punishes
           them for a fault that was not theirs. */
        persist(next, stage);
      },
    });
  }

  /* Everything worth resuming, and nothing else. Attachment contents ride
     along in apiContent so a file handed over on turn one is still there
     after a reload, but ids and feedback are page state and are dropped. */
  async function persist(list, stage, brief) {
    if (!me?.company?.id || !me?.user?.id) return;

    const keepable = list.filter((m) => m.role === "user" || m.role === "assistant");
    if (!keepable.length) return;

    /* Written on every save, not only on the interesting ones. A note that
       is only current some of the time is worse than no note, because the
       returning person cannot tell which kind they got. Everything here is
       read from refs, because persist is called from inside stream
       callbacks where state is whatever it was when the turn started. */
    const state = buildResumeLog({
      making: autoSkill ? SKILL_LABELS[autoSkill] : "",
      asked: interviewTurnsRef.current,
      findings: findingsRef.current,
      declined: declinedRef.current,
      missing: missingRef.current,
    });

    const id = await saveConversation({
      id: conversationIdRef.current,
      companyId: me.company.id,
      staffId: me.user.id,
      title: docTitle(list),
      stage,
      /* Left alone on an ordinary turn, so a normal message cannot wipe the
         brief a build already wrote. */
      brief,
      state,
      messages: keepable.map((m) => ({
        role: m.role,
        type: m.type,
        content: m.content,
        apiContent: m.apiContent,
        title: m.title,
      })),
    });

    if (id && !conversationIdRef.current) conversationIdRef.current = id;
    if (id) setRecentChats(await listConversations(me.user.id));
  }

  /* --------------------------------------------------------------------------
     PICKING A CONVERSATION BACK UP

     ONE PLACE, ON PURPOSE. There are two ways back into a conversation: the
     page loading straight into the most recent one, and tapping one in the
     sidebar. Until the resume log existed they each did their own three
     lines and both were the same three lines. The moment there were six
     things to put back, two copies became two chances to forget one.

     Puts back the invisible half. The messages and the stage were already
     coming back; the findings, the spent question allowance and the frozen
     brief were not, and those are the ones that change what the finished
     document says.
     -------------------------------------------------------------------------- */
  function restoreFrom(row) {
    const log = readResumeLog(row.state);

    conversationIdRef.current = row.id;
    setFlowStage(row.stage ?? "interview");

    /* Ref first and state second, the same rule as everywhere else in this
       file: a turn fired straight after this reads the ref. */
    findingsRef.current = log.findings;
    setFindings(log.findings);
    interviewTurnsRef.current = log.asked;
    declinedRef.current = log.declined;
    missingRef.current = log.missing;
    briefRef.current = row.brief ?? "";

    const restored = (row.messages ?? []).map((m) => ({ id: nextId(), ...m }));

    /* Said only when something came back that they cannot see on screen.
       The conversation itself is right there, so announcing it would be
       noise, and a line that shows every time is a line nobody reads.

       role is "system", and that one word is doing two jobs. persist keeps
       only user and assistant turns, so this is never written to the row:
       it belongs to this visit, not to the record. toApiMessages filters on
       the same two roles, so it never reaches the model either, which
       matters because a third role in that array is a 400 and would break
       the very next turn. Do not give it a different role. */
    const line = resumeLine(log, { hasBrief: Boolean(row.brief) });
    if (line) restored.push({ id: nextId(), role: "system", type: "resumed", content: line });

    updateMessages(restored);
  }

  /* Pick a conversation back up exactly where it stopped, including which
     model was about to run next. */
  async function resumeChat(id) {
    const row = await loadConversation(id);
    if (!row) return;

    abortTurnRef.current?.();
    abortTurnRef.current = null;
    setTyping(false);
    setGenerating(false);
    setSidebarOpen(false);

    restoreFrom(row);
  }

  function handleUserReply(text, apiContent = text) {
    /* Skill detection still runs locally. It is a badge, not a decision,
       and guessing it instantly beats waiting on a round trip to show it. */
    const guessed = SKILL_BY_TYPE[guessProjectType(text)];
    if (guessed && !autoSkill) setAutoSkill(guessed);

    /* THE LOOP THAT COULD NOT CLOSE, fixed 2026-09-14.

       This line used to read:

         let stage = flowStage === "analyse" ? "interview" : flowStage;

       The reasoning was cost: a correction is a conversation, so drop to
       the cheaper stage. The consequence was that the work could never get
       back to a Build button.

       Only the analyse stage emits READBACK_COMPLETE, and only that marker
       puts the Build card on screen. The interview stage cannot produce
       one. So typing anything after a read back threw the flow into a stage
       with no way out, and it only climbed back after five more messages or
       when the model happened to say it was done.

       Anthony hit it exactly: the reply read "I'm ready to draft that
       whenever you say go", with no button to press. He said go. It talked
       again. There was nothing else it could do.

       So a correction after a read back now goes back to ANALYSE, which is
       the one stage that can close the loop. It re-reads, and it ends in
       one of three places every time: it asks him for something
       (NEED_INPUT, which drops to the interview by itself, so the cheap
       path is still there when it is genuinely a conversation), it asks to
       search (NEED_LOOKUP), or it reads back again with the Build card.

       It costs more per correction. A loop that terminates is worth it. */
    updateMessages((prev) => prev.filter((m) => m.type !== "build" && m.type !== "offer" && m.type !== "lookup" && m.type !== "useFinding"));
    let stage = flowStage;

    /* They typed instead of tapping either button. Typing is a conversation
       and the interview is the conversation stage, so it goes there. That
       is safe for both answers: the interview reads "no, just get on with
       it" and hands off on the spot, which it is already told to do. */
    if (stage === "offered") stage = "interview";

    /* The interview has had its questions. Whatever the model thinks, the
       work moves up now. Three to five questions is the promise, and a
       promise a model can talk itself out of is not one. */
    if (stage === "interview" && interviewTurnsRef.current >= MAX_INTERVIEW_TURNS) {
      stage = "analyse";
      interviewTurnsRef.current = 0;
    }

    if (stage !== flowStage) setFlowStage(stage);

    runTurn(stage, toApiMessages([...messages, { role: "user", content: apiContent }]));
  }

  /* ------------------------------------------------------------------------
     4. GENERATION
     Runs once the staff member confirms the brief.

     A finished file is delivered two ways in a deployment: a download here
     in the chat, and a draft written into the organization's own storage.
     Which storage that is belongs to the requirements conversation with
     each organization, so nothing in this file names one. Neither does the
     library below: it holds what was made, and says plainly that it is
     here rather than pretending it went somewhere it did not.
     ------------------------------------------------------------------------ */

  /* The moment the conversation becomes a deliverable. Same function as
     the interview, different stage, which is what moves it up to a model
     that can actually write the thing.

     The instruction is appended as a normal user turn rather than being
     hidden in the system prompt, because everything agreed in the
     conversation above is the brief. Restating it would risk contradicting
     it. */
  /* ------------------------------------------------------------------------
     THE PROMPT AND THE BUILD, WHICH ARE ONE ACTION

     Anthony, 2026-09-10: "it's the prompt and the build that are together.
     The read back belongs with the conversation after the analysis."

     So the read back is not a stage somebody waits at. It happens in the
     chat, they correct it, the conversation carries on until they are happy.
     The moment they say go, two things run back to back with nobody pressing
     anything else:

       1. The brief is written from everything agreed.
       2. The document is written, fenced by that brief.

     WHY THE BRIEF IS NOT SHOWN. The product principle keeps the read back and
     the sources visible and hides the rest. The read back is what proves it
     understood, and they have already seen it. The brief is machinery. It is
     saved on the conversation so it can be looked at later, and it never goes
     on screen.

     WHY IT IS NOT JUST ONE LONGER PROMPT. Because the brief is the fence. The
     writing step is handed it and told that anything outside it was never
     approved, which is what stops a number nobody agreed appearing in a
     finished document. It is also the exact point a bigger model takes over
     for a deployment that needs one. See DIRECTION.md.
     ------------------------------------------------------------------------ */

  function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    updateMessages((prev) => prev.filter((m) => m.type !== "build"));
    addMessage({ role: "assistant", type: "generating" });

    let brief = "";

    setTurnStage("brief");
    setStalled(false);

    abortTurnRef.current = sendTurn({
      stage: "brief",
      /* The build does not go through runTurn, so it has to carry the
         accepted findings itself. Missing this once meant a person could
         approve a figure, watch it appear on screen, and never see it in
         the document. */
      findings: findingsRef.current.join("\n\n"),
      messages: toApiMessages(messages),

      onMeta: ({ tier }) => setActiveTier(tier),
      onStall: () => setStalled(true),
      onText: (chunk) => { brief += chunk; setStalled(false); },

      onError: ({ reason, message }) => {
        setGenerating(false);
        setStalled(false);
        abortTurnRef.current = null;
        updateMessages((prev) => [
          ...prev.filter((m) => m.type !== "generating"),
          {
            id: nextId(),
            role: "assistant",
            type: reason === "out_of_budget" ? "text" : "error",
            content: message,
          },
        ]);
      },

      /* Straight on. Nothing is built without a brief, so the only thing
         between the two is this line. */
      onDone: () => buildFromBrief(brief.trim()),
    });
  }

  function buildFromBrief(brief) {
    /* Held here as well as written to the row, so the rest of this visit
       knows a brief exists without going back to the database for it. */
    briefRef.current = brief;

    const resultId = nextId();
    let started = false;
    let finished = "";

    /* Saved before a word is written, so the fence the document was built
       inside is on the row whether or not the writing finishes. */
    persist(messages, "generate", brief);

    /* The card on screen is still the build card, so moving this on is what
       changes its line from "Writing the brief" to "Building your
       document". Without it the card would still be talking about the
       brief while the document was being written. */
    setTurnStage("generate");
    setStalled(false);

    abortTurnRef.current = sendTurn({
      stage: "generate",
      brief,
      findings: findingsRef.current.join("\n\n"),
      messages: toApiMessages(messages),

      onMeta: ({ tier }) => setActiveTier(tier),
      onStall: () => setStalled(true),

      onText: (chunk) => {
        finished += chunk;
        setStalled(false);
        if (!started) {
          started = true;
          updateMessages((prev) => [
            ...prev.filter((m) => m.type !== "generating"),
            { id: resultId, role: "assistant", type: "result", content: "", title: docTitle(messages) },
          ]);
        }
        updateMessages((prev) =>
          prev.map((m) => (m.id === resultId ? { ...m, content: m.content + chunk } : m))
        );
      },

      onDone: () => {
        setGenerating(false);
        setStalled(false);
        abortTurnRef.current = null;
        setDailyUsed((n) => Math.min(n + 1, DAILY_LIMIT));

        /* Into the library, so it is somewhere other than this one
           conversation. savedToStorage stays false because no storage is
           connected here, and claiming otherwise would be a lie in the UI. */
        const title = docTitle(messages);

        setLibraryFiles((prev) => [
          { id: nextId(), title, skill: autoSkill, savedToStorage: false, when: "Just now", content: finished },
          ...prev,
        ]);

        /* And to the database, so it is still there tomorrow. Written
           under this person's own identity, which is what the row level
           security expects, so a failure here is a permission problem
           worth seeing in the console rather than a silent loss. */
        if (me?.company?.id && me?.user?.id) {
          saveWork({
            companyId: me.company.id,
            staffId: me.user.id,
            title,
            skill: autoSkill,
            content: finished,
          });
        }
      },

      onError: ({ reason, message }) => {
        setGenerating(false);
        setStalled(false);
        abortTurnRef.current = null;
        updateMessages((prev) => [
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
    updateMessages(before);
    runTurn(flowStage, toApiMessages(before));
  }

  /* ------------------------------------------------------------------------
     ANSWERING THE OFFER

     The first turn read everything and asked whether they want to be
     interviewed. These are the two answers.

     Both put a line in the conversation as though the person typed it, so
     the transcript reads honestly and the model can see what was chosen.
     Neither is a setting and neither is remembered: the same question can
     be asked again in the next conversation, because the answer depends on
     the job, not on the person.
     ------------------------------------------------------------------------ */

  function answerOffer(line, stage) {
    if (typing || generating) return;
    const kept = messages.filter((m) => m.type !== "offer");
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: line });
    interviewTurnsRef.current = 0;
    setFlowStage(stage);
    runTurn(stage, toApiMessages([...kept, { role: "user", content: line }]));
  }

  /* Yes. Straight into the questions. */
  const handleWantInterview = () => answerOffer("Yes, ask me your questions.", "interview");

  /* No. Straight to the read back, which is where it says what it
     understood and what it is going to use. They still see that before
     anything is written, so saying no skips the questions and never skips
     the checkpoint. */
  const handleSkipInterview = () =>
    answerOffer("No, get on with it with what you have.", "analyse");

  /* ------------------------------------------------------------------------
     GOING AND LOOKING, AND THE TWO GATES EITHER SIDE OF IT

     Anthony, 2026-09-10: "for it to be allowed to research, it must be
     guarded... Once it pulls out the data, it shows you everything, and it
     shows it in a very simple and direct language, showing you what it has
     discovered and how it intends to use this data."

     GATE ONE is above, in the analysis. It says what it wants to find and
     stops. The search tool is not attached to any request until the button
     below is pressed, so before that there is nothing to talk itself into.

     GATE TWO is here. What comes back is shown with its real sources, in a
     panel that does not look like the rest of the conversation, because it
     is not from the company and should never be mistaken for it. It goes
     nowhere until they accept it.

     A REJECTED FINDING IS DROPPED, not stored. "If there is no go-ahead, it
     should not add it." So there is no list of things it found that nobody
     wanted, waiting to be reconsidered on a later turn.
     ------------------------------------------------------------------------ */

  /* WHERE THE CONVERSATION GOES AFTER A SEARCH.

     The card can now be raised from any stage, so the answer is no longer
     always "the analysis". Somebody chatting on the first turn who asks it
     to check a figure should get the figure and still be chatting. They
     should not find themselves halfway up a document pipeline they never
     asked to start.

     So the stage that raised the card is carried on the card itself, and
     everything on the way back reads it. Anything that is not the orient
     turn lands in the analysis exactly as it did before, which is why the
     default is "analyse". */
  const lookupFromRef = useRef("analyse");

  /* Back to the stage that asked, so a search during the interview returns
     to the interview and one during the analysis returns to the analysis.
     Both of those stages end on their own, so neither can trap anybody: the
     interview is moved up at MAX_INTERVIEW_TURNS whatever the model thinks,
     and the analysis always ends in a read back, a question, or a search.
     The first turn is the one that needed a guard, and it has one above. */
  function lookupReturnStage() {
    const from = lookupFromRef.current;
    return from === "orient" || from === "interview" ? from : "analyse";
  }

  function allowLookup(from) {
    if (typing || generating) return;
    lookupFromRef.current = from || "analyse";
    const kept = messages.filter((m) => m.type !== "lookup");
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: "Yes, go and look." });
    setFlowStage(lookupReturnStage());
    runTurn("research", toApiMessages([...kept, { role: "user", content: "Yes, go and look." }]));
  }

  function refuseLookup(from) {
    if (typing || generating) return;
    lookupFromRef.current = from || "analyse";
    declinedRef.current += 1;
    const kept = messages.filter((m) => m.type !== "lookup");
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: "No, work with what you have." });
    const back = lookupReturnStage();
    setFlowStage(back);
    runTurn(back, toApiMessages([...kept, { role: "user", content: "No, work with what you have." }]));
  }

  /* GATE TWO, the yes. Takes a LIST, because the answer is no longer only
     all or nothing: the picker hands back every finding still ticked, which
     may be all of them, some of them, or one.

     Written to the ref first and the state second, because the very next
     line fires a turn that reads the ref, and state would not have caught
     up.

     What the person is recorded as saying changes with what they kept. "Use
     that" after unticking two of three would be the conversation carrying a
     claim the person did not make, and the model reads that line as theirs.
     So it says how many, and when they dropped some it says that too. */
  function useFinding(chosen, droppedCount = 0) {
    if (typing || generating) return;

    const list = (Array.isArray(chosen) ? chosen : [chosen])
      .filter((t) => typeof t === "string" && t.trim());
    if (!list.length) return dropFinding();

    /* Counted, never stored. Somebody who unticked two of three findings has
       turned two down, and the resume log wants to know that happened
       without keeping a word of what they were. */
    if (droppedCount > 0) declinedRef.current += droppedCount;

    findingsRef.current = [...findingsRef.current, ...list];
    setFindings(findingsRef.current);

    const said = list.length === 1
      ? "Use that."
      : `Use those ${list.length}.`;

    const kept = messages.filter((m) => m.type !== "useFinding");
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: said });
    const back = lookupReturnStage();
    setFlowStage(back);
    runTurn(back, toApiMessages([...kept, { role: "user", content: said }]));
  }

  /* GATE TWO, the no. Nothing is kept. They are put back in the
     conversation with the cursor, so the next thing they type is the
     correction or the data they would rather it used. */
  function dropFinding() {
    if (typing || generating) return;
    /* The count goes up and the text does not get written anywhere.
       Anthony: "if there is no go-ahead, it should not add it." */
    declinedRef.current += 1;
    updateMessages((prev) => prev.filter((m) => m.type !== "useFinding"));
    setFlowStage("interview");
    textareaRef.current?.focus();
  }

  /* "Something needs changing" is not a stage of its own. It just takes the
     card away, puts them back in conversation, and hands them the cursor.
     What they type next is the correction, and the loop carries it back up
     to the analysis by itself. */
  function handleAdjust() {
    updateMessages((prev) => prev.filter((m) => m.type !== "build"));
    setFlowStage("interview");
    textareaRef.current?.focus();
  }

  function handleNewChat() {
    abortTurnRef.current?.();
    abortTurnRef.current = null;
    conversationIdRef.current = null;
    lookupFromRef.current = "analyse";
    orientLookupsRef.current = 0;
    setTyping(false);
    setActiveTier(null);
    updateMessages([]);
    setGreetingText(buildGreetingText(me?.staff?.name?.split(" ")[0]));
    interviewTurnsRef.current = 0;

    /* EVERYTHING THE RESUME LOG CARRIES IS CLEARED HERE TOO, and it was not
       before this was written. Approved findings lived in a ref that New
       chat never touched, so a figure somebody approved in the morning was
       still sitting in the browser in the afternoon and would have gone
       into a completely unrelated document. Nothing carries between two
       pieces of work. */
    findingsRef.current = [];
    setFindings([]);
    declinedRef.current = 0;
    missingRef.current = "";
    briefRef.current = "";

    /* "orient", not "interview". The first turn reads the request against
       the whole knowledge base and then offers the interview. This line
       said "interview" and was a leftover from before orient existed, so
       every new chat skipped the reading and went straight to asking
       people for things their own company had already written down. */
    setFlowStage("orient");
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

  /* One place that sizes the box to its contents, so it grows the same
     whether the words were typed or spoken. It used to be done inside the
     typing handler only, which meant dictation ran off the bottom of a one
     line box and you could not see what you had said. */
  function fitTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  function handleTextareaInput(e) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  useEffect(fitTextarea, [input]);

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
      const isDocument = kind === "text" || kind === "pdf" || kind === "docx";

      /* Pictures get the generous cap and text gets the strict one. A
         picture shrinks to almost nothing before it is sent, so its size
         on disk barely matters. Text does not shrink, so a file far past
         what we can read would be accepted and then mostly ignored, and
         being told no is better than being quietly half heard. */
      const capKB = kind === "image" ? MAX_IMAGE_UPLOAD_KB : MAX_SOURCE_UPLOAD_KB;
      if (kind !== "unreadable" && sizeKB > capKB) {
        showUploadError(
          `${file.name} is ${(sizeKB / 1024).toFixed(1)} MB, over the ${Math.round(
            capKB / 1024
          )} MB limit. Split it up, or paste the part that matters.`
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
        shrinkImage(file, { maxEdge: MAX_IMAGE_EDGE })
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

      if (isDocument) {
        readFileAsText(file, { maxChars: MAX_FILE_CHARS }).then((result) => {
          if (!result.ok) {
            showUploadError(result.reason);
            setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
            return;
          }
          setPendingAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, status: "ready", text: result.text, truncated: result.truncated }
                : a
            )
          );
        });
      }
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

  /* ------------------------------------------------------------------
     CONNECTING YOUR OWN CANVA, FROM HERE

     Canva is the one connector in this list that really connects, so it
     does not just flip a switch in this browser the way the others do
     while they wait to be built.

     It leaves this page and comes back. Anthony, 2026-09-14: "it doesn't
     open a different tab, but rather preserves the page... It returns back
     to where the person was, exactly." So the address travels with the
     request and the callback redirects to it. Nothing to block, nothing to
     close, no orphan tab.

     WHY THE PERSON AND NOT THE ADMIN. An admin connecting one account for
     everybody put every design in one person's Canva, so a staff member
     who clicked Open in Canva landed in their own account and the file was
     not there. Their own connection, their own account, their own designs.
     ------------------------------------------------------------------ */
  const [canvaBusy, setCanvaBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await askCanva("status");
      if (!alive || !result?.ok) return;
      setConnectors((prev) => ({ ...prev, canva: Boolean(result.connected) }));
    })();
    return () => { alive = false; };
  }, []);

  /* Read once on the way back in, said once, then taken out of the address
     bar so a refresh does not replay a message about something that
     happened a while ago. */
  const [canvaJustBack] = useState(() => {
    if (typeof window === "undefined") return "";
    const marker = new URLSearchParams(window.location.search).get("connected");
    return marker === "canva" || marker === "failed" ? marker : "";
  });

  useEffect(() => {
    if (!canvaJustBack || typeof window === "undefined") return;
    setToast(canvaJustBack === "canva"
      ? "Canva is connected. Nothing else to do."
      : "Canva did not finish that, so nothing was connected.");
    const url = new URL(window.location.href);
    url.searchParams.delete("connected");
    window.history.replaceState({}, "", url.toString());
  }, [canvaJustBack]);

  async function connectCanva() {
    if (canvaBusy) return;

    /* Already connected means this press is a disconnect. Same control,
       both directions, so there is never a connection somebody can make
       and cannot unmake. */
    if (connectors.canva) {
      setCanvaBusy(true);
      const result = await askCanva("disconnect");
      setCanvaBusy(false);
      if (!result?.ok) {
        setToast(result?.reason ?? "Could not disconnect that. Try again.");
        return;
      }
      setConnectors((prev) => ({ ...prev, canva: false }));
      setToast("Canva disconnected. It is still in your Canva settings if you want it gone from there too.");
      return;
    }

    setCanvaBusy(true);
    const result = await askCanva("start");
    if (!result?.ok || !result.url) {
      setCanvaBusy(false);
      setToast(result?.reason ?? "Could not start that. Try again.");
      return;
    }
    /* busy stays true on purpose. The page is about to be replaced, and
       putting the row back to normal for the half second in between reads
       as nothing having happened. */
    window.location.assign(result.url);
  }

  function toggleFeedback(id, kind) {
    setFeedback((prev) => ({ ...prev, [id]: prev[id] === kind ? null : kind }));
  }

  /* Writing a file can fail, and a download button that silently does
     nothing is the worst control on any screen. Say what happened. */
  /* FOUR FORMATS, AND ONE OF THEM CAN LEGITIMATELY REFUSE.

     A spreadsheet is the numbers. A document with no table in it has no
     numbers to put in one, so downloadXlsx throws with code "no_tables"
     rather than handing somebody an empty file. An empty spreadsheet looks
     like a bug and sends people hunting for a failure that never happened,
     so that case gets its own message and is not logged as an error. */
  const MAKING = {
    pdf: "Making the PDF",
    docx: "Making the Word file",
    pptx: "Making the slides",
    xlsx: "Making the spreadsheet",
  };

  async function handleDownload(format, title, content) {
    setToast(MAKING[format] ?? "Making the file");
    try {
      if (format === "pdf") await downloadPdf(title, content);
      else if (format === "pptx") await downloadPptx(title, content);
      else if (format === "xlsx") await downloadXlsx(title, content);
      else await downloadDocx(title, content);
      setToast("Saved to your downloads");
    } catch (err) {
      if (err?.code === "no_tables") {
        setToast("There is no table in this one, so there is nothing to put in a spreadsheet.");
        return;
      }
      console.error("could not build the file", err);
      setToast("Could not build that file. Copy the text instead.");
    }
  }

  /* A copy that says nothing is a copy you check by pasting somewhere to
     see whether it worked. Say so, and say it when it did not. */
  function copyText(text) {
    if (!navigator.clipboard) {
      setToast("This browser will not allow copying. Select the text instead.");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => setToast("Copied"),
      () => setToast("Could not copy. Select the text instead."),
    );
  }

  /* It has to actually sign them out, which it did not until 2026-09-09.
     It only navigated, so the session survived and the browser back button
     walked straight back into the workspace.

     replace: true matters as much as the sign out. Without it the workspace
     stays in the history, so back renders it for a moment before its own
     guard notices and bounces. Replacing the entry means there is nothing
     behind them to go back to. */
  async function handleLogout() {
    setSidebarOpen(false);
    setProfileOpen(false);
    await signOutCompletely();
    navigate("/auth", { replace: true });
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
              {assistantName}
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

        {/* Pick up where you left off. Only the last few, because
            somebody wants to resume a brief, not browse a year of their
            own talking. */}
        {recentChats.length > 0 && (
          <div className="px-3 pb-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide px-1 pb-1.5"
              style={{ color: "var(--text-3)" }}
            >
              Pick up where you left off
            </p>
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => resumeChat(chat.id)}
                className="w-full flex items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:opacity-80"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <RotateCw size={13} className="shrink-0 mt-1" style={{ color: "var(--text-3)" }} />
                <span className="min-w-0">
                  <span className="block text-[13px] truncate" style={{ color: "var(--text-1)" }}>
                    {chat.title}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--text-3)" }}>
                    {chat.stage === "analyse" ? "Ready to build" : "Still talking"}
                    {" · "}
                    {new Date(chat.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

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
                  onClick={() => downloadPdf(f.title, f.content)}
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
                      {/* A spinner that never resolves is worse than no
                          status at all, and that is what sat here: nothing
                          is connected, so "Saving" span forever. It now says
                          where the file actually is. */}
                      {f.savedToStorage ? (
                        <>
                          <Cloud size={10} style={{ color: BRAND.green }} />
                          Saved to your storage, {f.when}
                        </>
                      ) : (
                        <>Made {f.when.toLowerCase()}</>
                      )}
                    </span>
                  </span>
                  {f.savedToStorage && <ExternalLink size={12} style={{ color: "var(--text-3)" }} />}
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
          {/* Only an admin is offered the admin side. A staff member being
              shown a door they are not allowed through is an invitation to
              try it, and a door that opens onto a panel where every save
              fails is worse than no door. */}
          {/* THE SUPPORT QUEUE, for somebody an admin has given it to.

              It sits in the same stack as the admin door and follows the
              same rule: a person is only ever shown a door they can
              actually walk through. can_support is false for everybody
              until an admin turns it on, so most people never see this at
              all. */}
          {me?.staff?.can_support === true && (
            <button
              onClick={() => navigate("/workspace?view=support")}
              className="w-full flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--text-2)" }}
            >
              <LifeBuoy size={15} />
              Support queue
            </button>
          )}

          {me?.staff?.access_level === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--text-2)" }}
            >
              <Shield size={15} />
              Admin dashboard
            </button>
          )}
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
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-2)", backgroundColor: "var(--surface)" }}
            aria-label="Open menu"
          >
            <Menu size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
          </button>
          {/* min-w-0 and truncate together are what stop a long company name
              wrapping the title onto two lines the moment a skill badge
              appears beside it. Without min-w-0 a flex child refuses to
              shrink below its content, so truncate never gets a chance. */}
          <div className="flex items-center gap-2 ml-1.5 min-w-0">
            <span
              className="font-bold text-[15px] tracking-tight truncate"
              style={{ fontFamily: FONTS.display }}
            >
              {assistantName}
            </span>
            {autoSkill && (
              <span
                className="text-[11.5px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Profile and usage */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: GRADIENTS.brand }}
              aria-label="Profile"
            >
              {personName ? personName.charAt(0) : <User size={15} />}
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-11 rounded-2xl border shadow-2xl z-50 w-64 backdrop-blur-2xl p-4"
                style={{ backgroundColor: "var(--surface-solid)", borderColor: "var(--border)" }}
              >
                <p className="text-[14.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                  {personName}
                </p>
                <p className="text-[12.5px] mb-3" style={{ color: "var(--text-3)" }}>
                  {[personRole, companyName].filter(Boolean).join(" at ")}
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
                buildStage={turnStage}
                buildStalled={stalled}
                onGenerate={handleGenerate}
                onAdjust={handleAdjust}
                onWantInterview={handleWantInterview}
                onSkipInterview={handleSkipInterview}
                onAllowLookup={() => allowLookup(m.from)}
                onRefuseLookup={() => refuseLookup(m.from)}
                onUseFinding={useFinding}
                onDropFinding={dropFinding}
                onReset={handleNewChat}
                onRetry={() => handleRetry(m.id)}
                feedback={feedback[m.id]}
                onFeedback={(kind) => toggleFeedback(m.id, kind)}
                onCopy={() => copyText(m.content)}
                onDownload={(format) => handleDownload(format, m.title || "Your document", m.content)}
              />
            ))}
            {typing && <Thinking stage={turnStage} stalled={stalled} />}
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
                            tool.id === "canva"
                              ? connectCanva()
                              : tool.state === "connectable"
                              ? toggleConnector(tool.id)
                              : setDemoNoteFor((open) => (open === tool.id ? null : tool.id))
                          }
                          disabled={tool.id === "canva" && canvaBusy}
                          className="w-full flex items-center justify-between pl-9 pr-4 py-2.5 hover:opacity-80 transition-opacity"
                        >
                          <span className="flex items-center gap-2.5">
                            <tool.icon size={18} />
                            <span className="text-[13.5px] text-left" style={{ color: "var(--text-1)" }}>
                              {tool.label}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5 shrink-0">
                            {/* EVERYTHING NOT YET CONNECTABLE SAYS THE SAME
                                THING, 2026-09-16, and it says "Coming soon".

                                This screen used to split them into "Set up"
                                and "Example" off an internal state field.
                                Anthony saw it against the admin screen, which
                                already says Coming soon for all of them, and
                                asked for the two to match. He is right twice
                                over. Two screens giving different answers
                                about the same tool is a screen somebody has
                                to work out, and grading tools by how far our
                                own build has got tells a customer nothing
                                they can use.

                                Canva is the one that is really connectable,
                                so it is the only one with a live label, and
                                that label tracks whether THIS person has
                                signed in. */}
                            {tool.state === "connectable" ? (
                              <StatusPill tone={connectors[tool.id] ? "ok" : "neutral"}>
                                {tool.id === "canva" && canvaBusy
                                  ? "One moment"
                                  : connectors[tool.id]
                                  ? "Connected"
                                  : "Connect"}
                              </StatusPill>
                            ) : (
                              <StatusPill tone="neutral">Coming soon</StatusPill>
                            )}

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

          {/* ----------------------------------------------------------
              THE MESSAGE BOX

              A SHARP RECTANGLE HOLDING ROUND CONTROLS, and both halves of
              that were decided by looking rather than by reasoning.

              Anthony asked for the box itself: "make this box rectangular
              with the sharp edge so it looks more mature and stop looking
              like it's wombling." So the frame is square, 0px, no radius
              at all.

              THE CONTROLS INSIDE STAYED ROUND, and the first attempt got
              this wrong. Squaring them looked like the consistent choice on
              paper. Rendered, it is not: the microphone's glow is a radial
              gradient that slowly rotates, so in a square it becomes a
              diamond turning behind the button. That is the exact wobble
              Anthony was asking to be rid of, made worse. Round controls
              against a hard frame also give the eye something to land on.

              Both versions were built and screenshotted before this one was
              kept. If anybody squares these again, render it and look at
              the empty state in the light theme first.

              VERTICALLY CENTRED, not bottom aligned. Anthony: "they should
              be at the vertical midpoint of the entire entry field." The
              box grows with the text, and at four lines the controls now
              sit in the middle of it rather than sinking to the floor.

              overflow-hidden stays, cheap insurance so nothing inside can
              ever spill past a corner the frame no longer rounds off.
              ---------------------------------------------------------- */}
          <div
            className="flex items-center gap-1.5 rounded-none border px-3 py-2 overflow-hidden backdrop-blur-2xl shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-[rgba(20,32,160,0.35)]"
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
                if (e.key === "Enter" && !e.shiftKey && HAS_KEYBOARD) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={
                listening
                  ? "Listening..."
                  : !conversationStarted
                  ? `Ask ${assistantName}, or type / for quick starts`
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
                    worse than a control that looks live and cannot work.

THE GLOW AND THE PULSE STAY. They were
                    taken out once, on a guess that they were the "wombling"
                    Anthony wanted gone. They were not, and he said so. The
                    smudge that removing them appeared to fix had a different
                    cause: the glow had been squared along with the button,
                    and a rotating radial gradient in a square is a spinning
                    diamond. Round again, it reads as it always did. */}
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
                      /* Bordered, like the plus on the other side, so the
                         two ends of the box read as a matched pair. The
                         border earns its place in the light theme: the idle
                         background is the same white as the box, so without
                         an edge the microphone stops looking like a control
                         and starts looking like a decorative icon. While
                         listening the red fill says enough on its own, so
                         the border gets out of the way. */
                      className="relative w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                      style={
                        listening
                          ? { backgroundColor: BRAND.red, color: "#fff", borderColor: BRAND.red }
                          : input.trim() || pendingAttachments.length > 0
                          ? { backgroundColor: "var(--chip)", color: "var(--text-2)", borderColor: "var(--border-2)" }
                          : {
                              backgroundColor: "var(--surface-solid)",
                              color: "var(--text-1)",
                              borderColor: "var(--border-2)",
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

          {toast && (
            <div
              className="flex items-center justify-center pointer-events-none"
              style={{ position: "absolute", left: 0, right: 0, bottom: "100%", marginBottom: 10 }}
            >
              <span
                className="text-[12.5px] px-3.5 py-1.5 rounded-full border backdrop-blur-xl shadow-lg"
                style={{
                  backgroundColor: "var(--surface-solid)",
                  borderColor: "var(--border-2)",
                  color: "var(--text-1)",
                  animation: "sx-rise 0.2s ease",
                }}
              >
                {toast}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center mt-2.5">
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
              <Lock size={10} />
              {assistantName} can make mistakes
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

export function ChatBubble({ message, brief, buildStage = "brief", buildStalled = false, onGenerate, onAdjust, onWantInterview, onSkipInterview, onAllowLookup, onRefuseLookup, onUseFinding, onDropFinding, onReset, onRetry, feedback, onFeedback, onCopy, onDownload }) {
  const isUser = message.role === "user";
  const riseStyle = { animation: "sx-rise 0.35s ease" };

  /* --- Picked back up, said once and only when something invisible came
         back with it. Not a card and not a colour: it is a note about the
         last visit, not a thing to act on, so it reads as quiet as it is.
         role is "system", so persist never writes it to the row. --- */
  if (message.type === "resumed") {
    return (
      <div style={riseStyle} className="flex justify-center px-2">
        {/* NO BORDER AND NO BACKGROUND, and that is the point. As a pill it
            wrapped to two lines on a phone and read as a card, which made a
            note about the last visit look like something to act on. Plain
            centred text wraps at any width without changing what it is.

            items-start, not items-center: on two lines a centred icon
            floats halfway down the block with nothing to sit against. This
            pins it to the first line. */}
        <p
          className="flex items-start gap-2 text-[12.5px] text-center max-w-sm"
          style={{ color: "var(--text-3)" }}
        >
          <History size={12} className="shrink-0 mt-[3px]" />
          <span className="text-left">{message.content}</span>
        </p>
      </div>
    );
  }

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
  /* --- GATE ONE: may it go and look ---

     Amber, not blue. This is the only moment in the whole flow where
     something leaves the building, and it should not look like the
     ordinary next step. The refusal is the plain button on purpose: saying
     no is free, costs nothing, and must never feel like the awkward
     choice. */
  if (message.type === "lookup") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: BRAND.amber + "66" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Search size={15} style={{ color: BRAND.amber }} />
            <p className="text-[15.5px] font-semibold" style={{ color: "var(--text-1)" }}>
              May I look this up online?
            </p>
          </div>
          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            It has said above what it wants to find. Nothing goes into your work until you
            have seen it and said yes.
          </p>
          <PrimaryButton onClick={onAllowLookup} className="w-full flex items-center justify-center gap-2">
            <Search size={15} />
            Yes, go and look
          </PrimaryButton>
          <button
            onClick={onRefuseLookup}
            className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            No, work with what you have
          </button>
        </div>
      </div>
    );
  }

  /* --- What it found outside, in its own colour ---

     Anthony: "even write it with a different colour. So the person sees it,
     okay, this is important."

     A tinted panel with an accent edge and a label, so it cannot be
     mistaken at a glance for the company's own material or for something
     the assistant simply knew. It came from outside, and it looks it. */
  if (message.type === "finding") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[14px] border-l-[3px] border-y border-r px-4 py-3.5"
          style={{
            backgroundColor: "var(--surface-2)",
            borderColor: "var(--border)",
            borderLeftColor: BRAND.cyan,
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Globe size={13} style={{ color: BRAND.cyan }} />
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: BRAND.cyan, letterSpacing: "0.06em" }}
            >
              From outside your company
            </span>
          </div>
          {/* withoutMarks, because the research stage puts [FINDING] before
              each one so the picker below knows where to split. That is
              plumbing and it must never reach a person's eyes. */}
          <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-1)" }}>
            {withoutMarks(message.content)}
          </div>
        </div>
      </div>
    );
  }

  /* --- GATE TWO: does any of it get used, and which of it ---

     The whole card lives in src/shared/FindingPicker.jsx, because it holds
     state of its own now: which findings are still ticked. Hooks cannot be
     called from inside a branch like this one, so it has to be a component
     rather than a few more lines here. */
  if (message.type === "useFinding") {
    return (
      <FindingPicker
        content={message.content}
        onUse={onUseFinding}
        onDrop={onDropFinding}
      />
    );
  }

  /* --- The offer to interview ---

     Shown once, after the first turn has read the company's material. The
     two buttons are the two answers, in the words a person would use, so
     nobody has to work out what either one does.

     Yes is the quiet option and No is the plain one, deliberately. Neither
     is a mistake and neither is risky, so this is not a warning dialog and
     must not look like one. */
  if (message.type === "offer") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-[15.5px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
            Want me to ask you a few questions?
          </p>
          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            A few short ones make the work a lot better. Or I can start now with what I have.
          </p>
          <PrimaryButton
            onClick={onWantInterview}
            className="w-full flex items-center justify-center gap-2"
          >
            <MessagesSquare size={15} />
            Ask me a few questions
          </PrimaryButton>
          <button
            onClick={onSkipInterview}
            className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            Just get on with it
          </button>
        </div>
      </div>
    );
  }

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

  /* --- Building it now ---

     THE TICKS THAT WERE NOT TRUE, removed 2026-09-14. This card used to
     show two green ticks reading "Applied brand kit and template" and
     "Structured layout", both hard coded, neither connected to anything
     the product does. There is no brand kit. Nothing applies a template.
     They were on screen while the model was still writing the first line.

     In a product whose entire argument is that it does not invent, a green
     tick against work that did not happen is the worst thing on the
     screen, and it was about to be in a demo video.

     What it says now is what is actually happening: the stage it is on,
     and whether it has gone quiet. Both are known for certain. */
  if (message.type === "generating") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Spinner size={16} />
            <span className="text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
              Building it now
            </span>
          </div>

          <div className="pl-[26px]">
            <Thinking stage={buildStage} stalled={buildStalled} />
          </div>
        </div>
      </div>
    );
  }

  /* --- The finished file --- */
  /* The real document, on screen, as it is written. No placeholder
     preview: what is in this box is exactly what downloads. */
  if (message.type === "result") {
    const title = message.title || "Your document";
    /* Read from the document itself rather than from what the person asked
       for. Somebody can ask for a report and get one with a table in it,
       and somebody can ask for "the numbers" and get prose. What is
       actually there is the only thing that decides. */
    const hasTable = toTables(message.content ?? "").length > 0;

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

          {/* TALLER, AND IT SHOWS THAT IT SCROLLS.

              380px was chosen when this box held raw Markdown, where being
              cut off looked like being cut off. Rendered, the same height
              sliced the document exactly at a table header, so the numbers
              were hidden and it read as broken.

              60vh, with a floor and a ceiling. On a phone that is most of
              the screen, which is right: this is the thing they came to
              read. On a tall desktop the ceiling stops one report filling
              the window and pushing the buttons out of reach.

              The fade underneath is not decoration. A box that scrolls with
              no sign that it scrolls is a box people think is the whole
              document, and then they judge the work by half of it. */}
          <div className="relative mb-4">
            <div
              className="rounded-[14px] border p-4 overflow-y-auto"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
                maxHeight: "min(60vh, 560px)",
                minHeight: "120px",
              }}
            >
            {/* Rendered, not raw. This is the box somebody reads before
                deciding to download, and the download is the signal the
                whole style memory rests on. A decision made from a wall of
                hashes and pipes is not a decision. */}
              <DocumentView markdown={message.content} />
            </div>

            {/* aria-hidden and pointer-events-none: it is a hint for the
                eye, not a thing to read or to tap through. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-px right-px bottom-px h-10 rounded-b-[14px]"
              style={{ background: "linear-gradient(to bottom, transparent, var(--surface-2))" }}
            />
          </div>

          {/* TWO ROWS, BECAUSE THEY ARE TWO DIFFERENT QUESTIONS.

              The top row is "what shall I take away". The bottom row is
              "what shall I do now". Six buttons in one line reads as six
              equal choices, and on a phone it wraps into a block nobody
              can scan.

              THE SPREADSHEET BUTTON IS NOT ALWAYS THERE. A spreadsheet is
              the numbers, so a document with no table in it has nothing to
              put in one. Showing the button anyway and refusing when it is
              pressed is a control that exists to say no. It appears when
              it can work and not before. */}
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton
              onClick={() => onDownload("pdf")}
              className="flex items-center gap-2 text-[13.5px] px-4"
            >
              <Download size={14} />
              PDF
            </PrimaryButton>
            <GhostButton onClick={() => onDownload("docx")}>Word</GhostButton>
            <GhostButton onClick={() => onDownload("pptx")}>Slides</GhostButton>
            {hasTable && (
              <GhostButton onClick={() => onDownload("xlsx")}>Spreadsheet</GhostButton>
            )}
          </div>

          <div
            className="flex flex-wrap gap-2.5 mt-2.5 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <GhostButton onClick={onCopy}>Copy</GhostButton>
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

      {/* THE REPLY RAN OUT OF ROOM. Said out loud, because the alternative
          is a sentence that stops halfway and a person who thinks that was
          the whole answer. Quiet grey rather than a warning colour: nothing
          has gone wrong, there is just more to come. */}
      {message.cutOff && (
        <p className="text-[12.5px] mt-2 max-w-[85%]" style={{ color: "var(--text-3)" }}>
          That ran out of room and stopped here. Ask me to carry on and I will finish it.
        </p>
      )}

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
