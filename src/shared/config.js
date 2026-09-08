/* ==========================================================================
   PRODUCT CONFIG
   Company branding, skills, model tiers, workflow tools, and limits.
   This is the file you edit to rebrand a deployment for a new company.
   ========================================================================== */

import { LayoutGrid, FileType, Sheet, Presentation, Brain, LineChart } from "lucide-react";
import {
  CanvaIconGlyph,
  GmailIconGlyph,
  DriveIconGlyph,
  SlackIconGlyph,
  NotionIconGlyph,
} from "./icons.jsx";

/* --------------------------------------------------------------------------
   SECTION: Branding
   One value drives the assistant name everywhere it appears. A company
   called Acme sees "Acme AI" with no other change.
   -------------------------------------------------------------------------- */

export const PRODUCT = { name: "StellaXafe", supportEmail: "anthony@stellaxafe.com" };

/* --------------------------------------------------------------------------
   SECTION: OAuth client ids
   Public by design. A client id names the application, it does not
   authorise anything, so it belongs in the bundle. The matching secrets
   live in Supabase's secret store and are never in this repo.
   -------------------------------------------------------------------------- */

export const OAUTH_CLIENTS = {
  canva: "OC-AaA6AM8XqQ_Z",
  google: "575838735620-7rv1ibm8tlrj9djt3bs26j95g3r74g54.apps.googleusercontent.com",
};

/* Both providers send the browser back here after someone approves. It
   points at Supabase rather than at stellaxafe.com because exchanging the
   code for a token needs the client secret, and that must never be
   somewhere a browser can read it. */
/* --------------------------------------------------------------------------
   SECTION: Edge function slugs

   The name shown in the Supabase dashboard and the slug in the URL are two
   different things, and renaming a function does not rename its slug. That
   caught this project once: the assistant lived at `assistant-`, with a
   trailing hyphen it was created with, while the dashboard displayed it as
   "assistant". It was redeployed on the clean slug on 2026-09-08 and the
   hyphenated one is gone.

   Calling a slug that does not exist is a 404 with no CORS headers on it,
   which a browser reports as a send failure rather than a not found, so it
   looks like a network problem and sends everybody hunting in the wrong
   place. The slugs live here, named, so nobody has to guess.
   -------------------------------------------------------------------------- */

export const FUNCTIONS = {
  assistant: "assistant",
  addLink: "add-link",
  inviteStaff: "invite-staff",
  sendContact: "send-contact",
};

export const OAUTH_REDIRECT_URI =
  "https://cbunsqzkhidwjtxdsmxd.supabase.co/functions/v1/oauth-callback";

/* --------------------------------------------------------------------------
   SECTION: Naming
   There is deliberately no company name and no person's name in this file.

   Every deployment belongs to a different company and every screen is
   read by a different person, and both come from the database once
   somebody signs in. A default here would be a stranger's name greeting
   someone in their own workspace, which is the exact opposite of what
   this product claims to be.

   These are what a screen shows while it is still finding out, and they
   name nobody.
   -------------------------------------------------------------------------- */

export const ASSISTANT_FALLBACK = "Assistant";

export function assistantNameFor(companyName) {
  return companyName ? `${companyName.split(" ")[0]} AI` : ASSISTANT_FALLBACK;
}

/* --------------------------------------------------------------------------
   SECTION: Limits
   -------------------------------------------------------------------------- */

export const DAILY_LIMIT = 5;

/* Upload caps, split by what the file actually costs.

   A PDF or a Word file is mostly structure. Ten megabytes of PDF might be
   twenty pages of prose, so the megabyte figure says almost nothing about
   what reaches the model. The character cap below is the one that binds,
   and it is applied after the text comes out.

   Plain text is different: every byte is a byte the model would carry, so
   it is capped tighter.

   Images are capped generously because a phone screenshot is large on
   disk and tiny once shrunk. The browser scales it down to the size the
   model works at anyway before it leaves the device. */
export const MAX_TEXT_UPLOAD_KB = 500;
export const MAX_IMAGE_UPLOAD_KB = 5120;

/* A document going into the company knowledge base. Ten megabytes covers
   a real brand guide or an annual report. */
export const MAX_SOURCE_UPLOAD_KB = 10240;

/* How much of any one document is kept. Around sixty pages, which is more
   than any single source needs to be useful and still small enough that a
   handful of them fit in one conversation. */
export const MAX_SOURCE_CHARS = 120000;

/* Four files per message. Past that it stops being a person handing over
   what matters and starts being a folder, and a folder is what pointing at
   a drive is for. */
export const MAX_FILES_PER_MESSAGE = 4;

/* --------------------------------------------------------------------------
   SECTION: Model tiers
   The assistant moves up only as far as a task needs. Ceiling is a
   permission the admin sets per staff member.
   -------------------------------------------------------------------------- */

export const MODEL_TIERS = {
  "haiku-4-5": {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    use: "Interview and conversation",
    inputPer1M: 1,
    outputPer1M: 5,
  },
  "sonnet-5": {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    use: "Analysis, prompt writing, and output",
    inputPer1M: 2,
    outputPer1M: 10,
  },
  "opus-5": {
    id: "claude-opus-5",
    label: "Opus 5",
    use: "Heavier reasoning, granted by role",
    inputPer1M: 5,
    outputPer1M: 25,
  },
  "fable-5": {
    id: "claude-fable-5",
    label: "Fable 5",
    use: "Most demanding work, granted by role",
    inputPer1M: 10,
    outputPer1M: 50,
  },
};

/* Order matters. This is the ladder an admin raises a staff member up. */
export const MODEL_ORDER = ["haiku-4-5", "sonnet-5", "opus-5", "fable-5"];

export const DEFAULT_MODEL_CEILING = "sonnet-5";

/* What an admin may actually hand out. Opus and Fable exist in the ladder
   and the server will run them, but this deployment does not offer them,
   and a selector listing a choice the server refuses is a promise the
   product cannot keep. */
export const INVITABLE_CEILINGS = ["haiku-4-5", "sonnet-5"];

/* --------------------------------------------------------------------------
   SECTION: Skills
   Skills spin up from the task. The staff member never picks one.
   -------------------------------------------------------------------------- */

export const SKILL_LABELS = {
  ppt: "PowerPoint",
  word: "Word",
  excel: "Excel",
  design: "Design",
  mindmap: "Mind map",
  analysis: "Analysis",
};

export const SKILL_META = {
  ppt: {
    icon: Presentation,
    note: "Generated with Canva, connected for this task",
    needsCanva: true,
  },
  word: {
    icon: FileType,
    note: "Formatted as a Word document, ready to export as PDF",
    needsCanva: false,
  },
  excel: {
    icon: Sheet,
    note: "Structured as a spreadsheet",
    needsCanva: false,
  },
  design: {
    icon: LayoutGrid,
    note: "Generated with Canva, connected for this task",
    needsCanva: true,
  },
  mindmap: {
    icon: Brain,
    note: "Structured as a mind map",
    needsCanva: false,
  },
  analysis: {
    icon: LineChart,
    note: "Generated directly from the source material",
    needsCanva: false,
  },
};

/* --------------------------------------------------------------------------
   SECTION: Templates
   Pulled from the company knowledge base in a real deployment.
   -------------------------------------------------------------------------- */

export const TEMPLATES = {
  deck: "Investor Pitch Deck v3",
  finance: "Finance Report Q series",
  social: "Social Announcement",
  proposal: "Client One Pager",
  mindmap: "Project Structure Map",
  analysis: "Analysis Summary",
  other: "Custom layout",
};

/* Maps a detected project type to the skill that handles it. */
export const SKILL_BY_TYPE = {
  deck: "ppt",
  social: "design",
  finance: "excel",
  proposal: "word",
  mindmap: "mindmap",
  analysis: "analysis",
  other: null,
};

/* --------------------------------------------------------------------------
   SECTION: Quick starts
   Surfaced when a staff member types / at the start of a conversation.
   -------------------------------------------------------------------------- */

export const QUICK_ACTIONS = [
  { id: "deck", label: "New pitch deck", seed: "New investor pitch deck", icon: Presentation },
  { id: "finance", label: "Q3 report", seed: "Q3 finance report", icon: Sheet },
  { id: "social", label: "Social announcement", seed: "Social announcement graphic", icon: LayoutGrid },
  { id: "proposal", label: "Client one pager", seed: "Client one pager proposal", icon: FileType },
];

/* --------------------------------------------------------------------------
   SECTION: Workflow tools
   Called connectors internally. They serve two purposes: knowledge and
   storage. The admin connects company wide sources, each staff member
   connects their own.

   `state` has to tell the truth about three genuinely different things,
   because showing the wrong one is worse than showing nothing:

     connected   Already on and really working, but through StellaXafe's
                 own account rather than the viewer's. Canva is here. The
                 designs it makes are real and downloadable. Nobody can
                 swap in their own Canva, so offering a Connect button
                 would be a button that cannot work.
     connectable Genuinely connectable by the person looking at it, with
                 their own account. Drive lands here once its sign in
                 flow is built, and it is the one place a viewer sees a
                 real connection happen.
     sample      Shown to say what the shape of a deployment looks like.
                 Not wired, and says so.
   -------------------------------------------------------------------------- */

export const WORKFLOW_TOOLS = [
  {
    id: "canva",
    label: "Canva",
    icon: CanvaIconGlyph,
    hint: "Design and brand assets",
    state: "registered",
    note:
      "The Canva app is registered and its keys are in place, so the door is built. What is not " +
      "built yet is the part that sends a design through it, so nothing here produces a Canva " +
      "file today. That is the next piece of work, not a maybe.",
  },
  {
    id: "drive",
    label: "Google Drive",
    icon: DriveIconGlyph,
    hint: "Point the assistant at a file, and send finished work back",
    state: "registered",
    note:
      "Registered with Google and its keys are in place. The sign in that would let you connect " +
      "your own Drive is the remaining piece. Until then, hand over a file here and download " +
      "whatever gets made.",
  },
  {
    id: "email",
    label: "Gmail",
    icon: GmailIconGlyph,
    hint: "Search email for source material",
    state: "sample",
  },
  {
    id: "slack",
    label: "Slack",
    icon: SlackIconGlyph,
    hint: "Pull context from team channels",
    state: "sample",
  },
  {
    id: "notion",
    label: "Notion",
    icon: NotionIconGlyph,
    hint: "Read specs, briefs, and project pages",
    state: "sample",
  },
];

/* Sits behind the info control under the tool list. Answers the question
   a sharp person in the room is already forming: are these real, or is
   this a picture of a product? */
export const WORKFLOW_PLAN_NOTE =
  "Your deployment connects the tools your people actually work in, these or others, scoped to " +
  "exactly what your team approves. Where one says registered, the account and keys are already " +
  "in place and the remaining work is the wiring. Where it says example, the shape is drawn and " +
  "the build is scoped. Tell us what your workflow runs on and it gets wired for you.";

export const REGISTERED_CONNECTOR_NOTE =
  "Set up on our side. Not doing work in this demo yet.";

export const SAMPLE_CONNECTOR_NOTE =
  "Not connected in this demo. Built for your company during setup.";
