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
  Trash2,
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
  hideConversations,
  signOutCompletely,
  companySourceText,
} from "../shared/session.js";
import { usePressAndHold } from "../shared/usePressAndHold.js";
import RefreshOrKeep from "../shared/RefreshOrKeep.jsx";
import { readFileAsText, fileKind } from "../shared/readFile.js";
import { shrinkImage } from "../shared/shrinkImage.js";
import { askCanva } from "../shared/canvaApi.js";
import { downloadPdf, downloadDocx, buildFile, saveBlob } from "../shared/download.js";
import { askDrive, fileInDrive } from "../shared/driveApi.js";
/* Each in its own file, and each loaded only when somebody actually asks
   for that format. The deck and spreadsheet libraries are megabytes, and
   a person who only ever makes reports should not download either one to
   open the chat. */
import { downloadPptx } from "../shared/downloadDeck.js";
import { downloadXlsx } from "../shared/downloadSheet.js";
import { toTables } from "../shared/structure.js";
import DocumentView from "../shared/DocumentView.jsx";
import ChatText from "../shared/ChatText.jsx";
import { labelledImageBlocks, imagesInMessages } from "../shared/docs/images.js";
import { readDocument, notesAsText } from "../shared/docs/documentModel.js";
import { briefSaysNoPictures, stripPictures, fixTotals, numbersNotInSources, numberFindings } from "../shared/docs/checkDocument.js";
import { convertFromReply, withoutConvertLine, kindOfFile } from "../shared/convert/convertAsked.js";
import { readLayout, layoutFromBrief } from "../shared/convert/layoutOf.js";
import { BRAND, GRADIENTS, FONTS } from "../shared/tokens";
import {
  PageShell,
  FloatingNav,
  ThemeToggle,
  TypewriterText,
  Thinking,
  WorkingMark,
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
import { shouldReopen } from "../shared/resumeWindow.js";
import { titleOf } from "../shared/documentTitle.js";

/* Gate two, in its own file. It grew a list and local state of its own the
   day it learned to keep some findings and not others, and a card with
   state belongs somewhere it can be read top to bottom. */
import FindingPicker from "../shared/FindingPicker.jsx";
import SomethingWrong from "../shared/SomethingWrong.jsx";
import { settleForResume, restingStage } from "../shared/resumeCards.js";
import { storageTarget, storageMessage } from "../shared/storage.js";
import { withoutMarks } from "../shared/findings.js";
import { formatAsked } from "../shared/formatAsked.js";
import { formatFromReply, withoutFormatLine, DEFAULT_FORMAT, FORMAT_NAMES, FORMAT_SHORT } from "../shared/outputFormat.js";
import BuildProgress, { advance, note, sectionsSoFar } from "../shared/BuildProgress.jsx";

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

/* Refusals that are not faults: the meter ran out, the admin paused this
   person, or they reached the daily or weekly limit. Each comes back with
   a plain sentence written for them, so it is shown as an ordinary reply
   rather than a red error. Anthony, 2026-11-10: "a usage limit says so
   plainly." */
const PLAIN_REFUSALS = new Set(["out_of_budget", "paused", "daily_limit", "weekly_limit"]);

const MARKER = {
  offerInterview: "OFFER_INTERVIEW",
  needLookup: "NEED_LOOKUP",
  interviewDone: "INTERVIEW_COMPLETE",
  needInput: "NEED_INPUT",
  readbackDone: "READBACK_COMPLETE",
  /* THEY SAID YES IN WORDS. Anthony typed "Continue" under a read back on
     2026-09-23 and nothing could build, because only the button could. Now
     the read back step says BUILD_NOW when their message says go, and the
     app presses the button for them. Only honoured when a read back is
     actually on the table, see runTurn. */
  buildNow: "BUILD_NOW",
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
  /* The FORMAT line is plumbing, the same as the markers, and the product
     principle says plumbing never shows. */
  let out = withoutConvertLine(withoutFormatLine(raw));
  for (const word of MARKER_WORDS) out = out.split(word).join("");

  /* A model's own wrapper tags (<output>, </output>) are its plumbing too.
     Seen live 2026-11-10 around a message it wrote. Never shown. */
  out = out.replace(/<\/?(output|answer|response|document)>/gi, "");

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
    /* Its shape, for "lay it out like this one". Only to be followed when
       they ask for it (DOCUMENT-HARNESS.md, section 9). */
    if (a.outline) {
      blocks.push(`--- LAYOUT OF ${a.name} (follow it only if they ask for this layout) ---\n${a.outline}\n--- END LAYOUT ---`);
    }
  }

  const written = [text, ...blocks].filter(Boolean).join("\n\n");

  if (!imageFiles.length) return written;

  /* Each picture goes with its file name in front of it, so the model can
     say which one belongs where. See docs/images.js. */
  return [
    ...labelledImageBlocks(imageFiles),
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

  /* The first try failed before a word came back and sendTurn is asking
     again on its own (assistantApi.js, "One quiet retry"). The waiting line
     says so. Cleared the moment the turn ends either way. */
  const [retrying, setRetrying] = useState(false);

  /* Whether the build running now is a change to a document this chat
     already made. Read when the finished work is saved. */
  const revisionRef = useRef(false);

  /* The sources the assistant chose for this piece of work (null: all of
     them). Anthony, 2026-11-10: the knowledge map decides what a turn reads.
     Cleared with a new chat. */
  const sourcesRef = useRef(null);
  useEffect(() => {
    if (!typing) setRetrying(false);
  }, [typing]);

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

  /* WHICH FILE THE WORK BECOMES. Read off the read back, held in a ref
     because the turn that builds fires in the same tick the state is set
     and would otherwise see the old one. The state beside it is only for
     drawing the button. */
  const formatRef = useRef(DEFAULT_FORMAT);
  const [buildFormat, setBuildFormat] = useState(DEFAULT_FORMAT);

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
  /* Conversion (DOCUMENT-HARNESS.md, section 8). The PDF and Word files
     attached this visit, by attachment id, and each finished conversion,
     by its card id. Neither is saved with the conversation. */
  const originalFilesRef = useRef(new Map());
  const convertedRef = useRef(new Map());

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

  /* TRUE ONCE THEY HAVE ACTUALLY TAKEN THE FILE AWAY.

     Not "the document was built". Built and downloaded are two different
     moments, and only the second one means the job is finished. Somebody
     who built a document and did not download it still has something to
     come back to.

     It is a ref rather than state because handleDownload writes it and
     nothing on screen reads it. It rides to the database inside the resume
     log, so it survives a refresh, and it is what stops a finished
     conversation reopening by itself. See src/shared/resumeWindow.js. */
  const deliveredRef = useRef(false);

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

  /* DELETING CHATS FROM THE SIDEBAR. Anthony, 2026-09-23: "you can delete a
     chat at a time by pressing and holding it in the side bar and you can
     also select multiple chats and delete at the same time."

     `selecting` is the mode, `picked` is which chats are ticked, and
     `confirmingDelete` opens the dialog that asks before anything happens.
     Deleting HIDES the chat, it does not destroy it. See hideConversations
     in src/shared/session.js for why. */
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const pressAndHold = usePressAndHold();

  /* WHICH STORAGE, IF ANY, THIS PERSON CAN PUT A FINISHED FILE IN. The same
     rule storage.js uses: a storage tool that can actually be connected,
     and that this person has connected. Empty when there is none, and the
     result card then says so rather than offering a button that cannot
     work. */
  /* WHOSE FILES THESE ARE. The company's own colour, name and logo, read
     off its row, so every file comes out in that company's look. See
     src/shared/docs/documentTheme.js and download.js. */
  const companyBrand = {
    id: me?.company?.id ?? "",
    name: me?.company?.name ?? "",
    color: me?.company?.brand_color ?? "",
    logoUrl: me?.company?.logo_url ?? "",
  };

  /* Pictures handed over in this chat, by name, so the preview can show
     them where the document places them. Company images are fetched only
     when a file is built, not for the preview. */
  const chatImages = imagesInMessages(messages);

  const linkedStorageName =
    WORKFLOW_TOOLS.find((tool) => tool.kind === "storage" && tool.state === "connectable" && connectors[tool.id] === true)
      ?.label ?? "";

  /* Closing the sidebar ends selecting. Coming back to it later with ticks
     still on would look like a delete half done. */
  useEffect(() => {
    if (!sidebarOpen) {
      setSelecting(false);
      setPicked([]);
      setDeleteError("");
    }
  }, [sidebarOpen]);

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
         back up, which is the whole reason conversations are saved.

         BUT ONLY IF IT IS STILL THEIRS TO PICK UP, since 2026-09-22. This
         used to reopen the most recent conversation however old it was, so
         a chat last touched three weeks ago came straight back and the
         first thing anybody did each morning was press New chat.

         shouldReopen holds both rules and this page holds none of them.
         Recent enough and not yet finished, it opens. Past the hour, or the
         file was built and downloaded, a new chat opens instead and the old
         one waits in Recent. Nothing is deleted and nothing is hidden. */
      let restored = false;
      const latest = recent[0];
      if (latest && !conversationIdRef.current) {
        const verdict = shouldReopen({
          updatedAt: latest.updated_at,
          delivered: readResumeLog(latest.state).delivered,
        });

        if (verdict.reopen) {
          const row = await loadConversation(latest.id);
          if (!alive) return;
          if (row) {
            restoreFrom(row);
            restored = true;
          }
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
        const work = await listWork(who.company.id, who.user.id);
        if (!alive) return;
        setLibraryFiles(
          work.map((w) => ({
            id: w.id,
            title: w.title,
            skill: w.skill,
            savedToStorage: false,
            when: new Date(w.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            content: w.content ?? w.summary,
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
  /* `readbackOnTable` is true when a build card was on screen at the moment
     they typed. It is the only thing that lets a typed "go ahead" build,
     so a reply can never skip the read back by saying BUILD_NOW early. */
  function runTurn(stage, history, { readbackOnTable = false } = {}) {
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
      sources: sourcesRef.current,
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

      onMeta: (meta) => {
        setActiveTier(meta.tier);
        /* Which sources the assistant chose to read for this work, sent
           back on the next turn so it reads the same ones. */
        if (meta && "sources" in meta) sourcesRef.current = meta.sources ?? null;
      },

      /* Quiet for a long time. The turn is still running, so this only
         changes what the line says. Nothing is cancelled here. */
      onStall: () => setStalled(true),
      onRetry: () => {
        setStalled(false);
        setRetrying(true);
      },

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

        /* NOTHING CAME BACK, AND THE SCREEN USED TO SAY NOTHING ABOUT IT.

           Anthony, 2026-09-21: "I was trying to create a particular
           document, but it was not working. Then I came back and tried to
           use that same chat to create a new document, and then this AI
           system kept me silent. It just showed something like thinking
           and then went quiet."

           That is this, exactly. The reply bubble is only created when the
           FIRST chunk of text arrives. No text means no bubble, so onDone
           turned the thinking line off and left an empty space where an
           answer should be. No error, because nothing errored: the turn
           ran, it just produced nothing.

           A turn that produces nothing is now said out loud. Which of the
           two sentences depends on what the server told us, because "it
           ran out of room" and "it came back empty" are different problems
           and a person can act on the difference. */
        /* A REPLY MADE ONLY OF MARKERS IS NOT AN EMPTY REPLY.

           Anthony, 2026-09-23. He typed "Continue" under a read back. The
           model answered with the two hidden lines and no words, FORMAT
           and READBACK_COMPLETE, which is a correct answer: the read back
           was already on screen and there was nothing new to say. The
           check below saw no visible words, said "Nothing came back", and
           returned before the markers were ever read. So the build button
           never came and he was stuck.

           Now "nothing came back" means no words AND no marker. Markers
           with no words go on to the handshakes below like any other
           reply. */
        const hadMarker = MARKER_WORDS.some((word) => raw.includes(word)) || Boolean(convertFromReply(raw));

        if (!clean.trim() && !hadMarker) {
          const why = cutOff
            ? "That ran out of room before it could say anything. Ask me again, and shorter if you can."
            : stopReason === "end_without_done"
            ? "That stopped before it finished. Nothing was changed, so try again."
            : "Nothing came back that time. Nothing has changed, so try again, or say it a different way.";

          /* The empty bubble goes too. It used to stay, with its thumbs
             and copy buttons under nothing at all. */
          const withNote = updateMessages((prev) => [
            ...prev.filter((m) => m.id !== replyId),
            { id: nextId(), role: "assistant", type: "error", content: why },
          ]);
          /* What they typed is saved, the note is not. A saved note would
             sit at the bottom of the conversation when it is reopened. The
             permission card, when the search is what failed, IS saved: it is
             a question still waiting for an answer, not a note. */
          persist(
            putLookupCardBackAfterFailedSearch(withNote, stage).filter((m) => m.type !== "error"),
            restingStage(stage),
          );
          return;
        }

        /* Built from the ref rather than inside a state updater. An
           updater has to be pure, and React deliberately calls it twice
           in development to catch exactly this: a save fired from inside
           one wrote the conversation to the database twice.

           Markers and no words: the bubble that was opened for the reply
           is taken away, because it holds nothing. */
        const next = updateMessages((prev) =>
          clean.trim()
            ? prev.map((m) => (m.id === replyId ? { ...m, content: clean, cutOff } : m))
            : prev.filter((m) => m.id !== replyId)
        );

        /* ONE SAVE PER TURN, AND IT IS MADE BELOW, ONCE THE TURN KNOWS
           WHERE IT ENDED.

           It used to save here, straight away, and then again in some of
           the branches below. Two problems. The first save recorded the
           step the turn STARTED on, so a read back that asked a question
           was saved as the read back step, and a search as "research".
           And on the very first turn neither save had a conversation id
           yet, so the two could each create a row. Every branch below now
           ends in exactly one persist, with the step the work is really
           on and the cards the person should see. */

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

        /* A SEARCH REQUEST MAY RIDE ALONGSIDE A HANDSHAKE. IT MAY NEVER
           REPLACE ONE.

           Anthony, 2026-09-21: "the search option should happen at any
           time. If I want... the model can even suggest a research after a
           read back."

           So both cards can be on screen at once. He reads what it
           understood, and he either presses build or sends it to check one
           thing first. The handshake is never swallowed, which is the rule
           that stops the dead end of the 16th coming back. */
        const alsoAskedToLook = raw.includes(MARKER.needLookup);

        if (stage === "orient") {
          /* JUST A CONVERSION (DOCUMENT-HARNESS.md, section 8). The first
             turn said CONVERT: and a PDF or Word file really is attached in
             this turn, so there is nothing to interview about: code converts
             it. A CONVERT line with no such file is ignored and the reply
             stays as words, so the marker alone can never do anything. */
          const convertTo = convertFromReply(raw);
          const toConvert = convertTo ? convertibleFile(convertTo) : null;
          if (toConvert) {
            runConversion(toConvert, convertTo);
            return;
          }
          if (raw.includes(MARKER.offerInterview)) {
            /* ONE QUESTION AT A TIME. Anthony, 2026-11-10: "No two prompts
               are supposed to appear at the same time." When it also wants
               to search, the search is asked first, alone, and the offer
               waits in heldCardRef until that is answered. */
            if (alsoAskedToLook) {
              heldCardRef.current = { card: { type: "offer" }, stage: "offered" };
              orientLookupsRef.current += 1;
              const withLookup = updateMessages((prev) => [
                ...prev,
                { id: nextId(), role: "assistant", type: "lookup", from: "orient" },
              ]);
              persist(withLookup, "orient");
              return;
            }
            setFlowStage("offered");
            const withCards = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "offer" },
            ]);
            persist(withCards, "offered");
            return;
          }

          /* It asked to go and look before it had offered anything. Allowed
             ONCE per piece of work, and once only, because this stage has no
             other way out. Two turns of asking to search would be a person
             stuck on the first screen with no route to a document. */
          if (alsoAskedToLook && orientLookupsRef.current < 1) {
            orientLookupsRef.current += 1;
            const withLookup = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "lookup", from: "orient" },
            ]);
            persist(withLookup, "orient");
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
            return;
          }

          /* IT SAID "IF I UNDERSTAND" AND FORGOT THE MARKER. Seen live,
             2026-11-10: the confirmation was on screen with no buttons under
             it. The stage instruction makes that sentence the sign that the
             direction is clear, so the sentence itself puts the card up. */
          if (/(^|\n)\s*\**If I understand\b/i.test(clean)) {
            setFlowStage("offered");
            const withOffer = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "offer" },
            ]);
            persist(withOffer, "offered");
            return;
          }

          /* No marker at all and no search behind us means it was not a
             piece of work, just conversation. The stage stays where it is
             and it reads again next time. */
          persist(next, "orient");
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
            /* Saved as the interview, not the read back. If the page is
               closed before the read back arrives, reopening must not find
               a read back step with no read back in it. */
            persist(next, "interview");

            /* THEY PRESSED "YES, AFTER MY ANSWERS" UNDER THE QUESTIONS.
               Anthony, 2026-11-10: the search runs after the answers. So it
               runs now, before the read back, and comes back to the read
               back with what they keep. The yes line is theirs: they pressed
               the button that says it, and the search gate on the server
               still refuses without it. */
            if (searchAfterAnswersRef.current) {
              searchAfterAnswersRef.current = false;
              lookupFromRef.current = "analyse";
              const yes = "Yes, go and look.";
              updateMessages((prev) => prev.filter((m) => m.type !== "lookupArmed"));
              addMessage({ role: "user", type: "text", content: yes });
              setFlowStage("analyse");
              runTurn("research", [...history, { role: "assistant", content: clean }, { role: "user", content: yes }]);
              return;
            }

            setFlowStage("analyse");
            runTurn("analyse", [...history, { role: "assistant", content: clean }]);
            return;
          }

          /* Asked to go and look in the middle of the conversation, which is
             usually because the person asked it to. Safe here, unlike the
             first turn, because this stage always ends: either it says it is
             done, or handleUserReply moves it up at MAX_INTERVIEW_TURNS
             whatever the model thinks. */
          if (alsoAskedToLook) {
            const withLookup = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "lookup", from: "interview", later: true },
            ]);
            persist(withLookup, "interview");
            return;
          }

          /* NOTHING ASKED AND NO MARKER: IT HAS NOTHING LEFT TO ASK. Seen live
             2026-11-10: after a correction the interview wrote the work
             instead of handing off, and the person was left with text and
             no button. A turn here that asks no question is done, so the
             work moves on to the read back exactly as INTERVIEW_COMPLETE
             would have moved it. */
          /* IT ALREADY READ BACK. Seen live 2026-11-11: after a correction
             the questions step wrote the five line read back itself, and the
             next step then read back a second time. A reply here that carries
             the read back's own lines is the read back: the build card goes
             under it and nothing runs twice. */
          const isReadBack = /(^|\n)\s*\**What:\**/i.test(clean) && /(^|\n)\s*\**Format:\**/i.test(clean);
          if (!clean.includes("?") && isReadBack) {
            interviewTurnsRef.current = 0;
            missingRef.current = "";
            setFlowStage("analyse");
            const withBuild = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "build", format: formatRef.current },
            ]);
            persist(withBuild, "analyse");
            return;
          }

          if (!clean.includes("?")) {
            interviewTurnsRef.current = 0;
            persist(next, "interview");
            setFlowStage("analyse");
            runTurn("analyse", [...history, { role: "assistant", content: clean }]);
            return;
          }

          /* An ordinary question. Wait for them to answer it. */
          persist(next, "interview");
          return;
        }

        if (stage === "analyse") {
          /* THEY SAID GO, IN WORDS. "Continue", "yes", "go ahead", "build
             it", whatever they typed under a read back. The model says
             BUILD_NOW and this presses the build button for them, so
             typing works exactly like pressing.

             ONLY WHEN A READ BACK WAS ON THE TABLE. Building without a read
             back they have seen is the one thing this whole flow exists to
             stop. If the marker arrives with no build card on screen, it
             is treated as a read back instead: the card goes up and they
             press it. */
          if (raw.includes(MARKER.buildNow)) {
            const said = formatFromReply(raw);
            if (said) {
              formatRef.current = said;
              setBuildFormat(said);
            }
            if (readbackOnTable) {
              persist(next, "analyse");
              handleGenerate(undefined, { typed: true });
              return;
            }
            const withBuild = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "build", format: formatRef.current },
            ]);
            persist(withBuild, "analyse");
            return;
          }

          /* THE READ BACK, and it is the only thing that earns the Build
             card. Checked FIRST now, so a search request can never take it
             away. If it wants to check something as well, both cards go up
             and he chooses: build it now, or let it check first.

             The search card goes above the build card, because that is the
             order the decision is made in. */
          if (raw.includes(MARKER.readbackDone)) {
            /* Nothing is outstanding any more, so the note must not still
               claim there is. A stale "waiting on you" is worse than none. */
            missingRef.current = "";

            /* WHICH FILE THIS BECOMES, decided here rather than left to a
               row of buttons afterwards. Nothing said means a Word
               document, which is what an office reaches for by default. */
            formatRef.current = formatFromReply(raw) ?? DEFAULT_FORMAT;
            setBuildFormat(formatRef.current);
            /* SAVED WITH ITS BUTTON, and with the file type on it. Before
               2026-09-23 this card was never saved, so a chat reopened
               after a read back had no button to press. */
            /* ONE QUESTION AT A TIME (see the offer above): the search
               first, the build card held until it is answered. */
            if (alsoAskedToLook) {
              heldCardRef.current = { card: { type: "build", format: formatRef.current }, stage: "analyse" };
              const withLookup = updateMessages((prev) => [
                ...prev,
                { id: nextId(), role: "assistant", type: "lookup", from: "analyse" },
              ]);
              persist(withLookup, "analyse");
              return;
            }
            const withBuild = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "build", format: formatRef.current },
            ]);
            persist(withBuild, "analyse");
            return;
          }

          /* It read the sources and found a hole. Anything that needs a
             person is a conversation, so it drops back to the cheap model
             for the back and forth rather than charging Sonnet rates to
             collect a file name. It comes back up the moment that
             conversation says it is done.

             It may want both at once, and that is a real situation: one
             thing only he can answer, one thing it could go and find. The
             card is marked as coming from the interview, so the search
             hands him back to the conversation rather than to the
             analysis. */
          if (raw.includes(MARKER.needInput)) {
            /* A fresh, specific ask, so it gets its own allowance rather
               than inheriting one the first interview already spent. */
            interviewTurnsRef.current = 0;
            /* Kept for the resume log, so somebody coming back tomorrow is
               told what it was waiting on rather than reading back up the
               thread to work it out. */
            missingRef.current = clean;
            setFlowStage("interview");
            const asked = alsoAskedToLook
              ? updateMessages((prev) => [
                  ...prev,
                  { id: nextId(), role: "assistant", type: "lookup", from: "interview" },
                ])
              : next;
            /* Saved as the interview, because that is where their answer
               goes. It used to be saved as the read back step, so a chat
               reopened here skipped the question it was waiting on. */
            persist(asked, "interview");
            return;
          }

          /* Nothing to hand back yet, it just wants to go and look. */
          if (alsoAskedToLook) {
            const withLookup = updateMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", type: "lookup", from: "analyse" },
            ]);
            persist(withLookup, "analyse");
            return;
          }

          /* THE WAY OUT, AND WITHOUT IT THEY ARE LOOKING AT TEXT WITH NO
             BUTTON.

             This stage always ends in one of three places: it reads back,
             it asks them for something, or it asks to search. A turn that
             did none of those has gone wrong, and the commonest way is
             that it wrote the document here instead of handing off.

             Anthony, 2026-09-21: "after the recap, he started building...
             he just wrote the text there. He did not build it into a
             document. I still intentionally asked for document. He still
             gave me text."

             That is exactly this. The work appeared in a chat bubble,
             which is not a file and never can be, and there was no button
             to turn it into one. The prompt now forbids writing here, but
             a rule is something a model can talk itself out of, so the app
             stops depending on it: no marker means the Build card goes up
             anyway. Pressing it writes the brief and then the real
             document, as a file. */
          const withBuild = updateMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", type: "build", format: formatRef.current },
          ]);
          persist(withBuild, "analyse");
          return;
        }

        /* Any other step. Nothing reaches here today, but a turn must
           never end without being saved. */
        persist(next, restingStage(stage));
      },

      onError: ({ reason, message }) => {
        setTyping(false);
        setStalled(false);
        abortTurnRef.current = null;

        /* Running out is not a failure, it is the end of a trial, and the
           message that comes back with it is written to say so. */
        const next = putLookupCardBackAfterFailedSearch(
          updateMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              type: PLAIN_REFUSALS.has(reason) ? "text" : "error",
              content: message,
            },
          ]),
          stage,
        );

        /* Saved even though the turn failed. What somebody typed is
           theirs, and losing it because the answer never arrived punishes
           them for a fault that was not theirs. Saved on a step that is
           safe to type into, never "research", see resumeCards.js. */
        persist(next, restingStage(stage));
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
      delivered: deliveredRef.current,
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
        /* Which file a build card or a finished document is. Without it a
           reopened chat said Word when the read back had said PDF. */
        format: m.format,
        cutOff: m.cutOff,
        /* Where a filed document went, so "Open in Drive" still works when
           the chat is opened again. */
        link: m.link,
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

    /* The step, the button and the file type, decided in one place. See
       src/shared/resumeCards.js for every rule and why. */
    const settled = settleForResume(row.messages ?? [], row.stage);
    setFlowStage(settled.stage);
    formatRef.current = settled.format ?? DEFAULT_FORMAT;
    setBuildFormat(formatRef.current);

    /* Ref first and state second, the same rule as everywhere else in this
       file: a turn fired straight after this reads the ref. */
    findingsRef.current = log.findings;
    setFindings(log.findings);
    interviewTurnsRef.current = log.asked;
    declinedRef.current = log.declined;
    missingRef.current = log.missing;
    deliveredRef.current = log.delivered;
    briefRef.current = row.brief ?? "";

    /* A look that was running when the page closed is over: its card gets
       its download buttons back rather than waiting for ever. */
    const restored = settled.messages.map((m) => ({ id: nextId(), ...m, ...(m.looking ? { looking: false } : {}) }));

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
    /* ------------------------------------------------------------------
       THE THIRD LANE: SOMETHING ABOUT THE WORK THAT ALREADY EXISTS.

       Anthony, 2026-09-21: "even as it gave me this output, I can decide
       and say make it a word document or PDF file. that flexibility."

       The app had two lanes and needed three. Ordinary conversation is
       handled on the first turn. A new piece of work goes through the
       interview, the read back and the build. But a request about a
       document that is ALREADY finished had nowhere to go, so it was
       pushed back through the analysis as though it were a brand new job.
       Asking for a Word copy started the whole pipeline again.

       NOTHING IS GENERATED HERE, WHICH IS THE POINT. The result card has
       carried Word, PDF, Slides and Spreadsheet all along and
       handleDownload does the work. So this turns a sentence into that
       button press: instant, free, and it cannot be wrong about the
       contents because no model touches it.

       It is deliberately cautious, and formatAsked says why. Refusing
       costs nothing, the message simply carries on to the lane below.
       ------------------------------------------------------------------ */
    const finished = [...messages].reverse().find((m) => m.type === "result");
    if (finished) {
      const wanted = formatAsked(text);
      if (wanted) {
        /* Named after the document's own heading, not the request. See
         src/shared/documentTitle.js. */
      handleDownload(wanted, titleOf(finished.content, finished.title), finished.content);
        updateMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            type: "text",
            content: `Here it is as ${FORMAT_NAMES[wanted]}. It is the same document, nothing has been rewritten.`,
          },
        ]);
        return;
      }
    }

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
    /* Read BEFORE the cards are cleared. A build card on screen means a
       read back is waiting, and only then may a typed "go ahead" build. */
    const readbackOnTable = messagesRef.current.some((m) => m.type === "build");

    updateMessages((prev) => prev.filter((m) => m.type !== "build" && m.type !== "offer" && m.type !== "lookup" && m.type !== "useFinding"));
    /* Typing answers whatever was on screen; nothing stays held behind it. */
    heldCardRef.current = null;

    /* Never research, brief or generate. Typing is a conversation, and
       those three are only ever started by a button. */
    let stage = restingStage(flowStage);

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

    runTurn(stage, toApiMessages([...messages, { role: "user", content: apiContent }]), { readbackOnTable });
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

  /* THE FILE TYPE IS CHOSEN ON THE BUILD CARD.

     Anthony, 2026-09-23: "during the process, I wasn't even offered the
     choice to choose file type. It just saying it producing pdf."

     The read back still picks the best one, and the main button builds
     that. The row under it builds any of the others. So `asFormat` is the
     one they pressed, and nothing pressed means the one the read back
     chose.

     WHAT THEY PRESSED IS SAID IN THE CONVERSATION. The button's own words
     go into the chat as their message, the same way "Yes, go and look."
     does. That does two jobs. The brief is told which file it is writing
     for, so a spreadsheet gets planned as a table and slides get planned as
     slides. And the read back stays in what the brief reads: without a
     message after it, the read back was the last turn, and the last turn
     is dropped when it is the assistant's (see assistantApi.js), so the
     brief was being written without the one thing it summarises. These
     are the words on the button they pressed, so nothing is put in their
     mouth. */
  /* `typed` is true when they said go in their own words rather than
     pressing the button. Their words are already the last thing they
     said, so no button text is added on their behalf.

     Read from messagesRef, not from `messages`. When this is called from
     the end of a turn, `messages` is the list from before that turn
     started, which is missing both what they typed and the reply. */
  function handleGenerate(asFormat, { typed = false } = {}) {
    if (generating) return;
    const format = FORMAT_NAMES[asFormat] ? asFormat : formatRef.current;
    formatRef.current = format;
    setBuildFormat(format);

    const said = typed
      ? null
      : {
          id: nextId(),
          role: "user",
          type: "text",
          content: `Go ahead, build it as ${FORMAT_NAMES[format]}.`,
        };
    const current = messagesRef.current.filter((m) => m.type !== "build");
    const convo = said ? [...current, said] : current;

    /* A CHANGE, NOT A NEW DOCUMENT, when this chat already finished one.
       Anthony, 2026-11-10: changes do not count against the daily
       documents; they have their own cap. The server counts them apart. */
    const revision = current.some((m) => m.type === "result");
    revisionRef.current = revision;

    setGenerating(true);
    updateMessages((prev) => [
      ...prev.filter((m) => m.type !== "build"),
      ...(said ? [said] : []),
      {
        id: nextId(),
        role: "assistant",
        type: "generating",
        /* The live lines and the plan, see BuildProgress.jsx. */
        steps: advance([{ text: "I have read everything we agreed", tone: "done" }], "Writing the plan…"),
        plan: "",
      },
    ]);

    let brief = "";

    setTurnStage("brief");
    setStalled(false);

    abortTurnRef.current = sendTurn({
      sources: sourcesRef.current,
      stage: "brief",
      revision,
      /* The build does not go through runTurn, so it has to carry the
         accepted findings itself. Missing this once meant a person could
         approve a figure, watch it appear on screen, and never see it in
         the document. */
      findings: findingsRef.current.join("\n\n"),
      messages: toApiMessages(convo),

      onMeta: (meta) => {
        setActiveTier(meta.tier);
        /* Which sources the assistant chose to read for this work, sent
           back on the next turn so it reads the same ones. */
        if (meta && "sources" in meta) sourcesRef.current = meta.sources ?? null;
      },
      onStall: () => setStalled(true),
      onRetry: () => {
        setStalled(false);
        setRetrying(true);
      },
      onText: (chunk) => {
        brief += chunk;
        setStalled(false);
        updateMessages((prev) => prev.map((m) => (m.type === "generating" ? { ...m, plan: brief } : m)));
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
            type: PLAIN_REFUSALS.has(reason) ? "text" : "error",
            content: message,
          },
        ]);
      },

      /* THE FIRST JOIN, AND IT USED TO BE ONE UNGUARDED LINE.

         Anthony, 2026-09-21: "I am noticing breakage. Even the breakage of
         moving from read-back to prompt is been breaking."

         This read `onDone: () => buildFromBrief(brief.trim())` with
         nothing checking the brief was not empty. An empty brief did not
         stop anything: the server logs a warning and writes the document
         anyway, with no fence. So the guardrail this whole product turns
         on could be silently absent and nobody was told.

         Now an empty brief stops, says so, and PUTS THE BUILD CARD BACK,
         which is his rule: where the automatic path does not carry,
         there has to be a button that says build. */
      onDone: ({ stopReason } = {}) => {
        if (!brief.trim()) {
          setGenerating(false);
          setStalled(false);
          abortTurnRef.current = null;
          updateMessages((prev) => [
            ...prev.filter((m) => m.type !== "generating"),
            {
              id: nextId(),
              role: "assistant",
              type: "error",
              content:
                stopReason === "max_tokens"
                  ? "The plan for this ran out of room, so nothing was built. Press build again."
                  : "The plan for this came back empty, so nothing was built. Press build again.",
            },
            { id: nextId(), role: "assistant", type: "build" },
          ]);
          return;
        }
        buildFromBrief(brief.trim(), convo);
      },
    });
  }

  /* `convo` is the conversation including the build they pressed, handed
     over from handleGenerate. The `messages` in this closure is from before
     that press, so using it would save and send the conversation without
     it. */
  /* ---------------------------------------------------------------------
     CONVERSION (DOCUMENT-HARNESS.md, section 8)
     --------------------------------------------------------------------- */

  /* The PDF or Word file attached in the person's latest turn that can go
     the way asked, or null. A Word file can become a PDF and a PDF a Word
     file; the same format asked for is nothing to do. */
  function convertibleFile(to) {
    const lastUser = [...messagesRef.current].reverse().find((m) => m.role === "user");
    for (const a of lastUser?.attachments ?? []) {
      const file = originalFilesRef.current.get(a.id);
      const from = file ? kindOfFile(file.name) : null;
      if (file && from && from !== to) return file;
    }
    return null;
  }

  async function runConversion(file, to) {
    const cardId = nextId();
    updateMessages((prev) => [...prev, { id: cardId, role: "assistant", type: "converted", name: file.name, to, busy: true }]);
    try {
      const { convertFile, conversionReport } = await import("../shared/convert/convertFile.js");
      const result = await convertFile(file, to);
      convertedRef.current.set(cardId, result);
      const next = updateMessages((prev) => prev.map((m) => (m.id === cardId
        ? { ...m, busy: false, filename: result.filename, way: result.way, report: conversionReport(result, to), complete: result.words.complete }
        : m)));
      persist(next, "orient");
    } catch (error) {
      console.error("could not convert", error);
      const next = updateMessages((prev) => prev.map((m) => (m.id === cardId
        ? { ...m, busy: false, failed: true }
        : m)));
      persist(next, "orient");
    }
  }

  function downloadConverted(cardId) {
    const result = convertedRef.current.get(cardId);
    if (result) saveBlob(result.blob, result.filename);
  }

  /* "Arrange it for me": the converted words go down the normal path, so
     it is read back and agreed before anything is laid out. */
  function arrangeConverted(message) {
    const text = `Lay out ${message.name} properly as a ${message.to === "pdf" ? "PDF" : "Word document"}, keeping every word of it.`;
    addMessage({ role: "user", type: "text", content: text, attachments: [] });
    handleUserReply(text);
  }

  /* EVERY NUMBER COMES FROM SOMEWHERE (docs/checkDocument.js, section 3).
     Looked for in what the writing was allowed to use: the approved brief,
     what was said in this chat, the outside material they accepted, and
     the company's own sources. Anything found nowhere joins the "Worth
     checking" card. Runs after the document is on screen and saved, so it
     never holds the document up, and a failure here is a line in the
     console, never a missing document. */
  async function checkNumbers(resultId, markdown, brief, convo) {
    try {
      const sources = await companySourceText(me?.company?.id);
      const said = (convo ?? []).map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
      const allowed = [brief, findingsRef.current.join("\n"), said, sources].join("\n");
      const lines = numberFindings(numbersNotInSources(markdown, allowed));
      if (!lines.length) return;
      const next = updateMessages((prev) =>
        prev.map((m) => (m.id === resultId ? { ...m, checks: [...(m.checks ?? []), ...lines] } : m)));
      persist(next, "analyse");
    } catch (error) {
      console.warn("could not check the numbers", error);
    }
  }

  /* --------------------------------------------------------------------
     THE LOOK AGENT. The file is drawn as pictures (docs/look/lookAtFile.js,
     with what measuring already found) and sent to the "look" stage
     (supabase/functions/assistant/stages/look.ts), which answers ALL CLEAR
     or one line per problem. What it says goes on the build card; it never
     changes the file, the person decides whether to ask for a change.
     Anything failing here only means "not looked at": the card finishes
     and the file is handed over as before.
     -------------------------------------------------------------------- */
  async function lookAndReport(resultId, markdown, title, convo, stepsSoFar) {
    const format = formatRef.current;
    const noun = format === "pptx" ? "slide" : "page";
    let steps = stepsSoFar;
    let problems = [];
    let looked = false;
    try {
      const { lookAtFile, asImageBlock } = await import("../shared/docs/look/lookAtFile.js");
      const seen = await lookAtFile(format, title, markdown, me?.company, convo);
      if (seen?.pictures?.length) {
        const intro =
          `This is the finished ${format === "pptx" ? "slide deck" : "PDF"}, ${seen.pages} ${noun}${seen.pages === 1 ? "" : "s"}, ` +
          `drawn as pictures in order.` +
          (seen.problems.length ? `\nThe app already measured these:\n${seen.problems.join("\n")}` : "");
        const said = await new Promise((resolve) => {
          let text = "";
          const stop = setTimeout(() => resolve(null), 60000);
          sendTurn({
            stage: "look",
            messages: [{ role: "user", content: [{ type: "text", text: intro }, ...seen.pictures.map(asImageBlock)] }],
            onText: (chunk) => { text += chunk; },
            onDone: () => { clearTimeout(stop); resolve(text); },
            onError: () => { clearTimeout(stop); resolve(null); },
          });
        });
        looked = said !== null;
        const fromLook = said && !/ALL CLEAR/i.test(said)
          ? said.split("\n").map((l) => l.replace(/^[-*•\s]+/, "").trim()).filter(Boolean)
          : [];
        problems = [...new Set([...seen.problems, ...fromLook])].slice(0, 5);
      }
    } catch (error) {
      console.warn("could not look at the file", error);
    }

    if (looked && !problems.length) {
      steps = advance(steps, `Looked at every ${noun} the way you will see it. Nothing is out of place.`, "done");
    } else if (problems.length) {
      steps = advance(steps, `Looked at every ${noun}. ${problems.length === 1 ? "One thing" : "A few things"} you may want changed:`, "done");
      steps = [...steps, ...problems.map((text) => ({ text, tone: "error" }))];
    } else {
      steps = steps.filter((step) => step.tone !== "active");
    }
    steps = [...steps, { text: problems.length ? "Done. Tell me what to change, or download it as it is." : "Done. It is ready below.", tone: "done" }];
    const next = updateMessages((prev) => prev.map((m) => (m.id === resultId ? { ...m, steps, looking: false } : m)));
    persist(next, "analyse");
  }

  function buildFromBrief(brief, convo = messages) {
    /* Held here as well as written to the row, so the rest of this visit
       knows a brief exists without going back to the database for it. */
    briefRef.current = brief;

    const resultId = nextId();
    let started = false;
    let finished = "";

    /* Saved before a word is written, so the fence the document was built
       inside is on the row whether or not the writing finishes. */
    persist(convo, "generate", brief);

    /* The card on screen is still the build card, so moving this on is what
       changes its line from "Writing the brief" to "Building your
       document". Without it the card would still be talking about the
       brief while the document was being written. */
    setTurnStage("generate");
    setStalled(false);

    /* The progress lines live on whichever card is on screen: the build card
       until the first words arrive, then the result card. */
    let steps = [];
    let sections = 0;
    updateMessages((prev) =>
      prev.map((m) => {
        if (m.type !== "generating") return m;
        steps = advance(m.steps, "Writing the first draft…");
        return { ...m, steps, plan: brief };
      })
    );

    abortTurnRef.current = sendTurn({
      sources: sourcesRef.current,
      stage: "generate",
      brief,
      findings: findingsRef.current.join("\n\n"),
      messages: toApiMessages(convo),

      onMeta: (meta) => {
        setActiveTier(meta.tier);
        /* Which sources the assistant chose to read for this work, sent
           back on the next turn so it reads the same ones. */
        if (meta && "sources" in meta) sourcesRef.current = meta.sources ?? null;
      },
      onStall: () => setStalled(true),
      onRetry: () => {
        setStalled(false);
        setRetrying(true);
      },

      onText: (chunk) => {
        finished += chunk;
        setStalled(false);
        if (!started) {
          started = true;
          updateMessages((prev) => [
            ...prev.filter((m) => m.type !== "generating"),
            {
              id: resultId,
              role: "assistant",
              type: "result",
              content: "",
              title: docTitle(convo),
              steps,
              plan: brief,
              /* Which file this IS, decided back at the read back. The card
                 leads with it rather than offering four equal choices. */
              format: formatRef.current,
            },
          ]);
        }
        /* One grey line per section, the moment its heading arrives. */
        const heads = sectionsSoFar(finished);
        if (heads.length > sections) {
          for (const head of heads.slice(sections)) steps = note(steps, `Writing “${head}”`);
          sections = heads.length;
        }
        updateMessages((prev) =>
          prev.map((m) => (m.id === resultId ? { ...m, content: m.content + chunk, steps } : m))
        );
      },

      onDone: ({ stopReason } = {}) => {
        setGenerating(false);
        setStalled(false);
        abortTurnRef.current = null;

        /* THE SECOND JOIN, AND IT USED TO LEAVE A SPINNER THAT HAD STOPPED.

           The result card is only created when the first chunk of the
           document arrives. No text meant no card, the "generating" card
           was never taken down, and this line quietly turned generating
           off. So somebody sat looking at a spinner that had already
           finished, with nothing to press.

           That is the other half of what Anthony described: "it just
           showed something like thinking and then went quiet."

           Now it says what happened, takes the spinner down, and puts the
           Build card back, so there is always something to press. The
           brief is not lost either: briefRef still holds it, so pressing
           build again does not start the conversation over. */
        if (!finished.trim()) {
          updateMessages((prev) => [
            ...prev.filter((m) => m.type !== "generating"),
            {
              id: nextId(),
              role: "assistant",
              type: "error",
              content:
                stopReason === "max_tokens"
                  ? "The document ran out of room before anything was written. Press build again, and it will start fresh."
                  : "Nothing came back, so no document was written. Press build again.",
            },
            { id: nextId(), role: "assistant", type: "build" },
          ]);
          return;
        }

        /* THE DOCUMENT STOPPED HALFWAY. Before 2026-09-23 this fell
           straight through to the library and the database, so a document
           that ended mid sentence was saved and offered for download as
           though it were finished, and nothing on screen said otherwise.

           Now the part that was written stays on screen, so nothing is
           hidden, but it is not saved as a finished piece of work. The
           person is told plainly and the build card comes back. */
        if (stopReason === "max_tokens") {
          const withRetry = updateMessages((prev) => [
            ...prev.map((m) => (m.id === resultId ? { ...m, cutOff: true } : m)),
            {
              id: nextId(),
              role: "assistant",
              type: "error",
              content:
                "This document ran out of room before the end, so the file above is not complete. Press build again for the whole thing.",
            },
            { id: nextId(), role: "assistant", type: "build", format: formatRef.current },
          ]);
          persist(withRetry, "analyse");
          return;
        }

        /* THE CHECKER, 2026-09-23 (DOCUMENT-HARNESS.md, section 5). Code
           reads the finished document before anybody else does. It takes
           out pictures the person said to skip and puts right a total
           that does not add up, and says what it changed. The numbers are
           checked against the sources just below, once it is saved. A
           check that fails changes nothing: the document still arrives. */
        const checks = [];
        try {
          let checked = finished;
          if (briefSaysNoPictures(brief)) {
            const stripped = stripPictures(checked);
            checked = stripped.markdown;
          }
          const totals = fixTotals(checked);
          checked = totals.markdown;
          checks.push(...totals.findings);
          if (checked !== finished || checks.length) {
            finished = checked;
            updateMessages((prev) => prev.map((m) => (m.id === resultId ? { ...m, content: checked, checks } : m)));
          }
        } catch (error) {
          console.warn("the checker could not read this document", error);
        }

        /* LAID OUT LIKE AN UPLOAD, ONLY WHEN THE AGREED BRIEF SAYS SO
           (DOCUMENT-HARNESS.md, section 9). The style read from that file
           (its font, heading colour and margins) rides on this result, so
           every download of it uses that style instead of the house one. */
        const layoutName = layoutFromBrief(brief);
        if (layoutName) {
          const source = (convo ?? []).flatMap((m) => m.attachments ?? []).find((a) => a.name?.toLowerCase() === layoutName.toLowerCase());
          if (source?.style) {
            updateMessages((prev) => prev.map((m) => (m.id === resultId ? { ...m, style: source.style, layoutFrom: source.name } : m)));
          }
        }

        setDailyUsed((n) => Math.min(n + 1, DAILY_LIMIT));

        /* THE FINISHED DOCUMENT IS SAVED INTO THE CONVERSATION NOW, not
           only when it is downloaded. Before 2026-09-23 it was saved only
           by the download button, so a page reloaded after a build lost
           the document and came back on the "generate" step.

           Saved on the read back step, because that is where anything they
           say next belongs: "add a section on refunds" is a change to agree
           before it is built, not something to write straight into chat. */
        persist(messagesRef.current, "analyse");

        /* Into the library, so it is somewhere other than this one
           conversation. savedToStorage stays false because no storage is
           connected here, and claiming otherwise would be a lie in the UI. */
        /* THE DOCUMENT'S OWN TITLE, its top heading. Seen 2026-11-10: the
           Library and the admin's list named every document after the
           chat's first message ("Hi", "I have a meeting with..."). The
           first message stays only as the fallback for a document with no
           heading. */
        const title = titleOf(finished, docTitle(convo));

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
            revision: revisionRef.current,
          });
        }

        /* The section lines were live progress. Once the document is done they
           fold away, and the card keeps the steps that matter. */
        steps = steps.filter((step) => step.tone !== "info");
        steps = advance(steps, "Checked every figure against your files", "done");

        /* THE LOOK, BEFORE IT IS HANDED OVER. Anthony, 2026-11-10: "The
           system should look at what it made (screenshot) before handing
           it over, especially slides." Slides and PDFs are drawn as
           pictures and looked at; the download buttons wait until it is
           done. See lookAndReport. */
        const lookable = formatRef.current === "pptx" || formatRef.current === "pdf";
        if (lookable) {
          const noun = formatRef.current === "pptx" ? "slide" : "page";
          steps = advance(steps, `Looking at every ${noun} the way you will see it…`);
          updateMessages((prev) => prev.map((m) => (m.id === resultId ? { ...m, steps, looking: true } : m)));
          lookAndReport(resultId, finished, title, convo, steps);
        } else {
          steps = advance(steps, "Done. It is ready below.", "done");
          updateMessages((prev) => prev.map((m) => (m.id === resultId ? { ...m, steps } : m)));
        }
        checkNumbers(resultId, finished, brief, convo);
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
            type: PLAIN_REFUSALS.has(reason) ? "text" : "error",
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

  /* ANSWERING THE OFFER TAKES THE SEARCH CARD WITH IT.

     A search request can now sit next to the offer, so both cards can be
     on screen at once. Clearing only the offer left a live "May I look
     this up online?" button behind, still pointing at the first turn.
     Pressing it an hour later would have dragged somebody in the middle of
     an interview back to the very first stage.

     The flow walk caught this: the stages read orient, interview, analyse,
     research, and then ORIENT again, because the stale card was the one
     that got pressed. Nothing else would have caught it. */
  function answerOffer(line, stage) {
    if (typing || generating) return;
    const kept = clearActionCards(messages);
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: line });
    interviewTurnsRef.current = 0;
    setFlowStage(stage);
    runTurn(stage, toApiMessages([...kept, { role: "user", content: line }]));
  }

  /* Yes. Straight into the questions. */
  const handleWantInterview = () => answerOffer("Yes, that is right. Ask me what you need.", "interview");

  /* No. Straight to the read back, which is where it says what it
     understood and what it is going to use. They still see that before
     anything is written, so saying no skips the questions and never skips
     the checkpoint. */
  const handleSkipInterview = () =>
    answerOffer("Yes, that is right. Start now with what you have.", "analyse");

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

  /* A search they said yes to under the interview questions, waiting for
     their answers. Anthony, 2026-11-10: "should I look this up online?"
     sits inside the questions, and the search runs after the answers. */
  const searchAfterAnswersRef = useRef(false);

  /* THE CARD WAITING BEHIND A SEARCH QUESTION. Anthony, 2026-11-10: only
     one human in the loop question on screen at a time. When a turn wants
     both a search and its own card (the offer, or the build card), the
     search is asked first and the other waits here. Answering the search
     brings it back: "No" at once, with no new turn; "Yes" by way of the
     turn that follows the search, which puts up its own. */
  const heldCardRef = useRef(null);

  /* Puts the held card back on screen, alone. True when there was one. */
  function restoreHeldCard(saidLine) {
    const held = heldCardRef.current;
    if (!held) return false;
    heldCardRef.current = null;
    const kept = clearActionCards(messagesRef.current);
    const next = updateMessages([
      ...kept,
      ...(saidLine ? [{ id: nextId(), role: "user", type: "text", content: saidLine }] : []),
      { id: nextId(), ...held.card, role: "assistant" },
    ]);
    setFlowStage(held.stage);
    persist(next, held.stage);
    return true;
  }

  /* "Yes, after my answers": nothing runs yet. The card turns into a short
     note so they can see the yes was taken, and they answer the questions. */
  function armLookupAfterAnswers() {
    searchAfterAnswersRef.current = true;
    updateMessages((prev) => prev.map((m) => (m.type === "lookup" && m.later
      ? { id: m.id, role: "assistant", type: "lookupArmed" }
      : m)));
    textareaRef.current?.focus();
  }

  /* "No need": the card goes, nothing runs, they answer the questions. */
  function skipLookupAfterAnswers() {
    searchAfterAnswersRef.current = false;
    declinedRef.current += 1;
    updateMessages((prev) => prev.filter((m) => !(m.type === "lookup" && m.later)));
    textareaRef.current?.focus();
  }

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

  /* EVERY BUTTON THE LAST TURN PUT UP COMES DOWN.

     Since a search can now sit next to an offer or a Build card, answering
     the search has to clear the others. Two reasons, and both of them are
     things a person would hit within a minute of using it.

     A Build card left on screen during a search is a live button that
     would start writing the document off the old read back, halfway
     through the very check that was meant to improve it. And the turn that
     comes back after the search puts its own offer or Build card up, so
     leaving the old one there gives two of the same card with no way to
     tell which is current. */
  function clearActionCards(list) {
    return list.filter(
      (m) => m.type !== "lookup" && m.type !== "offer" && m.type !== "build" && m.type !== "useFinding",
    );
  }

  /* A FAILED SEARCH PUTS THE PERMISSION CARD BACK.

     Anthony, 2026-09-23: "the assistant couldn't search the Internet and
     couldn't skip the search."

     That was two faults in one sentence, and this is the second one.
     Pressing "Yes, go and look" takes the card away before the turn runs,
     which is right while the search is happening: a live Yes button during
     a search would start a second one. The fault was that a turn which
     FAILED did not put it back. The person got an error message and nothing
     else, so there was no way to say no any more, and no way to say yes
     again either. He typed "skip" into the chat instead, and that failed
     too, because by then every turn was failing.

     What he is left with after a failed search has to be the same two
     answers he had before it: yes once more, or no thanks. Anything else
     traps him in the search he cannot complete.

     Only after a failed research turn. A failed turn on any other step has
     no permission card to give back.

     IT PUTS THE CARD ON SCREEN, not only into the list it returns. The
     first version of this appended the card to a copy and handed that copy
     to persist, which saved a question the person was never shown. It
     looked right in the code and did nothing on the screen. updateMessages
     sets both state and the ref, so the card appears and the save agrees
     with the screen. */
  function putLookupCardBackAfterFailedSearch(list, turnStage) {
    if (turnStage !== "research") return list;
    return updateMessages([
      ...list,
      { id: nextId(), role: "assistant", type: "lookup", from: lookupFromRef.current },
    ]);
  }

  function allowLookup(from) {
    if (typing || generating) return;
    lookupFromRef.current = from || "analyse";
    const kept = clearActionCards(messages);
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: "Yes, go and look." });
    setFlowStage(lookupReturnStage());
    runTurn("research", toApiMessages([...kept, { role: "user", content: "Yes, go and look." }]));
  }

  function refuseLookup(from) {
    if (typing || generating) return;
    lookupFromRef.current = from || "analyse";
    declinedRef.current += 1;
    /* A card was waiting behind this question: it comes back, and nothing
       else needs to run. */
    if (restoreHeldCard("No, work with what you have.")) return;
    const kept = clearActionCards(messages);
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

    /* The turn that follows puts up its own card, with what was kept. */
    heldCardRef.current = null;

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
    if (restoreHeldCard()) return;
    setFlowStage("interview");
    textareaRef.current?.focus();
  }

  /* "Something needs changing" is not a stage of its own. It just takes the
     card away, puts them back in conversation, and hands them the cursor.
     What they type next is the correction, and the loop carries it back up
     to the analysis by itself. */
  /* "SOMETHING IS MISSING" IS A CONVERSATION, NOT A BLANK CURSOR.

     Anthony, 2026-09-21: "if I say something is missing, it should paste
     that something is missing, and it should ask me what is missing, where
     and where is missing."

     It used to take the card away, move the stage, and put the cursor in
     the box. Silence. The person who just said something is wrong is left
     to work out for themselves how to say what, and they are the one who
     is less sure about it, because it is not their draft.

     A colleague would not do that. They would say what they think they
     got wrong, and ask you which part. So pressing this now RUNS A TURN:
     it goes back to the conversation with "Something is missing" said out
     loud, and the interview stage is told what to do with that.

     Its own question allowance, because this is a fresh, specific ask and
     should not inherit one an earlier interview already spent. */
  function handleAdjust(said) {
    if (typing || generating) return;
    if (!said || !said.trim()) return;

    const kept = messages.filter((m) => m.type !== "build" && m.type !== "lookup");
    updateMessages(kept);
    addMessage({ role: "user", type: "text", content: said });

    interviewTurnsRef.current = 0;
    setFlowStage("interview");
    runTurn("interview", toApiMessages([...kept, { role: "user", content: said }]));
  }

  function handleNewChat() {
    abortTurnRef.current?.();
    abortTurnRef.current = null;
    conversationIdRef.current = null;
    lookupFromRef.current = "analyse";
    searchAfterAnswersRef.current = false;
    heldCardRef.current = null;
    orientLookupsRef.current = 0;
    sourcesRef.current = null;
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
    deliveredRef.current = false;
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
     4b. DELETING CHATS
     Hold a chat to start selecting it, tap others to add them, then delete
     them together. A tap outside selecting still opens the chat.
     ------------------------------------------------------------------------ */

  function startSelecting(id) {
    setSelecting(true);
    setDeleteError("");
    setPicked((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopSelecting() {
    setSelecting(false);
    setPicked([]);
    setConfirmingDelete(false);
    setDeleteError("");
  }

  function togglePicked(id) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function confirmDelete() {
    if (!me?.user?.id || !picked.length) return;
    setDeleteBusy(true);
    setDeleteError("");

    const result = await hideConversations(me.user.id, picked);

    /* READ THE LIST BACK FROM THE DATABASE rather than trusting what was
       asked for. A delete that removed nothing must look like one that
       removed nothing, not like a success. */
    const fresh = await listConversations(me.user.id);
    setRecentChats(fresh);
    setDeleteBusy(false);
    setConfirmingDelete(false);

    /* The chat that is open right now was one of them. It is gone from the
       list, so the screen starts a clean chat rather than carrying on in a
       conversation that no longer appears anywhere. */
    if (result.hidden.includes(conversationIdRef.current)) handleNewChat();

    if (!result.ok) {
      setDeleteError(
        result.reason === "not_ready"
          ? "Deleting chats is not switched on yet."
          : result.hidden.length
          ? "Some of those could not be deleted. Try again."
          : "That could not be deleted. Try again.",
      );
      setPicked((prev) => prev.filter((id) => !result.hidden.includes(id)));
      return;
    }
    stopSelecting();
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

      /* The file itself is kept for this visit, not only its words, so it
         can be converted exactly (convert/convertFile.js). Never saved
         with the conversation: a reopened chat asks for it again. */
      if (kind === "pdf" || kind === "docx") originalFilesRef.current.set(id, file);

      if (isDocument) {
        /* The layout is read alongside the words (convert/layoutOf.js), so
           it is there if they ask for "one like this". It is only USED when
           they do. A layout that cannot be read is simply left out. */
        const layout = kind === "pdf" || kind === "docx" ? readLayout(file) : Promise.resolve(null);
        Promise.all([readFileAsText(file, { maxChars: MAX_FILE_CHARS }), layout]).then(([result, shape]) => {
          if (!result.ok) {
            showUploadError(result.reason);
            setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
            return;
          }
          setPendingAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, status: "ready", text: result.text, truncated: result.truncated, outline: shape?.outline || "", style: shape?.style ?? null }
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

  /* GOOGLE DRIVE, the same way. Asked once when the chat opens, so the
     result card knows whether it can offer to file a document. */
  const [driveBusy, setDriveBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await askDrive("status");
      if (!alive || !result?.ok) return;
      setConnectors((prev) => ({ ...prev, drive: Boolean(result.connected) }));
    })();
    return () => { alive = false; };
  }, []);

  /* Read once on the way back in, said once, then taken out of the address
     bar so a refresh does not replay a message about something that
     happened a while ago. The callback names the service that connected. */
  const [canvaJustBack] = useState(() => {
    if (typeof window === "undefined") return "";
    const marker = new URLSearchParams(window.location.search).get("connected");
    return marker === "canva" || marker === "google-drive" || marker === "failed" ? marker : "";
  });

  useEffect(() => {
    if (!canvaJustBack || typeof window === "undefined") return;
    setToast(canvaJustBack === "canva"
      ? "Canva is connected. Nothing else to do."
      : canvaJustBack === "google-drive"
      ? "Google Drive is connected. Finished work can go straight into it."
      : "That did not finish, so nothing was connected.");
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

  /* Connect or disconnect this person's own Google Drive. Same control both
     ways, like Canva, so a connection can always be undone from where it
     was made. */
  async function connectDrive() {
    if (driveBusy) return;
    if (connectors.drive) {
      setDriveBusy(true);
      const result = await askDrive("disconnect");
      setDriveBusy(false);
      if (!result?.ok) {
        setToast(result?.reason ?? "Could not disconnect that. Try again.");
        return;
      }
      setConnectors((prev) => ({ ...prev, drive: false }));
      setToast("Google Drive disconnected. You can also remove it from your Google account settings.");
      return;
    }
    setDriveBusy(true);
    const result = await askDrive("start");
    if (!result?.ok || !result.url) {
      setDriveBusy(false);
      setToast(result?.reason ?? "Could not start that. Try again.");
      return;
    }
    /* Busy stays on: the page is about to go to Google and come back. */
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

  /* "PASTE IT IN THE CHAT."

     Anthony, 2026-09-21: "after it has produced it as a document and say
     you should download, you can decide that, Oh, I want you to paste it
     on the chat. So it now pastes it for you on the chat, so you can copy
     it as text if you want. Maybe because you can't open the file."

     So the words are always there, they are just not the first thing. One
     press and the document is on screen to read and copy. */
  /* Open or close the document inside the chat. Anthony, 2026-09-23:
     "when I open the file right in the chat, I should be able to close it
     as well." It used to open and never close. */
  function revealText(id, show = true) {
    updateMessages((prev) => prev.map((m) => (m.id === id ? { ...m, showText: show } : m)));
  }

  /* PUTTING IT WHERE THE COMPANY KEEPS THINGS.

     Anthony, 2026-09-21: "once the file is ready, it asks you... whether
     you want to upload this to the drive. When you say yes, it uploads...
     If you say yes and there is no drive access, it tells you that there
     is no access to your storage in this environment."

     Never "Google Drive". Whatever this company connected, and the three
     answers in storage.js cover every case. The one that matters is the
     middle one: connected and unreachable. Pressing a button and seeing
     nothing happen sends somebody away believing their document is filed,
     and they find out when somebody asks them for it. */
  /* `style` is set when the agreed brief said to lay the work out like an
     upload (DOCUMENT-HARNESS.md, section 9). It rides with the company's
     brand, and buildFile uses it instead of the house style. */
  async function handleFile(format, title, content, style = null) {
    /* Nothing connected: say so plainly. The card does not offer this
       button then, so this is only reached if the connection was dropped
       since the page opened. */
    const where = await storageTarget(WORKFLOW_TOOLS, connectors);
    if (where.state !== "ready") {
      setToast(storageMessage(where));
      return;
    }

    setToast(`Putting it in ${where.name}`);
    try {
      const file = await buildFile(format, title, content, style ? { ...companyBrand, layoutStyle: style } : companyBrand, messagesRef.current);
      const result = await fileInDrive(file);
      if (!result?.ok) {
        setToast(result?.reason ?? storageMessage({ state: "unreachable", name: where.name }));
        /* Google said the connection is gone. The switch shows it, so the
           person can see what to press. */
        if (result?.state === "none" || /connecting again/.test(result?.reason ?? "")) {
          setConnectors((prev) => ({ ...prev, drive: false }));
        }
        return;
      }
      setToast("");
      addMessage({
        role: "assistant",
        type: "filed",
        content: `Saved to ${where.name}, in the folder "${result.folder}".`,
        link: result.link,
      });
    } catch (err) {
      if (err?.code === "no_tables") {
        setToast("There is no table in this one, so there is nothing to put in a spreadsheet.");
        return;
      }
      console.error("could not file that", err);
      setToast(`Could not put that in ${where.name}. You can still download it.`);
    }
  }

  async function handleDownload(format, title, content, style = null) {
    setToast(MAKING[format] ?? "Making the file");
    try {
      const convo = messagesRef.current;
      const brand = style ? { ...companyBrand, layoutStyle: style } : companyBrand;
      if (format === "pdf") await downloadPdf(title, content, brand, convo);
      else if (format === "pptx") await downloadPptx(title, content, brand, convo);
      else if (format === "xlsx") await downloadXlsx(title, content, brand);
      else await downloadDocx(title, content, brand, convo);
      setToast("Saved to your downloads");

      /* THE JOB IS FINISHED THE MOMENT THE FILE IS ON THEIR MACHINE.

         Anthony, 2026-09-22: "when a piece work is already done, and
         downloaded keep at recent and always open a new chat."

         So this is recorded, and recording it is what stops this
         conversation reopening by itself next time they come in. The next
         thing they ask for is a different job.

         AFTER THE DOWNLOAD SUCCEEDED, NEVER BEFORE. A file that failed to
         build was never delivered, and marking it delivered would close a
         conversation somebody still has to come back to.

         In its own try, because this is bookkeeping running after the real
         work is done. They already have their file. A save that fails must
         never turn a finished download into an error on screen. */
      try {
        deliveredRef.current = true;
        await persist(messagesRef.current, flowStage, undefined);
      } catch (saveErr) {
        console.error("could not record that the file was downloaded", saveErr);
      }
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
          <div className="px-3 pb-1 min-h-0 flex flex-col">
            {/* THE HEADING, AND THE WAY IN FOR SOMEBODY WHO NEVER HOLDS.
                Press and hold is how a phone does it, but nobody is told
                that, so "Select" sits here in plain sight as well. Both do
                the same thing. */}
            <div className="flex items-center justify-between px-1 pb-1.5">
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-3)" }}
              >
                {selecting
                  ? picked.length === 0
                    ? "Tap chats to select"
                    : `${picked.length} selected`
                  : "Pick up where you left off"}
              </p>
              <button
                type="button"
                onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                className="text-[12px] font-medium px-1.5 py-0.5 rounded-md hover:opacity-70"
                style={{ color: selecting ? "var(--text-2)" : "var(--text-3)" }}
              >
                {selecting ? "Cancel" : "Select"}
              </button>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[42vh]">
            {recentChats.map((chat) => {
              const isPicked = picked.includes(chat.id);
              return (
              <button
                key={chat.id}
                {...pressAndHold.bind(() => startSelecting(chat.id))}
                onClick={() => {
                  if (pressAndHold.wasHeld()) return;
                  if (selecting) togglePicked(chat.id);
                  else resumeChat(chat.id);
                }}
                aria-pressed={selecting ? isPicked : undefined}
                className="w-full flex items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:opacity-80 select-none"
                style={{
                  backgroundColor: isPicked ? "var(--chip)" : "var(--surface)",
                  WebkitTouchCallout: "none",
                }}
              >
                {selecting ? (
                  <span
                    className="w-[15px] h-[15px] shrink-0 mt-0.5 rounded-full border flex items-center justify-center"
                    style={{
                      borderColor: isPicked ? BRAND.red : "var(--border-2)",
                      backgroundColor: isPicked ? BRAND.red : "transparent",
                    }}
                  >
                    {isPicked && <Check size={10} strokeWidth={3} color="#fff" />}
                  </span>
                ) : (
                  <RotateCw size={13} className="shrink-0 mt-1" style={{ color: "var(--text-3)" }} />
                )}
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
              );
            })}
            </div>

            {selecting && (
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={() => setConfirmingDelete(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold border transition-colors hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: BRAND.red, color: BRAND.red }}
              >
                <Trash2 size={14} />
                {picked.length <= 1 ? "Delete chat" : `Delete ${picked.length} chats`}
              </button>
            )}
            {deleteError && (
              <p className="text-[12px] mt-1.5 px-1" style={{ color: BRAND.red }}>
                {deleteError}
              </p>
            )}
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
                Nothing made yet
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
              Your finished documents will show here
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
                onAllowLookup={() => (m.later ? armLookupAfterAnswers() : allowLookup(m.from))}
                onRefuseLookup={() => (m.later ? skipLookupAfterAnswers() : refuseLookup(m.from))}
                onUseFinding={useFinding}
                onDropFinding={dropFinding}
                onReset={handleNewChat}
                onRetry={() => handleRetry(m.id)}
                feedback={feedback[m.id]}
                onFeedback={(kind) => toggleFeedback(m.id, kind)}
                onCopy={() => copyText(m.content)}
                buildFormat={buildFormat}
                onShowText={() => revealText(m.id)}
                onHideText={() => revealText(m.id, false)}
                storageName={linkedStorageName}
                chatImages={chatImages}
                onFile={() => handleFile(m.format ?? buildFormat, titleOf(m.content, m.title), m.content, m.style)}
                onDownload={(format) => handleDownload(format, titleOf(m.content, m.title), m.content, m.style)}
                converted={m.type === "converted" ? convertedRef.current.has(m.id) : false}
                onDownloadConverted={() => downloadConverted(m.id)}
                onArrange={() => arrangeConverted(m)}
              />
            ))}
            {typing && <Thinking stage={turnStage} stalled={stalled} retrying={retrying} />}
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

                {/* ANALYSE A FILE. Anthony, 2026-11-10: "upload a document, get
                    an analysis, for example pricing." Picks the file and puts
                    the words in the box; they press send, and the first stage
                    answers with the analysis right there in the chat. */}
                <button
                  onClick={() => {
                    setInput((now) => (now.trim() ? now : "Analyse this file for me."));
                    if (fileInputRef.current) fileInputRef.current.click();
                    setPlusMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-1)" }}
                >
                  <Search size={17} style={{ color: "var(--text-3)" }} />
                  Analyse a file
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
                              : tool.id === "drive"
                              ? connectDrive()
                              : tool.state === "connectable"
                              ? toggleConnector(tool.id)
                              : setDemoNoteFor((open) => (open === tool.id ? null : tool.id))
                          }
                          disabled={(tool.id === "canva" && canvaBusy) || (tool.id === "drive" && driveBusy)}
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
                                {(tool.id === "canva" && canvaBusy) || (tool.id === "drive" && driveBusy)
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
      {/* ASKED BEFORE ANYTHING HAPPENS. Cancel changes nothing at all. The
          words say what the person will notice: the chats leave the list,
          and their documents stay where they are. */}
      {confirmingDelete && (
        <RefreshOrKeep
          icon={Trash2}
          busy={deleteBusy}
          title={picked.length === 1 ? "Delete this chat?" : `Delete ${picked.length} chats?`}
          lead={
            picked.length === 1
              ? "It comes off your list. Documents you made stay in your Library."
              : "They come off your list. Documents you made stay in your Library."
          }
          note=""
          replaceLabel={picked.length === 1 ? "Delete chat" : `Delete ${picked.length} chats`}
          busyLabel="Deleting"
          replaceStyle={{ background: BRAND.red }}
          onReplace={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </PageShell>
  );
}

/* ==========================================================================
   11. MESSAGE BUBBLES
   Four shapes: the brief read back, the generating state, the finished
   result, and plain text. Assistant text reads as flowing text with no
   avatar, staff messages sit in a neutral capsule on the right.
   ========================================================================== */

/* Every file the build card can make, in the order they are offered. */
const BUILD_FORMATS = ["docx", "pdf", "pptx", "xlsx"];

export function ChatBubble({ message, brief, buildFormat = DEFAULT_FORMAT, buildStage = "brief", buildStalled = false, onGenerate, onAdjust, onWantInterview, onSkipInterview, onAllowLookup, onRefuseLookup, onUseFinding, onDropFinding, onReset, onRetry, onShowText, onHideText, storageName = "", chatImages = null, onFile, feedback, onFeedback, onCopy, onDownload, converted = false, onDownloadConverted, onArrange }) {
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
  /* The yes they gave under the questions, kept on screen as a short note
     until the search runs after their answers. */
  if (message.type === "lookupArmed") {
    return (
      <div style={riseStyle}>
        <p className="flex items-center gap-2 text-[13.5px]" style={{ color: "var(--text-3)" }}>
          <Search size={14} style={{ color: BRAND.amber }} />
          I will look it up once you have answered, and show you what I find first.
        </p>
      </div>
    );
  }

  if (message.type === "lookup" && message.later) {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: BRAND.amber + "66" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Search size={15} style={{ color: BRAND.amber }} />
            <p className="text-[15.5px] font-semibold" style={{ color: "var(--text-1)" }}>
              Look this up online too?
            </p>
          </div>
          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            If yes, I will look once you have answered the questions above. Nothing goes into
            your work until you have seen it and said yes.
          </p>
          <PrimaryButton onClick={onAllowLookup} className="w-full flex items-center justify-center gap-2">
            <Search size={15} />
            Yes, after my answers
          </PrimaryButton>
          <button
            onClick={onRefuseLookup}
            className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            No need
          </button>
        </div>
      </div>
    );
  }

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
            I have said above what I want to find. Nothing I find goes into your work until
            you have seen it and said yes.
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
          <ChatText
            text={withoutMarks(message.content)}
            className="text-[14.5px] leading-relaxed"
            style={{ color: "var(--text-1)" }}
          />
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
  /* A CONVERSION, DONE BY CODE. What it made, how, and what the word by
     word check found, said as facts. The file itself lives only for this
     visit; a reopened chat asks for the original again. */
  if (message.type === "converted") {
    const label = message.to === "pdf" ? "PDF" : "Word file";
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-[15.5px] font-semibold mb-1 break-words" style={{ color: "var(--text-1)" }}>
            {message.busy ? `Converting ${message.name}` : message.failed ? `${message.name} could not be converted` : message.filename}
          </p>
          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            {message.busy
              ? `Making the ${label} and checking every word came across.`
              : message.failed
              ? "Nothing was changed. Try again, or attach it once more."
              : `Ready as a ${label}.`}
          </p>
          {!message.busy && !message.failed && (message.report ?? []).length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {message.report.map((line, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed" style={{ color: i === 0 && message.complete ? "var(--text-1)" : "var(--text-2)" }}>
                  <span className="shrink-0" style={{ color: "var(--text-3)" }}>•</span>
                  <span className="break-words min-w-0">{line}</span>
                </li>
              ))}
            </ul>
          )}
          {!message.busy && !message.failed && (converted ? (
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={onDownloadConverted} className="flex items-center gap-2">
                <Download size={15} />
                Download the {label}
              </PrimaryButton>
              <GhostButton onClick={onArrange}>Arrange it for me</GhostButton>
            </div>
          ) : (
            <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
              Attach {message.name} again to download it. Files are not kept once the page closes.
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (message.type === "offer") {
    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-[15.5px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
            Is that right?
          </p>
          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            If it is, I can ask the few things I still need, or start now with what I have. If not, just tell me what to change.
          </p>
          <PrimaryButton
            onClick={onWantInterview}
            className="w-full flex items-center justify-center gap-2"
          >
            <MessagesSquare size={15} />
            Yes, ask what you need
          </PrimaryButton>
          <button
            onClick={onSkipInterview}
            className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
          >
            Yes, start now
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
            If yes, go ahead and build. If not, tell me what is wrong and where.
          </p>
          {/* IT SAYS WHICH FILE, because the format was decided in the
              conversation and this is the last moment to disagree with it
              cheaply. "Build it" hides a decision somebody would want to
              know about; "Build it as a Word document" does not. */}
          <PrimaryButton onClick={() => onGenerate()} className="w-full flex items-center justify-center gap-2">
            <FileText size={15} />
            Go ahead with {FORMAT_SHORT[buildFormat] ?? "Word"}
          </PrimaryButton>
          {/* THE OTHER FILE TYPES, one press each. Anthony, 2026-09-23:
              "I wasn't even offered the choice to choose file type." The
              main button is the one the read back picked. These build the
              same work as something else, straight away, with no second
              question. */}
          <div className="flex flex-wrap items-center gap-2 mt-3 mb-3">
            <span className="text-[13px] mr-1 w-full sm:w-auto" style={{ color: "var(--text-3)" }}>
              Or make it
            </span>
            {BUILD_FORMATS.filter((f) => f !== buildFormat).map((f) => (
              <GhostButton key={f} onClick={() => onGenerate(f)}>
                {FORMAT_SHORT[f]}
              </GhostButton>
            ))}
          </div>
          {/* NOT A BUTTON THAT CLEARS THE CARD. A box that opens where
              the button was, so the read back being corrected is still on
              screen above the correction. Nothing is asked of any model
              until they have said what is wrong. */}
          <SomethingWrong onSend={onAdjust} />
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
          <div className="flex items-center gap-2.5 mb-3">
            <WorkingMark size={20} />
            <span className="text-[15.5px] font-semibold" style={{ color: "var(--text-1)" }}>
              Building it now
            </span>
          </div>

          {message.steps?.length ? (
            <BuildProgress steps={message.steps} plan={message.plan} working />
          ) : (
            <div className="pl-[26px]">
              <Thinking stage={buildStage} stalled={buildStalled} />
            </div>
          )}
          {buildStalled && message.steps?.length > 0 && (
            <p className="text-[12.5px] mt-2" style={{ color: "var(--text-3)" }}>
              Still working. Longer documents take a minute or two.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* --- The finished file --- */
  /* The real document, on screen, as it is written. No placeholder
     preview: what is in this box is exactly what downloads. */
  /* --- Filed in the person's storage ---
     A plain line saying where it went, and the way to open it there. The
     link is Google's own address for the file, handed back by drive-upload. */
  if (message.type === "filed") {
    return (
      <div style={riseStyle}>
        <div
          className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border px-4 py-3 max-w-full"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <Cloud size={15} style={{ color: BRAND.green }} />
          <span className="text-[13.5px]" style={{ color: "var(--text-1)" }}>{message.content}</span>
          {message.link && (
            <a
              href={message.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-medium hover:opacity-80"
              style={{ color: BRAND.accentSoft }}
            >
              Open in Drive
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (message.type === "result") {
    /* The document's own heading, the same name the file is saved under.
       It used to show the request ("Make me a one page pricing FAQ") because
       the card is made before the document arrives. The heading is there by
       the time anybody reads this, so it is used. See documentTitle.js. */
    const title = titleOf(message.content, message.title);
    /* Read from the document itself rather than from what the person asked
       for. Somebody can ask for a report and get one with a table in it,
       and somebody can ask for "the numbers" and get prose. What is
       actually there is the only thing that decides. */
    const hasTable = toTables(message.content ?? "").length > 0;
    /* The notes to the person, taken out of the file. See the card below. */
    /* And what the checker found (docs/checkDocument.js): a total it put
       right, numbers it could not find in the sources, a chart it could
       not draw, a figure the text pointed at that does not exist. All of it
       is for the person, none of it goes in the file. */
    const readForNotes = readDocument(message.content ?? "", title);
    const notes = [...notesAsText(readForNotes.notes), ...readForNotes.findings, ...(message.checks ?? [])];

    /* WHICH FILE THIS IS. Decided in the conversation, back at the read
       back, so by the time anybody sees this card it is already settled. */
    const made = message.format ?? buildFormat ?? DEFAULT_FORMAT;

    return (
      <div style={riseStyle}>
        <div
          className="rounded-[18px] border p-5 backdrop-blur-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText size={15} style={{ color: BRAND.accentSoft }} />
            <span className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {title}
            </span>
          </div>

          {/* THE FILE IS THE DELIVERABLE, NOT THIS MESSAGE.

              Anthony, 2026-09-21: "naturally, anytime you ask for a
              document, or anytime you are doing work, it doesn't just
              paste it on the chat. Writing it on the chat shouldn't be the
              first thing the agent should do. The first thing the agent
              should do is to produce it in a file."

              He is right, and the reason is not taste. A chat message
              cannot be emailed, cannot go in a folder, and is gone when
              the tab closes. Somebody who asked for a document and got
              text still has to do the last and most annoying step
              themselves, which is the step they came here to avoid.

              So the card leads with the file. The words are still here and
              always will be, one press away, for when somebody cannot open
              the file or just wants to copy a line out of it. */}
          {message.steps?.length > 0 && (
            <div className="mb-4 mt-2">
              <BuildProgress steps={message.steps} plan={message.plan} />
            </div>
          )}

          <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: "var(--text-3)" }}>
            Ready as {FORMAT_NAMES[made] ?? "a Word document"}. Download it below, or read it
            here first.
          </p>

          {/* THE NOTES TO THE PERSON, HERE AND NOT IN THE FILE.

              The writing step ends with "What would make this better" when
              it had to work round something missing. That is written to the
              person who asked, and on 2026-09-23 it was printed inside a
              pricing FAQ meant for customers. documentModel.js now keeps it
              out of every file, and it is shown here instead, where the
              person reads it before sending anything out. */}
          {notes.length > 0 && (
            <div
              className="rounded-[12px] border px-3.5 py-3 mb-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
            >
              <p className="text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                Worth checking before it goes out
              </p>
              <ul className="space-y-1.5">
                {notes.map((line, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    <span className="shrink-0" style={{ color: "var(--text-3)" }}>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {message.showText && (
            <div className="relative mb-4">
              {/* A WAY BACK OUT, at the top where the eye already is. The
                  row of buttons is below the document, and on a phone that
                  can be a long scroll away. */}
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                  Preview
                </span>
                <button
                  type="button"
                  onClick={onHideText}
                  className="flex items-center gap-1 text-[12.5px] font-medium px-2 py-1 rounded-md hover:opacity-70"
                  style={{ color: "var(--text-2)" }}
                  aria-label="Close the preview"
                >
                  <X size={13} />
                  Close
                </button>
              </div>
              <div
                className="rounded-[14px] border p-4 overflow-y-auto"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  maxHeight: "min(60vh, 560px)",
                  minHeight: "120px",
                }}
              >
                {/* Rendered, not raw. Somebody reading this to check it
                    before sending it out should see the document, not a
                    wall of hashes and pipes. */}
                <DocumentView markdown={message.content} images={chatImages} />
              </div>

              {/* aria-hidden and pointer-events-none: a hint for the eye,
                  not a thing to read or to tap through. A box that scrolls
                  with no sign that it scrolls is a box people think is the
                  whole document. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-px right-px bottom-px h-10 rounded-b-[14px]"
                style={{ background: "linear-gradient(to bottom, transparent, var(--surface-2))" }}
              />
            </div>
          )}

          {/* THE ONE IT WAS BUILT AS COMES FIRST AND LOOKS LIKE THE ANSWER.
              The others are still there, because an office converts things
              all day: a report to PDF to send out where nobody can change
              it, a deck to PDF after it has been checked. */}
          {/* Held back while the look runs, so nothing is handed over
              before it has been looked at (Anthony, 2026-11-10). */}
          {message.looking ? (
            <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>
              The download is ready the moment I have finished looking.
            </p>
          ) : (
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton
              onClick={() => onDownload(made)}
              className="flex items-center gap-2 text-[13.5px] px-4"
            >
              <Download size={14} />
              {FORMAT_SHORT[made] ?? "Word"}
            </PrimaryButton>
            {made !== "docx" && <GhostButton onClick={() => onDownload("docx")}>Word</GhostButton>}
            {made !== "pdf" && <GhostButton onClick={() => onDownload("pdf")}>PDF</GhostButton>}
            {made !== "pptx" && <GhostButton onClick={() => onDownload("pptx")}>Slides</GhostButton>}
            {hasTable && made !== "xlsx" && (
              <GhostButton onClick={() => onDownload("xlsx")}>Excel</GhostButton>
            )}
          </div>
          )}

          {/* THE SECOND ROW IS A DIFFERENT QUESTION. The row above is
              "what shall I take away". This one is "what shall I do now".
              Six buttons in one line reads as six equal choices, and on a
              phone it wraps into a block nobody can scan. */}
          <div
            className="flex flex-wrap gap-2.5 mt-2.5 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            {/* THE QUESTION IS ASKED, AND THE ANSWER IS ALWAYS TRUE.

                It never says Google Drive. It says "your storage", because
                which storage that is was decided when the company was set
                up and could be Dropbox or anything else. Pressing it gets
                one of three honest answers, including the awkward one
                where something is connected and cannot be reached. */}
            {/* STORAGE IS CHECKED, NOT ASKED ABOUT BLINDLY. Anthony,
                2026-09-23: "the model didn't ask me to save to storage or
                detect if storage is connected." When something is
                connected the card offers it by name. When nothing is, a
                button that could only ever answer "nothing is connected"
                is noise, so the card says it once, plainly, below. */}
            {storageName && <GhostButton onClick={onFile}>Put it in {storageName}</GhostButton>}
            {message.showText ? (
              <GhostButton onClick={onHideText}>Close preview</GhostButton>
            ) : (
              <GhostButton onClick={onShowText}>Show it here</GhostButton>
            )}
            <GhostButton onClick={onCopy}>Copy</GhostButton>
            <GhostButton onClick={onReset}>Start something new</GhostButton>
          </div>

          {!storageName && (
            <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-3)" }}>
              No storage is connected here yet, so this one is a download.
            </p>
          )}

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
      {/* Shown as what it means, not as typed. See ChatText.jsx. */}
      <ChatText
        text={message.content}
        className="text-[15.5px] leading-relaxed max-w-[85%]"
        style={{ color: "var(--text-1)" }}
      />

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
